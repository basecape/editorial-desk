import { requireUser, publicUser } from '../../../../lib/auth';

export const runtime = 'edge';

export async function GET(req) {
  const { user, error } = await requireUser(req);
  if (error) return error;
  return new Response(
    JSON.stringify({ user: publicUser(user) }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
