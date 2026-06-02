'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, Sprout, Newspaper, Library, Settings, BookOpen,
  Plus, Check, X, Edit3, Trash2, Copy, RefreshCw,
  Loader2, ChevronRight, ChevronDown, AlertCircle, Search,
  ArrowRight, Save, Download, MoreHorizontal, Sparkles,
  ExternalLink, FileCode, GraduationCap, Beaker, Wand2,
  MessageSquare, Lightbulb, RotateCcw, Network, Globe,
  Zap, Rocket, Eye, Menu, Home, Calendar, TrendingUp
} from 'lucide-react';
import { EVERGREEN_BLUEPRINT } from '../lib/evergreenBlueprint';

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

const CATEGORIES = [
  { id: 'fitness', label: 'Fitness' },
  { id: 'nutrition', label: 'Nutrition' },
  { id: 'mental_health', label: 'Mental health' },
  { id: 'health_guides', label: 'Health guides' },
  { id: 'beauty', label: 'Beauty' },
];

const DEFAULT_CATEGORY_TRAINING = {
  fitness: `FITNESS content rules:
- Speak to a wide range of readers — not just gym-goers. Walking, dancing, running, home workouts all count.
- Reference SA-relevant: parkrun, hiking trails (Table Mountain, Drakensberg), local sports clubs, the cost barrier of gym membership.
- Cite SA Sports Medicine Association, ACSM (Am. College of Sports Medicine), or peer-reviewed exercise physiology where relevant.
- Avoid body-shape language. Focus on capability, energy, longevity, function.
- Always include safety notes for beginners, people over 50, or those with conditions.
- No fad workouts or unproven protocols. Be sceptical of TikTok fitness trends.`,
  nutrition: `NUTRITION content rules:
- Reference locally-available foods first: pap, samp, beans, morogo, biltong, amasi, sweet potatoes, peanuts, eggs, tinned pilchards, butternut.
- Cite SA-specific bodies: ADSA (Association for Dietetics in SA), HPCSA dietitians, NICUS (Nutrition Information Centre at Stellenbosch).
- Acknowledge cost — "affordable protein swaps", not just imported quinoa.
- Avoid moral language about food ("clean", "guilty", "cheat"). Use neutral descriptors.
- Be specific with quantities (grams, ml, cups) but flexible — not everyone weighs food.
- Reject fad diets. Detoxes, juice cleanses, extreme restriction = always pushed back on with evidence.`,
  mental_health: `MENTAL HEALTH content rules:
- Always include SADAG: 0800 567 567. Also Lifeline 0861 322 322 and Suicide Crisis Line 0800 567 567.
- Never dramatise. No "battle with depression" language. Use "lives with" or "experiences".
- Person-first: "a person with bipolar disorder", not "a bipolar".
- Acknowledge SA-specific stressors: load-shedding fatigue, crime anxiety, job insecurity, generational trauma.
- Be aware of cultural stigma — frame help-seeking as strength, not weakness.
- Cite SA bodies: SASOP (SA Society of Psychiatrists), Psychological Society of SA, SADAG.
- For severe topics (suicide, self-harm, eating disorders): keep methods vague, foreground help resources.`,
  health_guides: `HEALTH GUIDES content rules:
- Comprehensive but skimmable. Use clear H2 subheads matching what readers actually search.
- Always reference SA healthcare context: medical aid vs public clinics, GP referrals, specialist costs.
- Cite SA Dept of Health, NICD, SAMRC, HPCSA, Heart and Stroke Foundation SA, CANSA, Diabetes SA.
- Note when something requires a doctor — public clinic or private — and roughly what tests cost.
- For chronic conditions, acknowledge the load on SA's healthcare system honestly.
- Include "when to see a doctor" box with specific red flags.`,
  beauty: `BEAUTY content rules:
- Be sceptical of marketing claims. If a product or ingredient is hyped, look for the actual evidence.
- Reference SA climate realities: high UV, dry inland air, humid coast, hard water in many areas.
- Acknowledge skin tone diversity — products that work for fair skin don't always suit deeper tones (and vice versa).
- Reference dermatologists registered with HPCSA, SA Society of Dermatology.
- Mention price points in Rands. Note which products are in Clicks/Dis-Chem vs imported specialty.
- Avoid promoting unrealistic standards. Focus on skin/hair health, not "fixing" perceived flaws.`,
};

// ============================================================================
// STORAGE
// ============================================================================

// Server-backed storage via /api/data/:key — auth is enforced by the API.
const storage = {
  async get(key, fallback) {
    if (typeof window === 'undefined') return fallback;
    try {
      const res = await fetch(`/api/data/${encodeURIComponent(key)}`, { credentials: 'same-origin' });
      if (!res.ok) return fallback;
      const data = await res.json();
      return data.value === null || data.value === undefined ? fallback : data.value;
    } catch { return fallback; }
  },
  async set(key, value) {
    if (typeof window === 'undefined') return false;
    try {
      const res = await fetch(`/api/data/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ value }),
      });
      return res.ok;
    } catch (e) { console.error('Storage set failed', e); return false; }
  }
};

// Activity logger — fire-and-forget
async function logAction(action, metadata = {}) {
  try {
    await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action, metadata }),
    });
  } catch {}
}

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
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }]
  };
  if (useWebSearch) {
    body.tools = [{ type: 'web_search_20260209', name: 'web_search' }];
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

  // Parse Server-Sent Events stream from Anthropic
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulatedText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const event of events) {
      let dataStr = '';
      for (const line of event.split('\n')) {
        if (line.startsWith('data: ')) dataStr = line.slice(6);
      }
      if (!dataStr || dataStr === '[DONE]') continue;

      try {
        const parsed = JSON.parse(dataStr);
        if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
          accumulatedText += parsed.delta.text;
        } else if (parsed.type === 'error') {
          throw new Error(`Stream error: ${parsed.error?.message || 'unknown error mid-stream'}`);
        }
      } catch (e) {
        if (typeof e?.message === 'string' && e.message.startsWith('Stream error')) throw e;
        // Otherwise ignore — likely just a non-JSON event we don't care about
      }
    }
  }

  if (!accumulatedText.trim()) {
    throw new Error('Claude returned no text. Try again, reduce count, or disable web search.');
  }
  return accumulatedText;
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
      const m = line.match(/^(TITLE|META|EXCERPT|TAGS|CATEGORY|IMAGE_QUERY):\s*(.+)$/i);
      if (m) fields[m[1].toLowerCase().replace('image_query', 'imageQuery')] = m[2].trim();
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
  const [view, setView] = useState('dashboard');
  const [topics, setTopics] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [libraryItems, setLibraryItems] = useState([]);
  const [prompts, setPrompts] = useState(DEFAULT_PROMPTS);
  const [settings, setSettings] = useState({ instructions: DEFAULT_INSTRUCTIONS, style: DEFAULT_STYLE });
  const [trainingEvents, setTrainingEvents] = useState([]);
  const [sitePages, setSitePages] = useState([]);
  const [categoryTraining, setCategoryTraining] = useState(DEFAULT_CATEGORY_TRAINING);
  const [seeds, setSeeds] = useState({ evergreen: '', news: '', mythbusting: '' });
  const [wpStatus, setWpStatus] = useState({ connected: false, checking: true });
  const [loaded, setLoaded] = useState(false);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [theme, setTheme] = useState('light');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Load saved theme on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') setTheme(saved);
      else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark');
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem('theme', theme); } catch {}
  }, [theme]);

  // Auth state
  const [authStatus, setAuthStatus] = useState({ checking: true, user: null, hasUsers: true });
  const isAdmin = authStatus.user?.role === 'admin';
  const isEditor = authStatus.user?.role === 'editor';
  const isContributor = authStatus.user?.role === 'contributor';
  const canApprove = isAdmin || isEditor;

  // Load fonts
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(link); } catch {} };
  }, []);

  // Auth check on mount
  useEffect(() => {
    (async () => {
      try {
        // First check if any users exist
        const setupRes = await fetch('/api/setup');
        const setupData = await setupRes.json();
        if (!setupData.hasUsers) {
          setAuthStatus({ checking: false, user: null, hasUsers: false });
          return;
        }
        // Then check current session
        const meRes = await fetch('/api/auth/me', { credentials: 'same-origin' });
        if (meRes.ok) {
          const { user } = await meRes.json();
          setAuthStatus({ checking: false, user, hasUsers: true });
        } else {
          setAuthStatus({ checking: false, user: null, hasUsers: true });
        }
      } catch (e) {
        setAuthStatus({ checking: false, user: null, hasUsers: true, error: e.message });
      }
    })();
  }, []);

  // Load from storage with migration — only after auth check
  useEffect(() => {
    if (!authStatus.user) return;
    (async () => {
      const [t, d, l, p, s, te, sp, ct] = await Promise.all([
        storage.get('topics', []),
        storage.get('drafts', []),
        storage.get('library', []),
        storage.get('prompts', DEFAULT_PROMPTS),
        storage.get('settings', { instructions: DEFAULT_INSTRUCTIONS, style: DEFAULT_STYLE }),
        storage.get('training', []),
        storage.get('sitePages', []),
        storage.get('categoryTraining', DEFAULT_CATEGORY_TRAINING)
      ]);
      // Migrate: any item without type becomes evergreen; old categories → new
      const migrateCategory = (cat) => {
        if (!cat) return 'health_guides';
        const c = String(cat).toLowerCase();
        if (['fitness', 'nutrition', 'mental_health', 'health_guides', 'beauty'].includes(c)) return c;
        if (c === 'wellness') return 'health_guides';
        if (c === 'mens' || c === "men's") return 'health_guides';
        if (c === 'womens' || c === "women's") return 'health_guides';
        return 'health_guides';
      };
      setTopics(t.map(x => ({ ...x, type: x.type || 'evergreen', category: migrateCategory(x.category) })));
      setDrafts(d.map(x => ({ ...x, type: x.type || 'evergreen', category: migrateCategory(x.category) })));
      setLibraryItems(l.map(x => ({ ...x, type: x.type || 'evergreen', category: migrateCategory(x.category) })));
      setPrompts(p);
      setSettings(s);
      setTrainingEvents(te);
      setSitePages(sp.map(x => ({ ...x, category: migrateCategory(x.category) })));
      setCategoryTraining({ ...DEFAULT_CATEGORY_TRAINING, ...ct });
      setLoaded(true);
    })();
  }, [authStatus.user]);

  // Check WordPress connection — only after auth
  useEffect(() => {
    if (!authStatus.user) return;
    (async () => {
      try {
        const res = await fetch('/api/wordpress', { credentials: 'same-origin' });
        const data = await res.json();
        setWpStatus({ ...data, checking: false });
      } catch (e) {
        setWpStatus({ connected: false, checking: false, reason: 'fetch_failed', detail: e.message });
      }
    })();
  }, [authStatus.user]);

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
  const publishDraft = async (draft, options = {}) => {
    // Optionally learn from edits before publishing
    if (options.learnFromEdits && options.originalContent && options.originalContent.trim() !== draft.content.trim()) {
      await learnFromEdits(options.originalContent, draft.content, draft.category, draft.title);
    }
    const published = { ...draft, status: 'published', publishedAt: Date.now() };
    setLibraryItems(prev => {
      const next = [published, ...prev];
      storage.set('library', next);
      return next;
    });
    deleteDraft(draft.id);
    logAction('draft.approve', { draftId: draft.id, title: draft.title, type: draft.type, learnedFromEdits: !!options.learnFromEdits });
    setModal(null);
    showToast('Published to library', 'success');
  };
  const deleteLibraryItem = (id) => {
    setLibraryItems(prev => {
      const item = prev.find(i => i.id === id);
      const next = prev.filter(i => i.id !== id);
      storage.set('library', next);
      if (item) logAction('library.delete', { title: item.title });
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

  // ---- deployed toggle (library items) ----
  const toggleDeployed = (id) => {
    setLibraryItems(prev => {
      const item = prev.find(i => i.id === id);
      const next = prev.map(i => i.id === id ? { ...i, deployed: !i.deployed, deployedAt: !i.deployed ? Date.now() : null } : i);
      storage.set('library', next);
      if (item) logAction('library.toggle_deployed', { title: item.title, deployed: !item.deployed });
      return next;
    });
  };

  // ---- push an article to WordPress as a draft, then mark deployed ----
  const pushToWordPress = async (item) => {
    setModal({ type: 'loading', message: `Finding a relevant image for "${item.title}"…` });
    const categoryLabelMap = {
      fitness: 'Fitness', nutrition: 'Nutrition', mental_health: 'Mental health',
      health_guides: 'Health guides', beauty: 'Beauty'
    };

    // Try to find a featured image via Pexels (non-blocking)
    let chosenImage = null;
    const imageQuery = item.imageQuery || item.keyword || item.title;
    try {
      const imgRes = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: imageQuery, orientation: 'landscape', count: 5 }),
      });
      if (imgRes.ok) {
        const imgData = await imgRes.json();
        if (imgData.photos && imgData.photos.length) {
          chosenImage = imgData.photos[0];
        }
      }
    } catch {}

    setModal({
      type: 'loading',
      message: chosenImage
        ? `Pushing to WordPress with image by ${chosenImage.photographer}…`
        : `Pushing "${item.title}" to WordPress as a draft (no image)…`
    });

    try {
      const html = mdToHtml(item.content).replace(/^<h1>[\s\S]*?<\/h1>\n?/, '');
      const res = await fetch('/api/wordpress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title,
          content: html,
          excerpt: item.excerpt || '',
          categoryName: categoryLabelMap[item.category] || item.category,
          tags: item.tags || [],
          meta: item.meta || '',
          imageUrl: chosenImage?.large2x || chosenImage?.url || null,
          imageAlt: chosenImage?.alt || item.title,
          imageCredit: chosenImage ? `Photo by ${chosenImage.photographer} on Pexels` : '',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || `Push failed (${res.status})`);
      }
      setLibraryItems(prev => {
        const next = prev.map(i => i.id === item.id ? {
          ...i,
          deployed: true,
          deployedAt: Date.now(),
          wpPostId: data.id,
          wpEditUrl: data.editUrl,
          wpLink: data.link,
          featuredImage: chosenImage ? {
            url: chosenImage.url,
            thumb: chosenImage.thumb,
            photographer: chosenImage.photographer,
            photographerUrl: chosenImage.photographerUrl,
          } : null,
        } : i);
        storage.set('library', next);
        return next;
      });
      setModal(null);
      const msg = chosenImage
        ? `Pushed to WordPress with image by ${chosenImage.photographer}`
        : 'Pushed to WordPress (no image — set PEXELS_API_KEY to auto-add)';
      logAction('library.push_wp', { title: item.title, wpPostId: data.id, hasImage: !!chosenImage });
      showToast(msg, 'success');
    } catch (e) {
      setModal({ type: 'error', message: e.message });
    }
  };

  // ---- category training save ----
  const saveCategoryTraining = (next) => {
    setCategoryTraining(next);
    storage.set('categoryTraining', next);
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
        url: item.url || '',
        status
      });
    };
    sitePages.forEach(p => addToCluster(p, 'LIVE'));
    topics.filter(t => t.status === 'pending' || t.status === 'writing' || t.status === 'written')
      .forEach(t => addToCluster(t, 'PLANNED'));
    drafts.forEach(d => addToCluster(d, 'DRAFT'));
    libraryItems.forEach(l => addToCluster(l, l.deployed ? 'DEPLOYED' : 'READY'));

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

  // Build a list of internal link targets for article generation (with URLs)
  const buildLinkingContext = () => {
    const targets = [];
    sitePages.forEach(p => { if (p.url) targets.push({ title: p.title, url: p.url, keyword: p.keyword || '', cluster: p.cluster || '' }); });
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
    out += `EXAMPLE of GOOD inline linking:\n`;
    out += `  "If you've been feeling drained lately, [persistent fatigue can be an early sign of low iron](https://example.co.za/iron-deficiency), especially for women under 40."\n\n`;
    out += `EXAMPLE of BAD inline linking (do NOT do this):\n`;
    out += `  "To learn more about iron deficiency, click here."\n`;
    out += `  "We have an article on iron deficiency: Iron Deficiency Symptoms in Women."\n\n`;
    out += `If a target page's topic is clearly covered in your article (mentioned by name or addressed at length), you MUST link to it. Failing to add the required number of inline links is a formatting violation.\n`;
    return out;
  };

  // ---- load the evergreen topical authority blueprint ----
  const loadEvergreenBlueprint = () => {
    // Skip ones already in topics (by title match, evergreen only)
    const existing = new Set(topics.filter(t => t.type === 'evergreen').map(t => t.title.toLowerCase().trim()));
    const newOnes = EVERGREEN_BLUEPRINT.filter(b => !existing.has(b.title.toLowerCase().trim()));
    if (newOnes.length === 0) {
      showToast('All blueprint topics are already loaded', 'info');
      return;
    }
    const stamped = newOnes.map(b => ({
      id: uid(),
      type: 'evergreen',
      title: b.title,
      keyword: b.keyword,
      cluster: b.cluster,
      category: b.category,
      angle: `Comprehensive evergreen guide for the ${b.cluster} cluster. Anchor article aiming for topical authority on "${b.keyword}".`,
      whyEvergreen: `Long-tail evergreen — readers searching this question will keep landing here for years. Part of the ${b.cluster} cluster building topical authority for ${b.category}.`,
      status: 'pending',
      source: 'blueprint',
      createdAt: Date.now(),
    }));
    setTopics(prev => {
      const next = [...stamped, ...prev];
      storage.set('topics', next);
      return next;
    });
    logAction('topic.generate', { count: stamped.length, type: 'evergreen', source: 'blueprint' });
    showToast(`Loaded ${stamped.length} blueprint topics`, 'success');
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
    const useSearch = type === 'news' || type === 'mythbusting';
    const maxT = (type === 'news' || type === 'mythbusting') ? 6000 : 8000;
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
      logAction('topic.generate', { count: newTopics.length, type, seed });
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
      const linkingContext = buildLinkingContext();
      const catTraining = categoryTraining[topic.category] || '';
      const prompt = buildArticlePrompt(topic, settings.instructions, settings.style, linkingContext, catTraining);
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
        cluster: topic.cluster || '',
        imageQuery: parsed.imageQuery || '',
        content: parsed.content || text,
        status: 'pending',
        createdAt: Date.now()
      };
      addDraft(draft);
      updateTopic(topic.id, { status: 'written', draftId: draft.id });
      logAction('draft.write', { draftId: draft.id, topicId: topic.id, type: topic.type, title: draft.title });
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

  // Learn patterns from an approved article — targets the article's category training
  const learnFromApproved = async (item) => {
    setModal({ type: 'loading', message: `Extracting patterns from "${item.title}"…` });
    try {
      const cat = item.category || 'health_guides';
      const catTrainText = categoryTraining[cat] || '';
      const prompt = `This article was approved by the editor as a successful example for the "${cat}" category:

"""
${item.content}
"""

Current training for the "${cat}" category:
"""
${catTrainText || '(empty — no rules yet)'}
"""

General instructions in use:
"""
${settings.instructions}
"""

Identify 2–4 specific patterns this article uses well that AREN'T already captured in the ${cat} category training above. Focus on patterns specific to writing for the "${cat}" category — voice, structure, sourcing, terminology, examples.

Default target: "category" (add to the ${cat} training). Use "instructions" only for patterns that genuinely apply to ALL categories, not just ${cat}.

Return ONLY a JSON array (no preamble, no fences):
[
  {
    "diagnosis": "the specific pattern observed (one sentence)",
    "target": "category" | "instructions" | "style",
    "categoryKey": "${cat}",
    "text": "the rule to add — written as a directive sentence ('Always X', 'Avoid Y', 'When writing about Z, do W')",
    "rationale": "why codifying this matters (one sentence)"
  }
]`;
      const text = await callClaude(prompt, false, 2000);
      const patches = extractJsonArray(text);
      addTrainingEvent({
        kind: 'learn',
        data: {
          itemId: item.id, title: item.title, categoryKey: cat,
          patches: patches.map(p => ({ ...p, id: uid(), status: 'pending', categoryKey: p.categoryKey || cat }))
        }
      });
      setModal(null);
      showToast(`${patches.length} pattern${patches.length === 1 ? '' : 's'} extracted for ${cat}`, 'success');
    } catch (e) {
      setModal({ type: 'error', message: e.message });
    }
  };

  // Learn from editor's revisions — extract patterns from the diff
  const learnFromEdits = async (originalContent, editedContent, category, title) => {
    setModal({ type: 'loading', message: 'Learning from your edits…' });
    try {
      const cat = category || 'health_guides';
      const prompt = `An editor reviewed an AI-generated article and made edits before approving. Compare the two versions and extract the patterns the editor preferred, so future articles in the "${cat}" category automatically apply them.

ORIGINAL AI-GENERATED VERSION:
"""
${originalContent}
"""

EDITOR'S REVISED VERSION:
"""
${editedContent}
"""

Category: ${cat}
Article title: ${title}

Look for what the editor changed and why it matters. Examples:
- Replaced jargon with plainer wording → "Avoid clinical jargon; use everyday phrases the reader uses."
- Added a specific SA reference → "Include at least one SA-specific reference (SAMRC, NICD, local prices, local foods)."
- Reorganised structure → "Lead with the practical takeaway, then explain the science."
- Shortened sections → "Keep H2 sections under 200 words."

Extract 1–3 concise training rules. These will be added to the "${cat}" category training so the AI doesn't repeat the same mistakes.

Return ONLY a JSON array (no preamble, no fences):
[
  {
    "diagnosis": "what the editor changed (one sentence)",
    "target": "category",
    "categoryKey": "${cat}",
    "text": "the rule, written as a directive ('Always X', 'Avoid Y')",
    "rationale": "why this matters for ${cat} (one sentence)"
  }
]`;
      const text = await callClaude(prompt, false, 2000);
      const patches = extractJsonArray(text);
      const event = addTrainingEvent({
        kind: 'learn',
        data: {
          source: 'edits',
          title,
          categoryKey: cat,
          originalContent: originalContent.slice(0, 4000),
          editedContent: editedContent.slice(0, 4000),
          patches: patches.map(p => ({ ...p, id: uid(), status: 'pending', categoryKey: p.categoryKey || cat }))
        }
      });
      setModal(null);
      showToast(`Learned ${patches.length} pattern${patches.length === 1 ? '' : 's'} from your edits`, 'success');
      return event;
    } catch (e) {
      setModal({ type: 'error', message: e.message });
      return null;
    }
  };

  // Apply a patch to instructions, style, or category training
  const applyPatch = (parentEventId, patchId, editedText) => {
    const parent = trainingEvents.find(e => e.id === parentEventId);
    if (!parent) return;
    const patch = (parent.data.patches || []).find(p => p.id === patchId);
    if (!patch) return;
    const finalText = editedText || patch.text;
    const stamp = new Date().toISOString().slice(0, 10);

    if (patch.target === 'category') {
      const cat = patch.categoryKey || parent.data.categoryKey || 'health_guides';
      const current = categoryTraining[cat] || '';
      const newText = current.trim()
        ? `${current.trimEnd()}\n\n[Trained ${stamp}] ${finalText}`
        : `[Trained ${stamp}] ${finalText}`;
      const updated = { ...categoryTraining, [cat]: newText };
      setCategoryTraining(updated);
      storage.set('categoryTraining', updated);
      logAction('category_training.update', { category: cat, addedText: finalText.slice(0, 120) });
      showToast(`Added to ${cat} training`, 'success');
    } else {
      const target = patch.target === 'style' ? 'style' : 'instructions';
      const newSetting = `${settings[target].trimEnd()}\n\n[Trained ${stamp}] ${finalText}`;
      const updated = { ...settings, [target]: newSetting };
      setSettings(updated);
      storage.set('settings', updated);
      logAction('settings.update', { target, addedText: finalText.slice(0, 120) });
      showToast(`Added to ${target}`, 'success');
    }
    // Mark patch applied
    const updatedPatches = parent.data.patches.map(p =>
      p.id === patchId ? { ...p, status: 'applied', appliedText: finalText, appliedAt: Date.now() } : p
    );
    updateTrainingEvent(parentEventId, { data: { ...parent.data, patches: updatedPatches } });
    logAction('training.patch_applied', { target: patch.target, categoryKey: patch.categoryKey });
  };

  const dismissPatch = (parentEventId, patchId) => {
    const parent = trainingEvents.find(e => e.id === parentEventId);
    if (!parent) return;
    const updatedPatches = parent.data.patches.map(p =>
      p.id === patchId ? { ...p, status: 'dismissed' } : p
    );
    updateTrainingEvent(parentEventId, { data: { ...parent.data, patches: updatedPatches } });
  };

  // Auth gating
  if (authStatus.checking) {
    return (
      <div style={styles.loading} data-theme={theme}>
        <style>{globalCss}</style>
        <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--c-green)' }} />
      </div>
    );
  }
  if (!authStatus.hasUsers) {
    return <SetupScreen theme={theme} onComplete={(user) => setAuthStatus({ checking: false, user, hasUsers: true })} />;
  }
  if (!authStatus.user) {
    return <LoginScreen theme={theme} onLogin={(user) => setAuthStatus({ checking: false, user, hasUsers: true })} />;
  }

  if (!loaded) {
    return (
      <div style={styles.loading} data-theme={theme}>
        <style>{globalCss}</style>
        <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--c-green)' }} />
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
    mythbusting: topics.filter(t => t.type === 'mythbusting' && t.status === 'pending').length
              + drafts.filter(d => d.type === 'mythbusting' && d.status === 'pending').length,
    library: libraryItems.length,
  };

  return (
    <div style={styles.app} data-theme={theme}>
      <style>{globalCss}</style>

      <Sidebar
        view={view}
        setView={setView}
        counts={counts}
        currentUser={authStatus.user}
        theme={theme}
        onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={async () => {
          await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
          setAuthStatus({ checking: false, user: null, hasUsers: true });
        }}
      />

      <div style={styles.mainArea}>
        <TopBar onMenuClick={() => setSidebarOpen(true)} currentView={view} />
        <main style={styles.main}>
        {view === 'dashboard' && (
          <DashboardView
            libraryItems={libraryItems}
            drafts={drafts}
            topics={topics}
            currentUser={authStatus.user}
            setView={setView}
          />
        )}

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
            onLoadBlueprint={loadEvergreenBlueprint}
            canApprove={canApprove}
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

        {(view === 'evergreen' || view === 'news' || view === 'mythbusting') && (
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
            canApprove={canApprove}
          />
        )}

        {view === 'library' && (
          <LibraryView
            items={libraryItems}
            onView={(d) => setModal({ type: 'draft', draft: d, fromLibrary: true })}
            onExport={(d) => setModal({ type: 'export', item: d })}
            onDelete={deleteLibraryItem}
            onToggleDeployed={toggleDeployed}
            onPushToWP={pushToWordPress}
            wpStatus={wpStatus}
            canApprove={canApprove}
            showToast={showToast}
          />
        )}

        {view === 'train' && (
          <TrainView
            events={trainingEvents}
            settings={settings}
            drafts={drafts}
            libraryItems={libraryItems}
            categoryTraining={categoryTraining}
            onSaveCategoryTraining={(next) => { saveCategoryTraining(next); showToast('Category training saved', 'success'); }}
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

        {view === 'admin' && isAdmin && (
          <AdminView currentUser={authStatus.user} showToast={showToast} />
        )}

        {view === 'reports' && isAdmin && (
          <ReportsView showToast={showToast} />
        )}
      </main>
      </div>

      {modal && (
        <Modal onClose={() => setModal(null)}>
          {modal.type === 'loading' && <LoadingPanel message={modal.message} />}
          {modal.type === 'error' && <ErrorPanel message={modal.message} onClose={() => setModal(null)} />}
          {modal.type === 'draft' && (
            <DraftView
              draft={modal.draft}
              fromLibrary={modal.fromLibrary}
              onSave={(patch) => updateDraft(modal.draft.id, patch)}
              onPublish={(options) => { publishDraft(modal.draft, options); }}
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

Vary across categories: fitness, nutrition, mental_health, health_guides, beauty.

Return ONLY a JSON array (no markdown fences, no preamble). Each item:
{
  "title": "working title under 65 chars",
  "angle": "one sentence on the take",
  "keyword": "primary SEO keyword (must NOT match any existing keyword above)",
  "cluster": "topical cluster — existing one from the sitemap, or a new cluster name",
  "whyEvergreen": "why this stays relevant year-round",
  "category": "fitness" | "nutrition" | "mental_health" | "health_guides" | "beauty",
  "effort": "quick" | "standard" | "deep"
}`;
  }
  if (type === 'mythbusting') {
    return `${instructions}${siteBlock}

Now generate ${count} MYTH-BUSTING / CLICKBAIT-STYLE article topics${seed ? ` related to: "${seed}"` : ' on SA health misinformation'}.

These are punchy, curiosity-driving pieces that take a common health belief, viral claim, social-media trend, or oft-repeated piece of advice and either confirm, debunk, or nuance it with real evidence. The HOOK is the headline. The PAYOFF is the truth.

Search current SA social trends, TikTok health claims, WhatsApp-forwarded health myths, viral wellness influencers, and popular misconceptions in SA health forums.

Style of headline (mix these patterns):
- "No, [thing people believe] doesn't actually [outcome]"
- "Is [trendy thing] really [good/bad] for you?"
- "What [popular figure or trend] gets wrong about [topic]"
- "Stop doing [X] — here's what works instead"
- "The truth about [hyped ingredient/practice]"
- "Why [common advice] is wrong for South Africans"
- "[Number] [things] about [topic] that aren't true"

Each topic must be tied to a SPECIFIC myth, claim, or trend (not a generic explainer). The article should always land on the evidence-backed answer, never just dunk on people.

Vary across categories: fitness, nutrition, mental_health, health_guides, beauty.

Return ONLY a JSON array (no markdown fences, no preamble). Each item:
{
  "title": "punchy headline under 65 chars",
  "angle": "the actual answer — what evidence really says",
  "keyword": "primary SEO keyword (must NOT match any existing keyword above)",
  "cluster": "topical cluster — existing one from the sitemap, or a new cluster name",
  "theMyth": "the exact claim being debunked, in one sentence",
  "theTruth": "what evidence actually says, in one sentence",
  "category": "fitness" | "nutrition" | "mental_health" | "health_guides" | "beauty",
  "effort": "quick" | "standard" | "deep"
}`;
  }
  // news
  return `${instructions}${siteBlock}

Now generate ${count} NEWS article topics${seed ? ` related to: "${seed}"` : ' on current SA health stories'}.

Search current South African health news, recent peer-reviewed studies (last 60 days), Department of Health announcements, NICD updates, SAMRC research releases, and trending health conversations on SA social media.

Each topic must be tied to a SPECIFIC recent event, study, policy change, season, or trend. No evergreen pieces.

Vary across categories: fitness, nutrition, mental_health, health_guides, beauty.

Return ONLY a JSON array (no markdown fences, no preamble). Each item:
{
  "title": "working title under 65 chars",
  "angle": "one sentence on the take",
  "keyword": "primary SEO keyword (must NOT match any existing keyword above)",
  "cluster": "topical cluster — existing one from the sitemap, or a new cluster name",
  "whyNow": "the specific news hook, study, or trigger with date",
  "source": "the publication or body the hook came from",
  "category": "fitness" | "nutrition" | "mental_health" | "health_guides" | "beauty",
  "effort": "quick" | "standard" | "deep"
}`;
}

function buildArticlePrompt(topic, instructions, style, linkingContext = '', categoryTraining = '') {
  const whyContext = topic.whyEvergreen || topic.whyNow || topic.theMyth || '';
  const myth = topic.theMyth ? `\n- The myth: ${topic.theMyth}` : '';
  const truth = topic.theTruth ? `\n- The evidence-backed truth: ${topic.theTruth}` : '';
  const catBlock = categoryTraining ? `\n\nCATEGORY-SPECIFIC TRAINING for "${topic.category}":\n${categoryTraining}` : '';
  const linkBlock = linkingContext ? `\n\n${linkingContext}` : '';

  let lengthGuide = '1000–1400';
  let typeNote = '';
  if (topic.type === 'news') {
    lengthGuide = '600–900';
  } else if (topic.type === 'mythbusting') {
    lengthGuide = '700–1000';
    typeNote = `\n\nMYTHBUSTING STRUCTURE:\n1. Hook with the myth as a question or bold statement.\n2. Where the claim comes from (the source, the influencer, the cultural pattern).\n3. What the evidence actually says — peer-reviewed studies, SA bodies, experts.\n4. The nuanced truth — usually neither "always" nor "never".\n5. What to do instead (the practical takeaway).\n6. Bottom-line bullets.`;
  }

  return `${instructions}${catBlock}

House style reference:
${style}${linkBlock}

Now write a complete, publication-ready article.

Topic details:
- Title: ${topic.title}
- Angle: ${topic.angle}
- Primary keyword: ${topic.keyword}
- Category: ${topic.category}
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
CATEGORY: <fitness | nutrition | mental_health | health_guides | beauty>
IMAGE_QUERY: <4–6 word stock-photo search query — describe a SCENE, not an abstract concept. When subjects are people, prefer "diverse" or "African" or "multi-ethnic" to suit our SA audience. Examples: "diverse women jogging outdoor sunrise", "African mother cooking healthy meal", "young man meditation home", "fresh leafy vegetables market stall">

---

<the full article in markdown — # for the H1 title, ## for H2 subheads, ### for H3 if needed, **bold**, *italic*, lists with - or 1., links as [text](url), > for the "see a doctor" callout box>

Include all required sections per our house structure: hook, body with H2 subheads every 200–300 words, bottom-line bullets, "when to see a doctor" callout if relevant, numbered sources list at the end. Where natural, include 2–5 internal links to the pages listed under INTERNAL LINK TARGETS using markdown link syntax.

No preamble before TITLE. No commentary after the article.`;
}

// ============================================================================
// HEADER
// ============================================================================

function Sidebar({ view, setView, counts, currentUser, onLogout, theme, onToggleTheme, isOpen, onClose }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = currentUser?.role === 'admin';

  const sections = [
    {
      label: 'Overview',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: Home },
      ],
    },
    {
      label: 'Content',
      items: [
        { id: 'sitemap', label: 'Sitemap', icon: Network, badge: counts.sitemap },
      ],
    },
    {
      label: 'Pipeline',
      items: [
        { id: 'evergreen', label: 'Evergreen', icon: Sprout, badge: counts.evergreen },
        { id: 'news', label: 'News', icon: Newspaper, badge: counts.news },
        { id: 'mythbusting', label: 'Mythbust', icon: Zap, badge: counts.mythbusting },
        { id: 'library', label: 'Library', icon: Library, badge: counts.library },
      ],
    },
    {
      label: 'AI',
      items: [
        { id: 'train', label: 'Train', icon: GraduationCap },
        { id: 'prompts', label: 'Prompts', icon: BookOpen },
        { id: 'settings', label: 'Style', icon: Settings },
      ],
    },
    ...(isAdmin ? [{
      label: 'Admin',
      items: [
        { id: 'admin', label: 'Users', icon: Wand2 },
        { id: 'reports', label: 'Reports', icon: Beaker },
      ],
    }] : []),
  ];

  const roleColor = currentUser?.role === 'admin' ? colors.green
                  : currentUser?.role === 'editor' ? colors.blue
                  : colors.ochre;

  const handleNav = (id) => {
    setView(id);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && <div className="ed-sidebar-backdrop" onClick={onClose} />}

      <aside className={`ed-sidebar${isOpen ? ' is-open' : ''}`} style={styles.sidebar}>
        <div style={styles.sidebarBrand}>
          <div style={styles.brandMark}>◐</div>
          <div>
            <div style={styles.sidebarBrandTitle}>Editorial Desk</div>
            <div style={styles.sidebarBrandSub}>SA Health Workflow</div>
          </div>
        </div>

        <nav style={styles.sidebarNav}>
          {sections.map(section => (
            <div key={section.label} style={styles.sidebarSection}>
              <div style={styles.sidebarSectionLabel}>{section.label}</div>
              {section.items.map(t => {
                const Icon = t.icon;
                const active = view === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleNav(t.id)}
                    style={{ ...styles.sidebarItem, ...(active ? styles.sidebarItemActive : {}) }}
                  >
                    <Icon size={16} strokeWidth={1.7} />
                    <span style={styles.sidebarItemLabel}>{t.label}</span>
                    {t.badge > 0 && <span style={styles.sidebarBadge}>{t.badge}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          <button onClick={onToggleTheme} style={styles.themeToggle}>
            {theme === 'dark' ? <Sparkles size={14} /> : <Eye size={14} />}
            <span>{theme === 'dark' ? 'Light' : 'Dark'} mode</span>
          </button>

          {currentUser && (
            <div style={{ position: 'relative' }}>
              <button onClick={() => setMenuOpen(!menuOpen)} style={styles.sidebarUserBtn}>
                <span style={{ ...styles.userAvatar, background: roleColor }}>
                  {(currentUser.name || currentUser.username || '?').charAt(0).toUpperCase()}
                </span>
                <div style={styles.sidebarUserInfo}>
                  <div style={styles.sidebarUserName}>{currentUser.name || currentUser.username}</div>
                  <div style={styles.sidebarUserRole}>{currentUser.role}</div>
                </div>
                <ChevronRight size={14} style={{ transform: menuOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', color: colors.muted }} />
              </button>
              {menuOpen && (
                <div style={styles.userMenuSidebar} onMouseLeave={() => setMenuOpen(false)}>
                  <button style={styles.menuItem} onClick={() => { setMenuOpen(false); onLogout(); }}>
                    <ExternalLink size={13} /> Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function TopBar({ onMenuClick, currentView }) {
  const viewTitles = {
    dashboard: 'Dashboard',
    sitemap: 'Sitemap',
    evergreen: 'Evergreen',
    news: 'News',
    mythbusting: 'Mythbust',
    library: 'Library',
    train: 'Train',
    prompts: 'Prompts',
    settings: 'Style',
    admin: 'Users',
    reports: 'Reports',
  };
  return (
    <div className="ed-topbar" style={styles.topBar}>
      <button onClick={onMenuClick} style={styles.menuToggle} aria-label="Menu">
        <Menu size={20} />
      </button>
      <div style={styles.topBarTitle}>{viewTitles[currentView] || ''}</div>
    </div>
  );
}

// ============================================================================
// PIPELINE VIEW (used for both Evergreen and News)
// ============================================================================

function PipelineView({
  type, seed, onSeedChange, topics, drafts,
  onGenerate, onApproveWrite, onRejectTopic, onReinstateTopic, onDeleteTopic,
  onOpenDraft, onPublishDraft, onRejectDraft, onDeleteDraft, canApprove
}) {
  const [count, setCount] = useState(50);
  const [tab, setTab] = useState('topics');
  const [filter, setFilter] = useState('pending');

  const META = {
    evergreen: {
      eyebrow: '01 · Evergreen pipeline',
      title: 'Evergreen',
      sub: 'Timeless reference pieces. Input a topic, generate ideas, approve to write, ship to library.',
      placeholder: 'e.g. iron deficiency, menopause, sleep, intermittent fasting…',
      icon: Sprout,
    },
    news: {
      eyebrow: '02 · News pipeline',
      title: 'News',
      sub: 'Time-sensitive pieces tied to current SA health news, studies, and trends.',
      placeholder: 'e.g. diabetes, NHI, load shedding mental health (leave blank for general SA health news)',
      icon: Newspaper,
    },
    mythbusting: {
      eyebrow: '03 · Mythbusting pipeline',
      title: 'Mythbust',
      sub: 'Punchy, click-friendly pieces that take a viral claim or common belief and land on the evidence. Always honest, never just dunking.',
      placeholder: 'e.g. apple cider vinegar, seed oils, cold plunges (leave blank to scan SA viral health claims)',
      icon: Zap,
    },
  };
  const meta = META[type] || META.evergreen;

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
            <div style={styles.countPillRow}>
              {[1, 2, 3, 4, 5, 10, 20, 30, 40, 50].map(n => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  style={{ ...styles.countPill, ...(count === n ? styles.countPillActive : {}) }}
                >
                  {n}
                </button>
              ))}
            </div>
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
                  canApprove={canApprove}
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
                  canApprove={canApprove}
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

function TopicRow({ topic, onApproveWrite, onReject, onReinstate, onDelete, canApprove = true }) {
  const [expanded, setExpanded] = useState(false);

  const statusColor = {
    pending: '#C77D4A',
    writing: '#3A5266',
    written: '#2D5F4E',
    rejected: '#9A9486'
  }[topic.status];

  const categoryLabel = {
    fitness: 'Fitness', nutrition: 'Nutrition', mental_health: 'Mental health',
    health_guides: 'Health guides', beauty: 'Beauty',
    // legacy
    wellness: 'Health guides', mens: 'Health guides', womens: 'Health guides'
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
          {topic.status === 'pending' && canApprove && (
            <>
              <button style={styles.iconActionBtn} onClick={onReject} title="Reject">
                <X size={14} />
              </button>
              <button style={{ ...styles.iconActionBtn, ...styles.iconActionPrimary }} onClick={onApproveWrite} title="Approve & write">
                <Check size={14} />
              </button>
            </>
          )}
          {topic.status === 'pending' && !canApprove && (
            <span style={styles.pendingChip}>
              <Eye size={11} /> awaiting review
            </span>
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
          {topic.theMyth && (
            <div style={styles.expandRow}>
              <span style={styles.expandLabel}>The myth</span>
              <span style={styles.expandValue}>{topic.theMyth}</span>
            </div>
          )}
          {topic.theTruth && (
            <div style={styles.expandRow}>
              <span style={styles.expandLabel}>The truth</span>
              <span style={styles.expandValue}>{topic.theTruth}</span>
            </div>
          )}
          {topic.cluster && (
            <div style={styles.expandRow}>
              <span style={styles.expandLabel}>Cluster</span>
              <span style={styles.expandValue}>{topic.cluster}</span>
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

function DraftRow({ draft, onView, onPublish, onReject, onDelete, canApprove = true }) {
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
        {draft.status === 'pending' && canApprove && (
          <>
            <button style={styles.iconActionBtn} onClick={onReject} title="Reject">
              <X size={15} />
            </button>
            <button style={{ ...styles.iconActionBtn, ...styles.iconActionPrimary }} onClick={onPublish} title="Approve & publish">
              <Check size={15} />
            </button>
          </>
        )}
        {draft.status === 'pending' && !canApprove && (
          <span style={styles.pendingChip}>
            <Eye size={11} /> awaiting review
          </span>
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

function LibraryView({ items, onView, onExport, onDelete, onToggleDeployed, onPushToWP, wpStatus, canApprove = true, showToast }) {
  const [filter, setFilter] = useState('all');
  const [deployFilter, setDeployFilter] = useState('all');
  const filtered = items.filter(i => {
    if (filter !== 'all' && i.type !== filter) return false;
    if (deployFilter === 'deployed' && !i.deployed) return false;
    if (deployFilter === 'pending' && i.deployed) return false;
    return true;
  });

  const filters = [
    { id: 'all', label: 'All types', count: items.length },
    { id: 'evergreen', label: 'Evergreen', count: items.filter(i => i.type === 'evergreen').length },
    { id: 'news', label: 'News', count: items.filter(i => i.type === 'news').length },
    { id: 'mythbusting', label: 'Mythbust', count: items.filter(i => i.type === 'mythbusting').length },
  ];
  const deployFilters = [
    { id: 'all', label: 'All', count: items.length },
    { id: 'pending', label: 'Awaiting deploy', count: items.filter(i => !i.deployed).length },
    { id: 'deployed', label: 'Deployed', count: items.filter(i => i.deployed).length },
  ];

  if (items.length === 0) {
    return (
      <>
        <PageHead eyebrow="04" title="Library" sub="Approved articles ready to publish." />
        <WpStatusBanner status={wpStatus} />
        <EmptyState icon={Library} title="Nothing in the library yet" hint="Approved drafts land here, ready to push to WordPress." />
      </>
    );
  }

  const typeColor = (t) => t === 'evergreen' ? '#2D5F4E' : t === 'news' ? '#C77D4A' : t === 'mythbusting' ? '#A14438' : '#6B6657';
  const typeLabel = (t) => t === 'evergreen' ? 'Evergreen' : t === 'news' ? 'News' : t === 'mythbusting' ? 'Mythbust' : t;

  return (
    <>
      <PageHead eyebrow="04" title="Library" sub={`${items.length} finished ${items.length === 1 ? 'article' : 'articles'}.`} />
      <WpStatusBanner status={wpStatus} />
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
      <div style={styles.filterRow}>
        {deployFilters.map(f => (
          <button
            key={f.id}
            onClick={() => setDeployFilter(f.id)}
            style={{ ...styles.filterBtn, ...(deployFilter === f.id ? styles.filterBtnActive : {}) }}
          >
            {f.label} <span style={styles.filterCount}>{f.count}</span>
          </button>
        ))}
      </div>
      <div style={styles.draftList}>
        {filtered.map(item => (
          <article key={item.id} style={styles.draftRow} onClick={() => onView(item)}>
            {item.featuredImage?.thumb && (
              <img
                src={item.featuredImage.thumb}
                alt=""
                style={styles.libraryThumb}
                title={item.featuredImage.photographer ? `Photo by ${item.featuredImage.photographer}` : ''}
              />
            )}
            <div style={styles.draftLeft}>
              <div style={styles.draftMeta}>
                <span style={{ ...styles.statusDot, background: typeColor(item.type) }} />
                <span style={styles.cardCategory}>{typeLabel(item.type)}</span>
                <span style={styles.cardDot}>·</span>
                <span>{item.category}</span>
                <span style={styles.cardDot}>·</span>
                <span>Published {timeAgo(item.publishedAt)}</span>
                {item.deployed && item.wpEditUrl && (
                  <a
                    href={item.wpEditUrl}
                    target="_blank"
                    rel="noopener"
                    onClick={e => e.stopPropagation()}
                    style={{ ...styles.doneChip, textDecoration: 'none' }}
                  >
                    <ExternalLink size={11} /> in WordPress
                  </a>
                )}
                {item.deployed && !item.wpEditUrl && (
                  <span style={styles.doneChip}>
                    <Rocket size={11} /> deployed
                  </span>
                )}
              </div>
              <h3 style={styles.draftTitle}>{item.title}</h3>
              <p style={styles.draftPreview}>{item.excerpt || item.content.replace(/[#*_`>]/g, '').slice(0, 180)}…</p>
            </div>
            <div style={styles.draftActions} onClick={e => e.stopPropagation()}>
              {!item.deployed && wpStatus.connected && canApprove && (
                <button
                  style={{ ...styles.iconActionBtn, ...styles.iconActionPrimary }}
                  onClick={() => onPushToWP(item)}
                  title="Push to WordPress as draft"
                >
                  <Rocket size={15} />
                </button>
              )}
              {!item.deployed && !wpStatus.connected && canApprove && (
                <button
                  style={styles.iconActionBtn}
                  onClick={() => onToggleDeployed(item.id)}
                  title="Mark as deployed manually (WP not connected)"
                >
                  <Rocket size={15} />
                </button>
              )}
              {item.deployed && canApprove && (
                <button
                  style={styles.iconActionBtn}
                  onClick={() => onToggleDeployed(item.id)}
                  title="Mark as not deployed"
                >
                  <RotateCcw size={15} />
                </button>
              )}
              <button style={styles.iconActionBtn} onClick={() => onExport(item)} title="Manual export (copy HTML)">
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

function WpStatusBanner({ status }) {
  if (status.checking) {
    return (
      <div style={{ ...styles.wpBanner, color: colors.muted }}>
        <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
        Checking WordPress connection…
      </div>
    );
  }
  if (status.connected) {
    return (
      <div style={{ ...styles.wpBanner, ...styles.wpBannerOk }}>
        <Check size={13} />
        Connected to WordPress as <strong style={{ marginLeft: 4 }}>{status.user}</strong> · publishing as drafts to {status.url}
      </div>
    );
  }
  const reasonText = {
    env_vars_missing: 'WordPress credentials not set. Add WP_URL, WP_USER, and WP_APP_PASSWORD to your Vercel environment variables. See DEPLOY.md for steps.',
    auth_failed: 'Authentication failed. Check that WP_USER and WP_APP_PASSWORD are correct and that the user has publishing rights.',
    fetch_failed: `Could not reach the site. Check WP_URL is correct and reachable. ${status.detail || ''}`,
  }[status.reason] || 'WordPress not connected. Using manual deploy toggle instead.';
  return (
    <div style={{ ...styles.wpBanner, ...styles.wpBannerWarn }}>
      <AlertCircle size={13} />
      {reasonText}
    </div>
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
  const [confirmStep, setConfirmStep] = useState(null); // null | 'learn-prompt'
  const originalContent = draft.content; // snapshot at open time
  const hasEdits = content.trim() !== originalContent.trim();

  const save = () => { onSave({ content }); setEditing(false); showToast('Draft saved', 'success'); };
  const copy = async () => {
    try { await navigator.clipboard.writeText(content); showToast('Copied'); }
    catch { showToast('Copy failed', 'error'); }
  };

  const handleApproveClick = () => {
    // Always save first if there are edits
    if (hasEdits) {
      onSave({ content });
      setConfirmStep('learn-prompt');
    } else {
      onPublish({ learnFromEdits: false });
    }
  };

  return (
    <div style={styles.draftViewPanel}>
      <div style={styles.draftViewHeader}>
        <div>
          <div style={styles.draftViewEyebrow}>
            {fromLibrary ? 'Published' : 'Draft for review'} · {draft.type} · {draft.category}
          </div>
          <h2 style={styles.formTitle}>{draft.title}</h2>
          {draft.meta && <p style={styles.metaPreview}>{draft.meta}</p>}
        </div>
        <button style={styles.iconBtn} onClick={onClose}><X size={18} /></button>
      </div>

      {confirmStep === 'learn-prompt' ? (
        <div style={styles.learnPrompt}>
          <div style={styles.learnPromptIcon}><GraduationCap size={28} /></div>
          <h3 style={styles.learnPromptTitle}>You made edits — want to learn from them?</h3>
          <p style={styles.learnPromptBody}>
            I can compare your edited version to the original AI draft and extract 1–3 patterns to add to the <strong>{draft.category}</strong> category training. Future articles in this category will follow your patterns automatically.
          </p>
          <div style={styles.learnPromptActions}>
            <button style={styles.secondaryBtn} onClick={() => onPublish({ learnFromEdits: false })}>
              Skip — just publish
            </button>
            <button style={styles.primaryBtn} onClick={() => onPublish({ learnFromEdits: true, originalContent })}>
              <GraduationCap size={15} /> Learn & publish
            </button>
          </div>
        </div>
      ) : (
        <>
          {editing ? (
            <textarea value={content} onChange={e => setContent(e.target.value)} style={styles.draftEditor} rows={24} />
          ) : (
            <div style={styles.draftContent}><FormattedMarkdown text={content} /></div>
          )}
          <div style={styles.draftViewActions}>
            {hasEdits && !editing && (
              <span style={styles.editedIndicator}>
                <Edit3 size={11} /> edited
              </span>
            )}
            <button style={styles.secondaryBtn} onClick={copy}><Copy size={14} /> Copy markdown</button>
            {!fromLibrary && (
              editing
                ? <button style={styles.secondaryBtn} onClick={save}><Save size={14} /> Save edits</button>
                : <button style={styles.secondaryBtn} onClick={() => setEditing(true)}><Edit3 size={14} /> Edit</button>
            )}
            {fromLibrary
              ? <button style={styles.primaryBtn} onClick={onExport}><FileCode size={15} /> Export to WordPress</button>
              : <button style={styles.primaryBtn} onClick={handleApproveClick}><Check size={15} /> Approve & publish</button>}
          </div>
        </>
      )}
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
  categoryTraining, onSaveCategoryTraining,
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

      {/* Category training panel */}
      <CategoryTrainingPanel
        categoryTraining={categoryTraining}
        onSave={onSaveCategoryTraining}
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

function CategoryTrainingPanel({ categoryTraining, onSave }) {
  const [open, setOpen] = useState(true);
  const [active, setActive] = useState(CATEGORIES[0].id);
  const [drafts, setDrafts] = useState(categoryTraining || {});

  // Re-sync when parent updates
  useEffect(() => { setDrafts(categoryTraining || {}); }, [categoryTraining]);

  const dirty = CATEGORIES.some(c => (drafts[c.id] || '') !== (categoryTraining[c.id] || ''));

  const save = () => onSave(drafts);
  const reset = () => setDrafts(categoryTraining || {});
  const resetToDefault = (id) => setDrafts(d => ({ ...d, [id]: DEFAULT_CATEGORY_TRAINING[id] }));

  return (
    <div style={styles.catTrainPanel}>
      <header style={styles.catTrainHeader} onClick={() => setOpen(!open)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button style={styles.expandBtn}>
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          <div>
            <div style={styles.catTrainTitle}>Category training</div>
            <div style={styles.catTrainSub}>Per-category instructions appended whenever content for that category is generated.</div>
          </div>
        </div>
        {dirty && (
          <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
            <button style={styles.secondaryBtn} onClick={reset}>Cancel</button>
            <button style={styles.primaryBtn} onClick={save}>
              <Save size={15} /> Save changes
            </button>
          </div>
        )}
      </header>

      {open && (
        <div style={styles.catTrainBody}>
          {/* Category tabs */}
          <div style={styles.catTabs}>
            {CATEGORIES.map(c => {
              const isDirty = (drafts[c.id] || '') !== (categoryTraining[c.id] || '');
              return (
                <button
                  key={c.id}
                  onClick={() => setActive(c.id)}
                  style={{
                    ...styles.catTab,
                    ...(active === c.id ? styles.catTabActive : {}),
                  }}
                >
                  {c.label}
                  {isDirty && <span style={styles.catDirtyDot} />}
                </button>
              );
            })}
          </div>

          {/* Active category editor */}
          <div style={styles.catEditorWrap}>
            <div style={styles.catEditorTopBar}>
              <span style={styles.catTrainHint}>
                Plain instructions — bullet list works well. Will be included with every generation for this category.
              </span>
              <button style={styles.linkBtn} onClick={() => resetToDefault(active)}>
                <RotateCcw size={12} /> Reset to default
              </button>
            </div>
            <textarea
              value={drafts[active] || ''}
              onChange={e => setDrafts(d => ({ ...d, [active]: e.target.value }))}
              style={styles.catTrainArea}
              rows={14}
              placeholder={`Instructions specific to ${CATEGORIES.find(c => c.id === active)?.label}…`}
            />
          </div>
        </div>
      )}
    </div>
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
          <span style={styles.patchBadgeApplied}>
            <Check size={11} /> Added to {patch.target === 'category' ? `${patch.categoryKey} training` : patch.target}
          </span>
        ) : (
          <span style={styles.patchBadge}>
            <Wand2 size={11} /> Suggested patch → {patch.target === 'category' ? `${patch.categoryKey} training` : patch.target}
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
// AUTH SCREENS
// ============================================================================

function SetupScreen({ onComplete, theme = 'light' }) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Load fonts
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(link); } catch {} };
  }, []);

  const submit = async () => {
    setError(null);
    if (!name.trim() || !username.trim() || !password) {
      setError('All fields required'); return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters'); return;
    }
    if (password !== confirm) {
      setError('Passwords do not match'); return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ name: name.trim(), username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error?.message || 'Setup failed'); setSubmitting(false); return; }
      onComplete(data.user);
    } catch (e) {
      setError(e.message); setSubmitting(false);
    }
  };

  return (
    <div style={styles.authScreen} data-theme={theme}>
      <style>{globalCss}</style>
      <div style={styles.authCard}>
        <div style={styles.authBrand}>
          <div style={styles.brandMark}>◐</div>
          <div>
            <div style={styles.brandTitle}>The Editorial Desk</div>
            <div style={styles.brandSub}>First-time setup</div>
          </div>
        </div>
        <h1 style={styles.authTitle}>Create the first admin</h1>
        <p style={styles.authSub}>This account has full powers — user management, reports, everything. You can add more users from the Admin tab once you're in.</p>
        <label style={styles.formLabel}>Your name</label>
        <input value={name} onChange={e => setName(e.target.value)} style={styles.topicInput} placeholder="Lisa Smith" />
        <label style={styles.formLabel}>Username</label>
        <input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} style={styles.topicInput} placeholder="lisa" autoComplete="username" />
        <label style={styles.formLabel}>Password <span style={styles.optional}>8+ characters</span></label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={styles.topicInput} autoComplete="new-password" />
        <label style={styles.formLabel}>Confirm password</label>
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} style={styles.topicInput} autoComplete="new-password" onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
        {error && <div style={styles.authError}>{error}</div>}
        <button style={{ ...styles.primaryBtn, width: '100%', justifyContent: 'center', marginTop: 18, padding: '12px 18px' }} onClick={submit} disabled={submitting}>
          {submitting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowRight size={15} />}
          {submitting ? 'Creating…' : 'Create admin account'}
        </button>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin, theme = 'light' }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(link); } catch {} };
  }, []);

  const submit = async () => {
    setError(null);
    if (!username.trim() || !password) { setError('Username and password required'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error?.message || 'Login failed'); setSubmitting(false); return; }
      onLogin(data.user);
    } catch (e) {
      setError(e.message); setSubmitting(false);
    }
  };

  return (
    <div style={styles.authScreen} data-theme={theme}>
      <style>{globalCss}</style>
      <div style={styles.authCard}>
        <div style={styles.authBrand}>
          <div style={styles.brandMark}>◐</div>
          <div>
            <div style={styles.brandTitle}>The Editorial Desk</div>
            <div style={styles.brandSub}>South African health · workflow</div>
          </div>
        </div>
        <h1 style={styles.authTitle}>Sign in</h1>
        <label style={styles.formLabel}>Username</label>
        <input value={username} onChange={e => setUsername(e.target.value)} style={styles.topicInput} autoComplete="username" autoFocus />
        <label style={styles.formLabel}>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={styles.topicInput} autoComplete="current-password" onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
        {error && <div style={styles.authError}>{error}</div>}
        <button style={{ ...styles.primaryBtn, width: '100%', justifyContent: 'center', marginTop: 18, padding: '12px 18px' }} onClick={submit} disabled={submitting}>
          {submitting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowRight size={15} />}
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// ADMIN VIEW
// ============================================================================

function AdminView({ currentUser, showToast }) {
  const [users, setUsers] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users', { credentials: 'same-origin' });
      const data = await res.json();
      if (res.ok) setUsers(data.users);
      else setError(data?.error?.message || 'Failed to load users');
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const updateRole = async (id, role) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data?.error?.message || 'Failed', 'error'); return; }
      showToast('Role updated', 'success');
      loadUsers();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const deleteUser = async (id, username) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE', credentials: 'same-origin' });
      const data = await res.json();
      if (!res.ok) { showToast(data?.error?.message || 'Failed', 'error'); return; }
      showToast('User deleted', 'success');
      loadUsers();
    } catch (e) { showToast(e.message, 'error'); }
  };

  return (
    <>
      <PageHead
        eyebrow="07 · Admin"
        title="Users"
        sub="Add, remove, and manage team members. Roles: admin (everything), editor (write + approve + publish), contributor (write only — cannot approve)."
        action={
          <button style={styles.primaryBtn} onClick={() => setCreating(true)}>
            <Plus size={16} /> Add user
          </button>
        }
      />

      {creating && (
        <CreateUserForm
          onCreated={() => { setCreating(false); loadUsers(); showToast('User created', 'success'); }}
          onCancel={() => setCreating(false)}
        />
      )}

      {error && <div style={styles.authError}>{error}</div>}

      {users === null ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <Loader2 size={22} style={{ animation: 'spin 1s linear infinite', color: '#2D5F4E' }} />
        </div>
      ) : (
        <div style={styles.usersTable}>
          <div style={{ ...styles.usersRow, ...styles.usersHeader }}>
            <div style={{ flex: 2 }}>Name</div>
            <div style={{ flex: 1.5 }}>Username</div>
            <div style={{ flex: 1.2 }}>Role</div>
            <div style={{ flex: 1.5 }}>Last login</div>
            <div style={{ width: 40 }}></div>
          </div>
          {users.map(u => (
            <div key={u.id} style={styles.usersRow}>
              <div style={{ flex: 2, fontWeight: 500 }}>{u.name}</div>
              <div style={{ flex: 1.5, color: '#6B6657', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>{u.username}</div>
              <div style={{ flex: 1.2 }}>
                {u.id === currentUser.id ? (
                  <span style={styles.roleBadge(u.role)}>{u.role} (you)</span>
                ) : (
                  <select
                    value={u.role}
                    onChange={e => updateRole(u.id, e.target.value)}
                    style={styles.roleSelect}
                  >
                    <option value="admin">admin</option>
                    <option value="editor">editor</option>
                    <option value="contributor">contributor</option>
                  </select>
                )}
              </div>
              <div style={{ flex: 1.5, color: '#6B6657', fontSize: 13 }}>
                {u.lastLoginAt ? timeAgo(u.lastLoginAt) : 'never'}
              </div>
              <div style={{ width: 40, textAlign: 'right' }}>
                {u.id !== currentUser.id && (
                  <button style={styles.iconBtn} onClick={() => deleteUser(u.id, u.username)} title="Delete user">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function CreateUserForm({ onCreated, onCancel }) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('contributor');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    setError(null);
    if (!name.trim() || !username.trim() || !password) { setError('All fields required'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ name: name.trim(), username: username.trim(), password, role }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error?.message || 'Failed'); setSubmitting(false); return; }
      onCreated();
    } catch (e) { setError(e.message); setSubmitting(false); }
  };

  return (
    <div style={styles.createUserPanel}>
      <h3 style={{ ...styles.formTitle, fontSize: 22, marginBottom: 14 }}>New user</h3>
      <div style={styles.createUserGrid}>
        <div>
          <label style={styles.formLabel}>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} style={styles.topicInput} placeholder="Sipho Dlamini" />
        </div>
        <div>
          <label style={styles.formLabel}>Username</label>
          <input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} style={styles.topicInput} placeholder="sipho" />
        </div>
        <div>
          <label style={styles.formLabel}>Temporary password</label>
          <input type="text" value={password} onChange={e => setPassword(e.target.value)} style={styles.topicInput} placeholder="8+ characters" />
        </div>
        <div>
          <label style={styles.formLabel}>Role</label>
          <select value={role} onChange={e => setRole(e.target.value)} style={{ ...styles.topicInput, paddingRight: 14 }}>
            <option value="admin">Admin — full access</option>
            <option value="editor">Editor — write, approve, publish</option>
            <option value="contributor">Contributor — write only, no approve</option>
          </select>
        </div>
      </div>
      {error && <div style={styles.authError}>{error}</div>}
      <div style={styles.formActions}>
        <button style={styles.secondaryBtn} onClick={onCancel}>Cancel</button>
        <button style={styles.primaryBtn} onClick={submit} disabled={submitting}>
          {submitting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={15} />}
          Create user
        </button>
      </div>
      <p style={{ ...styles.formSub, marginTop: 14, marginBottom: 0 }}>
        Share the username and password with them out-of-band (e.g. via Signal). They can change their password later from their own profile.
      </p>
    </div>
  );
}

// ============================================================================
// REPORTS VIEW
// ============================================================================

function ReportsView({ showToast }) {
  const [events, setEvents] = useState(null);
  const [users, setUsers] = useState([]);
  const [filterUser, setFilterUser] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [filterRange, setFilterRange] = useState('30d');
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [evRes, uRes] = await Promise.all([
          fetch('/api/activity', { credentials: 'same-origin' }),
          fetch('/api/users', { credentials: 'same-origin' }),
        ]);
        const evData = await evRes.json();
        const uData = await uRes.json();
        if (evRes.ok) setEvents(evData.events || []);
        if (uRes.ok) setUsers(uData.users || []);
        if (!evRes.ok) setError(evData?.error?.message || 'Could not load activity');
      } catch (e) {
        setError(e.message);
      }
    })();
  }, []);

  if (events === null) {
    return (
      <>
        <PageHead eyebrow="08 · Reports" title="Reports" sub="Activity log and per-user stats." />
        <div style={{ padding: 40, textAlign: 'center' }}>
          <Loader2 size={22} style={{ animation: 'spin 1s linear infinite', color: '#2D5F4E' }} />
        </div>
      </>
    );
  }

  // Filter
  const rangeMs = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    'all': Infinity,
  }[filterRange];
  const cutoff = Date.now() - rangeMs;

  const filtered = events.filter(e => {
    if (e.timestamp < cutoff) return false;
    if (filterUser !== 'all' && e.userId !== filterUser) return false;
    if (filterAction !== 'all') {
      const family = filterAction; // e.g. 'topic', 'draft', 'library'
      if (!e.action.startsWith(family + '.')) return false;
    }
    return true;
  });

  // Per-user summary
  const summary = {};
  filtered.forEach(e => {
    if (!summary[e.userId]) summary[e.userId] = { username: e.username, name: '', counts: {} };
    summary[e.userId].counts[e.action] = (summary[e.userId].counts[e.action] || 0) + 1;
  });
  // Resolve user names
  users.forEach(u => { if (summary[u.id]) summary[u.id].name = u.name; });

  const tally = (userSummary, prefix) => Object.entries(userSummary.counts).filter(([k]) => k.startsWith(prefix)).reduce((s, [, n]) => s + n, 0);

  const topicCount = filtered.filter(e => e.action === 'topic.generate').reduce((s, e) => s + (e.metadata?.count || 1), 0);
  const draftCount = filtered.filter(e => e.action === 'draft.write').length;
  const approvedCount = filtered.filter(e => e.action === 'draft.approve').length;
  const pushedCount = filtered.filter(e => e.action === 'library.push_wp').length;

  const actionLabels = {
    'topic.generate': 'Topics generated',
    'topic.approve': 'Topic approved',
    'topic.reject': 'Topic rejected',
    'draft.write': 'Draft written',
    'draft.approve': 'Draft approved',
    'draft.reject': 'Draft rejected',
    'draft.edit': 'Draft edited',
    'library.push_wp': 'Pushed to WP',
    'library.delete': 'Library deleted',
    'library.toggle_deployed': 'Deploy toggled',
    'sitemap.add_page': 'Sitemap page added',
    'sitemap.bulk_add': 'Sitemap bulk add',
    'user.login': 'Signed in',
    'user.logout': 'Signed out',
    'user.create': 'User created',
    'user.delete': 'User deleted',
    'user.update': 'User updated',
    'user.setup': 'Initial setup',
  };

  return (
    <>
      <PageHead
        eyebrow="08 · Reports"
        title="Reports"
        sub="Activity log and per-user stats. Filter by user, time range, or action family."
      />

      {error && <div style={styles.authError}>{error}</div>}

      {/* Filters */}
      <div style={styles.reportFilters}>
        <div>
          <label style={styles.formLabel}>User</label>
          <select value={filterUser} onChange={e => setFilterUser(e.target.value)} style={styles.reportSelect}>
            <option value="all">All users</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.username})</option>)}
          </select>
        </div>
        <div>
          <label style={styles.formLabel}>Action</label>
          <select value={filterAction} onChange={e => setFilterAction(e.target.value)} style={styles.reportSelect}>
            <option value="all">All actions</option>
            <option value="topic">Topics</option>
            <option value="draft">Drafts</option>
            <option value="library">Library / WordPress</option>
            <option value="sitemap">Sitemap</option>
            <option value="user">User / auth</option>
          </select>
        </div>
        <div>
          <label style={styles.formLabel}>Range</label>
          <select value={filterRange} onChange={e => setFilterRange(e.target.value)} style={styles.reportSelect}>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      {/* Headline stats */}
      <div style={styles.statsStrip}>
        <SitemapStat label="Topics generated" value={topicCount} accent="#C77D4A" />
        <SitemapStat label="Drafts written" value={draftCount} accent="#5B8A78" />
        <SitemapStat label="Approved" value={approvedCount} accent="#234B3D" />
        <SitemapStat label="Pushed to WP" value={pushedCount} accent="#1A3D32" />
        <SitemapStat label="Events" value={filtered.length} />
      </div>

      {/* Per-user breakdown */}
      <h2 style={{ ...styles.formTitle, fontSize: 20, marginTop: 32, marginBottom: 12 }}>By user</h2>
      {Object.keys(summary).length === 0 ? (
        <EmptyState icon={Beaker} title="No activity in this range" hint="Try widening the filter." />
      ) : (
        <div style={styles.usersTable}>
          <div style={{ ...styles.usersRow, ...styles.usersHeader }}>
            <div style={{ flex: 1.8 }}>User</div>
            <div style={{ flex: 1, textAlign: 'right' }}>Topics gen.</div>
            <div style={{ flex: 1, textAlign: 'right' }}>Drafts written</div>
            <div style={{ flex: 1, textAlign: 'right' }}>Approved</div>
            <div style={{ flex: 1, textAlign: 'right' }}>Pushed</div>
            <div style={{ flex: 0.8, textAlign: 'right' }}>Total</div>
          </div>
          {Object.entries(summary)
            .map(([uid, s]) => {
              const tg = filtered.filter(e => e.userId === uid && e.action === 'topic.generate').reduce((sum, e) => sum + (e.metadata?.count || 1), 0);
              const dw = s.counts['draft.write'] || 0;
              const ap = s.counts['draft.approve'] || 0;
              const pu = s.counts['library.push_wp'] || 0;
              const total = Object.values(s.counts).reduce((a, b) => a + b, 0);
              return { uid, s, tg, dw, ap, pu, total };
            })
            .sort((a, b) => b.total - a.total)
            .map(({ uid, s, tg, dw, ap, pu, total }) => (
              <div key={uid} style={styles.usersRow}>
                <div style={{ flex: 1.8 }}>
                  <div style={{ fontWeight: 500 }}>{s.name || s.username}</div>
                  <div style={{ fontSize: 11.5, color: '#6B6657' }}>{s.username}</div>
                </div>
                <div style={{ flex: 1, textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}>{tg}</div>
                <div style={{ flex: 1, textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}>{dw}</div>
                <div style={{ flex: 1, textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}>{ap}</div>
                <div style={{ flex: 1, textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}>{pu}</div>
                <div style={{ flex: 0.8, textAlign: 'right', fontWeight: 600 }}>{total}</div>
              </div>
            ))}
        </div>
      )}

      {/* Recent events timeline */}
      <h2 style={{ ...styles.formTitle, fontSize: 20, marginTop: 32, marginBottom: 12 }}>Recent events</h2>
      <div style={styles.eventTimeline}>
        {filtered.slice(0, 200).map(e => (
          <div key={e.id} style={styles.eventRow}>
            <div style={styles.eventTime}>{timeAgo(e.timestamp)}</div>
            <div style={styles.eventUser}>{e.username}</div>
            <div style={styles.eventAction}>{actionLabels[e.action] || e.action}</div>
            <div style={styles.eventMeta}>
              {e.metadata?.title && <span>"{e.metadata.title.slice(0, 60)}"</span>}
              {e.metadata?.count && <span> · {e.metadata.count}</span>}
              {e.metadata?.type && <span> · {e.metadata.type}</span>}
              {e.metadata?.role && <span> · {e.metadata.role}</span>}
              {e.metadata?.newUsername && <span> · {e.metadata.newUsername}</span>}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <EmptyState icon={Beaker} title="No events" hint="Filter is too narrow." />}
      </div>
    </>
  );
}

// ============================================================================
// DASHBOARD VIEW — daily targets + monthly progress
// ============================================================================

const DAILY_TARGETS = {
  evergreen: { daily: 2, label: 'Evergreen', icon: Sprout, color: 'var(--c-green)', bg: 'var(--c-green-bg)', accent: '#5B8A78' },
  news: { daily: 4, label: 'News', icon: Newspaper, color: 'var(--c-ochre)', bg: 'var(--c-ochre-bg)', accent: '#C77D4A' },
  mythbusting: { daily: 2, label: 'Mythbust', icon: Zap, color: 'var(--c-red)', bg: 'var(--c-red-bg)', accent: '#A14438' },
};

function DashboardView({ libraryItems, drafts, topics, currentUser, setView }) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayEnd = todayStart + 24 * 60 * 60 * 1000;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const monthName = now.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
  const dayName = now.toLocaleDateString('en-ZA', { weekday: 'long' });
  const dateStr = now.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' });

  // Helper: deployed = library item with deployed=true (i.e. pushed to WP)
  const isDeployed = (item) => item.deployed && item.deployedAt;

  // Counts per type — today
  const deployedTodayByType = {};
  // Counts per type — month
  const deployedMonthByType = {};
  // Counts per day of month (across all types)
  const deployedByDay = {};

  Object.keys(DAILY_TARGETS).forEach(type => {
    deployedTodayByType[type] = 0;
    deployedMonthByType[type] = 0;
  });

  libraryItems.forEach(item => {
    if (!isDeployed(item)) return;
    const type = item.type;
    if (!DAILY_TARGETS[type]) return;
    if (item.deployedAt >= todayStart && item.deployedAt < todayEnd) {
      deployedTodayByType[type]++;
    }
    if (item.deployedAt >= monthStart && item.deployedAt < monthEnd) {
      deployedMonthByType[type]++;
      const day = new Date(item.deployedAt).getDate();
      deployedByDay[day] = (deployedByDay[day] || 0) + 1;
    }
  });

  // Day complete = all categories hit their daily target
  const dayComplete = Object.entries(DAILY_TARGETS).every(([type, t]) => deployedTodayByType[type] >= t.daily);
  const totalDeployedToday = Object.values(deployedTodayByType).reduce((s, n) => s + n, 0);
  const totalDailyTarget = Object.values(DAILY_TARGETS).reduce((s, t) => s + t.daily, 0);

  // Pending work counts — anything not yet deployed
  const draftCount = drafts.length;
  const pendingTopicsCount = topics.filter(t => t.status === 'pending').length;
  const readyCount = libraryItems.filter(i => !i.deployed).length;

  return (
    <>
      <div style={styles.dashTopRow}>
        <div>
          <div style={styles.dashEyebrow}>Today</div>
          <h1 style={styles.dashHeadline}>{dayName}, {dateStr}</h1>
          {currentUser && <div style={styles.dashGreeting}>Hi {currentUser.name?.split(' ')[0] || currentUser.username} 👋</div>}
        </div>
        {dayComplete ? (
          <div style={styles.dayCompleteBadge}>
            <div style={styles.dayCompleteTick}><Check size={20} strokeWidth={3} /></div>
            <div>
              <div style={styles.dayCompleteTitle}>Day complete</div>
              <div style={styles.dayCompleteSub}>All daily targets met</div>
            </div>
          </div>
        ) : (
          <div style={styles.dayProgressBadge}>
            <div style={styles.dayProgressNum}>{totalDeployedToday}<span style={styles.dayProgressOf}>/{totalDailyTarget}</span></div>
            <div style={styles.dayProgressLabel}>deployed today</div>
          </div>
        )}
      </div>

      {/* Daily target cards */}
      <div style={styles.dashCards}>
        {Object.entries(DAILY_TARGETS).map(([type, t]) => {
          const todayCount = deployedTodayByType[type];
          const outstanding = Math.max(0, t.daily - todayCount);
          const isComplete = todayCount >= t.daily;
          const monthCount = deployedMonthByType[type];
          const monthTarget = t.daily * daysInMonth;
          const monthExpected = t.daily * dayOfMonth;
          const monthPct = Math.min(100, Math.round((monthCount / monthTarget) * 100));
          const onPace = monthCount >= monthExpected;
          const Icon = t.icon;

          return (
            <div key={type} style={{ ...styles.dashCard, ...(isComplete ? styles.dashCardComplete : {}) }}>
              <div style={styles.dashCardHeader}>
                <div style={{ ...styles.dashCardIcon, color: t.color, background: t.bg }}>
                  <Icon size={18} strokeWidth={2} />
                </div>
                <div style={styles.dashCardLabel}>{t.label}</div>
                {isComplete && (
                  <div style={styles.dashCardTick} title="Daily target met">
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
              </div>

              <div style={styles.dashCardMainRow}>
                <div style={styles.dashCardBigNum}>
                  {todayCount}<span style={styles.dashCardSlash}>/{t.daily}</span>
                </div>
                <div style={styles.dashCardStatus}>
                  {isComplete
                    ? <span style={styles.dashCardOk}>complete</span>
                    : <span style={styles.dashCardOutstanding}>{outstanding} outstanding</span>}
                </div>
              </div>

              <div style={styles.dashProgressTrack}>
                <div style={{
                  ...styles.dashProgressFill,
                  width: `${Math.min(100, (todayCount / t.daily) * 100)}%`,
                  background: isComplete ? 'var(--c-green)' : t.color,
                }} />
              </div>

              <div style={styles.dashCardMonthly}>
                <div style={styles.dashCardMonthlyRow}>
                  <span style={styles.dashCardMonthlyLabel}>This month</span>
                  <span style={styles.dashCardMonthlyVal}>{monthCount} / {monthTarget}</span>
                </div>
                <div style={styles.dashMonthlyTrack}>
                  <div style={{ ...styles.dashMonthlyFill, width: `${monthPct}%`, background: t.color }} />
                  {/* Expected-by-now marker */}
                  <div style={{
                    ...styles.dashMonthlyMarker,
                    left: `${Math.min(100, (monthExpected / monthTarget) * 100)}%`,
                  }} title={`Expected by day ${dayOfMonth}: ${monthExpected}`} />
                </div>
                <div style={{ ...styles.dashCardPace, color: onPace ? 'var(--c-green)' : 'var(--c-ochre)' }}>
                  {onPace ? `on pace` : `${monthExpected - monthCount} behind pace`}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick links — what's outstanding */}
      <div style={styles.dashStatsStrip}>
        <DashStat label="Pending topics" value={pendingTopicsCount} onClick={() => setView('evergreen')} />
        <DashStat label="Drafts to review" value={draftCount} onClick={() => setView('evergreen')} />
        <DashStat label="Ready to publish" value={readyCount} onClick={() => setView('library')} />
        <DashStat label="Total deployed" value={libraryItems.filter(i => i.deployed).length} />
      </div>

      {/* Monthly heatmap */}
      <section style={styles.dashSection}>
        <div style={styles.dashSectionHead}>
          <Calendar size={16} style={{ color: 'var(--c-muted)' }} />
          <h2 style={styles.dashSectionTitle}>{monthName}</h2>
          <span style={styles.dashSectionSub}>· deployments per day</span>
        </div>
        <MonthHeatmap
          daysInMonth={daysInMonth}
          dayOfMonth={dayOfMonth}
          deployedByDay={deployedByDay}
          dailyTotalTarget={totalDailyTarget}
          firstDayOfMonth={new Date(now.getFullYear(), now.getMonth(), 1).getDay()}
        />
      </section>
    </>
  );
}

function DashStat({ label, value, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      style={{ ...styles.dashStatBtn, ...(onClick ? {} : { cursor: 'default' }) }}
    >
      <div style={styles.dashStatValue}>{value}</div>
      <div style={styles.dashStatLabel}>{label}</div>
    </button>
  );
}

function MonthHeatmap({ daysInMonth, dayOfMonth, deployedByDay, dailyTotalTarget, firstDayOfMonth }) {
  // Build grid: pad with empty cells before day 1 to align by weekday
  const cells = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push({ pad: true });
  for (let d = 1; d <= daysInMonth; d++) {
    const count = deployedByDay[d] || 0;
    const isToday = d === dayOfMonth;
    const isPast = d < dayOfMonth;
    const isFuture = d > dayOfMonth;
    const pct = count / dailyTotalTarget;
    let intensity = 'none';
    if (count > 0 && pct < 0.5) intensity = 'low';
    else if (count > 0 && pct < 1) intensity = 'mid';
    else if (count >= dailyTotalTarget) intensity = 'full';
    cells.push({ day: d, count, isToday, isPast, isFuture, intensity });
  }
  return (
    <div>
      <div style={styles.heatmapWeekdays}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} style={styles.heatmapWeekday}>{d}</div>
        ))}
      </div>
      <div style={styles.heatmapGrid}>
        {cells.map((c, i) => {
          if (c.pad) return <div key={`pad-${i}`} style={styles.heatmapCellPad} />;
          const style = {
            ...styles.heatmapCell,
            ...(styles[`heatmap_${c.intensity}`] || {}),
            ...(c.isFuture ? styles.heatmapCellFuture : {}),
            ...(c.isToday ? styles.heatmapCellToday : {}),
          };
          return (
            <div key={c.day} style={style} title={`Day ${c.day}: ${c.count} deployed`}>
              <span style={styles.heatmapCellDay}>{c.day}</span>
              {c.count > 0 && <span style={styles.heatmapCellCount}>{c.count}</span>}
            </div>
          );
        })}
      </div>
      <div style={styles.heatmapLegend}>
        <span style={styles.heatmapLegendLabel}>Coverage</span>
        <div style={{ ...styles.heatmapCell, ...styles.heatmap_none, width: 14, height: 14 }} />
        <div style={{ ...styles.heatmapCell, ...styles.heatmap_low, width: 14, height: 14 }} />
        <div style={{ ...styles.heatmapCell, ...styles.heatmap_mid, width: 14, height: 14 }} />
        <div style={{ ...styles.heatmapCell, ...styles.heatmap_full, width: 14, height: 14 }} />
        <span style={styles.heatmapLegendLabel}>Target met</span>
      </div>
    </div>
  );
}

// ============================================================================
// SITEMAP / TOPICAL AUTHORITY
// ============================================================================

function SitemapView({ sitePages, topics, drafts, libraryItems, onAdd, onBulkAdd, onEdit, onDelete, onUpdateCluster, onLoadBlueprint, canApprove }) {
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'visual'
  const [collapsed, setCollapsed] = useState({});
  const [typeFilter, setTypeFilter] = useState('evergreen'); // 'all' | 'evergreen' | 'news' | 'mythbusting'

  // Count blueprint progress for the planning banner
  const blueprintCounts = (() => {
    // Match by title — any evergreen topic with a matching title to the blueprint counts
    const evergreenTopics = topics.filter(t => t.type === 'evergreen');
    const loaded = EVERGREEN_BLUEPRINT.filter(b =>
      evergreenTopics.some(t => t.title.toLowerCase().trim() === b.title.toLowerCase().trim())
    ).length;
    // Written = a matching draft or library item exists
    const written = EVERGREEN_BLUEPRINT.filter(b => {
      const lowerTitle = b.title.toLowerCase().trim();
      return drafts.some(d => d.title.toLowerCase().trim() === lowerTitle)
        || libraryItems.some(l => l.title.toLowerCase().trim() === lowerTitle);
    }).length;
    const deployed = EVERGREEN_BLUEPRINT.filter(b => {
      const lowerTitle = b.title.toLowerCase().trim();
      return libraryItems.some(l => l.deployed && l.title.toLowerCase().trim() === lowerTitle);
    }).length;
    return { total: EVERGREEN_BLUEPRINT.length, loaded, written, deployed };
  })();

  // Aggregate everything into clusters
  const clusters = {};
  const addToCluster = (item, status, kind) => {
    const c = item.cluster || 'Unclustered';
    if (!clusters[c]) clusters[c] = { live: [], planned: [], writing: [], drafting: [], ready: [], deployed: [] };
    const bucket = status === 'LIVE' ? 'live'
                : status === 'PLANNED' ? 'planned'
                : status === 'WRITING' ? 'writing'
                : status === 'DRAFT' ? 'drafting'
                : status === 'DEPLOYED' ? 'deployed'
                : 'ready';
    clusters[c][bucket].push({ ...item, kind, _status: status });
  };
  // sitePages have no type — always include
  sitePages.forEach(p => addToCluster(p, 'LIVE', 'page'));
  topics.filter(t => ['pending', 'writing', 'written'].includes(t.status) && (typeFilter === 'all' || t.type === typeFilter)).forEach(t => {
    addToCluster(t, t.status === 'writing' ? 'WRITING' : 'PLANNED', 'topic');
  });
  drafts.filter(d => typeFilter === 'all' || d.type === typeFilter).forEach(d => addToCluster(d, 'DRAFT', 'draft'));
  libraryItems.filter(l => typeFilter === 'all' || l.type === typeFilter).forEach(l => addToCluster(l, l.deployed ? 'DEPLOYED' : 'READY', 'library'));

  // Sort clusters: most items first, "Unclustered" last
  const clusterEntries = Object.entries(clusters).sort((a, b) => {
    if (a[0] === 'Unclustered') return 1;
    if (b[0] === 'Unclustered') return -1;
    const aCount = Object.values(a[1]).reduce((s, arr) => s + arr.length, 0);
    const bCount = Object.values(b[1]).reduce((s, arr) => s + arr.length, 0);
    return bCount - aCount;
  });

  const totalLive = sitePages.length;
  const totalPlanned = topics.filter(t => ['pending', 'writing', 'written'].includes(t.status)).length;
  const totalDraft = drafts.length;
  const totalReady = libraryItems.filter(l => !l.deployed).length;
  const totalDeployed = libraryItems.filter(l => l.deployed).length;

  // Status legend
  const STATUS_COLORS = {
    LIVE: { bg: '#3A5266', label: 'Live on site' },
    PLANNED: { bg: '#C77D4A', label: 'Planned' },
    WRITING: { bg: '#D4A856', label: 'Writing' },
    DRAFT: { bg: '#5B8A78', label: 'Drafted' },
    READY: { bg: '#234B3D', label: 'Ready to publish' },
    DEPLOYED: { bg: '#1A3D32', label: 'Deployed' },
  };

  return (
    <>
      <PageHead
        eyebrow="00 · Topical authority"
        title="Sitemap"
        sub="Plan the ideal evergreen sitemap, then work the editor toward it. Colour shifts as each topic moves through generation, drafting, and deployment."
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

      {/* Planning banner — evergreen blueprint progress */}
      <BlueprintBanner
        counts={blueprintCounts}
        onLoad={onLoadBlueprint}
        canApprove={canApprove}
      />

      {/* Stats strip */}
      <div style={styles.statsStrip}>
        <SitemapStat label="Clusters" value={clusterEntries.length} />
        <SitemapStat label="Live" value={totalLive} accent={STATUS_COLORS.LIVE.bg} />
        <SitemapStat label="Planned" value={totalPlanned} accent={STATUS_COLORS.PLANNED.bg} />
        <SitemapStat label="In draft" value={totalDraft} accent={STATUS_COLORS.DRAFT.bg} />
        <SitemapStat label="Ready" value={totalReady} accent={STATUS_COLORS.READY.bg} />
        <SitemapStat label="Deployed" value={totalDeployed} accent={STATUS_COLORS.DEPLOYED.bg} />
      </div>

      {/* Type filter */}
      <div style={styles.typeFilterRow}>
        {[
          { id: 'evergreen', label: 'Evergreen', count: topics.filter(t => t.type === 'evergreen').length + drafts.filter(d => d.type === 'evergreen').length + libraryItems.filter(l => l.type === 'evergreen').length },
          { id: 'news', label: 'News', count: topics.filter(t => t.type === 'news').length + drafts.filter(d => d.type === 'news').length + libraryItems.filter(l => l.type === 'news').length },
          { id: 'mythbusting', label: 'Mythbust', count: topics.filter(t => t.type === 'mythbusting').length + drafts.filter(d => d.type === 'mythbusting').length + libraryItems.filter(l => l.type === 'mythbusting').length },
          { id: 'all', label: 'All types', count: topics.length + drafts.length + libraryItems.length },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setTypeFilter(f.id)}
            style={{ ...styles.filterBtn, ...(typeFilter === f.id ? styles.filterBtnActive : {}) }}
          >
            {f.label} <span style={styles.filterCount}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* View toggle and legend */}
      <div style={styles.sitemapControls}>
        <div style={styles.viewToggle}>
          <button
            onClick={() => setViewMode('list')}
            style={{ ...styles.viewToggleBtn, ...(viewMode === 'list' ? styles.viewToggleBtnActive : {}) }}
          >
            <FileText size={14} /> List
          </button>
          <button
            onClick={() => setViewMode('visual')}
            style={{ ...styles.viewToggleBtn, ...(viewMode === 'visual' ? styles.viewToggleBtnActive : {}) }}
          >
            <Eye size={14} /> Coverage map
          </button>
        </div>
        <div style={styles.legend}>
          {Object.entries(STATUS_COLORS).map(([key, { bg, label }]) => (
            <div key={key} style={styles.legendItem}>
              <span style={{ ...styles.legendDot, background: bg }} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {clusterEntries.length === 0 ? (
        <EmptyState
          icon={Network}
          title="No coverage map yet"
          hint="Add the pages already live on your site, or generate some topics. The map fills in as you work."
        />
      ) : viewMode === 'visual' ? (
        <div style={styles.visualClusterGrid}>
          {clusterEntries.map(([clusterName, buckets]) => {
            const allItems = [
              ...buckets.live.map(i => ({ ...i, _color: STATUS_COLORS.LIVE.bg })),
              ...buckets.deployed.map(i => ({ ...i, _color: STATUS_COLORS.DEPLOYED.bg })),
              ...buckets.ready.map(i => ({ ...i, _color: STATUS_COLORS.READY.bg })),
              ...buckets.drafting.map(i => ({ ...i, _color: STATUS_COLORS.DRAFT.bg })),
              ...buckets.writing.map(i => ({ ...i, _color: STATUS_COLORS.WRITING.bg })),
              ...buckets.planned.map(i => ({ ...i, _color: STATUS_COLORS.PLANNED.bg })),
            ];
            const total = allItems.length;
            // Coverage strength: more items + more "live/deployed" = stronger
            const liveCount = buckets.live.length + buckets.deployed.length + buckets.ready.length;
            const strength = total === 0 ? 0 : Math.min(100, Math.round((liveCount / total) * 100));

            return (
              <section key={clusterName} style={styles.visualCluster}>
                <header style={styles.visualClusterHead}>
                  <div>
                    <h3 style={styles.clusterTitle}>{clusterName}</h3>
                    <div style={styles.clusterSub}>
                      {total} {total === 1 ? 'page' : 'pages'} · {strength}% live or ready
                    </div>
                  </div>
                  <div style={styles.coverageBar}>
                    {Object.entries({
                      live: buckets.live.length,
                      deployed: buckets.deployed.length,
                      ready: buckets.ready.length,
                      drafting: buckets.drafting.length,
                      writing: buckets.writing.length,
                      planned: buckets.planned.length,
                    }).filter(([, n]) => n > 0).map(([key, n]) => {
                      const colorMap = {
                        live: STATUS_COLORS.LIVE.bg,
                        deployed: STATUS_COLORS.DEPLOYED.bg,
                        ready: STATUS_COLORS.READY.bg,
                        drafting: STATUS_COLORS.DRAFT.bg,
                        writing: STATUS_COLORS.WRITING.bg,
                        planned: STATUS_COLORS.PLANNED.bg,
                      };
                      return (
                        <div
                          key={key}
                          style={{
                            background: colorMap[key],
                            flex: n,
                            height: '100%',
                          }}
                          title={`${n} ${key}`}
                        />
                      );
                    })}
                  </div>
                </header>

                <div style={styles.nodeGrid}>
                  {allItems.map(item => (
                    <button
                      key={item.id}
                      style={{
                        ...styles.node,
                        background: item._color,
                        ...(item._status === 'WRITING' ? { animation: 'pulse 1.5s ease-in-out infinite' } : {}),
                      }}
                      onClick={() => item.kind === 'page' ? onEdit(item) : null}
                      title={`${item.title}${item.keyword ? ` — ${item.keyword}` : ''}${item.url ? `\n${item.url}` : ''}`}
                    >
                      <span style={styles.nodeTitle}>{item.title}</span>
                      <span style={styles.nodeStatus}>{item._status.toLowerCase()}</span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        // Indented list — category > cluster > pages
        <SitemapTreeList
          clusterEntries={clusterEntries}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
    </>
  );
}

function BlueprintBanner({ counts, onLoad, canApprove }) {
  const { total, loaded, written, deployed } = counts;
  const fullyLoaded = loaded >= total;
  const loadedPct = Math.round((loaded / total) * 100);
  const writtenPct = Math.round((written / total) * 100);
  const deployedPct = Math.round((deployed / total) * 100);

  return (
    <div style={styles.bpBanner}>
      <div style={styles.bpBannerLeft}>
        <div style={styles.bpBannerIcon}><Network size={22} /></div>
        <div>
          <div style={styles.bpBannerEyebrow}>Topical authority blueprint · Evergreen</div>
          <div style={styles.bpBannerTitle}>{total} planned topics across 5 categories</div>
          <div style={styles.bpBannerSub}>
            {fullyLoaded
              ? `${loaded} loaded · ${written} written · ${deployed} deployed`
              : `${loaded} of ${total} loaded into pipeline. Click load to add the rest.`
            }
          </div>
        </div>
      </div>
      <div style={styles.bpBannerRight}>
        <div style={styles.bpProgressBlock}>
          <div style={styles.bpProgressBars}>
            <div title={`Loaded: ${loaded}/${total} (${loadedPct}%)`} style={{ ...styles.bpBar, ...styles.bpBarLoaded, width: `${loadedPct}%` }} />
          </div>
          <div style={styles.bpProgressBars}>
            <div title={`Written: ${written}/${total} (${writtenPct}%)`} style={{ ...styles.bpBar, ...styles.bpBarWritten, width: `${writtenPct}%` }} />
          </div>
          <div style={styles.bpProgressBars}>
            <div title={`Deployed: ${deployed}/${total} (${deployedPct}%)`} style={{ ...styles.bpBar, ...styles.bpBarDeployed, width: `${deployedPct}%` }} />
          </div>
        </div>
        {canApprove && (
          <button
            onClick={onLoad}
            disabled={fullyLoaded}
            style={{ ...styles.primaryBtn, ...(fullyLoaded ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}
          >
            {fullyLoaded ? <><Check size={15} /> All loaded</> : <><Download size={15} /> Load blueprint</>}
          </button>
        )}
      </div>
    </div>
  );
}

function SitemapTreeList({ clusterEntries, collapsed, setCollapsed, onEdit, onDelete }) {
  // Build hierarchy: category → cluster → pages
  const tree = {};
  clusterEntries.forEach(([clusterName, buckets]) => {
    const allItems = [
      ...buckets.live, ...buckets.deployed, ...buckets.ready,
      ...buckets.drafting, ...buckets.writing, ...buckets.planned,
    ];
    if (allItems.length === 0) return;
    // Group within cluster by category
    allItems.forEach(item => {
      const cat = item.category || 'uncategorised';
      if (!tree[cat]) tree[cat] = {};
      if (!tree[cat][clusterName]) tree[cat][clusterName] = [];
      tree[cat][clusterName].push(item);
    });
  });

  const CATEGORY_LABELS = {
    // Original 5
    fitness: 'Fitness',
    nutrition: 'Nutrition',
    mental_health: 'Mental Health',
    health_guides: 'Health Guides',
    beauty: 'Beauty',
    // Content Plan v3 — 14 sections
    fitness_training: 'Fitness & Training',
    diet_nutrition: 'Diet & Nutrition',
    preventive_health: 'Preventive Health',
    women_s_health: "Women's Health",
    men_s_health: "Men's Health",
    expert_directory: 'Expert Directory',
    community_social: 'Community & Social',
    medications: 'Medications',
    supplements: 'Supplements',
    tools_calculators: 'Tools & Calculators',
    health_news: 'Health News',
    kids_family: 'Kids & Family',
    my_health_profile: 'My Health Profile',
    uncategorised: 'Uncategorised',
  };

  const sortedCategories = Object.keys(tree).sort((a, b) => {
    if (a === 'uncategorised') return 1;
    if (b === 'uncategorised') return -1;
    return (CATEGORY_LABELS[a] || a).localeCompare(CATEGORY_LABELS[b] || b);
  });

  return (
    <div style={styles.treeList}>
      {sortedCategories.map(cat => {
        const catKey = `cat:${cat}`;
        const catCollapsed = collapsed[catKey];
        const clustersInCat = Object.entries(tree[cat]).sort((a, b) => b[1].length - a[1].length);
        const totalPages = clustersInCat.reduce((s, [, items]) => s + items.length, 0);

        return (
          <div key={cat} style={styles.treeCategory}>
            <button
              onClick={() => setCollapsed(s => ({ ...s, [catKey]: !catCollapsed }))}
              style={styles.treeCategoryHead}
            >
              {catCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
              <span style={styles.treeCategoryTitle}>{CATEGORY_LABELS[cat] || cat}</span>
              <span style={styles.treeCategoryCount}>{totalPages}</span>
            </button>

            {!catCollapsed && clustersInCat.map(([clusterName, items]) => {
              const clusterKey = `${cat}:${clusterName}`;
              const clCollapsed = collapsed[clusterKey];
              const sortedItems = [...items].sort((a, b) => {
                // sort by status: live first, then ready, draft, writing, planned
                const order = { LIVE: 0, DEPLOYED: 1, READY: 2, DRAFT: 3, WRITING: 4, PLANNED: 5 };
                return (order[a._status] || 9) - (order[b._status] || 9);
              });

              return (
                <div key={clusterName} style={styles.treeCluster}>
                  <button
                    onClick={() => setCollapsed(s => ({ ...s, [clusterKey]: !clCollapsed }))}
                    style={styles.treeClusterHead}
                  >
                    {clCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                    <span style={styles.treeClusterTitle}>{clusterName}</span>
                    <span style={styles.treeClusterCount}>{items.length}</span>
                  </button>

                  {!clCollapsed && (
                    <div style={styles.treePageList}>
                      {sortedItems.map(item => (
                        <TreePage
                          key={item.id}
                          item={item}
                          onEdit={item.kind === 'page' ? () => onEdit(item) : null}
                          onDelete={item.kind === 'page' ? () => onDelete(item.id) : null}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function TreePage({ item, onEdit, onDelete }) {
  const STATUS_LABELS = {
    LIVE: 'live',
    DEPLOYED: 'deployed',
    READY: 'ready',
    DRAFT: 'draft',
    WRITING: 'writing',
    PLANNED: 'planned',
  };
  const statusClass = (item._status || '').toLowerCase();

  return (
    <div style={styles.treePage}>
      <span style={styles.treeBullet}>·</span>
      <span style={styles.treePageTitle}>{item.title}</span>
      <span style={{ ...styles.treeStatus, ...(styles[`treeStatus_${statusClass}`] || {}) }}>{STATUS_LABELS[item._status] || item._status}</span>
      {item.url && (
        <a href={item.url} target="_blank" rel="noopener" style={styles.treePageLink}>
          <ExternalLink size={11} />
        </a>
      )}
      {(onEdit || onDelete) && (
        <div style={styles.treePageActions}>
          {onEdit && <button style={styles.iconBtnSm} onClick={onEdit} title="Edit"><Edit3 size={11} /></button>}
          {onDelete && <button style={styles.iconBtnSm} onClick={onDelete} title="Delete"><Trash2 size={11} /></button>}
        </div>
      )}
    </div>
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
        {[{ id: '', label: 'None' }, ...CATEGORIES].map(c => (
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
  const [defaultCategory, setDefaultCategory] = useState('');

  // Smart parser: detects delimiter per line (tab, pipe, or 2+ spaces).
  // Excel paste uses tabs; pipes work for manual entry.
  const parseLines = (raw) => {
    const lines = raw.split('\n').map(l => l).filter(l => l.trim());
    return lines.map(line => {
      let parts;
      if (line.includes('\t')) parts = line.split('\t');
      else if (line.includes('|')) parts = line.split('|');
      else parts = [line]; // single column = title only
      parts = parts.map(p => p.trim());
      return {
        title: parts[0] || '',
        url: parts[1] || '',
        keyword: parts[2] || '',
        cluster: parts[3] || defaultCluster || 'Unclustered',
        category: (parts[4] || defaultCategory || '').toLowerCase().replace(/[\s-]/g, '_') || '',
      };
    }).filter(p => p.title);
  };

  const preview = parseLines(text);

  const submit = () => {
    if (preview.length) onSubmit(preview);
  };

  return (
    <div style={styles.formPanel}>
      <h2 style={styles.formTitle}>Bulk add live pages</h2>
      <p style={styles.formSub}>
        Paste rows from Excel (columns are auto-detected) or type by hand with <code style={styles.mdCode}>|</code> between fields.<br />
        Order: <code style={styles.mdCode}>Title</code> · <code style={styles.mdCode}>URL</code> · <code style={styles.mdCode}>Keyword</code> · <code style={styles.mdCode}>Cluster</code> · <code style={styles.mdCode}>Category</code>. Only Title is required.
      </p>

      <div style={styles.bulkDefaultsRow}>
        <div style={{ flex: 1 }}>
          <label style={styles.formLabel}>Default cluster <span style={styles.optional}>fallback</span></label>
          <input value={defaultCluster} onChange={e => setDefaultCluster(e.target.value)} style={styles.topicInput} placeholder="e.g. Diabetes" />
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.formLabel}>Default category <span style={styles.optional}>fallback</span></label>
          <select value={defaultCategory} onChange={e => setDefaultCategory(e.target.value)} style={{ ...styles.topicInput, paddingRight: 14 }}>
            <option value="">— none —</option>
            <option value="fitness">Fitness</option>
            <option value="nutrition">Nutrition</option>
            <option value="mental_health">Mental health</option>
            <option value="health_guides">Health guides</option>
            <option value="beauty">Beauty</option>
          </select>
        </div>
      </div>

      <label style={styles.formLabel}>Pages</label>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        style={{ ...styles.textarea, minHeight: 200, fontFamily: 'ui-monospace, monospace', fontSize: 13 }}
        rows={12}
        placeholder={`Tip: Copy multiple cells in Excel/Sheets and paste here — tabs auto-detected.

Signs of type 2 diabetes | https://site.co.za/t2d-signs | type 2 diabetes | Diabetes | health_guides
Iron deficiency in women | https://site.co.za/iron-women | iron deficiency women | Vitamins & minerals | nutrition`}
      />

      {preview.length > 0 && (
        <div style={styles.bulkPreview}>
          <div style={styles.bulkPreviewLabel}>Preview · {preview.length} {preview.length === 1 ? 'page' : 'pages'}</div>
          <div style={styles.bulkPreviewList}>
            {preview.slice(0, 8).map((p, i) => (
              <div key={i} style={styles.bulkPreviewRow}>
                <span style={styles.bulkPreviewTitle}>{p.title}</span>
                {p.url && <span style={styles.bulkPreviewUrl}>{p.url}</span>}
                {(p.cluster || p.category) && (
                  <span style={styles.bulkPreviewMeta}>
                    {p.cluster}{p.cluster && p.category ? ' · ' : ''}{p.category}
                  </span>
                )}
              </div>
            ))}
            {preview.length > 8 && <div style={styles.bulkPreviewMore}>+{preview.length - 8} more</div>}
          </div>
        </div>
      )}

      <div style={styles.formActions}>
        <button style={styles.secondaryBtn} onClick={onClose}>Cancel</button>
        <button style={styles.primaryBtn} onClick={submit} disabled={!preview.length}>
          <Plus size={15} /> Add {preview.length || ''} {preview.length === 1 ? 'page' : 'pages'}
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
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.65; } }
  @keyframes slideInLeft { from { transform: translateX(-12px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

  :root {
    --c-bg: #FAF7F2;
    --c-surface: #FFFFFF;
    --c-sidebar: #F2EDE3;
    --c-ink: #1A1815;
    --c-ink-soft: #3D3A33;
    --c-muted: #6B6657;
    --c-faint: #9A9486;
    --c-border: #E0D9C9;
    --c-border-soft: #EDE8DD;
    --c-green: #2D5F4E;
    --c-green-deep: #234B3D;
    --c-green-bg: #EAF1ED;
    --c-ochre: #C77D4A;
    --c-ochre-bg: #F4E4D2;
    --c-red: #A14438;
    --c-red-bg: #F5E0DD;
    --c-blue: #3A5266;
    --c-blue-bg: #E3EAEE;
    --c-warning-bg: #F5EFE4;
    --c-warning-border: #E8D9B8;
    --c-warning-text: #7A5519;
    --c-success-bg: #EAF1ED;
    --c-success-border: #C2D8C9;
    --c-success-text: #1F4636;
    --c-error-text: #7A2418;
    --c-code-bg: #1A1815;
    --c-code-text: #E8E2D7;
    --c-shadow: rgba(26, 24, 21, 0.06);
    --c-shadow-strong: rgba(26, 24, 21, 0.15);
    --c-overlay: rgba(26, 24, 21, 0.45);
    --c-button-active-bg: #1A1815;
    --c-button-active-text: #FAF7F2;
    --c-input-bg: #FAF7F2;
  }

  [data-theme="dark"] {
    --c-bg: #0E1218;
    --c-surface: #161B23;
    --c-sidebar: #0A0E13;
    --c-ink: #E8ECF1;
    --c-ink-soft: #C5CBD3;
    --c-muted: #8B939E;
    --c-faint: #5B6471;
    --c-border: #232932;
    --c-border-soft: #1A1F27;
    --c-green: #5BB89A;
    --c-green-deep: #4A9C82;
    --c-green-bg: #1A2A23;
    --c-ochre: #E89968;
    --c-ochre-bg: #2E2118;
    --c-red: #E5685B;
    --c-red-bg: #2E1A18;
    --c-blue: #7BA3C7;
    --c-blue-bg: #1A2329;
    --c-warning-bg: #2A220F;
    --c-warning-border: #3D3415;
    --c-warning-text: #D4B574;
    --c-success-bg: #15241D;
    --c-success-border: #213029;
    --c-success-text: #7DC8A8;
    --c-error-text: #F4A299;
    --c-code-bg: #050709;
    --c-code-text: #C5CBD3;
    --c-shadow: rgba(0, 0, 0, 0.4);
    --c-shadow-strong: rgba(0, 0, 0, 0.6);
    --c-overlay: rgba(0, 0, 0, 0.65);
    --c-button-active-bg: #E8ECF1;
    --c-button-active-text: #0E1218;
    --c-input-bg: #0A0E13;
  }

  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--c-bg);
    color: var(--c-ink);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    font-feature-settings: "cv11", "ss01", "ss03";
  }
  textarea, input, select { font-family: inherit; color: var(--c-ink); background: var(--c-input-bg); }
  textarea:focus, input:focus, select:focus { outline: none; border-color: var(--c-green) !important; }
  button { cursor: pointer; font-family: inherit; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  ::selection { background: var(--c-green); color: var(--c-bg); }
  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--c-border); border-radius: 5px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--c-muted); }

  /* Sidebar layout — mobile responsive */
  .ed-sidebar-backdrop {
    position: fixed; inset: 0; background: var(--c-overlay);
    z-index: 25; backdrop-filter: blur(2px); animation: fadeIn 0.18s ease;
  }
  @media (max-width: 960px) {
    .ed-sidebar {
      transform: translateX(-100%);
      box-shadow: 0 0 0 transparent;
    }
    .ed-sidebar.is-open {
      transform: translateX(0);
      box-shadow: 8px 0 32px var(--c-shadow-strong);
    }
    .ed-topbar { display: flex !important; }
    div[style*="margin-left: 232"] { margin-left: 0 !important; }
  }
  @media (min-width: 961px) {
    .ed-sidebar-backdrop { display: none; }
  }
`;

const colors = {
  bg: 'var(--c-bg)',
  surface: 'var(--c-surface)',
  sidebar: 'var(--c-sidebar)',
  ink: 'var(--c-ink)',
  inkSoft: 'var(--c-ink-soft)',
  muted: 'var(--c-muted)',
  faint: 'var(--c-faint)',
  border: 'var(--c-border)',
  borderSoft: 'var(--c-border-soft)',
  green: 'var(--c-green)',
  greenDeep: 'var(--c-green-deep)',
  greenBg: 'var(--c-green-bg)',
  ochre: 'var(--c-ochre)',
  ochreBg: 'var(--c-ochre-bg)',
  red: 'var(--c-red)',
  redBg: 'var(--c-red-bg)',
  blue: 'var(--c-blue)',
  blueBg: 'var(--c-blue-bg)',
  buttonActiveBg: 'var(--c-button-active-bg)',
  buttonActiveText: 'var(--c-button-active-text)',
  inputBg: 'var(--c-input-bg)',
};

const fonts = {
  display: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
};

const styles = {
  app: { minHeight: '100vh', background: colors.bg, color: colors.ink, fontFamily: fonts.body, fontSize: 14.5, lineHeight: 1.55 },
  loading: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.bg },

  // === SIDEBAR LAYOUT ===
  sidebar: {
    width: 232,
    background: colors.sidebar,
    borderRight: `1px solid ${colors.border}`,
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    zIndex: 30,
    transition: 'transform 0.22s ease',
  },
  sidebarBrand: {
    display: 'flex', alignItems: 'center', gap: 11,
    padding: '20px 18px 16px',
    borderBottom: `1px solid ${colors.borderSoft}`,
  },
  sidebarBrandTitle: { fontFamily: fonts.display, fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.012em', lineHeight: 1.1, color: colors.ink },
  sidebarBrandSub: { fontSize: 10, color: colors.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 3, fontWeight: 500 },

  sidebarNav: { flex: 1, overflowY: 'auto', padding: '12px 10px' },
  sidebarSection: { marginBottom: 18 },
  sidebarSectionLabel: {
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: colors.faint,
    fontWeight: 600,
    padding: '6px 12px 4px',
    marginBottom: 2,
  },
  sidebarItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    width: '100%',
    padding: '8px 12px',
    background: 'transparent',
    border: 'none',
    borderRadius: 6,
    color: colors.inkSoft,
    fontSize: 13.5,
    fontWeight: 500,
    fontFamily: fonts.body,
    textAlign: 'left',
    transition: 'background 0.12s',
    marginBottom: 1,
  },
  sidebarItemActive: {
    background: colors.buttonActiveBg,
    color: colors.buttonActiveText,
  },
  sidebarItemLabel: { flex: 1 },
  sidebarBadge: {
    background: colors.ochre,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 600,
    padding: '1px 7px',
    borderRadius: 999,
    minWidth: 18,
    textAlign: 'center',
    letterSpacing: '0.02em',
  },

  sidebarFooter: {
    padding: '12px 10px 14px',
    borderTop: `1px solid ${colors.borderSoft}`,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  themeToggle: {
    display: 'flex', alignItems: 'center', gap: 8,
    width: '100%', padding: '8px 12px',
    background: 'transparent', border: `1px solid ${colors.border}`,
    borderRadius: 6, color: colors.inkSoft, fontSize: 12.5, fontWeight: 500,
    fontFamily: fonts.body,
  },
  sidebarUserBtn: {
    display: 'flex', alignItems: 'center', gap: 10,
    width: '100%', padding: 8,
    background: 'transparent', border: `1px solid ${colors.border}`,
    borderRadius: 6, fontFamily: fonts.body, color: colors.ink,
  },
  sidebarUserInfo: { flex: 1, minWidth: 0, textAlign: 'left' },
  sidebarUserName: { fontSize: 13, fontWeight: 500, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis' },
  sidebarUserRole: { fontSize: 10.5, color: colors.muted, textTransform: 'capitalize', marginTop: 2, letterSpacing: '0.04em' },
  userMenuSidebar: {
    position: 'absolute', left: 0, right: 0, bottom: 'calc(100% + 6px)',
    background: colors.surface, border: `1px solid ${colors.border}`,
    borderRadius: 6, padding: 4, zIndex: 5,
    boxShadow: `0 8px 24px ${colors.surface === '#FFFFFF' ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.4)'}`,
  },

  brand: { display: 'flex', alignItems: 'center', gap: 14 }, // kept for auth screens
  brandMark: { fontSize: 24, fontFamily: fonts.display, color: colors.green, lineHeight: 1 },
  brandTitle: { fontFamily: fonts.display, fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.1, color: colors.ink },
  brandSub: { fontSize: 11, color: colors.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 3, fontWeight: 500 },

  mainArea: {
    marginLeft: 232,
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: colors.bg,
  },
  topBar: {
    display: 'none', // shown on mobile only via CSS
    alignItems: 'center',
    gap: 12,
    padding: '14px 20px',
    borderBottom: `1px solid ${colors.border}`,
    background: colors.bg,
    position: 'sticky',
    top: 0,
    zIndex: 20,
  },
  menuToggle: {
    background: 'transparent', border: `1px solid ${colors.border}`,
    borderRadius: 6, padding: '7px 8px', color: colors.ink,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  topBarTitle: { fontFamily: fonts.display, fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', color: colors.ink },

  main: { maxWidth: 1180, margin: '0 auto', padding: '40px 38px 80px', width: '100%' },

  // legacy header (unused but kept for auth screens that look like cards)
  badge: { background: colors.ochre, color: '#FFFFFF', fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 8, lineHeight: 1.5, letterSpacing: '0.02em' },

  pageHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28, gap: 24, flexWrap: 'wrap' },
  eyebrow: { fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: colors.muted, fontWeight: 500, marginBottom: 8 },
  pageTitle: { fontFamily: fonts.display, fontSize: 38, fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1, margin: 0 },
  pageSub: { fontSize: 15, color: colors.muted, marginTop: 10, maxWidth: 520, lineHeight: 1.5 },

  primaryBtn: { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 18px', background: colors.buttonActiveBg, color: colors.buttonActiveText, border: 'none', borderRadius: 999, fontSize: 13.5, fontWeight: 500, letterSpacing: '-0.005em', transition: 'all 0.15s' },
  secondaryBtn: { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 18px', background: 'transparent', color: colors.ink, border: `1px solid ${colors.border}`, borderRadius: 999, fontSize: 13.5, fontWeight: 500 },

  topicBar: { background: colors.surface, padding: '20px 24px', borderRadius: 6, border: `1px solid ${colors.border}`, marginBottom: 24 },
  topicBarRow: { display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' },
  topicInputWrap: { flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: 6 },
  topicInputLabel: { fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.muted, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 },
  topicInput: { padding: '11px 14px', fontSize: 15, border: `1px solid ${colors.border}`, borderRadius: 4, fontFamily: fonts.body, background: colors.bg, color: colors.ink },
  // Sitemap tree (indented list)
  treeList: { display: 'flex', flexDirection: 'column', gap: 2 },
  treeCategory: { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, marginBottom: 8, overflow: 'hidden' },
  treeCategoryHead: { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '13px 16px', background: colors.surface, border: 'none', textAlign: 'left', fontFamily: fonts.body, color: colors.ink },
  treeCategoryTitle: { fontSize: 14.5, fontWeight: 600, flex: 1, letterSpacing: '-0.005em' },
  treeCategoryCount: { fontSize: 11, color: colors.muted, fontWeight: 600, padding: '2px 8px', background: colors.bg, borderRadius: 999 },
  treeCluster: { borderTop: `1px solid ${colors.borderSoft}` },
  treeClusterHead: { display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 16px 9px 36px', background: 'transparent', border: 'none', textAlign: 'left', fontFamily: fonts.body, color: colors.inkSoft },
  treeClusterTitle: { fontSize: 13, fontWeight: 500, flex: 1 },
  treeClusterCount: { fontSize: 11, color: colors.muted, fontVariantNumeric: 'tabular-nums' },
  treePageList: { paddingBottom: 6 },
  treePage: { display: 'flex', alignItems: 'center', gap: 8, padding: '5px 16px 5px 62px', fontSize: 13, color: colors.inkSoft, transition: 'background 0.1s', position: 'relative' },
  treeBullet: { color: colors.faint, fontWeight: 700, fontSize: 14, lineHeight: 1, width: 4, textAlign: 'center' },
  treePageTitle: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  treeStatus: { fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 3, letterSpacing: '0.04em', textTransform: 'uppercase', flexShrink: 0 },
  treeStatus_live: { background: 'var(--c-blue-bg)', color: 'var(--c-blue)' },
  treeStatus_deployed: { background: 'var(--c-green-bg)', color: 'var(--c-green-deep)' },
  treeStatus_ready: { background: 'var(--c-green-bg)', color: 'var(--c-green)' },
  treeStatus_draft: { background: 'var(--c-ochre-bg)', color: 'var(--c-ochre)' },
  treeStatus_writing: { background: 'var(--c-warning-bg)', color: 'var(--c-warning-text)' },
  treeStatus_planned: { background: colors.bg, color: colors.muted, border: `1px solid ${colors.borderSoft}` },
  treePageLink: { color: colors.muted, display: 'flex', alignItems: 'center', textDecoration: 'none', padding: 2 },
  treePageActions: { display: 'flex', gap: 2 },
  iconBtnSm: { background: 'transparent', border: 'none', color: colors.muted, padding: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3 },

  // Bulk add improvements
  bulkDefaultsRow: { display: 'flex', gap: 12, marginBottom: 6 },
  bulkPreview: { marginTop: 14, padding: '12px 14px', background: colors.bg, border: `1px solid ${colors.borderSoft}`, borderRadius: 6 },
  bulkPreviewLabel: { fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.muted, marginBottom: 8 },
  bulkPreviewList: { display: 'flex', flexDirection: 'column', gap: 5 },
  bulkPreviewRow: { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'baseline', fontSize: 12.5, paddingBottom: 5, borderBottom: `1px dashed ${colors.borderSoft}` },
  bulkPreviewTitle: { fontWeight: 500, color: colors.ink, flex: '1 1 200px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  bulkPreviewUrl: { fontSize: 11.5, color: colors.muted, fontFamily: 'ui-monospace, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 },
  bulkPreviewMeta: { fontSize: 11, color: colors.faint, fontStyle: 'italic' },
  bulkPreviewMore: { fontSize: 11, color: colors.muted, fontStyle: 'italic', paddingTop: 4 },

  // === BLUEPRINT BANNER ===
  bpBanner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20, padding: '18px 22px', background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8, marginBottom: 18 },
  bpBannerLeft: { display: 'flex', alignItems: 'center', gap: 14, flex: '1 1 320px', minWidth: 0 },
  bpBannerIcon: { width: 44, height: 44, borderRadius: 8, background: 'var(--c-blue-bg)', color: 'var(--c-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bpBannerEyebrow: { fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.muted, fontWeight: 600, marginBottom: 2 },
  bpBannerTitle: { fontFamily: fonts.display, fontSize: 17, fontWeight: 600, color: colors.ink, letterSpacing: '-0.012em' },
  bpBannerSub: { fontSize: 12.5, color: colors.muted, marginTop: 3 },
  bpBannerRight: { display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  bpProgressBlock: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 200 },
  bpProgressBars: { height: 4, background: colors.bg, borderRadius: 999, overflow: 'hidden', position: 'relative' },
  bpBar: { height: '100%', borderRadius: 999 },
  bpBarLoaded: { background: 'var(--c-ochre)' },
  bpBarWritten: { background: 'var(--c-blue)' },
  bpBarDeployed: { background: 'var(--c-green)' },

  // Type filter row in sitemap
  typeFilterRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 },

  // === DASHBOARD ===
  dashTopRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, marginBottom: 32, paddingBottom: 24, borderBottom: `1px solid ${colors.border}` },
  dashEyebrow: { fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.muted, fontWeight: 600, marginBottom: 6 },
  dashHeadline: { fontFamily: fonts.display, fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1, margin: 0, color: colors.ink },
  dashGreeting: { fontSize: 14, color: colors.muted, marginTop: 8 },

  dayCompleteBadge: { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'var(--c-success-bg)', border: `1px solid var(--c-success-border)`, borderRadius: 8 },
  dayCompleteTick: { width: 38, height: 38, borderRadius: '50%', background: 'var(--c-green)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  dayCompleteTitle: { fontSize: 15, fontWeight: 600, color: 'var(--c-success-text)', lineHeight: 1.2 },
  dayCompleteSub: { fontSize: 12, color: 'var(--c-success-text)', opacity: 0.8, marginTop: 2 },

  dayProgressBadge: { textAlign: 'right' },
  dayProgressNum: { fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, letterSpacing: '-0.02em', lineHeight: 1 },
  dayProgressOf: { color: colors.muted, fontSize: 22, fontWeight: 500 },
  dayProgressLabel: { fontSize: 11, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4, fontWeight: 600 },

  dashCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 },
  dashCard: { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '18px 20px 16px', transition: 'border-color 0.15s' },
  dashCardComplete: { borderColor: 'var(--c-success-border)', background: 'var(--c-success-bg)' },
  dashCardHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 },
  dashCardIcon: { width: 32, height: 32, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  dashCardLabel: { fontSize: 13.5, fontWeight: 600, color: colors.ink, flex: 1, letterSpacing: '-0.005em' },
  dashCardTick: { width: 24, height: 24, borderRadius: '50%', background: 'var(--c-green)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' },

  dashCardMainRow: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 },
  dashCardBigNum: { fontFamily: fonts.display, fontSize: 34, fontWeight: 600, color: colors.ink, lineHeight: 1, letterSpacing: '-0.02em' },
  dashCardSlash: { color: colors.muted, fontSize: 18, fontWeight: 500 },
  dashCardStatus: { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' },
  dashCardOk: { color: 'var(--c-green)' },
  dashCardOutstanding: { color: colors.ochre },

  dashProgressTrack: { height: 6, background: colors.bg, borderRadius: 999, overflow: 'hidden', marginBottom: 14 },
  dashProgressFill: { height: '100%', borderRadius: 999, transition: 'width 0.3s ease' },

  dashCardMonthly: { borderTop: `1px solid ${colors.borderSoft}`, paddingTop: 10 },
  dashCardMonthlyRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  dashCardMonthlyLabel: { fontSize: 11.5, color: colors.muted, fontWeight: 500 },
  dashCardMonthlyVal: { fontSize: 12, fontWeight: 600, color: colors.ink, fontVariantNumeric: 'tabular-nums' },
  dashMonthlyTrack: { position: 'relative', height: 4, background: colors.bg, borderRadius: 999, overflow: 'visible', marginBottom: 6 },
  dashMonthlyFill: { height: '100%', borderRadius: 999, opacity: 0.7 },
  dashMonthlyMarker: { position: 'absolute', top: -2, width: 2, height: 8, background: colors.inkSoft, borderRadius: 1, opacity: 0.5 },
  dashCardPace: { fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 },

  // Stat strip
  dashStatsStrip: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 32 },
  dashStatBtn: { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, padding: '14px 16px', textAlign: 'left', fontFamily: fonts.body, color: colors.ink },
  dashStatValue: { fontFamily: fonts.display, fontSize: 22, fontWeight: 600, color: colors.ink, lineHeight: 1, marginBottom: 4 },
  dashStatLabel: { fontSize: 11.5, color: colors.muted, letterSpacing: '0.02em' },

  // Monthly heatmap
  dashSection: { marginBottom: 32 },
  dashSectionHead: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 },
  dashSectionTitle: { fontFamily: fonts.display, fontSize: 18, fontWeight: 600, color: colors.ink, margin: 0, letterSpacing: '-0.015em' },
  dashSectionSub: { fontSize: 12, color: colors.muted },

  heatmapWeekdays: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4, maxWidth: 560 },
  heatmapWeekday: { fontSize: 10, color: colors.muted, fontWeight: 600, textAlign: 'center', letterSpacing: '0.08em' },
  heatmapGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, maxWidth: 560 },
  heatmapCellPad: { aspectRatio: '1', background: 'transparent' },
  heatmapCell: { aspectRatio: '1', borderRadius: 4, background: colors.bg, border: `1px solid ${colors.borderSoft}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  heatmap_none: { background: colors.bg, border: `1px solid ${colors.borderSoft}` },
  heatmap_low: { background: 'var(--c-green-bg)', border: `1px solid var(--c-success-border)` },
  heatmap_mid: { background: 'var(--c-green)', opacity: 0.5, border: `1px solid var(--c-green)` },
  heatmap_full: { background: 'var(--c-green)', border: `1px solid var(--c-green-deep)` },
  heatmapCellFuture: { opacity: 0.35 },
  heatmapCellToday: { boxShadow: `0 0 0 2px var(--c-ochre)`, fontWeight: 700 },
  heatmapCellDay: { fontSize: 11, fontWeight: 600, color: colors.inkSoft, lineHeight: 1 },
  heatmapCellCount: { fontSize: 9, color: 'var(--c-green-deep)', fontWeight: 700, marginTop: 1 },
  heatmapLegend: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 11, color: colors.muted },
  heatmapLegendLabel: { fontSize: 10.5, fontWeight: 500 },

  // Learn-from-edits prompt
  learnPrompt: { padding: '32px 28px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  learnPromptIcon: { width: 56, height: 56, borderRadius: '50%', background: 'var(--c-green-bg)', color: 'var(--c-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  learnPromptTitle: { fontFamily: fonts.display, fontSize: 20, fontWeight: 600, margin: 0, letterSpacing: '-0.015em', color: colors.ink },
  learnPromptBody: { fontSize: 14, color: colors.inkSoft, maxWidth: 440, lineHeight: 1.55, margin: '4px 0 16px' },
  learnPromptActions: { display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  editedIndicator: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'var(--c-ochre-bg)', color: 'var(--c-ochre)', fontSize: 11, fontWeight: 600, borderRadius: 999, letterSpacing: '0.04em', textTransform: 'uppercase', marginRight: 'auto' },

  countWrap: { flex: '0 1 360px', display: 'flex', flexDirection: 'column', gap: 6 },
  countPillRow: { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  countPill: { padding: '6px 10px', minWidth: 34, fontSize: 12.5, fontWeight: 600, border: `1px solid ${colors.border}`, borderRadius: 4, background: colors.surface, color: colors.inkSoft, fontFamily: fonts.body },
  countPillActive: { background: colors.buttonActiveBg, color: colors.buttonActiveText, borderColor: colors.buttonActiveBg },
  countBadgeInline: { background: colors.buttonActiveBg, color: colors.buttonActiveText, padding: '1px 7px', borderRadius: 999, fontSize: 10, fontWeight: 500, letterSpacing: 0, textTransform: 'none', marginLeft: 'auto' },

  subTabRow: { display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${colors.borderSoft}` },
  subTab: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 16px', background: 'transparent', border: 'none', borderBottom: '2px solid transparent', fontSize: 14, color: colors.muted, fontWeight: 500, marginBottom: -1 },
  subTabActive: { color: colors.ink, borderBottomColor: colors.ink },
  subTabBadge: { background: colors.ochre, color: colors.bg, fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 8, letterSpacing: '0.02em' },

  filterRow: { display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' },
  filterBtn: { padding: '6px 14px', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 999, fontSize: 12.5, color: colors.muted, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 7 },
  filterBtnActive: { background: colors.buttonActiveBg, color: colors.buttonActiveText, borderColor: colors.buttonActiveBg },
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
  writingChip: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', background: 'var(--c-green-bg)', color: colors.green, fontSize: 11.5, fontWeight: 500, borderRadius: 999, textTransform: 'lowercase', letterSpacing: '0.02em' },
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
  draftTitle: { fontFamily: fonts.display, fontSize: 18, fontWeight: 600, letterSpacing: '-0.018em', lineHeight: 1.2, margin: '0 0 6px' },
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

  modalOverlay: { position: 'fixed', inset: 0, background: 'var(--c-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20, animation: 'fadeIn 0.18s ease', backdropFilter: 'blur(4px)' },
  modalBox: { background: colors.bg, borderRadius: 6, maxWidth: 760, width: '100%', maxHeight: '92vh', overflow: 'auto', border: `1px solid ${colors.border}`, boxShadow: '0 20px 60px var(--c-shadow-strong)' },
  formPanel: { padding: '32px 36px' },
  formTitle: { fontFamily: fonts.display, fontSize: 22, fontWeight: 600, letterSpacing: '-0.022em', margin: '0 0 8px' },
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
  codePanel: { background: 'var(--c-code-bg)', borderRadius: 4, marginTop: -1, marginBottom: 14, maxHeight: 280, overflow: 'auto' },
  codeBlock: { color: 'var(--c-code-text)', fontFamily: 'ui-monospace, monospace', fontSize: 12, lineHeight: 1.55, padding: '16px 18px', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  exportHint: { fontSize: 12.5, color: colors.muted, lineHeight: 1.5, padding: '10px 14px', background: '#F5EFE4', borderRadius: 4, marginBottom: 14, border: `1px solid ${colors.border}` },

  loadingPanel: { padding: '48px 36px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 },
  loadingMsg: { fontFamily: fonts.display, fontSize: 22, fontWeight: 500, margin: '8px 0 0', letterSpacing: '-0.015em' },
  loadingSub: { fontSize: 13, color: colors.muted, margin: '0 0 12px' },
  errorDetail: { fontSize: 12.5, color: colors.inkSoft, background: colors.surface, padding: '12px 14px', borderRadius: 4, border: `1px solid ${colors.border}`, maxWidth: 560, width: '100%', textAlign: 'left', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'ui-monospace, monospace', lineHeight: 1.5, margin: '0 0 4px' },

  toast: { position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: colors.buttonActiveBg, color: colors.buttonActiveText, padding: '10px 20px', borderRadius: 999, fontSize: 13.5, fontWeight: 500, zIndex: 100, animation: 'fadeIn 0.2s ease', boxShadow: '0 8px 24px var(--c-shadow-strong)' },
  toastSuccess: { background: colors.green },
  toastError: { background: colors.red },

  // Train view
  trainSummary: { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, padding: '18px 24px', marginBottom: 24 },
  trainSummaryRow: { display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' },
  trainStat: { display: 'flex', flexDirection: 'column', gap: 2 },
  trainStatNum: { fontFamily: fonts.display, fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1, color: colors.ink },
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
  patchCardApplied: { borderLeftColor: colors.green, background: 'var(--c-green-bg)' },
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
  segmentedBtnActive: { background: colors.buttonActiveBg, color: colors.buttonActiveText, borderColor: colors.buttonActiveBg },
  topicPreview: { background: colors.surface, padding: '14px 16px', borderRadius: 4, border: `1px solid ${colors.border}` },
  topicPreviewLabel: { fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.muted, fontWeight: 600, marginBottom: 6 },
  topicPreviewAngle: { fontSize: 13.5, color: colors.inkSoft, lineHeight: 1.5, fontStyle: 'italic', fontFamily: fonts.display },

  // Markdown rendering
  mdH1: { fontFamily: fonts.display, fontSize: 30, fontWeight: 500, letterSpacing: '-0.022em', margin: '0 0 18px', lineHeight: 1.15 },
  mdH2: { fontFamily: fonts.display, fontSize: 22, fontWeight: 500, letterSpacing: '-0.018em', margin: '28px 0 12px', lineHeight: 1.2 },
  mdH3: { fontFamily: fonts.display, fontSize: 17, fontWeight: 500, letterSpacing: '-0.012em', margin: '22px 0 8px', lineHeight: 1.25 },
  mdP: { margin: '0 0 14px', lineHeight: 1.65, color: colors.inkSoft, fontSize: 15 },
  mdList: { margin: '0 0 16px', paddingLeft: 22 },
  mdLi: { margin: '0 0 6px', lineHeight: 1.6, color: colors.inkSoft },
  mdLink: { color: colors.green, textDecoration: 'underline', textDecorationThickness: 1, textUnderlineOffset: 2 },
  mdCode: { fontFamily: 'ui-monospace, monospace', fontSize: 13, background: colors.bg, padding: '1px 5px', borderRadius: 3, color: colors.ink },
  mdBlockquote: { margin: '14px 0', padding: '12px 18px', borderLeft: `3px solid ${colors.green}`, background: 'var(--c-input-bg)', fontStyle: 'italic', color: colors.inkSoft, borderRadius: 2 },

  // Sitemap / topical authority
  statsStrip: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 1, background: colors.border, border: `1px solid ${colors.border}`, borderRadius: 6, overflow: 'hidden', marginBottom: 28 },
  statBox: { background: colors.surface, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 4 },
  statValue: { fontFamily: fonts.display, fontSize: 30, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1 },
  statLabel: { fontSize: 11.5, color: colors.muted, fontWeight: 500, letterSpacing: '0.03em', textTransform: 'uppercase' },
  clusterList: { display: 'flex', flexDirection: 'column', gap: 12 },
  clusterCard: { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, overflow: 'hidden' },
  clusterHead: { display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', cursor: 'pointer', userSelect: 'none', flexWrap: 'wrap' },
  clusterTitle: { fontFamily: fonts.display, fontSize: 22, fontWeight: 500, letterSpacing: '-0.018em', margin: 0, lineHeight: 1.2 },
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

  // Visual sitemap
  sitemapControls: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' },
  viewToggle: { display: 'flex', gap: 2, background: colors.surface, padding: 3, borderRadius: 999, border: `1px solid ${colors.border}` },
  viewToggleBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'transparent', border: 'none', borderRadius: 999, fontSize: 12.5, color: colors.muted, fontWeight: 500, fontFamily: fonts.body },
  viewToggleBtnActive: { background: colors.buttonActiveBg, color: colors.buttonActiveText },
  legend: { display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11, color: colors.muted },
  legendItem: { display: 'inline-flex', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: '50%', display: 'inline-block' },

  visualClusterGrid: { display: 'flex', flexDirection: 'column', gap: 16 },
  visualCluster: { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, padding: 20, overflow: 'hidden' },
  visualClusterHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 18, marginBottom: 18, flexWrap: 'wrap' },
  clusterSub: { fontSize: 11.5, color: colors.muted, marginTop: 4, letterSpacing: '0.02em' },
  coverageBar: { display: 'flex', height: 8, minWidth: 200, flex: '0 1 280px', borderRadius: 999, overflow: 'hidden', background: colors.borderSoft },

  nodeGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 },
  node: { background: colors.muted, color: '#FFFFFF', padding: '12px 14px', borderRadius: 4, border: 'none', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer', minHeight: 64, transition: 'transform 0.15s, box-shadow 0.15s', fontFamily: fonts.body },
  nodeTitle: { fontSize: 12.5, fontWeight: 500, lineHeight: 1.3, color: '#FFFFFF', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', textShadow: '0 1px 1px rgba(0,0,0,0.1)' },
  nodeStatus: { fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.85, fontWeight: 600, marginTop: 'auto' },

  // Category training panel
  catTrainPanel: { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, marginBottom: 28, overflow: 'hidden' },
  catTrainHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', cursor: 'pointer', userSelect: 'none', gap: 16, flexWrap: 'wrap' },
  catTrainTitle: { fontFamily: fonts.display, fontSize: 22, fontWeight: 500, letterSpacing: '-0.018em', lineHeight: 1.2 },
  catTrainSub: { fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 1.45 },
  catTrainBody: { borderTop: `1px solid ${colors.borderSoft}`, padding: '18px 22px 22px' },
  catTabs: { display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' },
  catTab: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 999, fontSize: 13, color: colors.inkSoft, fontWeight: 500, fontFamily: fonts.body },
  catTabActive: { background: colors.buttonActiveBg, color: colors.buttonActiveText, borderColor: colors.buttonActiveBg },
  catDirtyDot: { width: 6, height: 6, borderRadius: '50%', background: colors.ochre, display: 'inline-block' },
  catEditorWrap: {},
  catEditorTopBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 10, flexWrap: 'wrap' },
  catTrainHint: { fontSize: 12, color: colors.muted, fontStyle: 'italic' },
  catTrainArea: { width: '100%', padding: 14, fontSize: 13.5, lineHeight: 1.6, border: `1px solid ${colors.border}`, borderRadius: 4, fontFamily: fonts.body, background: colors.bg, resize: 'vertical', color: colors.inkSoft, minHeight: 280 },

  // WordPress connection banner
  wpBanner: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 4, fontSize: 12.5, marginBottom: 16, background: colors.surface, border: `1px solid ${colors.border}`, color: colors.muted, lineHeight: 1.45 },
  wpBannerOk: { background: 'var(--c-success-bg)', borderColor: 'var(--c-success-border)', color: 'var(--c-success-text)' },
  wpBannerWarn: { background: 'var(--c-warning-bg)', borderColor: 'var(--c-warning-border)', color: 'var(--c-warning-text)' },

  // Featured image thumbnail in library
  libraryThumb: { width: 72, height: 72, objectFit: 'cover', borderRadius: 4, flexShrink: 0, marginRight: 4 },

  // Auth screens
  authScreen: { minHeight: '100vh', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, color: colors.ink, fontFamily: fonts.body, fontSize: 15 },
  authCard: { background: colors.surface, padding: '40px 44px', border: `1px solid ${colors.border}`, borderRadius: 8, maxWidth: 440, width: '100%', boxShadow: '0 8px 32px var(--c-shadow)' },
  authBrand: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 },
  authTitle: { fontFamily: fonts.display, fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.15, margin: '0 0 6px' },
  authSub: { fontSize: 13.5, color: colors.muted, marginBottom: 22, lineHeight: 1.5 },
  authError: { padding: '10px 14px', background: 'var(--c-red-bg)', color: 'var(--c-error-text)', borderRadius: 4, fontSize: 13, marginTop: 16, border: `1px solid var(--c-red-bg)` },

  // User menu in header
  userBtn: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px 6px 6px', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 999, fontFamily: fonts.body, color: colors.ink, fontSize: 13.5 },
  userAvatar: { width: 24, height: 24, borderRadius: '50%', color: '#FFFFFF', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  userName: { fontWeight: 500 },
  userMenu: { position: 'absolute', right: 0, top: 'calc(100% + 6px)', background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, padding: 4, minWidth: 180, zIndex: 20, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' },
  userMenuHeader: { padding: '10px 12px 8px', borderBottom: `1px solid ${colors.borderSoft}`, marginBottom: 4 },
  userMenuName: { fontWeight: 500, fontSize: 13.5 },
  userMenuRole: { fontSize: 11, color: colors.muted, textTransform: 'capitalize', marginTop: 2, letterSpacing: '0.04em' },

  // Pending chip (for contributors)
  pendingChip: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: colors.bg, color: colors.muted, fontSize: 11, fontWeight: 500, borderRadius: 999, border: `1px solid ${colors.borderSoft}`, letterSpacing: '0.02em', fontStyle: 'italic' },

  // Admin / users table
  usersTable: { display: 'flex', flexDirection: 'column', background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, overflow: 'hidden' },
  usersRow: { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: `1px solid ${colors.borderSoft}`, fontSize: 14 },
  usersHeader: { background: colors.bg, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.muted, fontWeight: 600 },
  roleSelect: { padding: '5px 8px', fontSize: 12.5, border: `1px solid ${colors.border}`, borderRadius: 4, background: colors.surface, fontFamily: fonts.body, color: colors.inkSoft },
  roleBadge: (role) => ({ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', background: role === 'admin' ? 'var(--c-green-bg)' : role === 'editor' ? 'var(--c-blue-bg)' : 'var(--c-ochre-bg)', color: role === 'admin' ? 'var(--c-green)' : role === 'editor' ? 'var(--c-blue)' : 'var(--c-ochre)' }),

  createUserPanel: { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, padding: '22px 26px', marginBottom: 22 },
  createUserGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 },

  // Reports
  reportFilters: { display: 'flex', gap: 14, marginBottom: 22, flexWrap: 'wrap' },
  reportSelect: { padding: '9px 12px', fontSize: 13.5, border: `1px solid ${colors.border}`, borderRadius: 4, background: colors.bg, fontFamily: fonts.body, color: colors.ink, minWidth: 160 },
  eventTimeline: { display: 'flex', flexDirection: 'column', background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, overflow: 'hidden' },
  eventRow: { display: 'flex', alignItems: 'center', gap: 14, padding: '10px 18px', borderBottom: `1px solid ${colors.borderSoft}`, fontSize: 13 },
  eventTime: { fontSize: 12, color: colors.muted, width: 90, flexShrink: 0 },
  eventUser: { fontWeight: 500, width: 110, flexShrink: 0 },
  eventAction: { color: colors.inkSoft, width: 160, flexShrink: 0 },
  eventMeta: { fontSize: 12.5, color: colors.muted, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
};
