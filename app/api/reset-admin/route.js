import { kv } from '@vercel/kv';
import { hashPassword, generateSalt } from '../../../lib/auth';

export const runtime = 'edge';

// =============================================================================
// ONE-TIME ADMIN PASSWORD RESET
// =============================================================================
// Activates ONLY when the ADMIN_RESET_SECRET env var is set in Vercel.
// Visit (browser): /api/reset-admin?secret=YOUR_SECRET&username=admin&password=NewPass
// After successful reset, REMOVE the env var so this endpoint deactivates.
// =============================================================================

export async function GET(req) {
  const envSecret = process.env.ADMIN_RESET_SECRET;
  if (!envSecret) {
    return new Response(
      JSON.stringify({ error: 'Reset endpoint disabled. Set ADMIN_RESET_SECRET env var in Vercel to enable.' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const url = new URL(req.url);
  const secret = url.searchParams.get('secret');
  const username = url.searchParams.get('username');
  const password = url.searchParams.get('password');

  if (secret !== envSecret) {
    return new Response(
      JSON.stringify({ error: 'Invalid secret' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!username || !password) {
    return new Response(
      JSON.stringify({ error: 'Missing parameters. Required: username, password' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (password.length < 4) {
    return new Response(
      JSON.stringify({ error: 'Password must be at least 4 characters' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const users = (await kv.get('users')) || [];
  const idx = users.findIndex(u => u.username === username);

  if (idx === -1) {
    const available = users.map(u => `${u.username} (${u.role})`).join(', ') || 'none';
    return new Response(
      JSON.stringify({ error: `User "${username}" not found. Available users: ${available}` }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const newSalt = generateSalt();
  const newHash = await hashPassword(password, newSalt);
  users[idx] = {
    ...users[idx],
    passwordHash: newHash,
    passwordSalt: newSalt,
    passwordResetAt: Date.now(),
  };
  await kv.set('users', users);

  return new Response(
    JSON.stringify({
      ok: true,
      message: `Password reset for "${username}". You can now sign in with the new password.`,
      important: 'REMOVE the ADMIN_RESET_SECRET env var from Vercel now to disable this endpoint.',
    }, null, 2),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
