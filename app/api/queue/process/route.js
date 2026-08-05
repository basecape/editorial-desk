// Queue worker — runs on a schedule (Vercel Cron) or on-demand (admin trigger).
// Processes topics with status='queued' by generating articles server-side.
// Immune to client disconnects: your phone can lock, browser can close, this keeps running.

import { kv } from '@vercel/kv';
import { requireUser, logActivity } from '../../../../lib/auth';
import { generateArticle } from '../../../../lib/articleGenerator';

// Long-running: needs Vercel Pro's 300s function timeout (Hobby has 60s).
export const runtime = 'nodejs';
export const maxDuration = 300;

const LOCK_KEY = 'writeWorkerLock';
const LOCK_TTL_SECONDS = 300;         // 5 minutes
const MAX_TOPICS_PER_RUN = 3;         // Process up to 3 topics per invocation
const SAFETY_BUDGET_MS = 60 * 1000;   // Stop starting new topics if <60s function budget left

async function acquireLock() {
  // SET LOCK_KEY <ts> NX EX 300 — only succeeds if key doesn't exist
  const result = await kv.set(LOCK_KEY, Date.now(), { nx: true, ex: LOCK_TTL_SECONDS });
  return result === 'OK' || result === true;
}

async function releaseLock() {
  try { await kv.del(LOCK_KEY); } catch {}
}

function isAuthorized(req) {
  // Vercel Cron sets Authorization: Bearer <CRON_SECRET> (from env var)
  const auth = req.headers.get('authorization') || '';
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth === `Bearer ${cronSecret}`) return { source: 'cron' };
  return null;
}

async function processOneTopic(topic, state, deadline) {
  const startedAt = Date.now();
  const currentTopics = (await kv.get('topics')) || [];

  // Mark writing
  const idx1 = currentTopics.findIndex(t => t.id === topic.id);
  if (idx1 === -1) return { skipped: true, reason: 'topic vanished' };
  if (currentTopics[idx1].status !== 'queued') return { skipped: true, reason: `status is ${currentTopics[idx1].status}` };

  currentTopics[idx1] = { ...currentTopics[idx1], status: 'writing', writingStartedAt: startedAt, error: null };
  await kv.set('topics', currentTopics);

  try {
    const draft = await generateArticle(topic, state);

    // Re-fetch to avoid overwriting other changes
    const [freshTopics, freshDrafts] = await Promise.all([
      kv.get('topics'), kv.get('drafts')
    ]);
    const topics = freshTopics || [];
    const drafts = freshDrafts || [];

    // Save draft
    drafts.unshift(draft);
    await kv.set('drafts', drafts);

    // Mark topic written
    const idx2 = topics.findIndex(t => t.id === topic.id);
    if (idx2 !== -1) {
      topics[idx2] = { ...topics[idx2], status: 'written', draftId: draft.id, writingStartedAt: null, error: null, completedAt: Date.now() };
      await kv.set('topics', topics);
    }

    await logActivity(null, 'worker', 'draft.write', {
      draftId: draft.id, topicId: topic.id, type: topic.type, title: draft.title, durationMs: Date.now() - startedAt,
    });

    return { success: true, draftId: draft.id, durationMs: Date.now() - startedAt };
  } catch (e) {
    const errMsg = String(e?.message || e).slice(0, 500);
    // Mark failed
    const freshTopics = (await kv.get('topics')) || [];
    const idx3 = freshTopics.findIndex(t => t.id === topic.id);
    if (idx3 !== -1) {
      freshTopics[idx3] = { ...freshTopics[idx3], status: 'failed', writingStartedAt: null, error: errMsg, failedAt: Date.now() };
      await kv.set('topics', freshTopics);
    }
    await logActivity(null, 'worker', 'draft.write_failed', { topicId: topic.id, title: topic.title, error: errMsg });
    return { success: false, error: errMsg };
  }
}

async function runWorker(source) {
  const startTime = Date.now();
  const deadline = startTime + (LOCK_TTL_SECONDS * 1000) - SAFETY_BUDGET_MS;

  const gotLock = await acquireLock();
  if (!gotLock) {
    return { skipped: true, reason: 'another worker running', source };
  }

  const results = [];
  try {
    // Load state once (settings/training/sitepages don't change often)
    const [topics, settings, categoryTraining, sitePages, libraryItems] = await Promise.all([
      kv.get('topics'), kv.get('settings'), kv.get('categoryTraining'),
      kv.get('sitePages'), kv.get('library'),
    ]);

    const state = {
      settings: settings || {},
      categoryTraining: categoryTraining || {},
      sitePages: sitePages || [],
      libraryItems: libraryItems || [],
    };

    // Find queued topics — FIFO by createdAt
    const queued = (topics || [])
      .filter(t => t.status === 'queued')
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    if (queued.length === 0) {
      return { source, processed: 0, message: 'queue empty' };
    }

    // Process up to MAX_TOPICS_PER_RUN, respecting deadline
    for (let i = 0; i < Math.min(MAX_TOPICS_PER_RUN, queued.length); i++) {
      if (Date.now() > deadline) {
        results.push({ topicId: queued[i].id, skipped: true, reason: 'time budget exhausted' });
        break;
      }
      const r = await processOneTopic(queued[i], state, deadline);
      results.push({ topicId: queued[i].id, title: queued[i].title, ...r });
    }

    // Check if there are still queued topics after this run — if so, self-trigger
    const remainingTopics = (await kv.get('topics')) || [];
    const remainingQueued = remainingTopics.filter(t => t.status === 'queued').length;

    const result = {
      source, processed: results.length, results,
      durationMs: Date.now() - startTime,
      queueRemaining: remainingQueued,
    };

    // Self-trigger if more queued topics remain — release lock FIRST so the next call gets it
    if (remainingQueued > 0) {
      await releaseLock();
      // Fire-and-forget — don't await, don't block the response
      const proto = process.env.VERCEL_URL ? 'https' : 'http';
      const host = process.env.VERCEL_URL || 'localhost:3000';
      const cronSecret = process.env.CRON_SECRET;
      if (cronSecret) {
        fetch(`${proto}://${host}/api/queue/process`, {
          method: 'GET',
          headers: { authorization: `Bearer ${cronSecret}` },
        }).catch(() => {});
      }
      result.selfTriggered = true;
      return result;
    }
    return result;
  } finally {
    // Release lock if not already released via self-trigger path
    try { await releaseLock(); } catch {}
  }
}

// GET is used by Vercel Cron (which sends GET with Bearer token)
export async function GET(req) {
  const cronAuth = isAuthorized(req);
  if (!cronAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized. Cron only.' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }
  const result = await runWorker('cron');
  return new Response(JSON.stringify(result, null, 2), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
}

// POST is used by admin manual "run now" trigger
export async function POST(req) {
  // Allow either cron auth OR admin session
  const cronAuth = isAuthorized(req);
  if (!cronAuth) {
    const { user, error } = await requireUser(req, ['admin']);
    if (error) return error;
  }
  const result = await runWorker(cronAuth ? 'cron' : 'manual');
  return new Response(JSON.stringify(result, null, 2), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
}
