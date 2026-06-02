import { kv } from '@vercel/kv';
import { requireUser, logActivity } from '../../../lib/auth';

export const runtime = 'edge';

export async function GET(req) {
  const { user, error } = await requireUser(req, ['admin']);
  if (error) return error;
  const events = (await kv.get('activity')) || [];
  return new Response(
    JSON.stringify({ events }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

export async function DELETE(req) {
  const { user, error } = await requireUser(req, ['admin']);
  if (error) return error;
  await kv.set('activity', []);
  // Re-log the clear action so there's a record it happened
  await logActivity(user.id, user.username, 'activity.cleared');
  return new Response(
    JSON.stringify({ ok: true, cleared: true }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
