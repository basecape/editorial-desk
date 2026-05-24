// Pushes articles to WordPress as drafts via the WP REST API.

import { requireUser, logActivity } from '../../../lib/auth';

export const runtime = 'edge';

function jsonError(status, message, detail = null) {
  return new Response(
    JSON.stringify({ error: { message, detail } }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}

async function findOrCreateTerm(base, auth, type, name) {
  // type = 'categories' or 'tags'
  try {
    const searchRes = await fetch(
      `${base}/wp-json/wp/v2/${type}?search=${encodeURIComponent(name)}&per_page=20`,
      { headers: { Authorization: `Basic ${auth}` } }
    );
    if (searchRes.ok) {
      const items = await searchRes.json();
      const match = items.find(i => i.name.toLowerCase() === name.toLowerCase());
      if (match) return match.id;
    }
    // Not found — try to create (tags usually allowed; categories may need auth)
    const createRes = await fetch(`${base}/wp-json/wp/v2/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
      body: JSON.stringify({ name }),
    });
    if (createRes.ok) {
      const created = await createRes.json();
      return created.id;
    }
  } catch {}
  return null;
}

export async function GET(req) {
  const { error: authErr } = await requireUser(req);
  if (authErr) return authErr;

  // Connection check
  const { WP_URL, WP_USER, WP_APP_PASSWORD } = process.env;
  if (!WP_URL || !WP_USER || !WP_APP_PASSWORD) {
    return new Response(
      JSON.stringify({ connected: false, reason: 'env_vars_missing' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
  const base = WP_URL.replace(/\/$/, '');
  const auth = btoa(`${WP_USER}:${WP_APP_PASSWORD}`);
  try {
    const res = await fetch(`${base}/wp-json/wp/v2/users/me`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) {
      const text = await res.text();
      return new Response(
        JSON.stringify({ connected: false, reason: 'auth_failed', status: res.status, detail: text.slice(0, 300) }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const user = await res.json();
    return new Response(
      JSON.stringify({ connected: true, user: user.name, url: base }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ connected: false, reason: 'fetch_failed', detail: e.message }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST(req) {
  const { user, error: authErr } = await requireUser(req, ['admin', 'editor']);
  if (authErr) return authErr;

  const { WP_URL, WP_USER, WP_APP_PASSWORD } = process.env;
  if (!WP_URL || !WP_USER || !WP_APP_PASSWORD) {
    return jsonError(500, 'WordPress credentials not set on the server. Add WP_URL, WP_USER, and WP_APP_PASSWORD as Vercel environment variables.');
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return jsonError(400, 'Invalid JSON body');
  }

  const { title, content, excerpt, categoryName, tags, meta, imageUrl, imageAlt, imageCredit } = payload;
  if (!title || !content) {
    return jsonError(400, 'title and content are required');
  }

  const base = WP_URL.replace(/\/$/, '');
  const auth = btoa(`${WP_USER}:${WP_APP_PASSWORD}`);

  // Resolve category
  const categoryIds = [];
  if (categoryName) {
    const id = await findOrCreateTerm(base, auth, 'categories', categoryName);
    if (id) categoryIds.push(id);
  }

  // Resolve tags
  const tagIds = [];
  if (Array.isArray(tags) && tags.length) {
    for (const tagName of tags.slice(0, 10)) {
      if (!tagName) continue;
      const id = await findOrCreateTerm(base, auth, 'tags', tagName);
      if (id) tagIds.push(id);
    }
  }

  // Upload featured image first (if provided)
  let featuredMediaId = null;
  let featuredMediaLink = null;
  if (imageUrl) {
    try {
      const imgRes = await fetch(imageUrl);
      if (imgRes.ok) {
        const blob = await imgRes.blob();
        const mime = blob.type || 'image/jpeg';
        const ext = (mime.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
        const slug = (title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)) || 'article';
        const uploadRes = await fetch(`${base}/wp-json/wp/v2/media`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': mime,
            'Content-Disposition': `attachment; filename="${slug}.${ext}"`,
          },
          body: await blob.arrayBuffer(),
        });
        if (uploadRes.ok) {
          const media = await uploadRes.json();
          featuredMediaId = media.id;
          featuredMediaLink = media.source_url;
          // Set alt text and caption with photographer credit
          await fetch(`${base}/wp-json/wp/v2/media/${media.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
            body: JSON.stringify({
              alt_text: imageAlt || title,
              caption: imageCredit || '',
            }),
          });
        }
      }
    } catch (e) {
      // Image failure shouldn't block the push
      console.error('Featured image upload failed:', e.message);
    }
  }

  // Create the post as draft
  const postBody = {
    title,
    content,
    excerpt: excerpt || '',
    status: 'draft',
    categories: categoryIds,
    tags: tagIds,
  };
  if (featuredMediaId) {
    postBody.featured_media = featuredMediaId;
  }

  // Yoast SEO meta description (if Yoast is active)
  if (meta) {
    postBody.meta = {
      _yoast_wpseo_metadesc: meta,
      _yoast_wpseo_title: title,
    };
  }

  try {
    const wpRes = await fetch(`${base}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
      body: JSON.stringify(postBody),
    });
    const data = await wpRes.json();
    if (!wpRes.ok) {
      return jsonError(wpRes.status, `WordPress rejected the post: ${data.message || 'unknown error'}`, data);
    }
    await logActivity(user.id, user.username, 'library.push_wp', { wpPostId: data.id, title });
    return new Response(
      JSON.stringify({
        id: data.id,
        link: data.link,
        editUrl: `${base}/wp-admin/post.php?post=${data.id}&action=edit`,
        status: data.status,
        categoryIds,
        tagIds,
        featuredMediaId,
        featuredMediaLink,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return jsonError(502, `Could not reach WordPress: ${e.message}`);
  }
}
