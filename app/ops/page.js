'use client';
import { useState, useEffect } from 'react';
export default function OpsPage() {
const [user, setUser] = useState(null);
const [loading, setLoading] = useState(true);
const [msg, setMsg] = useState('');
const [sitemapJson, setSitemapJson] = useState('');
useEffect(() => {
fetch('/api/auth/me', { credentials: 'same-origin' })
.then(r => r.json())
.then(d => { setUser(d.user); setLoading(false); })
.catch(() => setLoading(false));
}, []);
const clearKey = async (key, label) => {
if (!confirm(`Clear ${label}? This cannot be undone.`)) return;
setMsg(`Clearing ${label}…`);
try {
let res;
if (key === 'activity') {
res = await fetch('/api/activity', { method: 'DELETE', credentials: 'same-origin' });
} else {
res = await fetch(`/api/data/${key}`, {
method: 'PUT',
headers: { 'Content-Type': 'application/json' },
credentials: 'same-origin',
body: JSON.stringify({ value: [] }),
});
}
setMsg(res.ok ? ` } catch (e) { setMsg(` ${label} cleared` : ` ${e.message}`); }
Failed: HTTP ${res.status}`);
};
const loadSitemap = async () => {
let parsed;
try { parsed = JSON.parse(sitemapJson); }
catch (e) { setMsg(` Invalid JSON: ${e.message}`); return; }
if (!Array.isArray(parsed)) { setMsg(' JSON must be an array'); return; }
if (!confirm(`Replace sitemap with ${parsed.length} new pages?`)) return;
setMsg(`Loading ${parsed.length} pages…`);
try {
const res = await fetch('/api/data/sitePages', {
method: 'PUT',
headers: { 'Content-Type': 'application/json' },
credentials: 'same-origin',
body: JSON.stringify({ value: parsed }),
});
setMsg(res.ok ? ` if (res.ok) setSitemapJson('');
} catch (e) { setMsg(` Loaded ${parsed.length} pages` : ` ${e.message}`); }
Failed: HTTP ${res.status}`);
};
if (loading) return <div style={S.box}>Loading…</div>;
if (!user) return <div style={S.box}>Not signed in. <a href="/" style={S.link}>Sign in</a>
if (user.role !== 'admin') return <div style={S.box}>Admin only. Your role: {user.role}.</d
return (
<div style={S.box}>
<h1 style={S.h1}>Ops</h1>
<p style={S.lead}>Hi {user.name || user.username}. Admin database tools.</p>
{msg && <div style={S.msg}>{msg}</div>}
<section style={S.section}>
<h2 style={S.h2}>Clear data</h2>
<p style={S.hint}>Wipes the key. Users, settings, training, and prompts are not touch
<button style={S.btn} onClick={() => clearKey('topics', 'topics')}>Clear topics</butt
<button style={S.btn} onClick={() => clearKey('drafts', 'drafts')}>Clear drafts</butt
<button style={S.btn} onClick={() => clearKey('library', 'library')}>Clear library</b
<button style={S.btn} onClick={() => clearKey('sitePages', 'sitemap')}>Clear sitemap<
<button style={S.btn} onClick={() => clearKey('activity', 'activity log')}>Clear acti
</section>
<section style={S.section}>
<h2 style={S.h2}>Load sitemap</h2>
<p style={S.hint}>Paste a JSON array of pages. Replaces the entire sitemap.</p>
<textarea
value={sitemapJson}
onChange={e => setSitemapJson(e.target.value)}
placeholder='[{"id":"p_1","title":"Workouts","url":"/fitness/workouts","cluster":"F
style={S.ta}
rows={8}
/>
</section>
<button style={S.btnPrimary} onClick={loadSitemap} disabled={!sitemapJson.trim()}>Loa
<p style={S.foot}>
<a href="/" style={S.link}>← Back to app</a>
</p>
</div>
);
}
const S = {
box: { padding: 16, maxWidth: 600, margin: '0 auto', fontFamily: '-apple-system, system-ui,
h1: { fontSize: 26, margin: '8px 0 4px', fontWeight: 700 },
h2: { fontSize: 16, margin: '20px 0 4px', fontWeight: 600 },
lead: { fontSize: 14, color: '#666', margin: '0 0 16px' },
hint: { fontSize: 12, color: '#888', margin: '4px 0 12px' },
msg: { padding: 12, background: '#fff', border: '1px solid #ddd', borderRadius: 6, fontSize
section: { background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #e5e2da', m
btn: { display: 'block', width: '100%', padding: 14, margin: '8px 0', background: '#fff3e0'
btnPrimary: { display: 'block', width: '100%', padding: 14, margin: '8px 0', background: '#
ta: { width: '100%', padding: 10, fontFamily: 'ui-monospace, monospace', fontSize: 12, bord
link: { color: '#2D5F4E', textDecoration: 'underline' },
foot: { textAlign: 'center', marginTop: 24, fontSize: 13 },
};
