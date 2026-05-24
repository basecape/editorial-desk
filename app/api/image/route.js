// Searches Pexels for stock images. Used by the WordPress push flow
// to auto-attach a featured image to each article.
//
// Required env var on Vercel:
//   PEXELS_API_KEY    free key from https://www.pexels.com/api/

import { requireUser } from '../../../lib/auth';

export const runtime = 'edge';

function jsonError(status, message) {
  return new Response(
    JSON.stringify({ error: { message } }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}

export async function POST(req) {
  const { error: authErr } = await requireUser(req);
  if (authErr) return authErr;

  const { PEXELS_API_KEY } = process.env;
  if (!PEXELS_API_KEY) {
    return jsonError(500, 'PEXELS_API_KEY not set. Add it as a Vercel environment variable to enable auto images.');
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, 'Invalid JSON');
  }

  const { query, orientation = 'landscape', count = 5 } = body;
  if (!query || !query.trim()) {
    return jsonError(400, 'query is required');
  }

  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query.trim())}&per_page=${count}&orientation=${orientation}`;
    const res = await fetch(url, { headers: { Authorization: PEXELS_API_KEY } });
    if (!res.ok) {
      const text = await res.text();
      return jsonError(res.status, `Pexels ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    const photos = (data.photos || []).map(p => ({
      id: p.id,
      url: p.src.large,
      large2x: p.src.large2x,
      thumb: p.src.medium,
      photographer: p.photographer,
      photographerUrl: p.photographer_url,
      alt: p.alt || query,
      width: p.width,
      height: p.height,
    }));
    return new Response(
      JSON.stringify({ photos, query }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return jsonError(502, `Pexels fetch failed: ${e.message}`);
  }
}
