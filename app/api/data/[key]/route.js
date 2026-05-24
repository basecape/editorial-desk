import { kv } from '@vercel/kv';
import { requireUser } from '../../../../lib/auth';

export const runtime = 'edge';

// Whitelist of keys clients can read/write
const ALLOWED_KEYS = [
  'topics', 'drafts', 'library', 'sitePages',
  'settings', 'categoryTraining', 'prompts', 'training'
];

// Keys only admin/editor can write (contributors can only read these)
const READ_ONLY_FOR_CONTRIBUTOR = ['settings', 'categoryTraining', 'prompts'];

export async function GET(req, { params }) {
  const { user, error } = await requireUser(req);
  if (error) return error;
  const { key } = params;
  if (!ALLOWED_KEYS.includes(key)) {
    return new Response(JSON.stringify({ error: { message: 'Unknown key' } }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  const data = await kv.get(key);
  return new Response(
    JSON.stringify({ value: data ?? null }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

export async function PUT(req, { params }) {
  const { user, error } = await requireUser(req);
  if (error) return error;
  const { key } = params;
  if (!ALLOWED_KEYS.includes(key)) {
    return new Response(JSON.stringify({ error: { message: 'Unknown key' } }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (user.role === 'contributor' && READ_ONLY_FOR_CONTRIBUTOR.includes(key)) {
    return new Response(JSON.stringify({ error: { message: 'Contributors cannot modify this' } }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }
  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: { message: 'Invalid JSON' } }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  await kv.set(key, body.value);
  return new Response(
    JSON.stringify({ ok: true }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
