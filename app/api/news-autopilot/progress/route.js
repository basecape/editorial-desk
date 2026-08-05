import { kv } from '@vercel/kv';
import { requireUser } from '../../../../lib/auth';

export const runtime = 'edge';

export async function GET(req) {
  const { user, error } = await requireUser(req);
  if (error) return error;
  const progress = (await kv.get('newsAutopilotProgress')) || null;
  return new Response(JSON.stringify({ progress }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
