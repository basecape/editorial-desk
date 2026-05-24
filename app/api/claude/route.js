// Proxies requests to Anthropic's API with streaming.
// Streaming keeps the connection alive past Vercel's 60s Hobby-tier limit,
// since each SSE event resets the idle timer.

export const runtime = 'edge';

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

  // Force streaming so the connection stays alive during long web-search calls
  body.stream = true;

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

    if (!upstream.ok) {
      const text = await upstream.text();
      return new Response(text, {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Pipe the SSE stream straight through to the browser
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: { message: `Upstream error: ${e.message}` } }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
