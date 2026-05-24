'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, Sprout, Newspaper, Library, Settings, BookOpen,
  Plus, Check, X, Edit3, Trash2, Copy, RefreshCw,
  Loader2, ChevronRight, ChevronDown, AlertCircle, Search,
  ArrowRight, Save, Download, MoreHorizontal, Sparkles,
  ExternalLink, FileCode, GraduationCap, Beaker, Wand2,
  MessageSquare, Lightbulb, RotateCcw, Network, Globe
} from 'lucide-react';

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_INSTRUCTIONS = `You are a senior health writer and editor for a South African health publication covering nutrition, wellness, men's health, and women's health. You write for a general SA audience — assume a smart reader, not a clinician.

VOICE: Direct, warm, evidence-based. SA English spelling (organise, colour, paediatric, oestrogen, foetal). Metric units. Rand for prices. Short paragraphs. Active voice.

LOCALISATION: Reference SA foods (pap, morogo, samp, biltong, amasi, rooibos), SA sources (Dept of Health, SAMRC, NICD, Heart and Stroke Foundation SA), SA context (load-shedding, medical aid, public vs private healthcare, TB/HIV/hypertension/diabetes burden).

STRUCTURE: Title under 65 chars. Meta description 150–160 chars. Hook (50–80 words). H2 subheads every 200–300 words. Bottom-line bullets. "See a doctor" box where relevant. Numbered sources list at the end.

GUARDRAILS: No individual medical advice. Direct to GP/pharmacist/dietitian for personal decisions. Include SADAG (0800 567 567) for mental health pieces. Avoid weight-shame framing. Reject fad diets and unproven supplements.

AVOID: delve, leverage, unlock, navigate (verb), embark, journey, holistic. Filler phrases. Em-dashes as a tic. Hedging without substance.`;

const DEFAULT_STYLE = `SA English spelling throughout.
H2 subheads in sentence case ("How much protein do you need?").
Numbers: spell out 1–9, numerals from 10+. Always numerals with units.
Money: R150, R1,500, R2 million.
Dates: 23 May 2026.
Bottom-line box: 3–5 bullets, verb-led, actionable.
"When to see a doctor" box for symptoms, pregnancy, meds, mental health, paediatric.
Sources: SA first, then international. Nothing over 5 years for nutrition/pharma. No aggregators, no influencer claims.`;

const DEFAULT_PROMPTS = [
  { id: 'p1', name: 'Reader question', template: 'A reader asked: "{question}". Search current evidence and SA guidelines, then write a 900–1100 word answer following our house structure.', vars: ['question'] },
  { id: 'p2', name: 'Myth-buster', template: 'Topic: "{myth}". Write a 700–900 word myth-buster: where the claim came from, what evidence actually says, the smart version of the advice, and what SA readers specifically should know.', vars: ['myth'] },
  { id: 'p3', name: 'Headline test', template: 'Generate 10 headline options for this article. Mix patterns. Under 65 chars each. Then pick top 3 with reasoning.\n\nArticle:\n{article}', vars: ['article'] },
  { id: 'p4', name: 'Localise', template: 'Rewrite this for SA readers — swap units, foods, stats, references. Flag anything that doesn\'t hold in SA context.\n\nDraft:\n{draft}', vars: ['draft'] },
];

// ============================================================================
// STORAGE
// ============================================================================

const storage = {
  async get(key, fallback) {
    if (typeof window === 'undefined') return fallback;
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  },
  async set(key, value) {
    if (typeof window === 'undefined') return false;
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { console.error('Storage set failed', e); return false; }
  }
};

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const timeAgo = (ts) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ts).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
};

// ============================================================================
// CLAUDE API
// ============================================================================

async function callClaude(prompt, useWebSearch = true, maxTokens = 4000) {
  const body = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }]
  };
  if (useWebSearch) {
    body.tools = [{ type: 'web_search_20250305', name: 'web_search' }];
  }
  let res;
  try {
    res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (e) {
    throw new Error(`Network error: ${e.message}. Check connection or refresh the artifact.`);
  }
  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    let parsed = errText;
    try { parsed = JSON.parse(errText).error?.message || errText; } catch {}
    throw new Error(`API ${res.status} ${res.statusText}: ${parsed.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
  if (!text.trim()) {
    throw new Error('Claude returned no text. Try again or disable web search.');
  }
  return text;
}

function extractJsonArray(text) {
  // Strip code fences
  let clean = text.replace(/```(?:json|javascript|js)?/gi, '').trim();
  const start = clean.indexOf('[');
  if (start === -1) {
    throw new Error(`No JSON array found. Claude returned: "${text.slice(0, 240)}…"`);
  }
  // Walk forward tracking string state to find the matching closing bracket
  let depth = 0, end = -1, inString = false, escape = false;
  for (let i = start; i < clean.length; i++) {
    const c = clean[i];
    if (escape) { escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (c === '"') inString = !inString;
    if (inString) continue;
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  if (end === -1) {
    // Truncated — try to salvage by closing the last complete object
    const lastObj = clean.lastIndexOf('}');
    if (lastObj > start) {
      try { return JSON.parse(clean.slice(start, lastObj + 1) + ']'); } catch {}
    }
    throw new Error(`JSON array looks truncated. First 240 chars: "${clean.slice(start, start + 240)}…"`);
  }
  try {
    return JSON.parse(clean.slice(start, end));
  } catch (e) {
    throw new Error(`JSON parse failed: ${e.message}. Snippet: "${clean.slice(start, start + 240)}…"`);
  }
}

function parseArticleOutput(text) {
  // Look for a header block with TITLE/META/EXCERPT/TAGS/CATEGORY, separated by ---
  const fenceMatch = text.match(/^([\s\S]+?)\n[-—]{3,}\n([\s\S]+)$/);
  let fields = {};
  let body = text;
  if (fenceMatch) {
    const [, header, rest] = fenceMatch;
    body = rest.trim();
    header.split('\n').forEach(line => {
      const m = line.match(/^(TITLE|META|EXCERPT|TAGS|CATEGORY):\s*(.+)$/i);
      if (m) fields[m[1].toLowerCase()] = m[2].trim();
    });
    if (fields.tags) fields.tags = fields.tags.split(',').map(s => s.trim()).filter(Boolean);
  }
  return { ...fields, content: body };
}

// ============================================================================
// MARKDOWN -> HTML (WordPress-ready)
// ============================================================================

function mdToHtml(md) {
  const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s) => {
    let out = escape(s);
    out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
    return out;
  };
  const lines = md.split('\n');
  const out = [];
  let listBuf = null, listType = null;
  const flushList = () => {
    if (!listBuf) return;
    out.push(`<${listType}>\n${listBuf.map(li => `  <li>${inline(li)}</li>`).join('\n')}\n</${listType}>`);
    listBuf = null; listType = null;
  };
  lines.forEach(line => {
    if (/^#{1,3}\s/.test(line)) {
      flushList();
      const level = line.match(/^(#+)/)[1].length;
      const t = line.replace(/^#+\s/, '');
      out.push(`<h${level}>${inline(t)}</h${level}>`);
    } else if (/^[-*]\s/.test(line)) {
      if (listType !== 'ul') { flushList(); listType = 'ul'; listBuf = []; }
      listBuf.push(line.replace(/^[-*]\s/, ''));
    } else if (/^\d+\.\s/.test(line)) {
      if (listType !== 'ol') { flushList(); listType = 'ol'; listBuf = []; }
      listBuf.push(line.replace(/^\d+\.\s/, ''));
    } else if (/^>\s/.test(line)) {
      flushList();
      out.push(`<blockquote><p>${inline(line.replace(/^>\s/, ''))}</p></blockquote>`);
    } else if (line.trim() === '') {
      flushList();
    } else {
      flushList();
      out.push(`<p>${inline(line)}</p>`);
    }
  });
  flushList();
  return out.join('\n');
}

// ============================================================================
// MAIN
// ============================================================================

export default function EditorialDesk() {
  const [view, setView] = useState('evergreen');
  const [topics, setTopics] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [libraryItems, setLibraryItems] = useState([]);
  const [prompts, setPrompts] = useState(DEFAULT_PROMPTS);
  const [settings, setSettings] = useState({ instructions: DEFAULT_INSTRUCTIONS, style: DEFAULT_STYLE });
  const [trainingEvents, setTrainingEvents] = useState([]);
  const [sitePages, setSitePages] = useState([]);
  const [seeds, setSeeds] = useState({ evergreen: '', news: '' });
  const [loaded, setLoaded] = useState(false);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);

  // Load fonts
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..700&family=Instrument+Sans:wght@400;500;600&display=swap';
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(link); } catch {} };
  }, []);

  // Load from storage with migration
  useEffect(() => {
    (async () => {
      const [t, d, l, p, s, te, sp] = await Promise.all([
        storage.get('topics', []),
        storage.get('drafts', []),
        storage.get('library', []),
        storage.get('prompts', DEFAULT_PROMPTS),
        storage.get('settings', { instructions: DEFAULT_INSTRUCTIONS, style: DEFAULT_STYLE }),
        storage.get('training', []),
        storage.get('sitePages', [])
      ]);
      // Migrate: any item without type becomes evergreen
      setTopics(t.map(x => ({ ...x, type: x.type || 'evergreen' })));
      setDrafts(d.map(x => ({ ...x, type: x.type || 'evergreen' })));
      setLibraryItems(l.map(x => ({ ...x, type: x.type || 'evergreen' })));
      setPrompts(p);
      setSettings(s);
      setTrainingEvents(te);
      setSitePages(sp);
      setLoaded(true);
    })();
  }, []);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  // ---- mutators with persistence ----
  const updateTopic = (id, patch) => {
    setTopics(prev => {
      const next = prev.map(t => t.id === id ? { ...t, ...patch } : t);
      storage.set('topics', next);
      return next;
    });
  };
  const addTopics = (newOnes) => {
    setTopics(prev => {
      const next = [...newOnes, ...prev];
      storage.set('topics', next);
      return next;
    });
  };
  const deleteTopic = (id) => {
    setTopics(prev => {
      const next = prev.filter(t => t.id !== id);
      storage.set('topics', next);
      return next;
    });
  };
  const addDraft = (draft) => {
    setDrafts(prev => {
      const next = [draft, ...prev];
      storage.set('drafts', next);
      return next;
    });
  };
  const updateDraft = (id, patch) => {
    setDrafts(prev => {
      const next = prev.map(d => d.id === id ? { ...d, ...patch } : d);
      storage.set('drafts', next);
      return next;
    });
  };
  const deleteDraft = (id) => {
    setDrafts(prev => {
      const next = prev.filter(d => d.id !== id);
      storage.set('drafts', next);
      return next;
    });
  };
  const publishDraft = (draft) => {
    const published = { ...draft, status: 'published', publishedAt: Date.now() };
    setLibraryItems(prev => {
      const next = [published, ...prev];
      storage.set('library', next);
      return next;
    });
    deleteDraft(draft.id);
    showToast('Published to library', 'success');
  };
  const deleteLibraryItem = (id) => {
    setLibraryItems(prev => {
      const next = prev.filter(i => i.id !== id);
      storage.set('library', next);
      return next;
    });
  };

  // ---- site page mutators ----
  const addSitePages = (newOnes) => {
    setSitePages(prev => {
      const next = [...newOnes, ...prev];
      storage.set('sitePages', next);
      return next;
    });
  };
  const updateSitePage = (id, patch) => {
    setSitePages(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...patch } : p);
      storage.set('sitePages', next);
      return next;
    });
  };
  const deleteSitePage = (id) => {
    setSitePages(prev => {
      const next = prev.filter(p => p.id !== id);
      storage.set('sitePages', next);
      return next;
    });
  };

  // ---- build sitemap context for topic generation ----
  const buildSitemapContext = () => {
    // Group everything by cluster
    const clusters = {};
    const addToCluster = (item, status) => {
      const c = item.cluster || 'Unclustered';
      if (!clusters[c]) clusters[c] = [];
      clusters[c].push({
        title: item.title,
        keyword: item.keyword || '',
        status
      });
    };
    sitePages.forEach(p => addToCluster(p, 'LIVE'));
    topics.filter(t => t.status === 'pending' || t.status === 'writing' || t.status === 'written')
      .forEach(t => addToCluster(t, 'PLANNED'));
    drafts.forEach(d => addToCluster(d, 'DRAFT'));
    libraryItems.forEach(l => addToCluster(l, 'READY'));

    if (Object.keys(clusters).length === 0) return '';

    let out = 'EXISTING SITE COVERAGE — do NOT duplicate or significantly overlap with the items below:\n\n';
    Object.entries(clusters).forEach(([cluster, items]) => {
      out += `Cluster "${cluster}" (${items.length} ${items.length === 1 ? 'page' : 'pages'}):\n`;
      items.forEach(it => {
        out += `- [${it.status}] ${it.title}${it.keyword ? ` (kw: ${it.keyword})` : ''}\n`;
      });
      out += '\n';
    });
    out += 'RULES:\n- Do NOT propose topics that duplicate or significantly overlap with the above\n- If exploring related territory, find a clearly different angle, keyword, or audience subset\n- Aim to fill clusters that are thin (1–2 pages) or create new clusters where there is no coverage\n- Tag each topic with a "cluster" field — either an existing cluster name above, or a new one';
    return out;
  };

  // ---- generate topics ----
  const generateTopics = async (type, seed, count) => {
    if (!seed.trim() && type === 'evergreen') {
      showToast('Enter a topic seed first', 'error');
      return;
    }
    setModal({ type: 'loading', message: `Generating ${count} ${type} topics${seed ? ` on "${seed}"` : ''}…` });
    const sitemapContext = buildSitemapContext();
    const prompt = buildTopicPrompt(type, seed, count, settings.instructions, sitemapContext);
    const useSearch = type === 'news';
    const maxT = type === 'news' ? 6000 : 8000;
    let text;
    try {
      text = await callClaude(prompt, useSearch, maxT);
    } catch (e1) {
      // Retry without web search if the search tool itself failed
      if (useSearch && /web_search|tool|400|invalid/i.test(e1.message)) {
        try {
          text = await callClaude(prompt, false, maxT);
        } catch (e2) {
          setModal({ type: 'error', message: e2.message });
          return;
        }
      } else {
        setModal({ type: 'error', message: e1.message });
        return;
      }
    }
    try {
      const items = extractJsonArray(text);
      const newTopics = items.map(it => ({
        ...it,
        id: uid(),
        type,
        seed,
        status: 'pending',
        createdAt: Date.now()
      }));
      addTopics(newTopics);
      setModal(null);
      showToast(`${newTopics.length} topics ready`, 'success');
    } catch (e) {
      setModal({ type: 'error', message: e.message });
    }
  };

  // ---- write article from topic (background) ----
  const writeArticle = async (topic) => {
    updateTopic(topic.id, { status: 'writing' });
    try {
      const prompt = buildArticlePrompt(topic, settings.instructions, settings.style);
      const text = await callClaude(prompt, true, 6000);
      const parsed = parseArticleOutput(text);
      const draft = {
        id: uid(),
        topicId: topic.id,
        type: topic.type,
        title: parsed.title || topic.title,
        meta: parsed.meta || '',
        excerpt: parsed.excerpt || '',
        tags: parsed.tags || [],
        category: parsed.category || topic.category || '',
        content: parsed.content || text,
        status: 'pending',
        createdAt: Date.now()
      };
      addDraft(draft);
      updateTopic(topic.id, { status: 'written', draftId: draft.id });
    } catch (e) {
      updateTopic(topic.id, { status: 'pending', error: e.message });
      showToast(`Write failed: ${e.message.slice(0, 80)}`, 'error');
    }
  };

  // ---- run a saved prompt ----
  const runPrompt = async (filledPrompt) => {
    setModal({ type: 'loading', message: 'Running prompt…' });
    try {
      const fullPrompt = `${settings.instructions}\n\nHouse style:\n${settings.style}\n\n${filledPrompt}`;
      const text = await callClaude(fullPrompt, true, 5000);
      setModal({ type: 'output', content: text });
    } catch (e) {
      setModal({ type: 'error', message: e.message });
    }
  };

  // ============ TRAINING ============
  const addTrainingEvent = (event) => {
    const full = { id: uid(), createdAt: Date.now(), ...event };
    setTrainingEvents(prev => {
      const next = [full, ...prev];
      storage.set('training', next);
      return next;
    });
    return full;
  };
  const updateTrainingEvent = (id, patch) => {
    setTrainingEvents(prev => {
      const next = prev.map(e => e.id === id ? { ...e, ...patch } : e);
      storage.set('training', next);
      return next;
    });
  };
  const deleteTrainingEvent = (id) => {
    setTrainingEvents(prev => {
      // also delete children
      const next = prev.filter(e => e.id !== id && e.parentId !== id);
      storage.set('training', next);
      return next;
    });
  };

  // Run a sample article using current instructions
  const runSample = async ({ topic, type }) => {
    setModal({ type: 'loading', message: `Generating sample on "${topic}"…` });
    try {
      const fakeTopic = {
        title: topic, angle: 'general overview',
        keyword: topic, category: 'wellness', type,
        whyEvergreen: type === 'evergreen' ? 'training sample' : null,
        whyNow: type === 'news' ? 'training sample' : null,
      };
      const prompt = `${settings.instructions}\n\nHouse style reference:\n${settings.style}\n\nWrite a SHORT 400–500 word sample article on "${topic}" using the voice and structure above. Skip the meta/title block — return only the markdown article body. Keep it tight so the editor can quickly assess voice and structure.`;
      const text = await callClaude(prompt, type === 'news', 2500);
      const event = addTrainingEvent({
        kind: 'sample',
        data: { topic, type, content: text }
      });
      setModal(null);
      showToast('Sample ready — give it feedback', 'success');
    } catch (e) {
      setModal({ type: 'error', message: e.message });
    }
  };

  // Submit feedback on a sample/critique → Claude suggests patches
  const submitFeedback = async (parentId, feedbackText, articleContent) => {
    setModal({ type: 'loading', message: 'Analysing feedback…' });
    try {
      const prompt = `You are reviewing a sample article written by an AI agent using these editorial instructions:

INSTRUCTIONS:
"""
${settings.instructions}
"""

STYLE GUIDE:
"""
${settings.style}
"""

The agent produced this article:
"""
${articleContent}
"""

The editor's feedback:
"""
${feedbackText}
"""

Propose 1–3 specific patches to the instructions or style guide that would prevent this issue in future generations. Each patch should be a self-contained, copy-pasteable rule.

Return ONLY a JSON array (no preamble, no fences):
[
  {
    "diagnosis": "what went wrong, 1-2 sentences",
    "target": "instructions" | "style",
    "text": "the exact text to add as a new paragraph or bullet",
    "rationale": "why this patch will help"
  }
]`;
      const text = await callClaude(prompt, false, 2000);
      const patches = extractJsonArray(text);
      addTrainingEvent({
        kind: 'feedback',
        parentId,
        data: { text: feedbackText, patches: patches.map(p => ({ ...p, id: uid(), status: 'pending' })) }
      });
      setModal(null);
      showToast(`${patches.length} suggestion${patches.length === 1 ? '' : 's'} ready`, 'success');
    } catch (e) {
      setModal({ type: 'error', message: e.message });
    }
  };

  // Critique a piece (article passed in, not from a sample run)
  const critiquePiece = async ({ source, articleContent, feedbackText }) => {
    setModal({ type: 'loading', message: 'Analysing piece…' });
    try {
      const event = addTrainingEvent({
        kind: 'critique',
        data: { source, content: articleContent }
      });
      // Then immediately add feedback as child
      await submitFeedback(event.id, feedbackText, articleContent);
    } catch (e) {
      setModal({ type: 'error', message: e.message });
    }
  };

  // Learn patterns from an approved article
  const learnFromApproved = async (item) => {
    setModal({ type: 'loading', message: `Extracting patterns from "${item.title}"…` });
    try {
      const prompt = `This article was approved by the editor as a successful example of our voice and style:

"""
${item.content}
"""

Current instructions in use:
"""
${settings.instructions}
"""

Current style guide:
"""
${settings.style}
"""

Identify 2–4 patterns this article uses well that AREN'T already captured in the instructions or style guide. Patterns worth codifying so future articles inherit them.

Return ONLY a JSON array (no preamble, no fences):
[
  {
    "diagnosis": "the pattern observed",
    "target": "instructions" | "style",
    "text": "the rule to add as a new paragraph or bullet",
    "rationale": "why codifying this matters"
  }
]`;
      const text = await callClaude(prompt, false, 2000);
      const patches = extractJsonArray(text);
      addTrainingEvent({
        kind: 'learn',
        data: {
          itemId: item.id, title: item.title,
          patches: patches.map(p => ({ ...p, id: uid(), status: 'pending' }))
        }
      });
      setModal(null);
      showToast(`${patches.length} pattern${patches.length === 1 ? '' : 's'} extracted`, 'success');
    } catch (e) {
      setModal({ type: 'error', message: e.message });
    }
  };

  // Apply a patch to instructions or style
  const applyPatch = (parentEventId, patchId, editedText) => {
    const parent = trainingEvents.find(e => e.id === parentEventId);
    if (!parent) return;
    const patch = (parent.data.patches || []).find(p => p.id === patchId);
    if (!patch) return;
    const finalText = editedText || patch.text;
    const target = patch.target === 'style' ? 'style' : 'instructions';
    const stamp = new Date().toISOString().slice(0, 10);
    const newSetting = `${settings[target].trimEnd()}\n\n[Trained ${stamp}] ${finalText}`;
    const updated = { ...settings, [target]: newSetting };
    setSettings(updated);
    storage.set('settings', updated);
    // Mark patch applied
    const updatedPatches = parent.data.patches.map(p =>
      p.id === patchId ? { ...p, status: 'applied', appliedText: finalText, appliedAt: Date.now() } : p
    );
    updateTrainingEvent(parentEventId, { data: { ...parent.data, patches: updatedPatches } });
    showToast(`Added to ${target}`, 'success');
  };

  const dismissPatch = (parentEventId, patchId) => {
    const parent = trainingEvents.find(e => e.id === parentEventId);
    if (!parent) return;
    const updatedPatches = parent.data.patches.map(p =>
      p.id === patchId ? { ...p, status: 'dismissed' } : p
    );
    updateTrainingEvent(parentEventId, { data: { ...parent.data, patches: updatedPatches } });
  };

  if (!loaded) {
    return (
      <div style={styles.loading}>
        <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#2D5F4E' }} />
      </div>
    );
  }

  // Counts for nav badges
  const counts = {
    sitemap: sitePages.length,
    evergreen: topics.filter(t => t.type === 'evergreen' && t.status === 'pending').length
              + drafts.filter(d => d.type === 'evergreen' && d.status === 'pending').length,
    news: topics.filter(t => t.type === 'news' && t.status === 'pending').length
        + drafts.filter(d => d.type === 'news' && d.status === 'pending').length,
    library: libraryItems.length,
  };

  return (
    <div style={styles.app}>
      <style>{globalCss}</style>

      <Header view={view} setView={setView} counts={counts} />

      <main style={styles.main}>
        {view === 'sitemap' && (
          <SitemapView
            sitePages={sitePages}
            topics={topics}
            drafts={drafts}
            libraryItems={libraryItems}
            onAdd={() => setModal({ type: 'addSitePage' })}
            onBulkAdd={() => setModal({ type: 'bulkSitePages' })}
            onEdit={(page) => setModal({ type: 'editSitePage', page })}
            onDelete={deleteSitePage}
            onUpdateCluster={(item, kind, cluster) => {
              if (kind === 'topic') updateTopic(item.id, { cluster });
              else if (kind === 'draft') updateDraft(item.id, { cluster });
              else if (kind === 'library') {
                setLibraryItems(prev => {
                  const next = prev.map(l => l.id === item.id ? { ...l, cluster } : l);
                  storage.set('library', next);
                  return next;
                });
              }
            }}
          />
        )}

        {(view === 'evergreen' || view === 'news') && (
          <PipelineView
            type={view}
            seed={seeds[view]}
            onSeedChange={(v) => setSeeds(s => ({ ...s, [view]: v }))}
            topics={topics.filter(t => t.type === view)}
            drafts={drafts.filter(d => d.type === view)}
            onGenerate={(count) => generateTopics(view, seeds[view], count)}
            onApproveWrite={writeArticle}
            onRejectTopic={(id) => updateTopic(id, { status: 'rejected' })}
            onReinstateTopic={(id) => updateTopic(id, { status: 'pending' })}
            onDeleteTopic={deleteTopic}
            onOpenDraft={(d) => setModal({ type: 'draft', draft: d })}
            onPublishDraft={publishDraft}
            onRejectDraft={(id) => updateDraft(id, { status: 'rejected' })}
            onDeleteDraft={deleteDraft}
          />
        )}

        {view === 'library' && (
          <LibraryView
            items={libraryItems}
            onView={(d) => setModal({ type: 'draft', draft: d, fromLibrary: true })}
            onExport={(d) => setModal({ type: 'export', item: d })}
            onDelete={deleteLibraryItem}
            showToast={showToast}
          />
        )}

        {view === 'train' && (
          <TrainView
            events={trainingEvents}
            settings={settings}
            drafts={drafts}
            libraryItems={libraryItems}
            onRunSample={() => setModal({ type: 'sampleForm' })}
            onCritique={() => setModal({ type: 'critiqueForm' })}
            onLearn={() => setModal({ type: 'learnForm' })}
            onSubmitFeedback={(parentId, text, content) => submitFeedback(parentId, text, content)}
            onApplyPatch={applyPatch}
            onDismissPatch={dismissPatch}
            onDelete={deleteTrainingEvent}
            onViewPrompt={() => setModal({ type: 'viewPrompt' })}
          />
        )}

        {view === 'prompts' && (
          <PromptsView
            prompts={prompts}
            onRun={(p) => setModal({ type: 'fillPrompt', prompt: p })}
            onSave={async (next) => { setPrompts(next); await storage.set('prompts', next); showToast('Saved'); }}
          />
        )}

        {view === 'settings' && (
          <SettingsView
            settings={settings}
            onSave={async (next) => { setSettings(next); await storage.set('settings', next); showToast('Settings saved', 'success'); }}
          />
        )}
      </main>

      {modal && (
        <Modal onClose={() => setModal(null)}>
          {modal.type === 'loading' && <LoadingPanel message={modal.message} />}
          {modal.type === 'error' && <ErrorPanel message={modal.message} onClose={() => setModal(null)} />}
          {modal.type === 'draft' && (
            <DraftView
              draft={modal.draft}
              fromLibrary={modal.fromLibrary}
              onSave={(patch) => updateDraft(modal.draft.id, patch)}
              onPublish={() => { publishDraft(modal.draft); setModal(null); }}
              onExport={() => setModal({ type: 'export', item: modal.draft })}
              onClose={() => setModal(null)}
              showToast={showToast}
            />
          )}
          {modal.type === 'export' && (
            <WordPressExport
              item={modal.item}
              onClose={() => setModal(null)}
              showToast={showToast}
            />
          )}
          {modal.type === 'fillPrompt' && (
            <FillPromptForm prompt={modal.prompt} onSubmit={runPrompt} onClose={() => setModal(null)} />
          )}
          {modal.type === 'output' && (
            <OutputPanel content={modal.content} onClose={() => setModal(null)} showToast={showToast} />
          )}
          {modal.type === 'sampleForm' && (
            <SampleForm onSubmit={(opts) => { setModal(null); runSample(opts); }} onClose={() => setModal(null)} />
          )}
          {modal.type === 'critiqueForm' && (
            <CritiqueForm
              drafts={drafts}
              libraryItems={libraryItems}
              onSubmit={(opts) => { setModal(null); critiquePiece(opts); }}
              onClose={() => setModal(null)}
            />
          )}
          {modal.type === 'learnForm' && (
            <LearnForm
              libraryItems={libraryItems}
              onSubmit={(item) => { setModal(null); learnFromApproved(item); }}
              onClose={() => setModal(null)}
            />
          )}
          {modal.type === 'viewPrompt' && (
            <ViewPromptPanel settings={settings} onClose={() => setModal(null)} showToast={showToast} />
          )}
          {modal.type === 'addSitePage' && (
            <SitePageForm
              existingClusters={[...new Set([
                ...sitePages.map(p => p.cluster),
                ...topics.map(t => t.cluster),
                ...drafts.map(d => d.cluster),
                ...libraryItems.map(l => l.cluster),
              ].filter(Boolean))]}
              onSubmit={(page) => {
                addSitePages([{ ...page, id: uid(), addedAt: Date.now() }]);
                setModal(null);
                showToast('Page added to sitemap', 'success');
              }}
              onClose={() => setModal(null)}
            />
          )}
          {modal.type === 'editSitePage' && (
            <SitePageForm
              page={modal.page}
              existingClusters={[...new Set([
                ...sitePages.map(p => p.cluster),
                ...topics.map(t => t.cluster),
                ...drafts.map(d => d.cluster),
                ...libraryItems.map(l => l.cluster),
              ].filter(Boolean))]}
              onSubmit={(page) => {
                updateSitePage(modal.page.id, page);
                setModal(null);
                showToast('Updated', 'success');
              }}
              onClose={() => setModal(null)}
            />
          )}
          {modal.type === 'bulkSitePages' && (
            <BulkSitePagesForm
              onSubmit={(pages) => {
                const stamped = pages.map(p => ({ ...p, id: uid(), addedAt: Date.now() }));
                addSitePages(stamped);
                setModal(null);
                showToast(`${stamped.length} pages added`, 'success');
              }}
              onClose={() => setModal(null)}
            />
          )}
        </Modal>
      )}

      {toast && <Toast {...toast} />}
    </div>
  );
}

// ============================================================================
// PROMPT BUILDERS
// ============================================================================

function buildTopicPrompt(type, seed, count, instructions, sitemapContext = '') {
  const siteBlock = sitemapContext ? `\n\n${sitemapContext}\n` : '';
  if (type === 'evergreen') {
    return `${instructions}${siteBlock}

Now generate ${count} EVERGREEN article topics based on this seed: "${seed}".

Evergreen means timeless — pieces that will be just as useful in 12 months as they are today. Reference content, explainers, how-tos, myth-busters. NOT tied to current news.

Mix angles widely:
- How-to and practical guides
- "What is X" and "X explained"
- Symptom guides and condition explainers
- Nutrition deep-dives (foods, nutrients, eating patterns)
- Myth-busters
- Comparisons (X vs Y)
- Life-stage variations (in your 20s, 30s, 40s, 50s, menopause, etc.)
- SA-specific contexts (medical aid, public clinics, local foods, climate)
- Common reader questions

Vary across categories: nutrition, wellness, men's health, women's health.

Return ONLY a JSON array (no markdown fences, no preamble). Each item:
{
  "title": "working title under 65 chars",
  "angle": "one sentence on the take",
  "keyword": "primary SEO keyword (must NOT match any existing keyword above)",
  "cluster": "topical cluster — existing one from the sitemap, or a new cluster name",
  "whyEvergreen": "why this stays relevant year-round",
  "category": "nutrition" | "wellness" | "mens" | "womens",
  "effort": "quick" | "standard" | "deep"
}`;
  }
  // news
  return `${instructions}${siteBlock}

Now generate ${count} NEWS article topics${seed ? ` related to: "${seed}"` : ' on current SA health stories'}.

Search current South African health news, recent peer-reviewed studies (last 60 days), Department of Health announcements, NICD updates, SAMRC research releases, and trending health conversations on SA social media.

Each topic must be tied to a SPECIFIC recent event, study, policy change, season, or trend. No evergreen pieces.

Vary across categories: nutrition, wellness, men's health, women's health.

Return ONLY a JSON array (no markdown fences, no preamble). Each item:
{
  "title": "working title under 65 chars",
  "angle": "one sentence on the take",
  "keyword": "primary SEO keyword (must NOT match any existing keyword above)",
  "cluster": "topical cluster — existing one from the sitemap, or a new cluster name",
  "whyNow": "the specific news hook, study, or trigger with date",
  "source": "the publication or body the hook came from",
  "category": "nutrition" | "wellness" | "mens" | "womens",
  "effort": "quick" | "standard" | "deep"
}`;
}

function buildArticlePrompt(topic, instructions, style) {
  const whyContext = topic.whyEvergreen || topic.whyNow || '';
  return `${instructions}

House style reference:
${style}

Now write a complete, publication-ready article.

Topic details:
- Title: ${topic.title}
- Angle: ${topic.angle}
- Primary keyword: ${topic.keyword}
- Category: ${topic.category}
- Context: ${whyContext}
- Type: ${topic.type}
- Target length: ${topic.type === 'news' ? '600–900' : '1000–1400'} words

Research the topic using web search before writing. Use SA sources where possible.

OUTPUT FORMAT — follow this exactly:

TITLE: <final headline, under 65 chars>
META: <meta description for SEO, 150–160 chars>
EXCERPT: <2–3 sentence article teaser>
TAGS: <comma-separated tags, 4–7 of them>
CATEGORY: <nutrition | wellness | mens | womens>

---

<the full article in markdown — # for the H1 title, ## for H2 subheads, ### for H3 if needed, **bold**, *italic*, lists with - or 1., links as [text](url), > for the "see a doctor" callout box>

Include all required sections per our house structure: hook, body with H2 subheads every 200–300 words, bottom-line bullets, "when to see a doctor" callout if relevant, numbered sources list at the end.

No preamble before TITLE. No commentary after the article.`;
}

// ============================================================================
// HEADER
// ============================================================================

function Header({ view, setView, counts }) {
  const tabs = [
    { id: 'sitemap', label: 'Sitemap', icon: Network, badge: counts.sitemap },
    { id: 'evergreen', label: 'Evergreen', icon: Sprout, badge: counts.evergreen },
    { id: 'news', label: 'News', icon: Newspaper, badge: counts.news },
    { id: 'library', label: 'Library', icon: Library, badge: counts.library },
    { id: 'train', label: 'Train', icon: GraduationCap },
    { id: 'prompts', label: 'Prompts', icon: BookOpen },
    { id: 'settings', label: 'Style', icon: Settings },
  ];
  return (
    <header style={styles.header}>
      <div style={styles.brand}>
        <div style={styles.brandMark}>◐</div>
        <div>
          <div style={styles.brandTitle}>The Editorial Desk</div>
          <div style={styles.brandSub}>South African health · workflow</div>
        </div>
      </div>
      <nav style={styles.nav}>
        {tabs.map(t => {
          const Icon = t.icon;
          const active = view === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              style={{ ...styles.navBtn, ...(active ? styles.navBtnActive : {}) }}
            >
              <Icon size={15} strokeWidth={1.8} />
              <span>{t.label}</span>
              {t.badge > 0 && <span style={styles.badge}>{t.badge}</span>}
            </button>
          );
        })}
      </nav>
    </header>
  );
}

// ============================================================================
// PIPELINE VIEW (used for both Evergreen and News)
// ============================================================================

function PipelineView({
  type, seed, onSeedChange, topics, drafts,
  onGenerate, onApproveWrite, onRejectTopic, onReinstateTopic, onDeleteTopic,
  onOpenDraft, onPublishDraft, onRejectDraft, onDeleteDraft
}) {
  const [count, setCount] = useState(50);
  const [tab, setTab] = useState('topics');
  const [filter, setFilter] = useState('pending');

  const isEvergreen = type === 'evergreen';
  const meta = {
    eyebrow: isEvergreen ? '01 · Evergreen pipeline' : '02 · News pipeline',
    title: isEvergreen ? 'Evergreen' : 'News',
    sub: isEvergreen
      ? 'Timeless reference pieces. Input a topic, generate ideas, approve to write, ship to library.'
      : 'Time-sensitive pieces tied to current SA health news, studies, and trends.',
    placeholder: isEvergreen
      ? 'e.g. iron deficiency, menopause, sleep, intermittent fasting…'
      : 'e.g. diabetes, NHI, load shedding mental health (leave blank for general SA health news)',
    icon: isEvergreen ? Sprout : Newspaper,
  };

  const filteredTopics = topics.filter(t => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  const draftFilters = [
    { id: 'pending', label: 'For review', count: drafts.filter(d => d.status === 'pending').length },
    { id: 'rejected', label: 'Rejected', count: drafts.filter(d => d.status === 'rejected').length },
  ];

  const topicCounts = {
    pending: topics.filter(t => t.status === 'pending').length,
    writing: topics.filter(t => t.status === 'writing').length,
    written: topics.filter(t => t.status === 'written').length,
    rejected: topics.filter(t => t.status === 'rejected').length,
  };

  return (
    <>
      <div style={styles.pageHead}>
        <div>
          <div style={styles.eyebrow}>{meta.eyebrow}</div>
          <h1 style={styles.pageTitle}>{meta.title}</h1>
          <p style={styles.pageSub}>{meta.sub}</p>
        </div>
      </div>

      {/* TOPIC INPUT BAR */}
      <div style={styles.topicBar}>
        <div style={styles.topicBarRow}>
          <div style={styles.topicInputWrap}>
            <label style={styles.topicInputLabel}>Topic seed</label>
            <input
              value={seed}
              onChange={e => onSeedChange(e.target.value)}
              placeholder={meta.placeholder}
              style={styles.topicInput}
              onKeyDown={e => { if (e.key === 'Enter') onGenerate(count); }}
            />
          </div>
          <div style={styles.countWrap}>
            <label style={styles.topicInputLabel}>Topics <span style={styles.countBadgeInline}>{count}</span></label>
            <input
              type="range"
              min={5}
              max={50}
              step={5}
              value={count}
              onChange={e => setCount(+e.target.value)}
              style={styles.slider}
            />
          </div>
          <button style={{ ...styles.primaryBtn, alignSelf: 'flex-end' }} onClick={() => onGenerate(count)}>
            <Sparkles size={15} /> Generate
          </button>
        </div>
      </div>

      {/* SUB-TABS */}
      <div style={styles.subTabRow}>
        <button
          onClick={() => setTab('topics')}
          style={{ ...styles.subTab, ...(tab === 'topics' ? styles.subTabActive : {}) }}
        >
          Topics
          {topicCounts.pending > 0 && <span style={styles.subTabBadge}>{topicCounts.pending}</span>}
        </button>
        <button
          onClick={() => setTab('drafts')}
          style={{ ...styles.subTab, ...(tab === 'drafts' ? styles.subTabActive : {}) }}
        >
          Drafts for review
          {drafts.filter(d => d.status === 'pending').length > 0 && (
            <span style={styles.subTabBadge}>{drafts.filter(d => d.status === 'pending').length}</span>
          )}
        </button>
      </div>

      {/* TOPICS TAB */}
      {tab === 'topics' && (
        <>
          <div style={styles.filterRow}>
            {[
              { id: 'pending', label: 'To approve', count: topicCounts.pending },
              { id: 'writing', label: 'Writing', count: topicCounts.writing },
              { id: 'written', label: 'Written', count: topicCounts.written },
              { id: 'rejected', label: 'Rejected', count: topicCounts.rejected },
              { id: 'all', label: 'All', count: topics.length },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                style={{ ...styles.filterBtn, ...(filter === f.id ? styles.filterBtnActive : {}) }}
              >
                {f.label} <span style={styles.filterCount}>{f.count}</span>
              </button>
            ))}
          </div>

          {filteredTopics.length === 0 ? (
            <EmptyState
              icon={meta.icon}
              title={topics.length === 0 ? `No ${type} topics yet` : `Nothing in "${filter}"`}
              hint={topics.length === 0
                ? `Enter a seed above and tap Generate to pitch ${type} ideas.`
                : 'Switch filters or generate more topics.'}
            />
          ) : (
            <div style={styles.topicListDense}>
              {filteredTopics.map(t => (
                <TopicRow
                  key={t.id}
                  topic={t}
                  onApproveWrite={() => onApproveWrite(t)}
                  onReject={() => onRejectTopic(t.id)}
                  onReinstate={() => onReinstateTopic(t.id)}
                  onDelete={() => onDeleteTopic(t.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* DRAFTS TAB */}
      {tab === 'drafts' && (
        <>
          <div style={styles.filterRow}>
            {draftFilters.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                style={{ ...styles.filterBtn, ...(filter === f.id ? styles.filterBtnActive : {}) }}
              >
                {f.label} <span style={styles.filterCount}>{f.count}</span>
              </button>
            ))}
          </div>

          {drafts.filter(d => filter === 'all' || d.status === filter).length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No drafts to review"
              hint="Approve a topic to send it to the writer. Drafts land here when ready."
            />
          ) : (
            <div style={styles.draftList}>
              {drafts.filter(d => filter === 'all' || d.status === filter).map(d => (
                <DraftRow
                  key={d.id}
                  draft={d}
                  onView={() => onOpenDraft(d)}
                  onPublish={() => onPublishDraft(d)}
                  onReject={() => onRejectDraft(d.id)}
                  onDelete={() => onDeleteDraft(d.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

// ============================================================================
// TOPIC ROW (compact, expandable)
// ============================================================================

function TopicRow({ topic, onApproveWrite, onReject, onReinstate, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  const statusColor = {
    pending: '#C77D4A',
    writing: '#3A5266',
    written: '#2D5F4E',
    rejected: '#9A9486'
  }[topic.status];

  const categoryLabel = {
    nutrition: 'Nutrition', wellness: 'Wellness',
    mens: "Men's", womens: "Women's"
  }[topic.category] || topic.category;

  const isWriting = topic.status === 'writing';

  return (
    <article style={{ ...styles.topicRow, ...(expanded ? styles.topicRowExpanded : {}) }}>
      <div style={styles.topicRowMain}>
        <button style={styles.expandBtn} onClick={() => setExpanded(!expanded)}>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <span style={{ ...styles.statusDot, background: statusColor }} />
        <div style={styles.topicRowText}>
          <div style={styles.topicRowTitle}>{topic.title}</div>
          <div style={styles.topicRowMeta}>
            <span style={styles.cardCategory}>{categoryLabel}</span>
            <span style={styles.cardDot}>·</span>
            <span style={styles.cardEffort}>{topic.effort}</span>
            <span style={styles.cardDot}>·</span>
            <span style={styles.kwTag}>{topic.keyword}</span>
          </div>
        </div>
        <div style={styles.topicRowActions}>
          {topic.status === 'pending' && (
            <>
              <button style={styles.iconActionBtn} onClick={onReject} title="Reject">
                <X size={14} />
              </button>
              <button style={{ ...styles.iconActionBtn, ...styles.iconActionPrimary }} onClick={onApproveWrite} title="Approve & write">
                <Check size={14} />
              </button>
            </>
          )}
          {isWriting && (
            <div style={styles.writingChip}>
              <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
              writing
            </div>
          )}
          {topic.status === 'written' && (
            <span style={styles.doneChip}>
              <Check size={11} /> drafted
            </span>
          )}
          {topic.status === 'rejected' && (
            <button style={styles.iconActionBtn} onClick={onReinstate} title="Reinstate">
              <RefreshCw size={13} />
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div style={styles.topicExpand}>
          <div style={styles.expandRow}>
            <span style={styles.expandLabel}>Angle</span>
            <span style={styles.expandValue}>{topic.angle}</span>
          </div>
          {topic.whyEvergreen && (
            <div style={styles.expandRow}>
              <span style={styles.expandLabel}>Why evergreen</span>
              <span style={styles.expandValue}>{topic.whyEvergreen}</span>
            </div>
          )}
          {topic.whyNow && (
            <div style={styles.expandRow}>
              <span style={styles.expandLabel}>Why now</span>
              <span style={styles.expandValue}>{topic.whyNow}</span>
            </div>
          )}
          {topic.source && (
            <div style={styles.expandRow}>
              <span style={styles.expandLabel}>Source</span>
              <span style={styles.expandValue}>{topic.source}</span>
            </div>
          )}
          {topic.error && (
            <div style={styles.expandRow}>
              <span style={styles.expandLabel}>Error</span>
              <span style={{ ...styles.expandValue, color: '#A14438' }}>{topic.error}</span>
            </div>
          )}
          <div style={styles.expandActions}>
            <button style={styles.linkBtn} onClick={onDelete}>
              <Trash2 size={12} /> Delete topic
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

// ============================================================================
// DRAFT ROW
// ============================================================================

function DraftRow({ draft, onView, onPublish, onReject, onDelete }) {
  const wordCount = draft.content.split(/\s+/).filter(Boolean).length;
  const preview = draft.content.replace(/[#*_`>]/g, '').slice(0, 180);
  return (
    <article style={styles.draftRow} onClick={onView}>
      <div style={styles.draftLeft}>
        <div style={styles.draftMeta}>
          <span style={styles.cardCategory}>{draft.category}</span>
          <span style={styles.cardDot}>·</span>
          <span>{timeAgo(draft.createdAt)}</span>
          <span style={styles.cardDot}>·</span>
          <span>{wordCount} words</span>
        </div>
        <h3 style={styles.draftTitle}>{draft.title}</h3>
        <p style={styles.draftPreview}>{preview}…</p>
      </div>
      <div style={styles.draftActions} onClick={e => e.stopPropagation()}>
        {draft.status === 'pending' && (
          <>
            <button style={styles.iconActionBtn} onClick={onReject} title="Reject">
              <X size={15} />
            </button>
            <button style={{ ...styles.iconActionBtn, ...styles.iconActionPrimary }} onClick={onPublish} title="Approve & publish">
              <Check size={15} />
            </button>
          </>
        )}
        <button style={styles.iconActionBtn} onClick={onView} title="Open">
          <ChevronRight size={15} />
        </button>
      </div>
    </article>
  );
}

// ============================================================================
// LIBRARY
// ============================================================================

function LibraryView({ items, onView, onExport, onDelete, showToast }) {
  const [filter, setFilter] = useState('all');
  const filtered = items.filter(i => filter === 'all' || i.type === filter);

  const filters = [
    { id: 'all', label: 'All', count: items.length },
    { id: 'evergreen', label: 'Evergreen', count: items.filter(i => i.type === 'evergreen').length },
    { id: 'news', label: 'News', count: items.filter(i => i.type === 'news').length },
  ];

  if (items.length === 0) {
    return (
      <>
        <PageHead eyebrow="03" title="Library" sub="Approved articles ready to export to WordPress." />
        <EmptyState icon={Library} title="Nothing in the library yet" hint="Approved drafts land here, ready for WordPress export." />
      </>
    );
  }

  return (
    <>
      <PageHead eyebrow="03" title="Library" sub={`${items.length} finished ${items.length === 1 ? 'article' : 'articles'}.`} />
      <div style={styles.filterRow}>
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{ ...styles.filterBtn, ...(filter === f.id ? styles.filterBtnActive : {}) }}
          >
            {f.label} <span style={styles.filterCount}>{f.count}</span>
          </button>
        ))}
      </div>
      <div style={styles.draftList}>
        {filtered.map(item => (
          <article key={item.id} style={styles.draftRow} onClick={() => onView(item)}>
            <div style={styles.draftLeft}>
              <div style={styles.draftMeta}>
                <span style={{ ...styles.statusDot, background: item.type === 'evergreen' ? '#2D5F4E' : '#C77D4A' }} />
                <span style={styles.cardCategory}>{item.type === 'evergreen' ? 'Evergreen' : 'News'}</span>
                <span style={styles.cardDot}>·</span>
                <span>{item.category}</span>
                <span style={styles.cardDot}>·</span>
                <span>Published {timeAgo(item.publishedAt)}</span>
              </div>
              <h3 style={styles.draftTitle}>{item.title}</h3>
              <p style={styles.draftPreview}>{item.excerpt || item.content.replace(/[#*_`>]/g, '').slice(0, 180)}…</p>
            </div>
            <div style={styles.draftActions} onClick={e => e.stopPropagation()}>
              <button style={{ ...styles.iconActionBtn, ...styles.iconActionPrimary }} onClick={() => onExport(item)} title="Export to WordPress">
                <FileCode size={15} />
              </button>
              <button style={styles.iconActionBtn} onClick={() => onDelete(item.id)} title="Delete">
                <Trash2 size={15} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

// ============================================================================
// PROMPTS
// ============================================================================

function PromptsView({ prompts, onRun, onSave }) {
  const [editing, setEditing] = useState(null);

  const addPrompt = () => {
    const np = { id: uid(), name: 'New prompt', template: 'Your prompt. Use {variable} for placeholders.', vars: [] };
    onSave([...prompts, np]);
    setEditing(np.id);
  };
  const updatePrompt = (id, patch) => onSave(prompts.map(p => p.id === id ? { ...p, ...patch } : p));
  const deletePrompt = (id) => onSave(prompts.filter(p => p.id !== id));

  return (
    <>
      <PageHead
        eyebrow="04"
        title="Prompts"
        sub="Reusable prompt templates. Use {curly-brace} variables, then run."
        action={<button style={styles.primaryBtn} onClick={addPrompt}><Plus size={16} /> New prompt</button>}
      />
      <div style={styles.promptGrid}>
        {prompts.map(p => (
          <article key={p.id} style={styles.promptCard}>
            {editing === p.id ? (
              <PromptEditor
                prompt={p}
                onSave={(patch) => { updatePrompt(p.id, patch); setEditing(null); }}
                onCancel={() => setEditing(null)}
                onDelete={() => { deletePrompt(p.id); setEditing(null); }}
              />
            ) : (
              <>
                <h3 style={styles.promptName}>{p.name}</h3>
                <pre style={styles.promptText}>{p.template}</pre>
                <div style={styles.cardActions}>
                  <button style={styles.actionBtn} onClick={() => setEditing(p.id)}><Edit3 size={13} /> Edit</button>
                  <button style={{ ...styles.actionBtn, ...styles.actionBtnPrimary }} onClick={() => onRun(p)}>
                    <ArrowRight size={13} /> Run
                  </button>
                </div>
              </>
            )}
          </article>
        ))}
      </div>
    </>
  );
}

function PromptEditor({ prompt, onSave, onCancel, onDelete }) {
  const [name, setName] = useState(prompt.name);
  const [template, setTemplate] = useState(prompt.template);
  const save = () => {
    const vars = [...new Set([...template.matchAll(/\{(\w+)\}/g)].map(m => m[1]))];
    onSave({ name, template, vars });
  };
  return (
    <div>
      <input value={name} onChange={e => setName(e.target.value)} style={styles.inputInline} placeholder="Prompt name" />
      <textarea value={template} onChange={e => setTemplate(e.target.value)} style={styles.textareaInline} rows={6} />
      <div style={styles.cardActions}>
        <button style={styles.actionBtn} onClick={onDelete}><Trash2 size={13} /> Delete</button>
        <button style={styles.actionBtn} onClick={onCancel}>Cancel</button>
        <button style={{ ...styles.actionBtn, ...styles.actionBtnPrimary }} onClick={save}><Save size={13} /> Save</button>
      </div>
    </div>
  );
}

// ============================================================================
// SETTINGS
// ============================================================================

function SettingsView({ settings, onSave }) {
  const [instructions, setInstructions] = useState(settings.instructions);
  const [style, setStyle] = useState(settings.style);
  const dirty = instructions !== settings.instructions || style !== settings.style;
  return (
    <>
      <PageHead
        eyebrow="05"
        title="Voice & style"
        sub="The instructions and style guide that ride along with every generation."
        action={dirty && (
          <button style={styles.primaryBtn} onClick={() => onSave({ instructions, style })}>
            <Save size={16} /> Save
          </button>
        )}
      />
      <div style={styles.settingsGrid}>
        <div style={styles.settingsBlock}>
          <label style={styles.settingsLabel}>System instructions</label>
          <p style={styles.settingsHint}>Role, voice, localisation rules, and guardrails sent with every prompt.</p>
          <textarea value={instructions} onChange={e => setInstructions(e.target.value)} style={styles.settingsArea} rows={18} />
        </div>
        <div style={styles.settingsBlock}>
          <label style={styles.settingsLabel}>House style notes</label>
          <p style={styles.settingsHint}>Reference style sheet for spelling, structure, sources, sensitivities.</p>
          <textarea value={style} onChange={e => setStyle(e.target.value)} style={styles.settingsArea} rows={18} />
        </div>
      </div>
    </>
  );
}

// ============================================================================
// MODALS
// ============================================================================

function Modal({ children, onClose }) {
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalBox} onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function LoadingPanel({ message }) {
  return (
    <div style={styles.loadingPanel}>
      <Loader2 size={32} style={{ animation: 'spin 1.2s linear infinite', color: '#2D5F4E' }} />
      <p style={styles.loadingMsg}>{message}</p>
      <p style={styles.loadingSub}>This can take 30–120 seconds with web search.</p>
    </div>
  );
}

function ErrorPanel({ message, onClose }) {
  const copy = async () => {
    try { await navigator.clipboard.writeText(message); } catch {}
  };
  return (
    <div style={styles.loadingPanel}>
      <AlertCircle size={32} color="#A14438" />
      <p style={styles.loadingMsg}>Something went wrong</p>
      <pre style={styles.errorDetail}>{message}</pre>
      <div style={{ display: 'flex', gap: 10 }}>
        <button style={styles.secondaryBtn} onClick={copy}><Copy size={14} /> Copy error</button>
        <button style={styles.primaryBtn} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function DraftView({ draft, fromLibrary, onSave, onPublish, onExport, onClose, showToast }) {
  const [content, setContent] = useState(draft.content);
  const [editing, setEditing] = useState(false);
  const save = () => { onSave({ content }); setEditing(false); showToast('Draft saved', 'success'); };
  const copy = async () => {
    try { await navigator.clipboard.writeText(content); showToast('Copied'); }
    catch { showToast('Copy failed', 'error'); }
  };
  return (
    <div style={styles.draftViewPanel}>
      <div style={styles.draftViewHeader}>
        <div>
          <div style={styles.draftViewEyebrow}>
            {fromLibrary ? 'Published' : 'Draft for review'} · {draft.type}
          </div>
          <h2 style={styles.formTitle}>{draft.title}</h2>
          {draft.meta && <p style={styles.metaPreview}>{draft.meta}</p>}
        </div>
        <button style={styles.iconBtn} onClick={onClose}><X size={18} /></button>
      </div>
      {editing ? (
        <textarea value={content} onChange={e => setContent(e.target.value)} style={styles.draftEditor} rows={24} />
      ) : (
        <div style={styles.draftContent}><FormattedMarkdown text={content} /></div>
      )}
      <div style={styles.draftViewActions}>
        <button style={styles.secondaryBtn} onClick={copy}><Copy size={14} /> Copy markdown</button>
        {!fromLibrary && (
          editing
            ? <button style={styles.secondaryBtn} onClick={save}><Save size={14} /> Save edits</button>
            : <button style={styles.secondaryBtn} onClick={() => setEditing(true)}><Edit3 size={14} /> Edit</button>
        )}
        {fromLibrary
          ? <button style={styles.primaryBtn} onClick={onExport}><FileCode size={15} /> Export to WordPress</button>
          : <button style={styles.primaryBtn} onClick={onPublish}><Check size={15} /> Approve & publish</button>}
      </div>
    </div>
  );
}

// ============================================================================
// WORDPRESS EXPORT
// ============================================================================

function WordPressExport({ item, onClose, showToast }) {
  const [tab, setTab] = useState('html');
  const html = mdToHtml(item.content);

  // Strip leading H1 if present (WordPress title field handles it)
  const bodyHtml = html.replace(/^<h1>[\s\S]*?<\/h1>\n?/, '');

  const fullPackage = `<!-- TITLE -->\n${item.title}\n\n<!-- META DESCRIPTION -->\n${item.meta || ''}\n\n<!-- EXCERPT -->\n${item.excerpt || ''}\n\n<!-- TAGS -->\n${(item.tags || []).join(', ')}\n\n<!-- CATEGORY -->\n${item.category}\n\n<!-- BODY HTML -->\n${bodyHtml}`;

  const copyText = async (text, label) => {
    try { await navigator.clipboard.writeText(text); showToast(`${label} copied`, 'success'); }
    catch { showToast('Copy failed', 'error'); }
  };

  const download = () => {
    const blob = new Blob([fullPackage], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safe = item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    a.href = url; a.download = `${safe || 'article'}.html`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded', 'success');
  };

  return (
    <div style={styles.draftViewPanel}>
      <div style={styles.draftViewHeader}>
        <div>
          <div style={styles.draftViewEyebrow}>WordPress export</div>
          <h2 style={styles.formTitle}>{item.title}</h2>
        </div>
        <button style={styles.iconBtn} onClick={onClose}><X size={18} /></button>
      </div>

      {/* Quick fields */}
      <div style={styles.exportFields}>
        <ExportField label="Title" value={item.title} onCopy={() => copyText(item.title, 'Title')} />
        <ExportField label="Meta description" value={item.meta || '(empty)'} onCopy={() => copyText(item.meta || '', 'Meta')} />
        <ExportField label="Excerpt" value={item.excerpt || '(empty)'} onCopy={() => copyText(item.excerpt || '', 'Excerpt')} multiline />
        <ExportField label="Tags" value={(item.tags || []).join(', ') || '(none)'} onCopy={() => copyText((item.tags || []).join(', '), 'Tags')} />
        <ExportField label="Category" value={item.category || '(none)'} onCopy={() => copyText(item.category || '', 'Category')} />
      </div>

      {/* HTML / Markdown switch */}
      <div style={styles.exportTabRow}>
        <button onClick={() => setTab('html')} style={{ ...styles.subTab, ...(tab === 'html' ? styles.subTabActive : {}) }}>
          HTML body
        </button>
        <button onClick={() => setTab('markdown')} style={{ ...styles.subTab, ...(tab === 'markdown' ? styles.subTabActive : {}) }}>
          Markdown
        </button>
        <button onClick={() => setTab('full')} style={{ ...styles.subTab, ...(tab === 'full' ? styles.subTabActive : {}) }}>
          Full package
        </button>
      </div>

      <div style={styles.codePanel}>
        <pre style={styles.codeBlock}>
          {tab === 'html' ? bodyHtml : tab === 'markdown' ? item.content : fullPackage}
        </pre>
      </div>

      <div style={styles.exportHint}>
        Paste the HTML body into WordPress (Custom HTML block in Gutenberg, or HTML view in Classic Editor). Fill the Title, Excerpt, Categories, and Tags fields separately in WordPress.
      </div>

      <div style={styles.draftViewActions}>
        <button style={styles.secondaryBtn} onClick={download}><Download size={14} /> Download .html</button>
        <button style={styles.secondaryBtn} onClick={() => copyText(item.content, 'Markdown')}>
          <Copy size={14} /> Copy markdown
        </button>
        <button style={styles.primaryBtn} onClick={() => copyText(tab === 'html' ? bodyHtml : tab === 'markdown' ? item.content : fullPackage, 'Block')}>
          <Copy size={14} /> Copy {tab === 'html' ? 'HTML body' : tab === 'markdown' ? 'markdown' : 'full package'}
        </button>
      </div>
    </div>
  );
}

function ExportField({ label, value, onCopy, multiline }) {
  return (
    <div style={styles.exportField}>
      <div style={styles.exportFieldLabel}>{label}</div>
      <div style={styles.exportFieldRow}>
        <div style={{ ...styles.exportFieldValue, ...(multiline ? styles.exportFieldMulti : {}) }}>{value}</div>
        <button style={styles.iconBtnSmall} onClick={onCopy} title="Copy">
          <Copy size={13} />
        </button>
      </div>
    </div>
  );
}

function FillPromptForm({ prompt, onSubmit, onClose }) {
  const [values, setValues] = useState(Object.fromEntries((prompt.vars || []).map(v => [v, ''])));
  const run = () => {
    let filled = prompt.template;
    Object.entries(values).forEach(([k, v]) => { filled = filled.replaceAll(`{${k}}`, v); });
    onSubmit(filled);
  };
  return (
    <div style={styles.formPanel}>
      <h2 style={styles.formTitle}>{prompt.name}</h2>
      <p style={styles.formSub}>Fill in the variables, then run.</p>
      {(prompt.vars || []).length === 0 ? (
        <p style={styles.formSub}>No variables — this prompt runs as-is.</p>
      ) : (
        prompt.vars.map(v => (
          <div key={v}>
            <label style={styles.formLabel}>{v}</label>
            <textarea value={values[v]} onChange={e => setValues({ ...values, [v]: e.target.value })} style={styles.textarea} rows={3} />
          </div>
        ))
      )}
      <div style={styles.formActions}>
        <button style={styles.secondaryBtn} onClick={onClose}>Cancel</button>
        <button style={styles.primaryBtn} onClick={run}><ArrowRight size={15} /> Run prompt</button>
      </div>
    </div>
  );
}

function OutputPanel({ content, onClose, showToast }) {
  const copy = async () => {
    try { await navigator.clipboard.writeText(content); showToast('Copied'); }
    catch { showToast('Copy failed'); }
  };
  return (
    <div style={styles.draftViewPanel}>
      <div style={styles.draftViewHeader}>
        <div>
          <div style={styles.draftViewEyebrow}>Output</div>
          <h2 style={styles.formTitle}>Result</h2>
        </div>
        <button style={styles.iconBtn} onClick={onClose}><X size={18} /></button>
      </div>
      <div style={styles.draftContent}><FormattedMarkdown text={content} /></div>
      <div style={styles.draftViewActions}>
        <button style={styles.secondaryBtn} onClick={copy}><Copy size={14} /> Copy</button>
        <button style={styles.primaryBtn} onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function PageHead({ eyebrow, title, sub, action }) {
  return (
    <div style={styles.pageHead}>
      <div>
        <div style={styles.eyebrow}>{eyebrow}</div>
        <h1 style={styles.pageTitle}>{title}</h1>
        <p style={styles.pageSub}>{sub}</p>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div style={styles.empty}>
      <Icon size={36} strokeWidth={1.2} color="#9A9486" />
      <div style={styles.emptyTitle}>{title}</div>
      <div style={styles.emptyHint}>{hint}</div>
    </div>
  );
}

function Toast({ msg, type }) {
  return <div style={{ ...styles.toast, ...(type === 'success' ? styles.toastSuccess : type === 'error' ? styles.toastError : {}) }}>{msg}</div>;
}

function FormattedMarkdown({ text }) {
  const lines = text.split('\n');
  const blocks = [];
  let listBuffer = null, listType = null;

  const flushList = () => {
    if (!listBuffer) return;
    const Tag = listType === 'ol' ? 'ol' : 'ul';
    blocks.push(<Tag key={blocks.length} style={styles.mdList}>{listBuffer.map((li, i) => <li key={i} style={styles.mdLi}>{inline(li)}</li>)}</Tag>);
    listBuffer = null; listType = null;
  };

  const inline = (s) => {
    const parts = [];
    let rest = s;
    let key = 0;
    const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`)/;
    let m;
    while ((m = re.exec(rest))) {
      if (m.index > 0) parts.push(rest.slice(0, m.index));
      if (m[2]) parts.push(<strong key={key++}>{m[2]}</strong>);
      else if (m[3]) parts.push(<em key={key++}>{m[3]}</em>);
      else if (m[4]) parts.push(<a key={key++} href={m[5]} target="_blank" rel="noopener" style={styles.mdLink}>{m[4]}</a>);
      else if (m[6]) parts.push(<code key={key++} style={styles.mdCode}>{m[6]}</code>);
      rest = rest.slice(m.index + m[0].length);
    }
    if (rest) parts.push(rest);
    return parts;
  };

  lines.forEach((line, i) => {
    if (/^#{1,3}\s/.test(line)) {
      flushList();
      const level = line.match(/^(#+)/)[1].length;
      const txt = line.replace(/^#+\s/, '');
      const Tag = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3';
      const style = level === 1 ? styles.mdH1 : level === 2 ? styles.mdH2 : styles.mdH3;
      blocks.push(<Tag key={i} style={style}>{inline(txt)}</Tag>);
    } else if (/^[-*]\s/.test(line)) {
      if (listType !== 'ul') { flushList(); listType = 'ul'; listBuffer = []; }
      listBuffer.push(line.replace(/^[-*]\s/, ''));
    } else if (/^\d+\.\s/.test(line)) {
      if (listType !== 'ol') { flushList(); listType = 'ol'; listBuffer = []; }
      listBuffer.push(line.replace(/^\d+\.\s/, ''));
    } else if (/^>\s/.test(line)) {
      flushList();
      blocks.push(<blockquote key={i} style={styles.mdBlockquote}>{inline(line.replace(/^>\s/, ''))}</blockquote>);
    } else if (line.trim() === '') {
      flushList();
    } else {
      flushList();
      blocks.push(<p key={i} style={styles.mdP}>{inline(line)}</p>);
    }
  });
  flushList();
  return <div>{blocks}</div>;
}

// ============================================================================
// TRAIN VIEW
// ============================================================================

function TrainView({
  events, settings, drafts, libraryItems,
  onRunSample, onCritique, onLearn,
  onSubmitFeedback, onApplyPatch, onDismissPatch,
  onDelete, onViewPrompt
}) {
  const patchCount = events.reduce((sum, e) =>
    sum + ((e.data?.patches || []).filter(p => p.status === 'applied').length), 0
  );
  const pendingCount = events.reduce((sum, e) =>
    sum + ((e.data?.patches || []).filter(p => p.status === 'pending').length), 0
  );

  // Top-level events (sample, critique, learn) — feedback events are nested under their parent
  const topLevel = events.filter(e => !e.parentId);
  const childrenOf = (id) => events.filter(e => e.parentId === id);

  return (
    <>
      <PageHead
        eyebrow="06 · Train"
        title="Train"
        sub="Run samples, give feedback, and refine the prompt. Every accepted patch updates the system instructions."
      />

      {/* Prompt summary panel */}
      <div style={styles.trainSummary}>
        <div style={styles.trainSummaryRow}>
          <div style={styles.trainStat}>
            <div style={styles.trainStatNum}>{settings.instructions.length.toLocaleString()}</div>
            <div style={styles.trainStatLabel}>chars in instructions</div>
          </div>
          <div style={styles.trainStat}>
            <div style={styles.trainStatNum}>{settings.style.length.toLocaleString()}</div>
            <div style={styles.trainStatLabel}>chars in style</div>
          </div>
          <div style={styles.trainStat}>
            <div style={styles.trainStatNum} data-accent="true">{patchCount}</div>
            <div style={styles.trainStatLabel}>trained patches</div>
          </div>
          <div style={styles.trainStat}>
            <div style={styles.trainStatNum} data-warn="true">{pendingCount}</div>
            <div style={styles.trainStatLabel}>awaiting review</div>
          </div>
          <button style={{ ...styles.secondaryBtn, marginLeft: 'auto', alignSelf: 'center' }} onClick={onViewPrompt}>
            <FileText size={14} /> View current prompt
          </button>
        </div>
      </div>

      {/* Action cards */}
      <div style={styles.trainActions}>
        <button style={styles.trainActionCard} onClick={onRunSample}>
          <Beaker size={20} strokeWidth={1.6} />
          <div style={styles.trainActionTitle}>Run a sample</div>
          <div style={styles.trainActionSub}>Generate a quick 400-word piece on any topic using current instructions.</div>
        </button>
        <button style={styles.trainActionCard} onClick={onCritique}>
          <MessageSquare size={20} strokeWidth={1.6} />
          <div style={styles.trainActionTitle}>Critique a piece</div>
          <div style={styles.trainActionSub}>Load a draft or paste any article, describe what's off, get patch suggestions.</div>
        </button>
        <button
          style={{ ...styles.trainActionCard, ...(libraryItems.length === 0 ? styles.trainActionDisabled : {}) }}
          onClick={onLearn}
          disabled={libraryItems.length === 0}
        >
          <Lightbulb size={20} strokeWidth={1.6} />
          <div style={styles.trainActionTitle}>Learn from approved</div>
          <div style={styles.trainActionSub}>
            {libraryItems.length === 0
              ? 'Approve articles to the library first, then extract patterns from them.'
              : 'Extract the patterns that make an approved piece work, codify them.'}
          </div>
        </button>
      </div>

      {/* Training log */}
      {events.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No training events yet"
          hint="Start with a sample — generate a quick piece, give it feedback, and let Claude propose patches to the prompt."
        />
      ) : (
        <div style={styles.trainLog}>
          {topLevel.map(ev => (
            <TrainEvent
              key={ev.id}
              event={ev}
              feedback={childrenOf(ev.id)}
              onSubmitFeedback={(text) => onSubmitFeedback(ev.id, text, ev.data.content)}
              onApplyPatch={onApplyPatch}
              onDismissPatch={onDismissPatch}
              onDelete={() => onDelete(ev.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}

function TrainEvent({ event, feedback, onSubmitFeedback, onApplyPatch, onDismissPatch, onDelete }) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [showFull, setShowFull] = useState(false);

  // For learn events, patches are directly on the event
  const hasOwnPatches = event.kind === 'learn';
  const patches = hasOwnPatches ? (event.data.patches || []) : [];

  const submit = () => {
    if (!feedbackText.trim()) return;
    onSubmitFeedback(feedbackText);
    setFeedbackText('');
    setFeedbackOpen(false);
  };

  const kindLabels = {
    sample: 'Sample run',
    critique: 'Critique',
    learn: 'Learning from approved'
  };
  const kindIcons = {
    sample: Beaker,
    critique: MessageSquare,
    learn: Lightbulb
  };
  const KindIcon = kindIcons[event.kind] || FileText;

  return (
    <article style={styles.trainCard}>
      <div style={styles.trainCardHeader}>
        <div style={styles.trainCardIcon}>
          <KindIcon size={15} strokeWidth={1.8} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.trainCardKind}>{kindLabels[event.kind] || event.kind}</div>
          <div style={styles.trainCardTitle}>
            {event.kind === 'sample' && `"${event.data.topic}" · ${event.data.type}`}
            {event.kind === 'critique' && (event.data.source || 'Pasted article')}
            {event.kind === 'learn' && event.data.title}
          </div>
        </div>
        <span style={styles.trainCardTime}>{timeAgo(event.createdAt)}</span>
        <button style={styles.iconBtn} onClick={onDelete} title="Delete">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Article preview */}
      {event.data.content && (
        <div style={styles.trainSampleBox}>
          <div style={styles.trainSamplePreview}>
            {showFull
              ? <FormattedMarkdown text={event.data.content} />
              : <div style={styles.trainSampleTruncated}>{event.data.content.replace(/[#*_`>]/g, '').slice(0, 320)}…</div>
            }
          </div>
          <button style={styles.linkBtn} onClick={() => setShowFull(!showFull)}>
            {showFull ? <><ChevronDown size={12} /> Collapse</> : <><ChevronRight size={12} /> View full</>}
          </button>
        </div>
      )}

      {/* Learn event patches inline */}
      {hasOwnPatches && patches.length > 0 && (
        <div style={styles.patchList}>
          {patches.map(p => (
            <PatchCard
              key={p.id}
              patch={p}
              onApply={(editedText) => onApplyPatch(event.id, p.id, editedText)}
              onDismiss={() => onDismissPatch(event.id, p.id)}
            />
          ))}
        </div>
      )}

      {/* Feedback children */}
      {feedback.map(f => (
        <div key={f.id} style={styles.feedbackBlock}>
          <div style={styles.feedbackQuote}>
            <div style={styles.feedbackLabel}>Editor said</div>
            <div style={styles.feedbackText}>"{f.data.text}"</div>
          </div>
          {(f.data.patches || []).length > 0 && (
            <div style={styles.patchList}>
              {f.data.patches.map(p => (
                <PatchCard
                  key={p.id}
                  patch={p}
                  onApply={(editedText) => onApplyPatch(f.id, p.id, editedText)}
                  onDismiss={() => onDismissPatch(f.id, p.id)}
                />
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Feedback input (for sample/critique only) */}
      {(event.kind === 'sample' || event.kind === 'critique') && (
        <div style={styles.feedbackInputWrap}>
          {feedbackOpen ? (
            <>
              <textarea
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
                placeholder="What's off? Be specific — what should be different? The agent will propose a patch to the instructions."
                style={styles.textarea}
                rows={4}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button style={styles.secondaryBtn} onClick={() => { setFeedbackOpen(false); setFeedbackText(''); }}>Cancel</button>
                <button style={styles.primaryBtn} onClick={submit} disabled={!feedbackText.trim()}>
                  <Wand2 size={14} /> Get suggestions
                </button>
              </div>
            </>
          ) : (
            <button style={styles.feedbackOpenBtn} onClick={() => setFeedbackOpen(true)}>
              <Plus size={13} /> Give feedback{feedback.length > 0 ? ' (add another round)' : ''}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function PatchCard({ patch, onApply, onDismiss }) {
  const [editing, setEditing] = useState(false);
  const [edited, setEdited] = useState(patch.text);

  if (patch.status === 'dismissed') return null;

  const applied = patch.status === 'applied';

  return (
    <div style={{ ...styles.patchCard, ...(applied ? styles.patchCardApplied : {}) }}>
      <div style={styles.patchHeader}>
        {applied ? (
          <span style={styles.patchBadgeApplied}><Check size={11} /> Added to {patch.target}</span>
        ) : (
          <span style={styles.patchBadge}>
            <Wand2 size={11} /> Suggested patch → {patch.target}
          </span>
        )}
      </div>
      {patch.diagnosis && !applied && (
        <div style={styles.patchDiagnosis}>{patch.diagnosis}</div>
      )}
      {editing ? (
        <textarea
          value={edited}
          onChange={e => setEdited(e.target.value)}
          style={styles.patchEditor}
          rows={3}
        />
      ) : (
        <pre style={styles.patchText}>{applied ? patch.appliedText : patch.text}</pre>
      )}
      {patch.rationale && !applied && (
        <div style={styles.patchRationale}>{patch.rationale}</div>
      )}
      {!applied && (
        <div style={styles.patchActions}>
          {editing ? (
            <>
              <button style={styles.actionBtn} onClick={() => { setEdited(patch.text); setEditing(false); }}>Cancel</button>
              <button style={{ ...styles.actionBtn, ...styles.actionBtnPrimary }} onClick={() => { onApply(edited); setEditing(false); }}>
                <Check size={13} /> Apply edited
              </button>
            </>
          ) : (
            <>
              <button style={styles.actionBtn} onClick={onDismiss}><X size={13} /> Dismiss</button>
              <button style={styles.actionBtn} onClick={() => setEditing(true)}><Edit3 size={13} /> Edit</button>
              <button style={{ ...styles.actionBtn, ...styles.actionBtnPrimary }} onClick={() => onApply()}>
                <Check size={13} /> Apply
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TRAINING MODALS
// ============================================================================

function SampleForm({ onSubmit, onClose }) {
  const [topic, setTopic] = useState('');
  const [type, setType] = useState('evergreen');
  return (
    <div style={styles.formPanel}>
      <h2 style={styles.formTitle}>Run a sample</h2>
      <p style={styles.formSub}>Generates a short (~400 word) article using the current instructions, so you can quickly assess voice and structure.</p>
      <label style={styles.formLabel}>Sample topic</label>
      <input
        value={topic}
        onChange={e => setTopic(e.target.value)}
        placeholder="e.g. iron deficiency, magnesium for sleep, prostate screening"
        style={styles.topicInput}
        autoFocus
      />
      <label style={styles.formLabel}>Type</label>
      <div style={styles.segmented}>
        {[
          { id: 'evergreen', label: 'Evergreen' },
          { id: 'news', label: 'News' }
        ].map(t => (
          <button key={t.id} onClick={() => setType(t.id)}
            style={{ ...styles.segmentedBtn, ...(type === t.id ? styles.segmentedBtnActive : {}) }}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={styles.formActions}>
        <button style={styles.secondaryBtn} onClick={onClose}>Cancel</button>
        <button style={styles.primaryBtn} onClick={() => onSubmit({ topic, type })} disabled={!topic.trim()}>
          <Beaker size={15} /> Generate sample
        </button>
      </div>
    </div>
  );
}

function CritiqueForm({ drafts, libraryItems, onSubmit, onClose }) {
  const [source, setSource] = useState('paste');
  const [pickedId, setPickedId] = useState('');
  const [pasted, setPasted] = useState('');
  const [feedback, setFeedback] = useState('');

  const all = [
    ...drafts.map(d => ({ id: d.id, label: `Draft · ${d.title}`, content: d.content, type: 'draft' })),
    ...libraryItems.map(i => ({ id: i.id, label: `Library · ${i.title}`, content: i.content, type: 'library' }))
  ];
  const picked = all.find(x => x.id === pickedId);
  const articleContent = source === 'paste' ? pasted : picked?.content || '';

  const canSubmit = articleContent.trim() && feedback.trim();

  return (
    <div style={styles.formPanel}>
      <h2 style={styles.formTitle}>Critique a piece</h2>
      <p style={styles.formSub}>Provide a piece and say what's off. The agent will propose patches to the instructions or style guide.</p>

      <label style={styles.formLabel}>Source</label>
      <div style={styles.segmented}>
        <button onClick={() => setSource('paste')}
          style={{ ...styles.segmentedBtn, ...(source === 'paste' ? styles.segmentedBtnActive : {}) }}>
          Paste text
        </button>
        <button onClick={() => setSource('pick')} disabled={all.length === 0}
          style={{ ...styles.segmentedBtn, ...(source === 'pick' ? styles.segmentedBtnActive : {}), ...(all.length === 0 ? { opacity: 0.5 } : {}) }}>
          Pick from drafts/library
        </button>
      </div>

      {source === 'paste' ? (
        <>
          <label style={styles.formLabel}>Article text</label>
          <textarea value={pasted} onChange={e => setPasted(e.target.value)}
            style={styles.textarea} rows={6}
            placeholder="Paste any article — yours, a competitor's, an AI draft you didn't love…" />
        </>
      ) : (
        <>
          <label style={styles.formLabel}>Pick a piece</label>
          <select value={pickedId} onChange={e => setPickedId(e.target.value)} style={styles.select}>
            <option value="">— select —</option>
            {all.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </>
      )}

      <label style={styles.formLabel}>What's off?</label>
      <textarea value={feedback} onChange={e => setFeedback(e.target.value)}
        style={styles.textarea} rows={4}
        placeholder="e.g. The voice is too formal. Or: too much hedging. Or: missing SA context. Be specific — the more concrete, the better the patch." />

      <div style={styles.formActions}>
        <button style={styles.secondaryBtn} onClick={onClose}>Cancel</button>
        <button style={styles.primaryBtn} onClick={() => onSubmit({
          source: source === 'pick' ? picked?.label : 'Pasted text',
          articleContent, feedbackText: feedback
        })} disabled={!canSubmit}>
          <Wand2 size={15} /> Analyse
        </button>
      </div>
    </div>
  );
}

function LearnForm({ libraryItems, onSubmit, onClose }) {
  const [pickedId, setPickedId] = useState(libraryItems[0]?.id || '');
  const picked = libraryItems.find(i => i.id === pickedId);

  return (
    <div style={styles.formPanel}>
      <h2 style={styles.formTitle}>Learn from an approved piece</h2>
      <p style={styles.formSub}>Pick an article you've already approved. The agent will identify patterns worth codifying so future articles inherit them.</p>

      <label style={styles.formLabel}>Approved article</label>
      <select value={pickedId} onChange={e => setPickedId(e.target.value)} style={styles.select}>
        {libraryItems.map(i => <option key={i.id} value={i.id}>{i.title}</option>)}
      </select>

      {picked && (
        <div style={{ ...styles.topicPreview, marginTop: 12 }}>
          <div style={styles.topicPreviewLabel}>Preview</div>
          <div style={styles.topicPreviewAngle}>{picked.excerpt || picked.content.replace(/[#*_`>]/g, '').slice(0, 220) + '…'}</div>
        </div>
      )}

      <div style={styles.formActions}>
        <button style={styles.secondaryBtn} onClick={onClose}>Cancel</button>
        <button style={styles.primaryBtn} onClick={() => onSubmit(picked)} disabled={!picked}>
          <Lightbulb size={15} /> Extract patterns
        </button>
      </div>
    </div>
  );
}

function ViewPromptPanel({ settings, onClose, showToast }) {
  const copy = async (text, label) => {
    try { await navigator.clipboard.writeText(text); showToast(`${label} copied`, 'success'); }
    catch { showToast('Copy failed', 'error'); }
  };
  return (
    <div style={styles.draftViewPanel}>
      <div style={styles.draftViewHeader}>
        <div>
          <div style={styles.draftViewEyebrow}>Current prompt</div>
          <h2 style={styles.formTitle}>What the agent sees</h2>
        </div>
        <button style={styles.iconBtn} onClick={onClose}><X size={18} /></button>
      </div>
      <div style={styles.draftContent}>
        <h3 style={styles.mdH3}>System instructions</h3>
        <pre style={styles.promptText}>{settings.instructions}</pre>
        <h3 style={styles.mdH3}>House style</h3>
        <pre style={styles.promptText}>{settings.style}</pre>
      </div>
      <div style={styles.draftViewActions}>
        <button style={styles.secondaryBtn} onClick={() => copy(settings.instructions, 'Instructions')}>
          <Copy size={14} /> Copy instructions
        </button>
        <button style={styles.secondaryBtn} onClick={() => copy(settings.style, 'Style')}>
          <Copy size={14} /> Copy style
        </button>
        <button style={styles.primaryBtn} onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

// ============================================================================
// SITEMAP / TOPICAL AUTHORITY
// ============================================================================

function SitemapView({ sitePages, topics, drafts, libraryItems, onAdd, onBulkAdd, onEdit, onDelete, onUpdateCluster }) {
  const [collapsed, setCollapsed] = useState({});

  // Aggregate everything into clusters
  const clusters = {};
  const addToCluster = (item, status, kind) => {
    const c = item.cluster || 'Unclustered';
    if (!clusters[c]) clusters[c] = { live: [], planned: [], drafting: [], ready: [] };
    const bucket = status === 'LIVE' ? 'live'
                : status === 'PLANNED' ? 'planned'
                : status === 'DRAFT' ? 'drafting'
                : 'ready';
    clusters[c][bucket].push({ ...item, kind, _status: status });
  };
  sitePages.forEach(p => addToCluster(p, 'LIVE', 'page'));
  topics.filter(t => ['pending', 'writing', 'written'].includes(t.status))
    .forEach(t => addToCluster(t, 'PLANNED', 'topic'));
  drafts.forEach(d => addToCluster(d, 'DRAFT', 'draft'));
  libraryItems.forEach(l => addToCluster(l, 'READY', 'library'));

  // Sort clusters: most items first, "Unclustered" last
  const clusterEntries = Object.entries(clusters).sort((a, b) => {
    if (a[0] === 'Unclustered') return 1;
    if (b[0] === 'Unclustered') return -1;
    const aCount = a[1].live.length + a[1].planned.length + a[1].drafting.length + a[1].ready.length;
    const bCount = b[1].live.length + b[1].planned.length + b[1].drafting.length + b[1].ready.length;
    return bCount - aCount;
  });

  const totalLive = sitePages.length;
  const totalPlanned = topics.filter(t => ['pending', 'writing', 'written'].includes(t.status)).length;
  const totalDraft = drafts.length;
  const totalReady = libraryItems.length;

  return (
    <>
      <PageHead
        eyebrow="00 · Topical authority"
        title="Sitemap"
        sub="Every live page, every planned topic, every draft — grouped by cluster. Topic generation references this map to avoid cannibalisation."
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={styles.secondaryBtn} onClick={onBulkAdd}>
              <FileText size={14} /> Bulk add
            </button>
            <button style={styles.primaryBtn} onClick={onAdd}>
              <Plus size={16} /> Add live page
            </button>
          </div>
        }
      />

      {/* Stats strip */}
      <div style={styles.statsStrip}>
        <SitemapStat label="Clusters" value={clusterEntries.length} />
        <SitemapStat label="Live pages" value={totalLive} accent="#3A5266" />
        <SitemapStat label="Planned topics" value={totalPlanned} accent="#C77D4A" />
        <SitemapStat label="In draft" value={totalDraft} accent="#2D5F4E" />
        <SitemapStat label="Ready to publish" value={totalReady} accent="#234B3D" />
      </div>

      {clusterEntries.length === 0 ? (
        <EmptyState
          icon={Network}
          title="No coverage map yet"
          hint="Add the pages already live on your site. Then generate topics — Claude will see this map and avoid duplicating them."
        />
      ) : (
        <div style={styles.clusterList}>
          {clusterEntries.map(([clusterName, buckets]) => {
            const total = buckets.live.length + buckets.planned.length + buckets.drafting.length + buckets.ready.length;
            const isCollapsed = collapsed[clusterName];
            return (
              <section key={clusterName} style={styles.clusterCard}>
                <header style={styles.clusterHead} onClick={() => setCollapsed(s => ({ ...s, [clusterName]: !isCollapsed }))}>
                  <button style={styles.expandBtn}>
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <h3 style={styles.clusterTitle}>{clusterName}</h3>
                  <div style={styles.clusterMeta}>
                    {buckets.live.length > 0 && <span style={{ ...styles.clusterChip, background: '#E3EAEE', color: '#3A5266' }}>{buckets.live.length} live</span>}
                    {buckets.planned.length > 0 && <span style={{ ...styles.clusterChip, background: '#F4E4D2', color: '#9C5E2C' }}>{buckets.planned.length} planned</span>}
                    {buckets.drafting.length > 0 && <span style={{ ...styles.clusterChip, background: '#E5EFE9', color: '#2D5F4E' }}>{buckets.drafting.length} draft</span>}
                    {buckets.ready.length > 0 && <span style={{ ...styles.clusterChip, background: '#D6E3DC', color: '#234B3D' }}>{buckets.ready.length} ready</span>}
                    <span style={styles.clusterTotal}>{total} {total === 1 ? 'page' : 'pages'}</span>
                  </div>
                </header>

                {!isCollapsed && (
                  <div style={styles.clusterBody}>
                    {[
                      { key: 'live', label: 'Live', items: buckets.live },
                      { key: 'planned', label: 'Planned (topics)', items: buckets.planned },
                      { key: 'drafting', label: 'In draft', items: buckets.drafting },
                      { key: 'ready', label: 'Ready to publish', items: buckets.ready },
                    ].filter(b => b.items.length > 0).map(b => (
                      <div key={b.key}>
                        <div style={styles.bucketLabel}>{b.label}</div>
                        {b.items.map(item => (
                          <SitemapItem
                            key={item.id}
                            item={item}
                            onEdit={item.kind === 'page' ? () => onEdit(item) : null}
                            onDelete={item.kind === 'page' ? () => onDelete(item.id) : null}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

function SitemapStat({ label, value, accent }) {
  return (
    <div style={styles.statBox}>
      <div style={{ ...styles.statValue, color: accent || colors.ink }}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

function SitemapItem({ item, onEdit, onDelete }) {
  const statusColor = item._status === 'LIVE' ? '#3A5266'
                    : item._status === 'PLANNED' ? '#C77D4A'
                    : item._status === 'DRAFT' ? '#2D5F4E'
                    : '#234B3D';
  return (
    <div style={styles.sitemapItem}>
      <span style={{ ...styles.statusDot, background: statusColor, marginTop: 7 }} />
      <div style={styles.sitemapItemMain}>
        <div style={styles.sitemapItemTitle}>{item.title}</div>
        <div style={styles.sitemapItemMeta}>
          {item.keyword && <span style={styles.kwTag}>{item.keyword}</span>}
          {item.category && <span style={styles.cardCategory}>{item.category}</span>}
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener" style={styles.sitemapLink} onClick={e => e.stopPropagation()}>
              <ExternalLink size={11} /> open
            </a>
          )}
        </div>
      </div>
      {(onEdit || onDelete) && (
        <div style={styles.sitemapActions}>
          {onEdit && (
            <button style={styles.iconBtnSmall} onClick={onEdit} title="Edit">
              <Edit3 size={12} />
            </button>
          )}
          {onDelete && (
            <button style={styles.iconBtnSmall} onClick={onDelete} title="Delete">
              <Trash2 size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SitePageForm({ page, existingClusters, onSubmit, onClose }) {
  const [title, setTitle] = useState(page?.title || '');
  const [url, setUrl] = useState(page?.url || '');
  const [keyword, setKeyword] = useState(page?.keyword || '');
  const [cluster, setCluster] = useState(page?.cluster || '');
  const [category, setCategory] = useState(page?.category || '');
  const [notes, setNotes] = useState(page?.notes || '');

  const submit = () => {
    if (!title.trim() || !cluster.trim()) return;
    onSubmit({ title: title.trim(), url: url.trim(), keyword: keyword.trim(), cluster: cluster.trim(), category, notes: notes.trim() });
  };

  return (
    <div style={styles.formPanel}>
      <h2 style={styles.formTitle}>{page ? 'Edit live page' : 'Add live page'}</h2>
      <p style={styles.formSub}>An article already published on the site. Used by the topic generator to avoid duplicates.</p>

      <label style={styles.formLabel}>Title</label>
      <input value={title} onChange={e => setTitle(e.target.value)} style={styles.topicInput} placeholder="e.g. Signs of type 2 diabetes" />

      <label style={styles.formLabel}>URL <span style={styles.optional}>optional</span></label>
      <input value={url} onChange={e => setUrl(e.target.value)} style={styles.topicInput} placeholder="https://yoursite.co.za/diabetes-signs" />

      <label style={styles.formLabel}>Primary keyword</label>
      <input value={keyword} onChange={e => setKeyword(e.target.value)} style={styles.topicInput} placeholder="e.g. type 2 diabetes symptoms" />

      <label style={styles.formLabel}>Cluster</label>
      <input
        value={cluster}
        onChange={e => setCluster(e.target.value)}
        style={styles.topicInput}
        placeholder="e.g. Diabetes, Menopause, Iron deficiency"
        list="cluster-suggestions"
      />
      {existingClusters.length > 0 && (
        <datalist id="cluster-suggestions">
          {existingClusters.map(c => <option key={c} value={c} />)}
        </datalist>
      )}
      {existingClusters.length > 0 && (
        <div style={styles.clusterPills}>
          {existingClusters.slice(0, 8).map(c => (
            <button key={c} style={styles.clusterPill} onClick={() => setCluster(c)}>{c}</button>
          ))}
        </div>
      )}

      <label style={styles.formLabel}>Category <span style={styles.optional}>optional</span></label>
      <div style={styles.segmented}>
        {[
          { id: '', label: 'None' },
          { id: 'nutrition', label: 'Nutrition' },
          { id: 'wellness', label: 'Wellness' },
          { id: 'mens', label: "Men's" },
          { id: 'womens', label: "Women's" },
        ].map(c => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            style={{ ...styles.segmentedBtn, ...(category === c.id ? styles.segmentedBtnActive : {}) }}
          >
            {c.label}
          </button>
        ))}
      </div>

      <label style={styles.formLabel}>Notes <span style={styles.optional}>optional</span></label>
      <textarea value={notes} onChange={e => setNotes(e.target.value)} style={styles.textarea} rows={2} placeholder="Anything to remember about this page" />

      <div style={styles.formActions}>
        <button style={styles.secondaryBtn} onClick={onClose}>Cancel</button>
        <button style={styles.primaryBtn} onClick={submit} disabled={!title.trim() || !cluster.trim()}>
          <Save size={15} /> {page ? 'Save' : 'Add to sitemap'}
        </button>
      </div>
    </div>
  );
}

function BulkSitePagesForm({ onSubmit, onClose }) {
  const [text, setText] = useState('');
  const [defaultCluster, setDefaultCluster] = useState('');

  const parse = () => {
    // Each line: Title | URL | keyword | cluster
    // Or simpler: Title | URL  (cluster falls back to defaultCluster)
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const pages = lines.map(line => {
      const parts = line.split('|').map(p => p.trim());
      return {
        title: parts[0] || '',
        url: parts[1] || '',
        keyword: parts[2] || '',
        cluster: parts[3] || defaultCluster || 'Unclustered',
      };
    }).filter(p => p.title);
    if (pages.length) onSubmit(pages);
  };

  return (
    <div style={styles.formPanel}>
      <h2 style={styles.formTitle}>Bulk add live pages</h2>
      <p style={styles.formSub}>One page per line. Format: <code style={styles.mdCode}>Title | URL | keyword | cluster</code> — only Title is required. Use <code style={styles.mdCode}>|</code> between fields.</p>

      <label style={styles.formLabel}>Default cluster <span style={styles.optional}>used when a line has no cluster</span></label>
      <input value={defaultCluster} onChange={e => setDefaultCluster(e.target.value)} style={styles.topicInput} placeholder="e.g. Diabetes" />

      <label style={styles.formLabel}>Pages</label>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        style={{ ...styles.textarea, minHeight: 200, fontFamily: 'ui-monospace, monospace', fontSize: 13 }}
        rows={12}
        placeholder={`Signs of type 2 diabetes | https://site.co.za/t2d-signs | type 2 diabetes signs | Diabetes
Diabetes and SA medical aid | https://site.co.za/diabetes-aid | diabetes medical aid | Diabetes
Menopause symptoms in your 40s | | menopause symptoms 40s | Menopause`}
      />

      <div style={styles.formActions}>
        <button style={styles.secondaryBtn} onClick={onClose}>Cancel</button>
        <button style={styles.primaryBtn} onClick={parse} disabled={!text.trim()}>
          <Plus size={15} /> Add all
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const globalCss = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  * { box-sizing: border-box; }
  body { margin: 0; }
  textarea, input { font-family: inherit; }
  textarea:focus, input:focus { outline: none; border-color: #2D5F4E !important; }
  button { cursor: pointer; font-family: inherit; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const colors = {
  bg: '#FAF7F2',
  surface: '#FFFFFF',
  ink: '#1A1815',
  inkSoft: '#3D3A33',
  muted: '#6B6657',
  faint: '#9A9486',
  border: '#E0D9C9',
  borderSoft: '#EDE8DD',
  green: '#2D5F4E',
  greenDeep: '#234B3D',
  ochre: '#C77D4A',
  red: '#A14438',
  blue: '#3A5266',
};

const fonts = {
  display: "'Fraunces', 'Iowan Old Style', Georgia, serif",
  body: "'Instrument Sans', -apple-system, system-ui, sans-serif",
};

const styles = {
  app: { minHeight: '100vh', background: colors.bg, color: colors.ink, fontFamily: fonts.body, fontSize: 15, lineHeight: 1.55 },
  loading: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.bg },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '22px 38px', borderBottom: `1px solid ${colors.border}`,
    background: colors.bg, position: 'sticky', top: 0, zIndex: 10,
    backdropFilter: 'blur(8px)', flexWrap: 'wrap', gap: 16,
  },
  brand: { display: 'flex', alignItems: 'center', gap: 14 },
  brandMark: { fontSize: 28, fontFamily: fonts.display, color: colors.green, lineHeight: 1, marginTop: -2 },
  brandTitle: { fontFamily: fonts.display, fontSize: 20, fontWeight: 500, letterSpacing: '-0.01em', lineHeight: 1.1 },
  brandSub: { fontSize: 11, color: colors.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 3, fontWeight: 500 },
  nav: { display: 'flex', gap: 4 },
  navBtn: { display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', border: 'none', background: 'transparent', color: colors.muted, fontSize: 13.5, fontWeight: 500, borderRadius: 8, transition: 'all 0.15s', fontFamily: fonts.body },
  navBtnActive: { background: colors.ink, color: colors.bg },
  badge: { background: colors.ochre, color: colors.bg, fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 8, lineHeight: 1.5, letterSpacing: '0.02em' },
  main: { maxWidth: 1180, margin: '0 auto', padding: '40px 38px 80px' },

  pageHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28, gap: 24, flexWrap: 'wrap' },
  eyebrow: { fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: colors.muted, fontWeight: 500, marginBottom: 8 },
  pageTitle: { fontFamily: fonts.display, fontSize: 44, fontWeight: 400, letterSpacing: '-0.025em', lineHeight: 1, margin: 0, fontVariationSettings: '"opsz" 144' },
  pageSub: { fontSize: 15, color: colors.muted, marginTop: 10, maxWidth: 520, lineHeight: 1.5 },

  primaryBtn: { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 18px', background: colors.ink, color: colors.bg, border: 'none', borderRadius: 999, fontSize: 13.5, fontWeight: 500, letterSpacing: '-0.005em', transition: 'all 0.15s' },
  secondaryBtn: { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 18px', background: 'transparent', color: colors.ink, border: `1px solid ${colors.border}`, borderRadius: 999, fontSize: 13.5, fontWeight: 500 },

  topicBar: { background: colors.surface, padding: '20px 24px', borderRadius: 6, border: `1px solid ${colors.border}`, marginBottom: 24 },
  topicBarRow: { display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' },
  topicInputWrap: { flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: 6 },
  topicInputLabel: { fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.muted, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 },
  topicInput: { padding: '11px 14px', fontSize: 15, border: `1px solid ${colors.border}`, borderRadius: 4, fontFamily: fonts.body, background: colors.bg, color: colors.ink },
  countWrap: { flex: '0 1 200px', display: 'flex', flexDirection: 'column', gap: 6 },
  countBadgeInline: { background: colors.ink, color: colors.bg, padding: '1px 7px', borderRadius: 999, fontSize: 10, fontWeight: 500, letterSpacing: 0, textTransform: 'none', marginLeft: 'auto' },

  subTabRow: { display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${colors.borderSoft}` },
  subTab: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 16px', background: 'transparent', border: 'none', borderBottom: '2px solid transparent', fontSize: 14, color: colors.muted, fontWeight: 500, marginBottom: -1 },
  subTabActive: { color: colors.ink, borderBottomColor: colors.ink },
  subTabBadge: { background: colors.ochre, color: colors.bg, fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 8, letterSpacing: '0.02em' },

  filterRow: { display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' },
  filterBtn: { padding: '6px 14px', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 999, fontSize: 12.5, color: colors.muted, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 7 },
  filterBtnActive: { background: colors.ink, color: colors.bg, borderColor: colors.ink },
  filterCount: { fontSize: 11, opacity: 0.65 },

  // Dense topic list
  topicListDense: { display: 'flex', flexDirection: 'column', gap: 1 },
  topicRow: {
    background: colors.surface, border: `1px solid ${colors.border}`,
    borderRadius: 4, transition: 'border-color 0.15s',
    animation: 'fadeIn 0.25s ease',
  },
  topicRowExpanded: { borderColor: colors.ink },
  topicRowMain: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' },
  expandBtn: { padding: 4, background: 'transparent', border: 'none', color: colors.muted, borderRadius: 4, display: 'flex' },
  statusDot: { width: 7, height: 7, borderRadius: '50%', flexShrink: 0 },
  topicRowText: { flex: 1, minWidth: 0 },
  topicRowTitle: { fontFamily: fonts.display, fontSize: 16, fontWeight: 500, letterSpacing: '-0.012em', lineHeight: 1.3, color: colors.ink, marginBottom: 3 },
  topicRowMeta: { display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: colors.muted, letterSpacing: '0.01em', flexWrap: 'wrap' },
  cardCategory: { fontWeight: 500, color: colors.inkSoft, textTransform: 'capitalize' },
  cardDot: { color: colors.faint },
  cardEffort: { textTransform: 'capitalize' },
  kwTag: { background: colors.bg, color: colors.muted, padding: '1px 7px', borderRadius: 3, fontSize: 11, border: `1px solid ${colors.borderSoft}` },
  topicRowActions: { display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 },
  writingChip: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', background: '#EAF1ED', color: colors.green, fontSize: 11.5, fontWeight: 500, borderRadius: 999, textTransform: 'lowercase', letterSpacing: '0.02em' },
  doneChip: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: colors.green, color: colors.bg, fontSize: 11.5, fontWeight: 500, borderRadius: 999, letterSpacing: '0.02em' },
  topicExpand: { padding: '0 16px 14px 38px', borderTop: `1px solid ${colors.borderSoft}`, paddingTop: 12, marginTop: 0 },
  expandRow: { display: 'flex', gap: 12, marginBottom: 7, fontSize: 13 },
  expandLabel: { fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: colors.muted, fontWeight: 600, width: 92, flexShrink: 0, paddingTop: 2 },
  expandValue: { color: colors.inkSoft, flex: 1, lineHeight: 1.5 },
  expandActions: { marginTop: 10, display: 'flex', gap: 10 },
  linkBtn: { display: 'inline-flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', color: colors.muted, fontSize: 12, padding: '4px 0' },

  iconActionBtn: { width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: '50%', color: colors.inkSoft, padding: 0 },
  iconActionPrimary: { background: colors.green, color: colors.bg, borderColor: colors.green },
  iconBtn: { padding: 6, background: 'transparent', border: 'none', color: colors.muted, borderRadius: 4 },
  iconBtnSmall: { padding: 5, background: 'transparent', border: `1px solid ${colors.border}`, color: colors.muted, borderRadius: 4, display: 'flex', alignItems: 'center', flexShrink: 0 },

  draftList: { display: 'flex', flexDirection: 'column', gap: 2 },
  draftRow: { background: colors.surface, padding: '22px 24px', border: `1px solid ${colors.border}`, borderRadius: 4, display: 'flex', gap: 16, alignItems: 'center', cursor: 'pointer', transition: 'border-color 0.15s' },
  draftLeft: { flex: 1, minWidth: 0 },
  draftMeta: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: colors.muted, marginBottom: 8, letterSpacing: '0.02em' },
  draftTitle: { fontFamily: fonts.display, fontSize: 22, fontWeight: 500, letterSpacing: '-0.018em', lineHeight: 1.2, margin: '0 0 6px', fontVariationSettings: '"opsz" 60' },
  draftPreview: { fontSize: 14, color: colors.muted, margin: 0, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' },
  draftActions: { display: 'flex', gap: 8, flexShrink: 0 },

  promptGrid: { display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' },
  promptCard: { background: colors.surface, padding: 22, border: `1px solid ${colors.border}`, borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 12 },
  promptName: { fontFamily: fonts.display, fontSize: 19, fontWeight: 500, margin: 0, letterSpacing: '-0.015em' },
  promptText: { fontSize: 12.5, color: colors.inkSoft, lineHeight: 1.55, fontFamily: fonts.body, margin: 0, padding: '12px 14px', background: colors.bg, borderRadius: 4, whiteSpace: 'pre-wrap', border: `1px solid ${colors.borderSoft}`, maxHeight: 140, overflow: 'auto' },
  cardActions: { display: 'flex', gap: 8, marginTop: 'auto', justifyContent: 'flex-end' },
  actionBtn: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 999, fontSize: 12.5, color: colors.inkSoft, fontWeight: 500 },
  actionBtnPrimary: { background: colors.green, color: colors.bg, borderColor: colors.green },
  inputInline: { width: '100%', padding: '10px 12px', fontSize: 16, border: `1px solid ${colors.border}`, borderRadius: 4, fontFamily: fonts.display, fontWeight: 500, marginBottom: 10, background: colors.bg },
  textareaInline: { width: '100%', padding: 12, fontSize: 13.5, border: `1px solid ${colors.border}`, borderRadius: 4, fontFamily: fonts.body, lineHeight: 1.5, marginBottom: 10, background: colors.bg, resize: 'vertical' },

  settingsGrid: { display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))' },
  settingsBlock: { background: colors.surface, padding: 24, border: `1px solid ${colors.border}`, borderRadius: 4 },
  settingsLabel: { display: 'block', fontFamily: fonts.display, fontSize: 18, fontWeight: 500, marginBottom: 4, letterSpacing: '-0.015em' },
  settingsHint: { fontSize: 13, color: colors.muted, marginBottom: 14, lineHeight: 1.5 },
  settingsArea: { width: '100%', padding: 14, fontSize: 13.5, lineHeight: 1.6, border: `1px solid ${colors.border}`, borderRadius: 4, fontFamily: fonts.body, background: colors.bg, resize: 'vertical', color: colors.inkSoft },

  empty: { background: colors.surface, padding: '60px 32px', border: `1px dashed ${colors.border}`, borderRadius: 4, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 22, fontWeight: 500, letterSpacing: '-0.015em' },
  emptyHint: { fontSize: 14, color: colors.muted, maxWidth: 360 },

  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(26, 24, 21, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20, animation: 'fadeIn 0.18s ease', backdropFilter: 'blur(4px)' },
  modalBox: { background: colors.bg, borderRadius: 6, maxWidth: 760, width: '100%', maxHeight: '92vh', overflow: 'auto', border: `1px solid ${colors.border}`, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' },
  formPanel: { padding: '32px 36px' },
  formTitle: { fontFamily: fonts.display, fontSize: 28, fontWeight: 500, letterSpacing: '-0.022em', margin: '0 0 8px', fontVariationSettings: '"opsz" 96' },
  formSub: { fontSize: 14, color: colors.muted, margin: '0 0 24px' },
  formLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.muted, fontWeight: 600, marginTop: 18, marginBottom: 8 },
  slider: { width: '100%', accentColor: colors.green, marginBottom: 0 },
  textarea: { width: '100%', padding: 14, fontSize: 14, lineHeight: 1.5, border: `1px solid ${colors.border}`, borderRadius: 4, fontFamily: fonts.body, background: colors.surface, resize: 'vertical', marginBottom: 4, color: colors.ink },
  formActions: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 28 },

  draftViewPanel: { padding: '28px 36px 32px', display: 'flex', flexDirection: 'column', maxHeight: '92vh' },
  draftViewHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, gap: 16 },
  draftViewEyebrow: { fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: colors.muted, fontWeight: 500, marginBottom: 6 },
  metaPreview: { fontSize: 13, color: colors.muted, fontStyle: 'italic', margin: '6px 0 0', maxWidth: 540 },
  draftContent: { flex: 1, overflow: 'auto', background: colors.surface, borderRadius: 4, padding: '28px 32px', border: `1px solid ${colors.border}` },
  draftEditor: { flex: 1, width: '100%', padding: '20px 24px', fontSize: 14, lineHeight: 1.65, border: `1px solid ${colors.border}`, borderRadius: 4, fontFamily: fonts.body, background: colors.surface, resize: 'vertical', minHeight: 400, color: colors.ink },
  draftViewActions: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18, flexWrap: 'wrap' },

  // WordPress export
  exportFields: { display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginBottom: 18 },
  exportField: { background: colors.surface, padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 4 },
  exportFieldLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.muted, fontWeight: 600, marginBottom: 4 },
  exportFieldRow: { display: 'flex', gap: 8, alignItems: 'flex-start' },
  exportFieldValue: { flex: 1, fontSize: 13, color: colors.inkSoft, lineHeight: 1.4, wordBreak: 'break-word' },
  exportFieldMulti: { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  exportTabRow: { display: 'flex', gap: 2, marginBottom: 0, borderBottom: `1px solid ${colors.borderSoft}` },
  codePanel: { background: colors.ink, borderRadius: 4, marginTop: -1, marginBottom: 14, maxHeight: 280, overflow: 'auto' },
  codeBlock: { color: '#E8E2D7', fontFamily: 'ui-monospace, monospace', fontSize: 12, lineHeight: 1.55, padding: '16px 18px', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  exportHint: { fontSize: 12.5, color: colors.muted, lineHeight: 1.5, padding: '10px 14px', background: '#F5EFE4', borderRadius: 4, marginBottom: 14, border: `1px solid ${colors.border}` },

  loadingPanel: { padding: '48px 36px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 },
  loadingMsg: { fontFamily: fonts.display, fontSize: 22, fontWeight: 500, margin: '8px 0 0', letterSpacing: '-0.015em' },
  loadingSub: { fontSize: 13, color: colors.muted, margin: '0 0 12px' },
  errorDetail: { fontSize: 12.5, color: colors.inkSoft, background: colors.surface, padding: '12px 14px', borderRadius: 4, border: `1px solid ${colors.border}`, maxWidth: 560, width: '100%', textAlign: 'left', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'ui-monospace, monospace', lineHeight: 1.5, margin: '0 0 4px' },

  toast: { position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: colors.ink, color: colors.bg, padding: '10px 20px', borderRadius: 999, fontSize: 13.5, fontWeight: 500, zIndex: 100, animation: 'fadeIn 0.2s ease', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' },
  toastSuccess: { background: colors.green },
  toastError: { background: colors.red },

  // Train view
  trainSummary: { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, padding: '18px 24px', marginBottom: 24 },
  trainSummaryRow: { display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' },
  trainStat: { display: 'flex', flexDirection: 'column', gap: 2 },
  trainStatNum: { fontFamily: fonts.display, fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1, color: colors.ink, fontVariationSettings: '"opsz" 96' },
  trainStatLabel: { fontSize: 11, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 },
  trainActions: { display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginBottom: 32 },
  trainActionCard: {
    background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 4,
    padding: '20px 22px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8,
    color: colors.ink, fontFamily: fonts.body, transition: 'border-color 0.15s, transform 0.15s',
  },
  trainActionDisabled: { opacity: 0.55, cursor: 'not-allowed' },
  trainActionTitle: { fontFamily: fonts.display, fontSize: 18, fontWeight: 500, letterSpacing: '-0.015em', lineHeight: 1.2, marginTop: 4 },
  trainActionSub: { fontSize: 13, color: colors.muted, lineHeight: 1.5 },
  trainLog: { display: 'flex', flexDirection: 'column', gap: 14 },
  trainCard: { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, padding: '20px 22px', animation: 'fadeIn 0.25s ease' },
  trainCardHeader: { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  trainCardIcon: { width: 28, height: 28, borderRadius: '50%', background: colors.bg, border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.green, flexShrink: 0 },
  trainCardKind: { fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.muted, fontWeight: 600, marginBottom: 3 },
  trainCardTitle: { fontFamily: fonts.display, fontSize: 17, fontWeight: 500, letterSpacing: '-0.012em', lineHeight: 1.3, color: colors.ink },
  trainCardTime: { fontSize: 11.5, color: colors.muted, flexShrink: 0, paddingTop: 4 },
  trainSampleBox: { background: colors.bg, borderRadius: 4, padding: '14px 16px', border: `1px solid ${colors.borderSoft}`, marginBottom: 12 },
  trainSamplePreview: { fontSize: 13.5, color: colors.inkSoft, lineHeight: 1.6 },
  trainSampleTruncated: { fontSize: 13.5, color: colors.inkSoft, lineHeight: 1.6 },
  feedbackBlock: { marginTop: 14, paddingLeft: 14, borderLeft: `2px solid ${colors.borderSoft}` },
  feedbackQuote: { marginBottom: 10 },
  feedbackLabel: { fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.muted, fontWeight: 600, marginBottom: 4 },
  feedbackText: { fontSize: 14, color: colors.inkSoft, fontStyle: 'italic', fontFamily: fonts.display, lineHeight: 1.5 },
  feedbackInputWrap: { marginTop: 12 },
  feedbackOpenBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'transparent', border: `1px dashed ${colors.border}`, borderRadius: 4, fontSize: 13, color: colors.muted, fontWeight: 500 },
  patchList: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 },
  patchCard: { background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 4, padding: '14px 16px', borderLeftWidth: 3, borderLeftColor: colors.ochre },
  patchCardApplied: { borderLeftColor: colors.green, background: '#EAF1ED' },
  patchHeader: { marginBottom: 8 },
  patchBadge: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', background: colors.surface, color: colors.ochre, fontSize: 10.5, fontWeight: 600, borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.06em', border: `1px solid ${colors.border}` },
  patchBadgeApplied: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', background: colors.green, color: colors.bg, fontSize: 10.5, fontWeight: 600, borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.06em' },
  patchDiagnosis: { fontSize: 13, color: colors.inkSoft, lineHeight: 1.5, marginBottom: 8, fontStyle: 'italic' },
  patchText: { fontSize: 13.5, color: colors.ink, lineHeight: 1.55, padding: '10px 12px', background: colors.surface, borderRadius: 3, border: `1px solid ${colors.borderSoft}`, margin: '0 0 8px', whiteSpace: 'pre-wrap', fontFamily: fonts.body },
  patchEditor: { width: '100%', padding: '10px 12px', fontSize: 13.5, lineHeight: 1.55, border: `1px solid ${colors.border}`, borderRadius: 3, fontFamily: fonts.body, background: colors.surface, marginBottom: 8, resize: 'vertical', color: colors.ink },
  patchRationale: { fontSize: 12, color: colors.muted, lineHeight: 1.5, marginBottom: 10 },
  patchActions: { display: 'flex', gap: 6, justifyContent: 'flex-end' },

  select: { width: '100%', padding: '11px 14px', fontSize: 14, border: `1px solid ${colors.border}`, borderRadius: 4, fontFamily: fonts.body, background: colors.surface, color: colors.ink, marginBottom: 4 },
  segmented: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  segmentedBtn: { padding: '7px 14px', background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 999, fontSize: 13, color: colors.inkSoft, fontWeight: 500 },
  segmentedBtnActive: { background: colors.ink, color: colors.bg, borderColor: colors.ink },
  topicPreview: { background: colors.surface, padding: '14px 16px', borderRadius: 4, border: `1px solid ${colors.border}` },
  topicPreviewLabel: { fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.muted, fontWeight: 600, marginBottom: 6 },
  topicPreviewAngle: { fontSize: 13.5, color: colors.inkSoft, lineHeight: 1.5, fontStyle: 'italic', fontFamily: fonts.display },

  // Markdown rendering
  mdH1: { fontFamily: fonts.display, fontSize: 30, fontWeight: 500, letterSpacing: '-0.022em', margin: '0 0 18px', lineHeight: 1.15, fontVariationSettings: '"opsz" 96' },
  mdH2: { fontFamily: fonts.display, fontSize: 22, fontWeight: 500, letterSpacing: '-0.018em', margin: '28px 0 12px', lineHeight: 1.2, fontVariationSettings: '"opsz" 60' },
  mdH3: { fontFamily: fonts.display, fontSize: 17, fontWeight: 500, letterSpacing: '-0.012em', margin: '22px 0 8px', lineHeight: 1.25 },
  mdP: { margin: '0 0 14px', lineHeight: 1.65, color: colors.inkSoft, fontSize: 15 },
  mdList: { margin: '0 0 16px', paddingLeft: 22 },
  mdLi: { margin: '0 0 6px', lineHeight: 1.6, color: colors.inkSoft },
  mdLink: { color: colors.green, textDecoration: 'underline', textDecorationThickness: 1, textUnderlineOffset: 2 },
  mdCode: { fontFamily: 'ui-monospace, monospace', fontSize: 13, background: colors.bg, padding: '1px 5px', borderRadius: 3, color: colors.ink },
  mdBlockquote: { margin: '14px 0', padding: '12px 18px', borderLeft: `3px solid ${colors.green}`, background: colors.bg, fontStyle: 'italic', color: colors.inkSoft, borderRadius: 2 },

  // Sitemap / topical authority
  statsStrip: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 1, background: colors.border, border: `1px solid ${colors.border}`, borderRadius: 6, overflow: 'hidden', marginBottom: 28 },
  statBox: { background: colors.surface, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 4 },
  statValue: { fontFamily: fonts.display, fontSize: 30, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1, fontVariationSettings: '"opsz" 96' },
  statLabel: { fontSize: 11.5, color: colors.muted, fontWeight: 500, letterSpacing: '0.03em', textTransform: 'uppercase' },
  clusterList: { display: 'flex', flexDirection: 'column', gap: 12 },
  clusterCard: { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, overflow: 'hidden' },
  clusterHead: { display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', cursor: 'pointer', userSelect: 'none', flexWrap: 'wrap' },
  clusterTitle: { fontFamily: fonts.display, fontSize: 22, fontWeight: 500, letterSpacing: '-0.018em', margin: 0, lineHeight: 1.2, fontVariationSettings: '"opsz" 60' },
  clusterMeta: { display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' },
  clusterChip: { fontSize: 10.5, fontWeight: 600, padding: '3px 9px', borderRadius: 999, letterSpacing: '0.02em', textTransform: 'uppercase' },
  clusterTotal: { fontSize: 11.5, color: colors.muted, marginLeft: 6 },
  clusterBody: { padding: '0 20px 18px 50px', borderTop: `1px solid ${colors.borderSoft}` },
  bucketLabel: { fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.muted, fontWeight: 600, marginTop: 16, marginBottom: 8 },
  sitemapItem: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: `1px solid ${colors.borderSoft}` },
  sitemapItemMain: { flex: 1, minWidth: 0 },
  sitemapItemTitle: { fontSize: 14, color: colors.ink, lineHeight: 1.4, marginBottom: 3 },
  sitemapItemMeta: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: colors.muted, flexWrap: 'wrap' },
  sitemapLink: { display: 'inline-flex', alignItems: 'center', gap: 3, color: colors.green, textDecoration: 'none', fontSize: 11 },
  sitemapActions: { display: 'flex', gap: 4, flexShrink: 0 },
  clusterPills: { display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 },
  clusterPill: { padding: '4px 10px', fontSize: 11.5, background: colors.bg, color: colors.inkSoft, border: `1px solid ${colors.border}`, borderRadius: 999, cursor: 'pointer', fontFamily: fonts.body },
};
