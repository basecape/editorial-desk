import { kv } from '@vercel/kv';
import { requireUser } from '../../../lib/auth';

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
