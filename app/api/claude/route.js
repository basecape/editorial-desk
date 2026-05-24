// This route proxies requests to the Anthropic API.
// Your API key stays on the server, never exposed to the browser.

export const runtime = 'edge';
export const maxDuration = 300; // 5 minutes for long web-search calls

export async function POST(req) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: { message: 'ANTHROPIC_API_KEY environment variable not set on the server.' } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: { message: 'Invalid JSON in request body' } }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Forward to Anthropic
  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: { message: `Upstream error: ${e.message}` } }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
