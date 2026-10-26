const REPO = 'https://github.com/Skillossus/rstools';

const COLS = 8, MAX_SLOTS = 80; // official bank tag tab grid is 8x10
// 'qv' = the quiver's ammunition, which the game draws top-right, beside the head slot.
const EQ_ROWS = [[null, 0, 'qv'], [1, 2, 13], [3, 4, 5], [null, 7, null], [9, 10, 12]];
// Inventory Setups numbers spellbooks 0-4 and leaves "sb" out of the export when it is 0 (Standard); 4 = none.
// `key` names the icon rendered from the game cache: icons/spellbooks/<key>.png
const BOOKS = {
  0: {key: 'standard', name: 'Standard', color: '#9aa0a8'},
  1: {key: 'ancient', name: 'Ancient', color: '#e0453f'},
  2: {key: 'lunar', name: 'Lunar', color: '#3d9bff'},
  3: {key: 'arceuus', name: 'Arceuus', color: '#a35cff'}
};
const BOOK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 4h7a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H3zM21 4h-7a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h7z"/></svg>';
const $ = id => document.getElementById(id);

/* ---------- bank tag strings ---------- */
// layout: array indexed by slot, -1 = empty. Official string: "1,<n>,<id>,<col>,<row>,..."
function officialString(layout){
  if (!Array.isArray(layout)) return {s: null, warn: 'This export has no layout, so there is no bank tag string.'};
  const parts = [];
  for (let slot = 0; slot < layout.length; slot++) {
    const id = layout[slot];
    if (id === -1 || id == null) continue;
    if (slot >= MAX_SLOTS) return {s: null, warn: 'Items sit beyond the 8x10 tab grid, so no bank tag string was made.'};
    parts.push(id, slot % COLS, Math.floor(slot / COLS));
  }
  return {s: '1,' + (parts.length / 3) + ',' + parts.join(','), warn: null};
}
const fillHoles = sparse => Array.from({length: sparse.length}, (_, i) => sparse[i] ?? -1);

// RuneLite export: banktags,1,<name>,<iconId>,<item ids...>,layout,<pos>,<id>,<pos>,<id>,...
function parseRuneLiteTag(line, i){
  const t = line.trim().replace(/,+$/, '').split(',');
  if (t[0] !== 'banktags' || t.length < 4) return null;
  const rest = t.slice(4);
  const li = rest.indexOf('layout');
  const sparse = [];
  if (li !== -1) {
    const p = rest.slice(li + 1).map(Number);
    for (let k = 0; k + 1 < p.length; k += 2) if (Number.isInteger(p[k]) && Number.isInteger(p[k + 1])) sparse[p[k]] = p[k + 1];
  } else {
    rest.map(Number).filter(Number.isInteger).forEach((id, k) => { sparse[k] = id; });
  }
  return tagRecord(t[2] || 'Bank tag ' + (i + 1), fillHoles(sparse));
}
// Official client export: 1,<n>,<id>,<col>,<row>,...
function parseOfficialTag(line, i){
  if (!/^\d+(,\d+)+,?$/.test(line.trim())) return null;
  const v = line.trim().replace(/,+$/, '').split(',').map(Number);
  if (v.length < 2 || v[0] !== 1 || v.length - 2 !== v[1] * 3) return null;
  const sparse = [];
  for (let k = 2; k < v.length; k += 3) sparse[v[k + 2] * COLS + v[k + 1]] = v[k];
  return tagRecord('Bank tag ' + (i + 1), fillHoles(sparse));
}
function tagRecord(name, layout){
  const imp = officialString(layout);
  return {kind: 'tag', n: name, s: imp.s, warn: imp.warn, layout, sb: null, inv: [], eq: [], rp: [], qv: [], afi: [], notes: ''};
}

/* ---------- Inventory Setups JSON ---------- */
const clean = list => (Array.isArray(list) ? list : []).map(it => (it && typeof it.id === 'number' && it.id !== -1)
  ? {id: it.id, q: Number(it.q) || 0} : null);

function normalize(json){
  const out = [];
  (Array.isArray(json) ? json : [json]).forEach((e, i) => {
    if (!e || typeof e !== 'object') return;
    const s = e.setup && typeof e.setup === 'object' ? e.setup : (e.inv || e.eq ? e : null);
    if (!s) return;
    const layout = e.setup && Array.isArray(e.layout) ? e.layout : null;
    const imp = officialString(layout);
    out.push({
      kind: 'setup',
      n: String(s.name || 'Setup ' + (i + 1)),
      s: imp.s, warn: imp.warn, layout,
      sb: typeof s.sb === 'number' ? s.sb : 0,
      inv: clean(s.inv), eq: clean(s.eq), rp: clean(s.rp), qv: clean(s.qv),
      afi: clean(s.afi && typeof s.afi === 'object' ? Object.values(s.afi) : []),
      notes: typeof s.notes === 'string' ? s.notes : ''
    });
  });
  return out;
}

function parseText(text){
  const t = text.trim();
  if (t[0] === '[' || t[0] === '{') return normalize(JSON.parse(t));
  const recs = [];
  t.split(/\r?\n/).filter(l => l.trim()).forEach((line, i) => {
    const r = parseRuneLiteTag(line, i) || parseOfficialTag(line, i);
    if (r) recs.push(r);
  });
  return recs;
}
const byName = (a, b) => (a.n.toLowerCase() < b.n.toLowerCase() ? -1 : a.n.toLowerCase() > b.n.toLowerCase() ? 1 : 0);

/* ---------- item names (id -> name), loaded on first use ---------- */
let NAMES = window.NAMES || {};
let namesPromise = null;
function ensureNames(){
  if (!namesPromise) {
    namesPromise = window.NAMES || typeof fetch !== 'function' ? Promise.resolve()
      : fetch('icons/names.json').then(r => (r.ok ? r.json() : {})).then(j => { NAMES = j; }).catch(() => {});
  }
  return namesPromise;
}
const nameOf = id => NAMES[id] || 'Item ' + id;

/* ---------- rendering (user data only ever goes through textContent) ---------- */
function el(tag, cls, text){
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function fmt(q){
  if (q >= 1e7) return [Math.floor(q / 1e6) + 'M', '#00ff80'];
  if (q >= 1e5) return [Math.floor(q / 1e3) + 'K', '#ffffff'];
  return [String(q), '#ffff00'];
}
// The self-contained release defines window.ICONS (id -> base64 PNG); otherwise icons/<id>.png is used.
function iconSrc(id){
  if (!window.ICONS) return 'icons/' + id + '.png';
  return window.ICONS[id] ? 'data:image/png;base64,' + window.ICONS[id] : null;
}
function slot(it, prefix){
  const d = el('div', 'slot');
  if (!it) return d;
  const label = (prefix ? prefix + ': ' : '') + nameOf(it.id) + (it.q > 1 ? ' \u00d7 ' + it.q.toLocaleString() : '');
  d.title = label; d.dataset.label = label;
  const fallback = () => { d.classList.add('missing'); d.append(String(it.id)); };
  const src = iconSrc(it.id);
  if (!src) fallback();
  else {
    const img = new Image();
    img.alt = ''; img.loading = 'lazy'; img.src = src;
    img.onerror = () => { img.remove(); fallback(); };
    d.append(img);
  }
  if (it.q > 1) {
    const [t, color] = fmt(it.q);
    const s = el('span', 'qty', t); s.style.color = color; d.append(s);
  }
  return d;
}
// The equipment screen shows the quiver's ammunition in its own slot; extra ammo types go in the label.
function quiverSlot(qv){
  const d = slot(qv[0], 'Quiver');
  if (qv.length > 1) {
    const all = ['Quiver: ' + qv.map(it => nameOf(it.id) + (it.q > 1 ? ' \u00d7 ' + it.q.toLocaleString() : '')).join('; ')][0];
    d.title = all; d.dataset.label = all;
    d.append(el('span', 'more', '+' + (qv.length - 1)));
  }
  return d;
}
function strip(items){
  const s = el('div', 'strip');
  items.filter(Boolean).forEach(it => s.append(slot(it)));
  return s;
}
function layoutGrid(layout){
  const g = el('div', 'grid layout');
  const rows = Math.max(1, Math.ceil(layout.length / COLS));
  for (let i = 0; i < rows * COLS; i++) {
    const id = layout[i];
    g.append(slot(id == null || id === -1 ? null : {id, q: 0}));
  }
  const wrap = el('div', 'scroll'); wrap.append(g);
  return wrap;
}
async function copyText(text, btn, label){
  try { await navigator.clipboard.writeText(text); }
  catch (e) {
    const t = el('textarea'); t.value = text; document.body.append(t); t.select();
    try { document.execCommand('copy'); } catch (_) {}
    t.remove();
  }
  btn.textContent = 'Copied';
  setTimeout(() => btn.textContent = label, 1200);
}
// Game-cache sprite when available; the inline book (static markup) only if the image cannot load.
function bookFallback(){
  const f = el('span', 'book');
  f.innerHTML = BOOK_SVG;
  return f;
}
function bookIcon(book){
  const embedded = window.BOOK_ICONS;
  const src = embedded ? (embedded[book.key] ? 'data:image/png;base64,' + embedded[book.key] : null)
    : 'icons/spellbooks/' + book.key + '.png';
  if (!src) return bookFallback();
  const img = new Image();
  img.alt = ''; img.className = 'book'; img.src = src;
  img.onerror = () => img.replaceWith(bookFallback());
  return img;
}
function spellbookBadge(sb){
  const book = BOOKS[sb];
  if (!book) return null;
  const b = el('span', 'sb');
  b.style.color = book.color;
  b.title = book.name + ' spellbook';
  b.append(bookIcon(book), book.name);
  return b;
}
function render(body, s){
  const cap = el('p', 'cap', 'Tap or hover an item for its name.');
  body.addEventListener('click', e => {
    const slotEl = e.target.closest('.slot');
    if (slotEl && slotEl.dataset.label) cap.textContent = slotEl.dataset.label;
  });
  body.append(cap);

  if (s.kind === 'tag') {
    body.append(el('h3', null, 'Bank tag layout'));
    body.append(layoutGrid(s.layout));
  } else {
    const row = el('div', 'row');
    const inv = el('div'); inv.append(el('h3', null, 'Inventory'));
    const ig = el('div', 'grid inv');
    for (let i = 0; i < 28; i++) ig.append(slot(s.inv[i]));
    inv.append(ig);

    const eq = el('div'); eq.append(el('h3', null, 'Equipment'));
    const eg = el('div', 'grid eq');
    const qv = s.qv.filter(Boolean);
    EQ_ROWS.forEach(r => r.forEach(idx => {
      if (idx === null || (idx === 'qv' && !qv.length)) eg.append(el('div', 'slot spacer'));
      else eg.append(idx === 'qv' ? quiverSlot(qv) : slot(s.eq[idx]));
    }));
    eq.append(eg);
    row.append(inv, eq);
    body.append(row);

    [['Rune pouch', s.rp], ['Additional items', s.afi]].forEach(([label, items]) => {
      if (items.some(Boolean)) { body.append(el('h3', null, label)); body.append(strip(items)); }
    });
    if (s.notes) { body.append(el('h3', null, 'Notes')); body.append(el('div', 'notes', s.notes)); }
  }

  if (s.s) {
    body.append(el('h3', null, 'Bank tag import string'));
    body.append(el('pre', null, s.s));
    const b = el('button', null, 'Copy tag');
    b.onclick = () => copyText(s.s, b, 'Copy tag');
    body.append(b);
  } else if (s.warn) body.append(el('p', 'warn', s.warn));

  if (s.kind === 'setup' && s.layout) {
    const d = el('details');
    d.append(el('summary', null, 'Bank tag layout'));
    let done = false;
    d.addEventListener('toggle', () => { if (d.open && !done) { done = true; d.append(layoutGrid(s.layout)); } });
    body.append(d);
  }
}

/* ---------- app state ---------- */
let nodes = [];
function show(recs){
  const list = $('list');
  list.replaceChildren();
  nodes = recs.map(s => {
    const d = el('details');
    const sum = el('summary');
    sum.append(el('span', 'name', s.n));
    const badge = s.kind === 'setup' ? spellbookBadge(s.sb) : null;
    if (badge) sum.append(badge);
    if (s.s) {
      const c = el('button', 'copy-mini', 'Copy');
      c.title = 'Copy bank tag string';
      c.onclick = e => { e.preventDefault(); e.stopPropagation(); copyText(s.s, c, 'Copy'); };
      sum.append(c);
    }
    d.append(sum);
    const body = el('div', 'body');
    d.append(body);
    let done = false;
    d.addEventListener('toggle', () => {
      if (d.open && !done) { done = true; ensureNames().then(() => render(body, s)); }
    });
    list.append(d);
    return {d, key: s.n.toLowerCase()};
  });
  $('q').value = '';
  filter();
  $('loader').classList.add('hidden');
  $('app').classList.remove('hidden');
}
function filter(){
  const term = $('q').value.trim().toLowerCase();
  let shown = 0;
  nodes.forEach(n => { const hit = !term || n.key.includes(term); n.d.hidden = !hit; if (hit) shown++; });
  $('count').textContent = shown + ' of ' + nodes.length + ' setups';
}
function msg(text, isErr){ const m = $('msg'); m.textContent = text || ''; m.className = isErr ? 'err' : ''; }

function loadTexts(texts){
  if (texts.every(t => !t.trim())) {
    if (!window.EXAMPLE) return msg('Nothing to load.', true);
    show(normalize(window.EXAMPLE).sort(byName));
    return msg('Showing an example (Vorkath). Paste your own export to replace it.');
  }
  const all = [];
  for (const t of texts) {
    if (!t.trim()) continue;
    try { all.push(...parseText(t)); }
    catch (e) { return msg('That is not valid JSON: ' + e.message, true); }
  }
  if (!all.length) return msg('Nothing recognised. Expecting Inventory Setups JSON or a bank tag string.', true);
  msg('');
  show(all.sort(byName));
}
async function loadFiles(files){
  const list = [...files];
  if (!list.length) return;
  try { loadTexts(await Promise.all(list.map(f => f.text()))); }
  catch (e) { msg('Could not read the file: ' + e.message, true); }
}

$('load').onclick = () => loadTexts([$('paste').value]);
$('paste').addEventListener('paste', () => setTimeout(() => { if ($('paste').value.trim()) loadTexts([$('paste').value]); }, 0));
$('file').addEventListener('change', e => loadFiles(e.target.files));
$('q').addEventListener('input', filter);
$('q').addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const first = nodes.find(n => !n.d.hidden);
  if (first) { first.d.open = true; first.d.scrollIntoView({block: 'nearest'}); }
});
$('again').onclick = () => { $('app').classList.add('hidden'); $('loader').classList.remove('hidden'); msg(''); };
['dragenter', 'dragover'].forEach(ev => document.addEventListener(ev, e => { e.preventDefault(); $('drop').classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => document.addEventListener(ev, e => { e.preventDefault(); $('drop').classList.remove('over'); }));
document.addEventListener('drop', e => { if (e.dataTransfer) loadFiles(e.dataTransfer.files); });

// Footer links (index.html ships them hidden so nothing flashes before the script runs).
$('problem').href = REPO + '/issues/new';
$('gh').href = REPO;
$('problem').classList.remove('hidden');
$('gh').classList.remove('hidden');
// The icon pipeline writes icons/version.json; the release embeds it as window.ICON_VERSION.
const showVer = v => { if (v && v.cache) $('ver').textContent = 'Icons from OSRS cache ' + v.cache + '.'; };
if (window.ICON_VERSION) showVer(window.ICON_VERSION);
else if (typeof fetch === 'function') fetch('icons/version.json').then(r => (r.ok ? r.json() : null)).then(showVer).catch(() => {});
