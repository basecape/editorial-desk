import { kv } from '@vercel/kv';
import { requireUser, publicUser, generateSalt, hashPassword, logActivity } from '../../../../lib/auth';

export const runtime = 'edge';

const VALID_ROLES = ['admin', 'editor', 'contributor'];

export async function PATCH(req, { params }) {
  const { user, error } = await requireUser(req, ['admin']);
  if (error) return error;
  const { id } = params;
  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: { message: 'Invalid JSON' } }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  const users = (await kv.get('users')) || [];
  const target = users.find(u => u.id === id);
  if (!target) {
    return new Response(JSON.stringify({ error: { message: 'User not found' } }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }
  const updates = {};
  if (body.name !== undefined) updates.name = String(body.name).trim();
  if (body.role !== undefined) {
    if (!VALID_ROLES.includes(body.role)) {
      return new Response(JSON.stringify({ error: { message: `role must be one of: ${VALID_ROLES.join(', ')}` } }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    // Don't allow removing the last admin
    if (target.role === 'admin' && body.role !== 'admin') {
      const adminCount = users.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        return new Response(JSON.stringify({ error: { message: 'Cannot demote the last admin' } }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
    }
    updates.role = body.role;
  }
  if (body.password !== undefined) {
    if (body.password.length < 8) {
      return new Response(JSON.stringify({ error: { message: 'Password must be at least 8 characters' } }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const salt = generateSalt();
    updates.passwordSalt = salt;
    updates.passwordHash = await hashPassword(body.password, salt);
  }
  const next = users.map(u => u.id === id ? { ...u, ...updates } : u);
  await kv.set('users', next);
  await logActivity(user.id, user.username, 'user.update', { targetUserId: id, changes: Object.keys(updates) });
  const updated = next.find(u => u.id === id);
  return new Response(
    JSON.stringify({ user: publicUser(updated) }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

export async function DELETE(req, { params }) {
  const { user, error } = await requireUser(req, ['admin']);
  if (error) return error;
  const { id } = params;
  if (id === user.id) {
    return new Response(JSON.stringify({ error: { message: 'You cannot delete yourself' } }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  const users = (await kv.get('users')) || [];
  const target = users.find(u => u.id === id);
  if (!target) {
    return new Response(JSON.stringify({ error: { message: 'User not found' } }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }
  if (target.role === 'admin') {
    const adminCount = users.filter(u => u.role === 'admin').length;
    if (adminCount <= 1) {
      return new Response(JSON.stringify({ error: { message: 'Cannot delete the last admin' } }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
  }
  await kv.set('users', users.filter(u => u.id !== id));
  await logActivity(user.id, user.username, 'user.delete', { targetUserId: id, targetUsername: target.username });
  return new Response(
    JSON.stringify({ ok: true }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
