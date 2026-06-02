import { kv } from '@vercel/kv';
import { requireUser, logActivity } from '../../../lib/auth';

export const runtime = 'edge';

export async function GET(req) {
  const { user, error } = await requireUser(req);
  if (error) return error;
  const events = (await kv.get('activity')) || [];
  // Admins see everything; everyone else sees their own events only
  const filtered = user.role === 'admin' ? events : events.filter(e => e.userId === user.id);
  return new Response(
    JSON.stringify({ events: filtered }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

export async function DELETE(req) {
  const { user, error } = await requireUser(req, ['admin']);
  if (error) return error;
  await kv.set('activity', []);
  await logActivity(user.id, user.username, 'activity.cleared');
  return new Response(
    JSON.stringify({ ok: true, cleared: true }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
