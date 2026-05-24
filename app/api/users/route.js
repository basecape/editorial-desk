import { kv } from '@vercel/kv';
import { requireUser, publicUser, generateSalt, hashPassword, uid, logActivity } from '../../../lib/auth';

export const runtime = 'edge';

const VALID_ROLES = ['admin', 'editor', 'contributor'];

export async function GET(req) {
  const { user, error } = await requireUser(req, ['admin']);
  if (error) return error;
  const users = (await kv.get('users')) || [];
  return new Response(
    JSON.stringify({ users: users.map(publicUser) }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

export async function POST(req) {
  const { user, error } = await requireUser(req, ['admin']);
  if (error) return error;
  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: { message: 'Invalid JSON' } }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  const { username, name, password, role } = body;
  if (!username || !name || !password || !role) {
    return new Response(JSON.stringify({ error: { message: 'username, name, password, role required' } }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (!VALID_ROLES.includes(role)) {
    return new Response(JSON.stringify({ error: { message: `role must be one of: ${VALID_ROLES.join(', ')}` } }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (password.length < 8) {
    return new Response(JSON.stringify({ error: { message: 'Password must be at least 8 characters' } }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  const users = (await kv.get('users')) || [];
  const cleanUsername = username.toLowerCase().trim();
  if (users.find(u => u.username === cleanUsername)) {
    return new Response(JSON.stringify({ error: { message: 'Username already taken' } }), { status: 409, headers: { 'Content-Type': 'application/json' } });
  }
  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);
  const newUser = {
    id: uid('u_'),
    username: cleanUsername,
    name: name.trim(),
    role,
    passwordHash,
    passwordSalt: salt,
    createdAt: Date.now(),
    lastLoginAt: null,
  };
  await kv.set('users', [...users, newUser]);
  await logActivity(user.id, user.username, 'user.create', { newUserId: newUser.id, newUsername: cleanUsername, role });
  return new Response(
    JSON.stringify({ user: publicUser(newUser) }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
