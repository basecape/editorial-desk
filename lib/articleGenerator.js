// Server-side article generation.
// Used by the queue worker (/api/queue/process) to write articles independently
// of any client — the browser can close, phone can lock, this keeps working.

const CLAUDE_MODEL = 'claude-sonnet-4-6';
const WEB_SEARCH_TOOL = { type: 'web_search_20260209', name: 'web_search' };

export function buildLinkingContext(sitePages = [], libraryItems = []) {
  const targets = [];
  sitePages.forEach(p => {
    if (p.url) targets.push({ title: p.title, url: p.url, keyword: p.keyword || '', cluster: p.cluster || '' });
  });
  libraryItems.forEach(l => {
    const url = l.wpLink || l.url;
    if (url) targets.push({ title: l.title, url, keyword: l.keyword || '', cluster: l.cluster || '' });
  });
  if (targets.length === 0) return '';

  const minLinks = Math.min(3, targets.length);
  const maxLinks = Math.min(5, targets.length);
  let out = '═══════════════════════════════════════════════\n';
  out += 'INTERNAL LINKS — REQUIRED. You MUST add inline contextual links to these pages within the article body.\n';
  out += '═══════════════════════════════════════════════\n\n';
  out += `Available pages on this site (${targets.length} total):\n\n`;
  targets.forEach(t => {
    out += `• "${t.title}" → ${t.url}${t.keyword ? `\n  (this page covers: ${t.keyword})` : ''}${t.cluster ? `\n  (cluster: ${t.cluster})` : ''}\n\n`;
  });
  out += `\nREQUIREMENTS:\n`;
  out += `1. Insert ${minLinks}–${maxLinks} inline links naturally within the article body.\n`;
  out += `2. Use markdown link syntax: [anchor phrase](url)\n`;
  out += `3. Anchor text must be a meaningful noun phrase that flows in the sentence — NEVER "click here", "read more", or the bare title.\n`;
  out += `4. Place each link where the surrounding sentence naturally mentions that topic.\n`;
  out += `5. Don't link to the same page twice.\n`;
  out += `6. Don't link to a page that contradicts what you're saying.\n\n`;
  out += `If a target page's topic is clearly covered in your article (mentioned by name or addressed at length), you MUST link to it.\n`;
  return out;
}

export function buildArticlePrompt(topic, instructions = '', style = '', linkingContext = '', categoryTraining = '', newsInstructions = '', mythbustInstructions = '') {
  const whyContext = topic.whyEvergreen || topic.whyNow || topic.theMyth || '';
  const myth = topic.theMyth ? `\n- The myth: ${topic.theMyth}` : '';
  const truth = topic.theTruth ? `\n- The evidence-backed truth: ${topic.theTruth}` : '';
  const catBlock = categoryTraining ? `\n\nCATEGORY-SPECIFIC TRAINING for "${topic.category}":\n${categoryTraining}` : '';
  const linkBlock = linkingContext ? `\n\n${linkingContext}` : '';

  // Type-specific instruction overrides
  let typeInstructionBlock = '';
  if (topic.type === 'news' && newsInstructions?.trim()) {
    typeInstructionBlock = `\n\nNEWS-SPECIFIC INSTRUCTIONS:\n${newsInstructions}`;
  } else if (topic.type === 'mythbusting' && mythbustInstructions?.trim()) {
    typeInstructionBlock = `\n\nMYTHBUST-SPECIFIC INSTRUCTIONS:\n${mythbustInstructions}`;
  }

  let lengthGuide = '1000–1400';
  let typeNote = '';
  if (topic.type === 'news') lengthGuide = '600–900';
  else if (topic.type === 'mythbusting') {
    lengthGuide = '700–1000';
    typeNote = `\n\nMYTHBUSTING STRUCTURE:\n1. Hook with the myth as a question or bold statement.\n2. Where the claim comes from.\n3. What the evidence actually says.\n4. The nuanced truth.\n5. What to do instead.\n6. Bottom-line bullets.`;
  }

  return `${instructions}${typeInstructionBlock}${catBlock}

House style reference:
${style}${linkBlock}

Now write a complete, publication-ready article.

Topic details:
- Title: ${topic.title}
- Angle: ${topic.angle || ''}
- Primary keyword: ${topic.keyword || ''}
- Category: ${topic.category || ''}
- Cluster: ${topic.cluster || 'Unclustered'}
- Context: ${whyContext}${myth}${truth}
- Type: ${topic.type}
- Target length: ${lengthGuide} words${typeNote}

Research the topic using web search before writing. Use SA sources where possible.

OUTPUT FORMAT — follow this exactly:

TITLE: <final headline, under 65 chars>
META: <meta description for SEO, 150–160 chars>
EXCERPT: <2–3 sentence article teaser>
TAGS: <comma-separated tags, 4–7 of them>
CATEGORY: <fitness | nutrition | mental_health | health_guides | beauty | fitness_training | diet_nutrition | preventive_health | women_s_health | men_s_health>
IMAGE_QUERY: <4–6 word stock-photo search query — describe a SCENE. Prefer "diverse" or "African" for SA audience.>

---

<the full article in markdown — # for H1 title, ## for H2 subheads, **bold**, *italic*, lists with - or 1., links as [text](url), > for callout boxes>

No preamble before TITLE. No commentary after the article.`;
}

export function parseArticleOutput(text) {
  const fenceMatch = text.match(/^([\s\S]+?)\n[-—]{3,}\n([\s\S]+)$/);
  let fields = {};
  let body = text;
  if (fenceMatch) {
    const [, header, rest] = fenceMatch;
    body = rest.trim();
    header.split('\n').forEach(line => {
      const m = line.match(/^(TITLE|META|EXCERPT|TAGS|CATEGORY|IMAGE_QUERY):\s*(.+)$/i);
      if (m) fields[m[1].toLowerCase().replace('image_query', 'imageQuery')] = m[2].trim();
    });
    if (fields.tags) fields.tags = fields.tags.split(',').map(s => s.trim()).filter(Boolean);
  }
  return { ...fields, content: body };
}

// Call Anthropic non-streaming for reliable server-side use.
// Returns the concatenated text of all content blocks.
export async function callAnthropic(prompt, { maxTokens = 6000, useWebSearch = true, timeoutMs = 120000 } = {}) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }

  const body = {
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  };
  if (useWebSearch) body.tools = [WEB_SEARCH_TOOL];

  // Abort if the request takes longer than timeoutMs
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new Error(`Anthropic API timeout after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => `HTTP ${res.status}`);
    let msg = txt;
    try { msg = JSON.parse(txt).error?.message || txt; } catch {}
    throw new Error(`Anthropic API ${res.status}: ${msg.slice(0, 400)}`);
  }

  const data = await res.json();
  const textBlocks = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n\n');
  if (!textBlocks.trim()) {
    throw new Error(`Anthropic returned no text content. Stop reason: ${data.stop_reason || 'unknown'}`);
  }
  return textBlocks;
}

// Full pipeline: given a topic and state, generate a draft object.
// Throws on failure. The caller decides what to do with errors.
export async function generateArticle(topic, { settings = {}, categoryTraining = {}, sitePages = [], libraryItems = [] }) {
  const linkingContext = buildLinkingContext(sitePages, libraryItems);
  const catTraining = categoryTraining[topic.category] || '';
  const prompt = buildArticlePrompt(
    topic,
    settings.instructions || '',
    settings.style || '',
    linkingContext,
    catTraining,
    settings.newsInstructions || '',
    settings.mythbustInstructions || ''
  );

  const text = await callAnthropic(prompt, { maxTokens: 6000, useWebSearch: true });
  if (!text || text.length < 200) {
    throw new Error(`Response too short (${text?.length || 0} chars). Rate limit or model refusal.`);
  }

  const parsed = parseArticleOutput(text);
  return {
    id: `d_${Math.random().toString(36).slice(2, 12)}_${Date.now().toString(36)}`,
    topicId: topic.id,
    type: topic.type,
    title: parsed.title || topic.title,
    meta: parsed.meta || '',
    excerpt: parsed.excerpt || '',
    tags: parsed.tags || [],
    category: parsed.category || topic.category || '',
    cluster: topic.cluster || '',
    imageQuery: parsed.imageQuery || '',
    content: parsed.content || text,
    status: 'pending',
    createdAt: Date.now(),
  };
}
