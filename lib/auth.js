// Auth utilities — runs in edge runtime, uses native Web Crypto (no bcrypt dep).

import { kv } from '@vercel/kv';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

// --- Password hashing (PBKDF2-SHA256) ---

export function generateSalt() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr));
}

export async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

export async function verifyPassword(password, salt, expectedHash) {
  const got = await hashPassword(password, salt);
  return got === expectedHash;
}

// --- Tokens & IDs ---

export function generateToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

export function uid(prefix = '') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// --- Session management ---

export async function createSession(userId) {
  const token = generateToken();
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  await kv.set(`session:${token}`, { userId, expiresAt }, { ex: SESSION_TTL_SECONDS });
  return { token, expiresAt };
}

export async function getSession(token) {
  if (!token) return null;
  const sess = await kv.get(`session:${token}`);
  if (!sess) return null;
  if (sess.expiresAt < Date.now()) {
    await kv.del(`session:${token}`);
    return null;
  }
  return sess;
}

export async function destroySession(token) {
  if (!token) return;
  await kv.del(`session:${token}`);
}

// --- Cookie helpers ---

const COOKIE_NAME = 'ed_session';

export function sessionCookie(token, maxAge = SESSION_TTL_SECONDS) {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${maxAge}`;
}

export function clearCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`;
}

export function readSessionToken(req) {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

// --- Auth guard helper ---

export async function requireUser(req, allowedRoles = null) {
  const token = readSessionToken(req);
  const session = await getSession(token);
  if (!session) {
    return { error: new Response(JSON.stringify({ error: { message: 'Not authenticated', code: 'unauth' } }), { status: 401, headers: { 'Content-Type': 'application/json' } }) };
  }
  const users = (await kv.get('users')) || [];
  const user = users.find(u => u.id === session.userId);
  if (!user) {
    return { error: new Response(JSON.stringify({ error: { message: 'User no longer exists', code: 'no_user' } }), { status: 401, headers: { 'Content-Type': 'application/json' } }) };
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return { error: new Response(JSON.stringify({ error: { message: `Requires role: ${allowedRoles.join(' or ')}`, code: 'forbidden' } }), { status: 403, headers: { 'Content-Type': 'application/json' } }) };
  }
  return { user };
}

// --- User helpers ---

export function publicUser(user) {
  if (!user) return null;
  const { passwordHash, passwordSalt, ...rest } = user;
  return rest;
}

// --- Activity log ---

const ACTIVITY_MAX = 2000; // keep last N events

export async function logActivity(userId, username, action, metadata = {}) {
  try {
    const event = {
      id: uid('a_'),
      userId,
      username,
      action,
      metadata,
      timestamp: Date.now()
    };
    const current = (await kv.get('activity')) || [];
    const next = [event, ...current].slice(0, ACTIVITY_MAX);
    await kv.set('activity', next);
    return event;
  } catch (e) {
    console.error('logActivity failed', e);
  }
}
