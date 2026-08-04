// Cron-triggered news autopilot runner.
// Called by Vercel Cron at midnight SAST (22:00 UTC) or manually by admin.

import { requireUser, logActivity } from '../../../../lib/auth';
import { runNewsAutopilot } from '../../../../lib/newsScout';

export const runtime = 'nodejs';
export const maxDuration = 300;

function isCronAuthorized(req) {
  const auth = req.headers.get('authorization') || '';
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;
  return false;
}

// GET is used by Vercel Cron
export async function GET(req) {
  if (!isCronAuthorized(req)) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }
  const result = await runNewsAutopilot({ trigger: 'cron' });
  await logActivity(null, 'news-autopilot', 'news_autopilot.run', {
    trigger: 'cron', created: result.totalTopicsCreated, errors: result.errors?.length || 0,
  });
  return new Response(JSON.stringify(result, null, 2), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
}

// POST — admin manual trigger (Run now button)
export async function POST(req) {
  if (!isCronAuthorized(req)) {
    const { user, error } = await requireUser(req, ['admin']);
    if (error) return error;
  }
  const result = await runNewsAutopilot({ trigger: 'manual' });
  return new Response(JSON.stringify(result, null, 2), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
}
