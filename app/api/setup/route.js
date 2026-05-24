// Bootstrap route — only works when no users exist.
// Creates the first admin user.

import { kv } from '@vercel/kv';
import { generateSalt, hashPassword, createSession, sessionCookie, uid, logActivity } from '../../../lib/auth';

export const runtime = 'edge';

export async function GET() {
  const users = (await kv.get('users')) || [];
  return new Response(
    JSON.stringify({ hasUsers: users.length > 0, userCount: users.length }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

export async function POST(req) {
  const users = (await kv.get('users')) || [];
  if (users.length > 0) {
    return new Response(
      JSON.stringify({ error: { message: 'Setup already complete. Sign in instead.' } }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }
  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: { message: 'Invalid JSON' } }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  const { username, name, password } = body;
  if (!username || !name || !password) {
    return new Response(JSON.stringify({ error: { message: 'username, name, password required' } }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (password.length < 8) {
    return new Response(JSON.stringify({ error: { message: 'Password must be at least 8 characters' } }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);
  const user = {
    id: uid('u_'),
    username: username.toLowerCase().trim(),
    name: name.trim(),
    role: 'admin',
    passwordHash,
    passwordSalt: salt,
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
  };
  await kv.set('users', [user]);

  // Create session and set cookie
  const { token } = await createSession(user.id);
  await logActivity(user.id, user.username, 'user.setup', { role: 'admin' });

  const { passwordHash: _, passwordSalt: __, ...publicUser } = user;
  return new Response(
    JSON.stringify({ user: publicUser }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': sessionCookie(token),
      }
    }
  );
}
