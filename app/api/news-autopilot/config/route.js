import { kv } from '@vercel/kv';
import { requireUser } from '../../../../lib/auth';

export const runtime = 'edge';

const DEFAULT_CONFIG = {
  enabled: false,
  autoWrite: true,
  lookbackHours: 24,
  targetCategories: {},
  lastRun: null,
};

export async function GET(req) {
  const { user, error } = await requireUser(req);
  if (error) return error;
  const config = (await kv.get('newsAutopilot')) || DEFAULT_CONFIG;
  return new Response(JSON.stringify({ config }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
}

export async function PUT(req) {
  const { user, error } = await requireUser(req, ['admin']);
  if (error) return error;

  let body;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400 }); }

  const current = (await kv.get('newsAutopilot')) || DEFAULT_CONFIG;
  const config = {
    ...current,
    enabled: body.enabled !== undefined ? !!body.enabled : current.enabled,
    autoWrite: body.autoWrite !== undefined ? !!body.autoWrite : current.autoWrite,
    lookbackHours: body.lookbackHours !== undefined
      ? Math.max(1, Math.min(72, parseInt(body.lookbackHours, 10) || 24))
      : current.lookbackHours,
    targetCategories: body.targetCategories !== undefined ? body.targetCategories : current.targetCategories,
    updatedAt: Date.now(),
  };
  await kv.set('newsAutopilot', config);
  return new Response(JSON.stringify({ config }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
}
