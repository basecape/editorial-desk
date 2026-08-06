// News scout — searches the web for the latest news in configured categories
// and creates queued news topics ready for the queue worker to write.
// Runs on a daily cron (00:00 SAST = 22:00 UTC).

import { kv } from '@vercel/kv';
import { callAnthropic } from './articleGenerator';

const CATEGORY_LABELS = {
  fitness: 'Fitness',
  nutrition: 'Nutrition',
  mental_health: 'Mental Health',
  health_guides: 'Health Guides',
  beauty: 'Beauty',
  fitness_training: 'Fitness & Training',
  diet_nutrition: 'Diet & Nutrition',
  preventive_health: 'Preventive Health',
  women_s_health: "Women's Health",
  men_s_health: "Men's Health",
  expert_directory: 'Expert Directory',
  community_social: 'Community & Social',
  medications: 'Medications',
  supplements: 'Supplements',
  tools_calculators: 'Tools & Calculators',
  health_news: 'Health News',
  kids_family: 'Kids & Family',
  my_health_profile: 'My Health Profile',
};

function extractJsonArray(text) {
  let clean = text.replace(/```(?:json|javascript|js)?/gi, '').trim();
  const start = clean.indexOf('[');
  if (start === -1) throw new Error(`No JSON array in response: "${text.slice(0, 200)}…"`);
  let depth = 0, end = -1, inStr = false, esc = false;
  for (let i = start; i < clean.length; i++) {
    const c = clean[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"') inStr = !inStr;
    if (inStr) continue;
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  if (end === -1) {
    const lastObj = clean.lastIndexOf('}');
    if (lastObj > start) {
      try { return JSON.parse(clean.slice(start, lastObj + 1) + ']'); } catch {}
    }
    throw new Error(`Truncated JSON: "${clean.slice(start, start + 200)}…"`);
  }
  return JSON.parse(clean.slice(start, end));
}

function slugKeyword(str) {
  return String(str || '').toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .split(/\s+/).slice(0, 5).join(' ').trim();
}

function makeTopicId() {
  return `tp_${Math.random().toString(36).slice(2, 12)}_${Date.now().toString(36)}`;
}

async function scoutCategoryNews(categoryKey, count, focus, lookbackHours) {
  const catLabel = CATEGORY_LABELS[categoryKey] || categoryKey;
  const focusLine = focus?.trim()
    ? `Additional focus for this category: ${focus}`
    : `Focus on the "${catLabel}" area.`;

  const prompt = `Search the web for the most important South African health news in "${catLabel}" published in the last ${lookbackHours} hours.

${focusLine}

Return EXACTLY ${count} stories (or fewer if fewer are worth covering) as a JSON array. Each story object must include:

{
  "title": "Working title for our SA-focused article (under 80 chars)",
  "angle": "The SA-specific angle we should take — how does this affect SA readers?",
  "primaryKeyword": "The main SEO keyword phrase (3-5 words)",
  "sourceUrl": "URL to the primary news source",
  "sourcePublisher": "Publication name (Daily Maverick, SABC, News24, etc.)",
  "publishDate": "YYYY-MM-DD when the story was published",
  "summary": "150-200 word factual summary of what happened, who was involved, why it matters"
}

Requirements:
- Prioritise stories relevant to South African readers
- Skip PR fluff, product launches, and celebrity gossip unless genuinely newsworthy
- Prefer authoritative sources: Daily Maverick, News24, SABC, BusinessDay, EWN, Sunday Times, Health24, IOL, Mail & Guardian, or peer-reviewed research reported in credible outlets
- If a story is international, only include it if it has clear implications for SA readers
- Do NOT include stories that are older than ${lookbackHours} hours
- Each story should be genuinely useful, publish-worthy editorial content
- Reject anything you cannot verify to a specific source

Return ONLY the JSON array. No preamble, no commentary, no code fences.`;

  const text = await callAnthropic(prompt, { maxTokens: 4000, useWebSearch: true, timeoutMs: 120000 });
  const stories = extractJsonArray(text);
  if (!Array.isArray(stories)) throw new Error('Expected JSON array from scout');
  return stories.slice(0, count); // safety cap
}

export async function runNewsAutopilot({ trigger = 'cron' } = {}) {
  const config = (await kv.get('newsAutopilot')) || null;
  if (!config) return { skipped: true, reason: 'no config' };
  if (!config.enabled && trigger === 'cron') return { skipped: true, reason: 'autopilot disabled' };

  const lookbackHours = Number(config.lookbackHours) || 24;
  const autoWrite = config.autoWrite !== false;
  const targets = config.targetCategories || {};
  const enabledCategoryKeys = Object.entries(targets)
    .filter(([, c]) => c?.enabled)
    .map(([k]) => k);

  const results = {
    trigger,
    startedAt: Date.now(),
    perCategory: {},
    totalTopicsCreated: 0,
    errors: [],
  };

  // Track live progress in KV so the client can poll it
  const progressKey = 'newsAutopilotProgress';
  const writeProgress = async (state) => {
    try {
      await kv.set(progressKey, state, { ex: 600 }); // expire in 10 min
    } catch {}
  };

  await writeProgress({
    running: true,
    startedAt: results.startedAt,
    totalCategories: enabledCategoryKeys.length,
    completedCategories: 0,
    currentCategory: null,
    currentStep: 'starting',
    totalTopicsCreated: 0,
    errors: [],
  });

  const currentTopics = (await kv.get('topics')) || [];
  const newTopics = [];
  let completedCount = 0;

  // Run all categories IN PARALLEL — total time = slowest single call, not sum of all
  // Update progress after each one settles
  const processCategory = async (categoryKey) => {
    const catConfig = targets[categoryKey];
    const count = Math.min(20, Math.max(1, Number(catConfig.count) || 5));
    const focus = catConfig.focus || '';
    try {
      const stories = await scoutCategoryNews(categoryKey, count, focus, lookbackHours);
      const perCat = { requested: count, retrieved: stories.length, created: 0 };
      const created = [];
      for (const story of stories) {
        if (!story?.title) continue;
        created.push({
          id: makeTopicId(),
          type: 'news',
          title: String(story.title).trim().slice(0, 120),
          angle: String(story.angle || '').trim(),
          whyNow: String(story.summary || '').trim(),
          keyword: slugKeyword(story.primaryKeyword || story.title),
          cluster: 'News autopilot',
          category: categoryKey,
          status: autoWrite ? 'queued' : 'pending',
          source: 'news_autopilot',
          sourceUrl: story.sourceUrl || null,
          sourcePublisher: story.sourcePublisher || null,
          publishDate: story.publishDate || null,
          createdAt: Date.now(),
        });
        perCat.created++;
      }
      return { categoryKey, perCat, topics: created };
    } catch (e) {
      const msg = String(e?.message || e).slice(0, 300);
      return { categoryKey, perCat: { requested: count, retrieved: 0, created: 0, error: msg }, topics: [], error: msg };
    } finally {
      completedCount++;
      writeProgress({
        running: true,
        startedAt: results.startedAt,
        totalCategories: enabledCategoryKeys.length,
        completedCategories: completedCount,
        currentCategory: categoryKey,
        currentCategoryLabel: CATEGORY_LABELS[categoryKey] || categoryKey,
        currentStep: `${completedCount} of ${enabledCategoryKeys.length} categories done`,
        totalTopicsCreated: newTopics.length,
        errors: results.errors,
      }).catch(() => {});
    }
  };

  await writeProgress({
    running: true,
    startedAt: results.startedAt,
    totalCategories: enabledCategoryKeys.length,
    completedCategories: 0,
    currentCategory: null,
    currentStep: `searching ${enabledCategoryKeys.length} categories in parallel`,
    totalTopicsCreated: 0,
    errors: [],
  });

  const settled = await Promise.allSettled(enabledCategoryKeys.map(processCategory));

  settled.forEach(s => {
    if (s.status === 'fulfilled') {
      const { categoryKey, perCat, topics: catTopics, error } = s.value;
      results.perCategory[categoryKey] = perCat;
      newTopics.push(...catTopics);
      if (error) results.errors.push({ category: categoryKey, error });
    } else {
      results.errors.push({ category: 'unknown', error: String(s.reason).slice(0, 300) });
    }
  });

  if (newTopics.length > 0) {
    const updated = [...newTopics, ...currentTopics];
    await kv.set('topics', updated);
    results.totalTopicsCreated = newTopics.length;
  }

  const finalConfig = {
    ...config,
    lastRun: {
      at: results.startedAt,
      completedAt: Date.now(),
      trigger,
      totalTopicsCreated: results.totalTopicsCreated,
      perCategory: results.perCategory,
      errors: results.errors,
    },
  };
  await kv.set('newsAutopilot', finalConfig);

  // Mark progress as done
  await writeProgress({
    running: false,
    startedAt: results.startedAt,
    completedAt: Date.now(),
    totalCategories: enabledCategoryKeys.length,
    completedCategories: enabledCategoryKeys.length,
    totalTopicsCreated: results.totalTopicsCreated,
    errors: results.errors,
    currentStep: 'complete',
  });

  results.completedAt = Date.now();
  results.durationMs = results.completedAt - results.startedAt;
  return results;
}
