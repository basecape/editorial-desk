import { readSessionToken, destroySession, clearCookie, getSession } from '../../../../lib/auth';
import { kv } from '@vercel/kv';
import { logActivity } from '../../../../lib/auth';

export const runtime = 'edge';

export async function POST(req) {
  const token = readSessionToken(req);
  const session = await getSession(token);
  if (session) {
    const users = (await kv.get('users')) || [];
    const user = users.find(u => u.id === session.userId);
    if (user) await logActivity(user.id, user.username, 'user.logout');
  }
  await destroySession(token);
  return new Response(
    JSON.stringify({ ok: true }),
    { status: 200, headers: { 'Content-Type': 'application/json', 'Set-Cookie': clearCookie() } }
  );
}
