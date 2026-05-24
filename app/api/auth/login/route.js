import { kv } from '@vercel/kv';
import { verifyPassword, createSession, sessionCookie, logActivity } from '../../../../lib/auth';

export const runtime = 'edge';

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: { message: 'Invalid JSON' } }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  const { username, password } = body;
  if (!username || !password) {
    return new Response(JSON.stringify({ error: { message: 'username and password required' } }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  const users = (await kv.get('users')) || [];
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase().trim());
  if (!user) {
    return new Response(JSON.stringify({ error: { message: 'Invalid username or password' } }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  const ok = await verifyPassword(password, user.passwordSalt, user.passwordHash);
  if (!ok) {
    return new Response(JSON.stringify({ error: { message: 'Invalid username or password' } }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  // Update lastLoginAt
  const updated = users.map(u => u.id === user.id ? { ...u, lastLoginAt: Date.now() } : u);
  await kv.set('users', updated);
  const { token } = await createSession(user.id);
  await logActivity(user.id, user.username, 'user.login');
  const { passwordHash, passwordSalt, ...publicUser } = user;
  return new Response(
    JSON.stringify({ user: { ...publicUser, lastLoginAt: Date.now() } }),
    { status: 200, headers: { 'Content-Type': 'application/json', 'Set-Cookie': sessionCookie(token) } }
  );
}
