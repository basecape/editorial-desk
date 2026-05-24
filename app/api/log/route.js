import { requireUser, logActivity } from '../../../lib/auth';

export const runtime = 'edge';

// Allow-list of actions the client may log
const ALLOWED = new Set([
  'topic.generate', 'topic.approve', 'topic.reject',
  'draft.write', 'draft.approve', 'draft.reject', 'draft.edit',
  'library.push_wp', 'library.delete', 'library.toggle_deployed',
  'sitemap.add_page', 'sitemap.bulk_add', 'sitemap.update_page', 'sitemap.delete_page',
  'training.sample', 'training.critique', 'training.learn', 'training.patch_applied',
  'settings.update', 'category_training.update'
]);

export async function POST(req) {
  const { user, error } = await requireUser(req);
  if (error) return error;
  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: { message: 'Invalid JSON' } }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  const { action, metadata } = body;
  if (!action || !ALLOWED.has(action)) {
    return new Response(JSON.stringify({ error: { message: 'Unknown action' } }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  await logActivity(user.id, user.username, action, metadata || {});
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
