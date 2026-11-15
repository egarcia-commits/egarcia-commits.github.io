#!/usr/bin/env node
/* Static site builder – zero dependencies. Usage: node build.js  ->  ./dist
   Content:  site.config.json · products/*.json · news/*.md · content/*  */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = __dirname, DIST = path.join(ROOT, 'dist');
const readJSON = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const cfg = readJSON('site.config.json');
const I18N = readJSON('content/i18n.json');
const CATALOG = readJSON('content/catalog.json');
const LANGS = cfg.site.languages, DEF = cfg.site.defaultLang;
const SITE = cfg.site.url.replace(/\/$/, '');
const BRAND = cfg.brand.name;
const PREVIEW = !!cfg.site.previewBanner;

/* ---------- helpers ---------- */
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const isPh = s => /\[[^\]]+\]/.test(String(s || ''));
const ph = s => PREVIEW && isPh(s) ? `<span class="ph">${esc(s)}</span>` : esc(s);
const phText = s => PREVIEW ? esc(s).replace(/\[[^\]]+\]/g, m => `<span class="ph">${m}</span>`) : esc(s);
const digits = s => String(s || '').replace(/\D/g, '');
const tokens = s => String(s).replace(/\{\{(\w+)\}\}/g, (m, k) => ({
  brand: BRAND, legalName: cfg.brand.legalName, taxId: cfg.brand.taxId, registry: cfg.brand.registry,
  address: cfg.contact.address, email: cfg.contact.email, phone: cfg.contact.phone, url: SITE
})[k] ?? m);
const write = (rel, content) => { const f = path.join(DIST, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, content); };
const copyDir = (src, dst, skip) => { if (!fs.existsSync(src)) return; fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (skip && skip(src, e)) continue;
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    e.isDirectory() ? copyDir(s, d, skip) : fs.copyFileSync(s, d); } };
const fmtDate = (d, lang) => new Date(d + 'T12:00:00Z').toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const u = (lang, p = '') => `/${lang}/${p}`.replace(/\/+/g, '/').replace(/([^/])$/, '$1/');

const hexToRgb = hex => {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return '0, 0, 0';
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)).join(', ');
};
function rootVars() {
  const c = cfg.colors;
  const stops = c.gradient || [c.primary, c.secondary];
  const offs = c.gradient_offsets;
  const thermal = `linear-gradient(100deg, ${stops.map((col, i) => offs && offs[i] != null ? `${col} ${+(offs[i] * 100).toFixed(2)}%` : col).join(', ')})`;
  return `:root{--bg:${c.bg};--bg2:${c.bg2};--surface:${c.surface};--primary:${c.primary};--secondary:${c.secondary};--accent:${c.accent};--text:${c.text};--muted:${c.muted};--primary-rgb:${hexToRgb(c.primary)};--secondary-rgb:${hexToRgb(c.secondary)};--accent-rgb:${hexToRgb(c.accent)};--thermal:${thermal}}`;
}

/* ---------- mini markdown ---------- */
function inline(s) {
  s = esc(s);
  return s.replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, h) => `<a href="${h}"${/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`);
}
function md(src) {
  const lines = tokens(src).replace(/\r/g, '').split('\n'); let out = [], i = 0;
  while (i < lines.length) {
    let l = lines[i];
    if (!l.trim()) { i++; continue; }
    let h = l.match(/^(#{1,4})\s+(.*)/);
    if (h) { const n = Math.min(h[1].length + 1, 4); out.push(`<h${n}>${inline(h[2])}</h${n}>`); i++; continue; }
    if (/^>\s?/.test(l)) { let b = []; while (i < lines.length && /^>\s?/.test(lines[i])) b.push(lines[i++].replace(/^>\s?/, '')); out.push(`<blockquote>${md(b.join('\n'))}</blockquote>`); continue; }
    if (/^\|/.test(l)) { let rows = []; while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
      rows = rows.filter(r => !/^\|[\s:|-]+\|$/.test(r)).map(r => r.replace(/^\||\|$/g, '').split('|').map(c => inline(c.trim())));
      out.push(`<div class="table-wrap"><table><thead><tr>${rows[0].map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`); continue; }
    if (/^\s*[-*]\s+/.test(l)) { let it = []; while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) it.push(lines[i++].replace(/^\s*[-*]\s+/, '')); out.push(`<ul>${it.map(x => `<li>${inline(x)}</li>`).join('')}</ul>`); continue; }
    if (/^\s*\d+\.\s+/.test(l)) { let it = []; while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) it.push(lines[i++].replace(/^\s*\d+\.\s+/, '')); out.push(`<ol>${it.map(x => `<li>${inline(x)}</li>`).join('')}</ol>`); continue; }
    let p = []; while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|>|\||\s*[-*]\s|\s*\d+\.\s)/.test(lines[i])) p.push(lines[i++]);
    out.push(`<p>${inline(p.join(' '))}</p>`);
  }
  return out.join('\n');
}
function frontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/); if (!m) return { data: {}, body: raw };
  const data = {};
  for (const line of m[1].split('\n')) { const kv = line.match(/^([\w-]+):\s*(.*)$/); if (!kv) continue;
    let v = kv[2].trim();
    if (/^\[.*\]$/.test(v)) v = v.slice(1, -1).split(',').map(x => x.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    else v = v.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
    data[kv[1]] = v; }
  return { data, body: m[2] };
}

/* ---------- icons ---------- */
const P = {
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  sd: '<path d="M7 2h8l4 4v16H5V4a2 2 0 0 1 2-2z"/><path d="M9 6v3M12 6v3M15 6v3"/>', fan: '<circle cx="12" cy="12" r="2"/><path d="M12 10c0-4 1-7 4-7 2 0 3 2 2 4-1 2-4 3-6 3zM14 12c4 0 7 1 7 4 0 2-2 3-4 2-2-1-3-4-3-6zM12 14c0 4-1 7-4 7-2 0-3-2-2-4 1-2 4-3 6-3zM10 12c-4 0-7-1-7-4 0-2 2-3 4-2 2 1 3 4 3 6z"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
  radio: '<circle cx="12" cy="12" r="2"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8"/>',
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>', layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 12 10 5 10-5M2 17l10 5 10-5"/>',
  video: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m16 10 6-3v10l-6-3"/>', aperture: '<circle cx="12" cy="12" r="9"/><path d="m14.3 3.3-4.6 8M20.5 8h-9.2M19 17.5l-4.6-8M9.7 20.7l4.6-8M3.5 16h9.2M5 6.5l4.6 8"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>', box: '<path d="m21 8-9-5-9 5v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  thermo: '<path d="M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0z"/><path d="M12 9v7"/>', zoom: '<circle cx="11" cy="11" r="7"/><path d="m21 21-5-5M11 8v6M8 11h6"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>', link: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>', shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>', percent: '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7" cy="7" r="1.5"/>', mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  map: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', check: '<path d="m20 6-11 11-5-5"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>', list: '<path d="M15 5h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/><rect x="9" y="2" width="6" height="5" rx="1"/><path d="M11 12h6M11 16h4"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-5-5"/>', globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>', calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'
};
const icon = (n, c = '') => `<svg class="ic ${c}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${P[n] || P.target}</svg>`;
const WA = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.8-1.2.2-.6.2-1.1.1-1.2l-.5-.3z"/></svg>';

/* ---------- data ---------- */
const products = fs.readdirSync(path.join(ROOT, 'products')).filter(f => f.endsWith('.json'))
  .map(f => readJSON('products/' + f)).sort((a, b) => (a.order || 99) - (b.order || 99));
const bySlug = Object.fromEntries(products.map(p => [p.slug, p]));
const cats = CATALOG.categories, uses = CATALOG.use_cases;
const catById = Object.fromEntries(cats.map(c => [c.id, c])), useById = Object.fromEntries(uses.map(c => [c.id, c]));

const news = fs.readdirSync(path.join(ROOT, 'news')).filter(f => /\.md$/.test(f) && !f.startsWith('_')).map(f => {
  const { data, body } = frontmatter(fs.readFileSync(path.join(ROOT, 'news', f), 'utf8'));
  const slug = data.slug || f.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
  const [en, es] = body.split(/<!--\s*es\s*-->/);
  const date = String(data.date || f.slice(0, 10));
  return { ...data, slug, date, tags: data.tags || [], body: { en: en || '', es: (es || en || '') }, file: f };
}).sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
const nt = (n, k, lang) => (lang !== 'en' && n[`${k}_${lang}`]) || n[k] || '';

/* news cover: auto-generated SVG when the article has no image */
function coverSVG(n) {
  let h = 0; for (const ch of n.slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const t = (n.tags[0] || 'tech').toLowerCase();
  const pal = t.includes('thermal') ? ['#FF8B22', '#E43948', '#AB199E'] : t.includes('regul') ? ['#C52281', '#FF8B22', '#5A29B2'] : t.includes('research') ? ['#F45D2E', '#AB199E', '#FF8B22'] : ['#C52281', '#FF8B22', '#5A29B2'];
  const R = []; let a = h || 1; for (let k = 0; k < 400; k++) { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; R.push(((t ^ (t >>> 14)) >>> 0) / 4294967296); }
  const rnd = i => R[Math.abs(i) % 400];
  let lines = ''; for (let i = 0; i < 9; i++) { const y = 80 + i * 55 + rnd(i) * 20; lines += `<path d="M0 ${y} C 300 ${y - 80 * rnd(i + 3)}, 700 ${y + 90 * rnd(i + 5)}, 1200 ${y - 30}" stroke="${pal[i % 3]}" stroke-opacity="${(0.12 + rnd(i + 9) * 0.35).toFixed(2)}" stroke-width="${1 + (i % 3)}" fill="none"/>`; }
  let dots = ''; for (let i = 0; i < 40; i++) dots += `<circle cx="${(rnd(i * 3) * 1200).toFixed(0)}" cy="${(rnd(i * 5 + 1) * 630).toFixed(0)}" r="${(1 + rnd(i) * 2.5).toFixed(1)}" fill="${pal[i % 3]}" opacity="${(0.25 + rnd(i + 2) * 0.6).toFixed(2)}"/>`;
  const cx = 760 + rnd(4) * 220, cy = 240 + rnd(6) * 140;
  const drone = `<g transform="translate(${cx.toFixed(0)} ${cy.toFixed(0)}) rotate(${(-12 + rnd(8) * 24).toFixed(0)})" stroke="${pal[0]}" stroke-width="6" stroke-linecap="round" fill="none"><path d="M-70 -50 70 50M70 -50 -70 50"/><circle cx="-80" cy="-58" r="34"/><circle cx="80" cy="-58" r="34"/><circle cx="-80" cy="58" r="34"/><circle cx="80" cy="58" r="34"/><rect x="-26" y="-20" width="52" height="40" rx="9" fill="${pal[0]}" fill-opacity=".2"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630"><defs><radialGradient id="g" cx="70%" cy="40%" r="70%"><stop offset="0" stop-color="${pal[1]}" stop-opacity=".35"/><stop offset=".55" stop-color="#0C1320" stop-opacity=".9"/><stop offset="1" stop-color="#070B12"/></radialGradient><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#fff" stroke-opacity=".05"/></pattern></defs><rect width="1200" height="630" fill="#070B12"/><rect width="1200" height="630" fill="url(#g)"/><rect width="1200" height="630" fill="url(#p)"/>${lines}${dots}${drone}<text x="60" y="570" font-family="Chakra Petch, Arial, sans-serif" font-weight="700" font-size="34" fill="#fff" fill-opacity=".85" letter-spacing="6">${esc((n.tags[0] || 'DRONE TECH').toUpperCase())}</text></svg>`;
}

/* ---------- layout ---------- */
const pagesForSitemap = [];
function nav(lang, cur) {
  const t = I18N[lang].nav;
  const items = [['products', 'products/'], ['solutions', 'solutions/'], ['b2b', 'distributors/'], ['news', 'news/'], ['support', 'support/'], ['contact', 'contact/']];
  return items.map(([k, p]) => `<a href="${u(lang, p)}"${cur === k ? ' aria-current="page"' : ''}>${esc(t[k])}</a>`).join('');
}
function logo(lang) {
  const b = cfg.brand;
  if (b.logoFull) return `<a class="logo logo-full" href="${u(lang)}" aria-label="${esc(BRAND)} – home"><img src="${b.logoFull}" alt="${esc(BRAND)}" height="40"></a>`;
  return `<a class="logo" href="${u(lang)}" aria-label="${esc(BRAND)} – ${esc(I18N[lang].nav.home)}">${b.logoMark ? `<img src="${b.logoMark}" alt="" width="38" height="38">` : ''}<span class="logo-txt"><b>${esc(BRAND)}</b><small>${esc(b.tagline[lang])}</small></span></a>`;
}
function waLink(text) { return `https://wa.me/${digits(cfg.contact.whatsapp)}?text=${encodeURIComponent(text)}`; }
function layout(lang, o) {
  const T = I18N[lang];
  const pth = o.path; // path after /lang/
  const canonical = SITE + u(lang, pth);
  const title = o.rawTitle ? o.title : `${o.title} | ${BRAND}`;
  const og = o.ogImage && !/\.svg$/.test(o.ogImage) ? o.ogImage : cfg.brand.ogImage;
  pagesForSitemap.push({ loc: canonical, lastmod: o.lastmod });
  const alt = LANGS.map(l => `<link rel="alternate" hreflang="${l}" href="${SITE + u(l, pth)}">`).join('') + `<link rel="alternate" hreflang="x-default" href="${SITE + u(DEF, pth)}">`;
  const c = cfg.colors;
  const jsCfg = { lang, brand: BRAND, email: cfg.contact.salesEmail || cfg.contact.email, wa: digits(cfg.contact.whatsapp), endpoint: cfg.forms.endpoint || '', analytics: cfg.analytics,
    t: { added: T.cta.added, addQuote: T.cta.addQuote, empty: T.quote.empty, qty: T.quote.qty, remove: T.quote.remove, intro: T.quote.intro, sent: T.form.sent, mailto: T.form.mailto, results: T.products.results } };
  const social = Object.entries(cfg.social).filter(([, v]) => v).map(([k, v]) => `<a href="${esc(v)}" target="_blank" rel="noopener">${k}</a>`).join(' · ');
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(o.desc)}">
<link rel="canonical" href="${canonical}">
${alt}
<meta property="og:type" content="${o.ogType || 'website'}">
<meta property="og:site_name" content="${esc(BRAND)}">
<meta property="og:title" content="${esc(o.title)}">
<meta property="og:description" content="${esc(o.desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE + og}">
<meta property="og:locale" content="${lang === 'es' ? 'es_ES' : 'en_GB'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(o.title)}">
<meta name="twitter:description" content="${esc(o.desc)}">
<meta name="twitter:image" content="${SITE + og}">
<meta name="theme-color" content="${c.bg}">
<link rel="icon" href="${cfg.brand.favicon}" type="image/svg+xml">
<link rel="icon" href="${cfg.brand.faviconPng}" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="${cfg.brand.appleTouchIcon}">
<link rel="preload" href="/fonts/chakra-petch-Bold.woff" as="font" type="font/woff" crossorigin>
${o.preload ? `<link rel="preload" as="image" href="${o.preload}">` : ''}
<style>${rootVars()}</style>
<link rel="stylesheet" href="/assets/style.css?v=${BUILD_ID}">
${(o.jsonld || []).map(j => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head>
<body class="page-${o.bodyClass || 'default'}">
<a class="skip" href="#main">${lang === 'es' ? 'Saltar al contenido' : 'Skip to content'}</a>
${PREVIEW ? `<div class="preview-bar">${lang === 'es' ? 'BORRADOR · para revisión de socios. Los datos de contacto, precios e información de la empresa son provisionales.' : 'DRAFT · for partner review. Contact details, pricing and company information are placeholders.'}</div>` : ''}
<header class="site-header" id="top">
  <div class="wrap hdr">
    ${logo(lang)}
    <nav class="main-nav" id="main-nav" aria-label="Main">${nav(lang, o.nav)}</nav>
    <div class="hdr-tools">
      <nav class="lang-switch" aria-label="${lang === 'es' ? 'Idioma' : 'Language'}">${LANGS.map(l => `<a class="lang${l === lang ? ' is-active' : ''}" href="${u(l, pth)}" hreflang="${l}" lang="${l}" data-lang="${l}"${l === lang ? ' aria-current="true"' : ''}>${l.toUpperCase()}</a>`).join('')}</nav>
      <a class="quote-btn" href="${u(lang, 'quote/')}" aria-label="${esc(T.nav.quote)}">${icon('list')}<span class="badge" data-quote-count hidden>0</span></a>
      <a class="btn btn-sm btn-primary hide-sm" href="${u(lang, 'contact/')}">${esc(T.cta.quote)}</a>
      <button class="menu-toggle" aria-controls="main-nav" aria-expanded="false" aria-label="Menu">${icon('menu', 'i-open')}${icon('x', 'i-close')}</button>
    </div>
  </div>
</header>
<main id="main">
${o.body}
</main>
<footer class="site-footer">
  <div class="wrap foot-grid">
    <div class="foot-brand">${logo(lang)}<p>${esc(T.footer.about)}</p>
      <ul class="contact-list">
        <li>${icon('mail')}<a href="mailto:${esc(cfg.contact.email)}">${ph(cfg.contact.email)}</a></li>
        <li>${icon('phone')}<a href="tel:${digits(cfg.contact.phone)}">${ph(cfg.contact.phone)}</a></li>
        <li>${WA}<a href="${waLink(BRAND)}" target="_blank" rel="noopener">WhatsApp ${ph('+' + cfg.contact.whatsapp)}</a></li>
      </ul>${social ? `<p class="social">${social}</p>` : ''}
    </div>
    <div><h3>${esc(T.footer.shop)}</h3><ul>${cats.map(c => `<li><a href="${u(lang, 'products/category/' + c.id + '/')}">${esc(c[lang].name)}</a></li>`).join('')}<li><a href="${u(lang, 'quote/')}">${esc(T.nav.quote)}</a></li></ul></div>
    <div><h3>${esc(T.footer.company)}</h3><ul><li><a href="${u(lang, 'about/')}">${esc(T.nav.about)}</a></li><li><a href="${u(lang, 'solutions/')}">${esc(T.nav.solutions)}</a></li><li><a href="${u(lang, 'distributors/')}">${esc(T.nav.b2b)}</a></li><li><a href="${u(lang, 'news/')}">${esc(T.nav.news)}</a></li><li><a href="${u(lang, 'support/')}">${esc(T.nav.support)}</a></li><li><a href="${u(lang, 'contact/')}">${esc(T.nav.contact)}</a></li></ul></div>
    <div><h3>${esc(T.footer.legal)}</h3><ul>${['legal-notice', 'privacy', 'cookies', 'terms'].map(k => `<li><a href="${u(lang, 'legal/' + k + '/')}">${esc(T.legal[{ 'legal-notice': 'notice' }[k] || k])}</a></li>`).join('')}</ul></div>
  </div>
  <div class="wrap foot-bottom"><span>© <span data-year>${new Date().getFullYear()}</span> ${esc(BRAND)} · ${ph(cfg.brand.legalName)} · ${esc(T.footer.rights)}</span><span>${LANGS.map(l => `<a href="${u(l, pth)}" hreflang="${l}" data-lang="${l}"${l === lang ? ' aria-current="true"' : ''}>${esc(I18N[l].langName)}</a>`).join(' · ')}</span></div>
</footer>
<a class="wa-float" href="${waLink(lang === 'es' ? `Hola ${BRAND}, me gustaría información OEM (precios, muestras o integración).` : `Hello ${BRAND}, I would like OEM information (pricing, samples or integration).`)}" target="_blank" rel="noopener" aria-label="WhatsApp">${WA}</a>
<div class="cookie" id="cookie" hidden role="dialog" aria-live="polite" aria-label="Cookies"><p>${esc(T.cookie.text)} <a href="${u(lang, 'legal/cookies/')}">${esc(T.cookie.more)}</a></p><div><button class="btn btn-ghost btn-sm" data-cookie="reject">${esc(T.cookie.reject)}</button><button class="btn btn-primary btn-sm" data-cookie="accept">${esc(T.cookie.accept)}</button></div></div>
<script>window.SITE=${JSON.stringify(jsCfg)}</script>
<script src="/assets/main.js?v=${BUILD_ID}" defer></script>
</body>
</html>`;
}
const BUILD_ID = Date.now().toString(36);

/* ---------- components ---------- */
const pl = (p, lang) => p[lang] || p[DEF];
function productCard(p, lang, i = 0) {
  const L = pl(p, lang), T = I18N[lang];
  const s = L.stats.slice(0, 2).map(x => `<span><b>${esc(x.value)}${x.unit ? `<small>${esc(x.unit)}</small>` : ''}</b>${esc(x.label)}</span>`).join('');
  return `<article class="card product-card reveal" data-cat="${p.category}" data-uses="${p.use_cases.join(' ')}" data-search="${esc((L.name + ' ' + L.subtitle + ' ' + p.sku + ' ' + L.category_label).toLowerCase())}">
  <a class="pc-media" href="${u(lang, 'products/' + p.slug + '/')}" tabindex="-1" aria-hidden="true"><img src="${p.images[0]}" alt="" loading="${i < 3 ? 'eager' : 'lazy'}" width="1024" height="768"></a>
  <div class="pc-body"><p class="eyebrow">${esc(catById[p.category]?.[lang].name || L.category_label)}</p>
  <h3><a href="${u(lang, 'products/' + p.slug + '/')}">${esc(L.name)}</a></h3><p class="pc-sub">${esc(L.subtitle)}</p>
  <div class="pc-stats">${s}</div>
  <div class="pc-foot"><span class="price muted">${esc(T.products.priceOnRequest)}</span><a class="link-arrow" href="${u(lang, 'products/' + p.slug + '/')}">${esc(T.cta.details)} ${icon('arrow')}</a></div></div>
</article>`;
}
function newsCard(n, lang, big = false) {
  return `<article class="card news-card reveal${big ? ' big' : ''}"><a class="nc-media" href="${u(lang, 'news/' + n.slug + '/')}" tabindex="-1" aria-hidden="true"><img src="${n.image || `/img/news/${n.slug}.svg`}" alt="" loading="lazy" width="1200" height="630"></a>
  <div class="nc-body"><p class="meta">${icon('calendar')}<time datetime="${n.date}">${fmtDate(n.date, lang)}</time><span class="src">${esc(n.source || '')}</span></p><h3><a href="${u(lang, 'news/' + n.slug + '/')}">${esc(nt(n, 'title', lang))}</a></h3><p>${esc(nt(n, 'summary', lang))}</p>
  <p class="tags">${n.tags.map(t => `<span>#${esc(t)}</span>`).join('')}</p></div></article>`;
}
const pageHead = (eyebrow, title, lead, crumbs) => `<section class="page-head"><div class="wrap">${crumbs || ''}<p class="eyebrow">${esc(eyebrow)}</p><h1>${esc(title)}</h1>${lead ? `<p class="lead">${esc(lead)}</p>` : ''}</div><div class="ph-grid" aria-hidden="true"></div></section>`;
function crumbs(lang, items) {
  const all = [[I18N[lang].nav.home, u(lang)], ...items];
  return `<nav class="crumbs" aria-label="Breadcrumb"><ol>${all.map(([n, h], i) => `<li>${i < all.length - 1 ? `<a href="${h}">${esc(n)}</a>` : `<span aria-current="page">${esc(n)}</span>`}</li>`).join('')}</ol></nav>`;
}
const crumbLD = (lang, items) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [[I18N[lang].nav.home, u(lang)], ...items].map(([n, h], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: SITE + h })) });
const orgLD = () => ({ '@context': 'https://schema.org', '@type': 'Organization', name: BRAND, legalName: cfg.brand.legalName, url: SITE, logo: SITE + cfg.brand.appleTouchIcon, email: cfg.contact.email, telephone: cfg.contact.phone,
  sameAs: Object.values(cfg.social).filter(Boolean) });
function formFields(lang, kind) {
  const Q = I18N[lang].quote, B = I18N[lang].b2b, C = I18N[lang].contact;
  const f = (n, l, type = 'text', req = false, ac = '', phold = '') => `<label class="field"><span>${esc(l)}${req ? ' *' : ''}</span><input name="${n}" type="${type}"${req ? ' required' : ''}${ac ? ` autocomplete="${ac}"` : ''}${phold ? ` placeholder="${esc(phold)}"` : ''}></label>`;
  let x = `<div class="grid-2">${f('company', Q.company, 'text', true, 'organization')}${f('name', Q.name, 'text', true, 'name')}</div>
    <div class="grid-2">${f('role', Q.role, 'text', false, 'organization-title')}${f('email', Q.email, 'email', true, 'email')}</div>
    <div class="grid-2">${f('country', Q.country, 'text', true, 'country-name')}${f('phone', Q.phone, 'tel', false, 'tel')}</div>`;
  if (kind === 'b2b') {
    x += `<div class="grid-2"><label class="field"><span>${esc(B.type)} *</span><select name="business_type" required>${B.types.map(opt => `<option>${esc(opt)}</option>`).join('')}</select></label>${f('website', B.website, 'url')}</div>`;
  }
  x += f('volume', kind === 'b2b' ? B.volume : Q.volume, 'text', false, '', Q.volumeHint);
  x += `<fieldset class="field checks"><legend>${esc(kind === 'b2b' ? B.interest : Q.interest)}</legend>${cats.map(c => `<label><input type="checkbox" name="interest" value="${esc(c[lang].name)}"> ${esc(c[lang].name)}</label>`).join('')}</fieldset>`;
  if (kind === 'contact') x += f('subject', C.subject);
  x += `<label class="field"><span>${esc(Q.message)}${kind !== 'quote' ? ' *' : ''}</span><textarea name="message" rows="5"${kind !== 'quote' ? ' required' : ''}></textarea></label>
  <label class="consent"><input type="checkbox" name="consent" required> <span>${esc(B.consent).replace(lang === 'es' ? 'política de privacidad' : 'privacy policy', `<a href="${u(lang, 'legal/privacy/')}">$&</a>`)}</span></label>`;
  return x;
}

/* ---------- pages ---------- */
function build() {
  fs.rmSync(DIST, { recursive: true, force: true });
  copyDir(path.join(ROOT, 'public'), DIST, (dir, e) => e.name === '_old');
  write('.nojekyll', '');
  copyDir(path.join(ROOT, 'src'), path.join(DIST, 'assets'));
  for (const n of news) if (!n.image) write(`img/news/${n.slug}.svg`, coverSVG(n));

  for (const lang of LANGS) {
    const T = I18N[lang], H = T.home;
    /* HOME */
    const featured = products.filter(p => p.featured).slice(0, 4);
    const kitPdf = lang === 'es' ? '/downloads/es/Catalogo_2026.pdf' : '/downloads/en/Catalogue_2026.pdf';
    const home = `
<section class="hero">
  <div class="hero-bg" aria-hidden="true"><img src="/img/hero.webp" alt="" fetchpriority="high"><div class="hero-grid"></div><div class="hero-scan"></div></div>
  <div class="wrap hero-in">
    <div class="hero-copy">
      <p class="eyebrow pulse">${esc(H.eyebrow)}</p>
      <h1><span>${esc(H.h1a)}</span> <span class="grad">${esc(H.h1b)}</span></h1>
      <p class="lead">${esc(H.lead)}</p>
      <div class="btn-row"><a class="btn btn-primary btn-lg" href="${u(lang, 'quote/')}">${esc(T.cta.quote)} ${icon('arrow')}</a><a class="btn btn-ghost btn-lg" href="${u(lang, 'contact/')}">${esc(T.cta.engineering)}</a></div>
      <p class="hero-secondary"><a href="${u(lang, 'products/')}">${esc(T.cta.explore)}</a> · <a href="${u(lang, 'quote/')}">${esc(T.cta.samples)}</a> · <a href="${u(lang, 'distributors/')}">${esc(T.cta.b2b)}</a></p>
    </div>
    <div class="hud" aria-hidden="true"><div class="hud-ring"></div><div class="hud-ring r2"></div><div class="hud-cross"></div><span class="hud-l t">REC ● 1080p</span><span class="hud-l b">LAT 22ms · 5.8GHz</span></div>
  </div>
  <div class="wrap"><ul class="stat-strip">${H.stats.map(s => `<li><b>${esc(s[0])}<small>${esc(s[1])}</small></b><span>${esc(s[2])}</span></li>`).join('')}</ul></div>
</section>
<section class="section"><div class="wrap">
  <div class="sec-head"><div><p class="eyebrow">${esc(T.nav.products)}</p><h2>${esc(H.featured)}</h2><p class="muted">${esc(H.featuredLead)}</p></div><a class="link-arrow" href="${u(lang, 'products/')}">${esc(T.cta.viewAll)} ${icon('arrow')}</a></div>
  <div class="grid-products">${featured.map((p, i) => productCard(p, lang, i)).join('')}</div>
</div></section>
<section class="section alt"><div class="wrap">
  <div class="sec-head"><div><p class="eyebrow">${esc(T.products.category)}</p><h2>${esc(H.categories)}</h2><p class="muted">${esc(H.categoriesLead)}</p></div></div>
  <div class="grid-cats">${cats.map(c => `<a class="cat-tile reveal" href="${u(lang, 'products/category/' + c.id + '/')}"><img src="${c.image}" alt="" loading="lazy" width="1024" height="768"><span class="ct-ic">${icon(c.icon)}</span><span class="ct-txt"><b>${esc(c[lang].name)}</b><small>${esc(c[lang].desc)}</small></span><span class="ct-count">${products.filter(p => p.category === c.id).length}</span></a>`).join('')}</div>
</div></section>
<section class="section"><div class="wrap">
  <div class="sec-head"><div><p class="eyebrow">${esc(T.nav.solutions)}</p><h2>${esc(H.solutionsTitle)}</h2></div><a class="link-arrow" href="${u(lang, 'solutions/')}">${esc(T.cta.viewAll)} ${icon('arrow')}</a></div>
  <div class="grid-uses">${uses.map(x => `<a class="use-card reveal" href="${u(lang, 'solutions/')}#${x.id}">${icon(x.icon)}<b>${esc(x[lang].name)}</b><span>${esc(x[lang].desc)}</span></a>`).join('')}</div>
</div></section>
<section class="section alt"><div class="wrap">
  <h2 class="center">${esc(H.whyTitle)}</h2>
  <div class="grid-why">${H.why.map(w => `<div class="why reveal"><span class="why-ic">${icon(w[0])}</span><h3>${esc(w[1])}</h3><p>${esc(w[2])}</p></div>`).join('')}</div>
</div></section>
<section class="section" id="oem"><div class="wrap">
  <div class="sec-head"><div><p class="eyebrow">${esc(T.oem.eyebrow)}</p><h2>${esc(T.oem.title)}</h2><p class="muted">${esc(T.oem.lead)}</p></div></div>
  <div class="grid-why">${T.oem.items.map(w => `<div class="why reveal"><span class="why-ic">${icon(w[0])}</span><h3>${esc(w[1])}</h3><p>${phText(w[2])}</p></div>`).join('')}</div>
  <div class="oem-panel reveal">
    <h3>${esc(T.oem.tiersTitle)}</h3>
    <p class="muted small">${esc(T.oem.tiersLead)}</p>
    <div class="table-wrap"><table class="oem-table"><thead><tr>${T.oem.tiersHead.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${T.oem.tiers.map(r => `<tr>${r.map(c => `<td>${phText(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <p class="muted small">${phText(T.oem.certs)}</p>
    <div class="btn-row"><a class="btn btn-primary" href="${u(lang, 'quote/')}">${esc(T.cta.quote)} ${icon('arrow')}</a><a class="btn btn-ghost" href="${u(lang, 'quote/')}">${esc(T.cta.samples)}</a><a class="btn btn-ghost" href="${u(lang, 'contact/')}">${esc(T.cta.engineering)}</a><a class="btn btn-ghost" href="${kitPdf}" download>${icon('download')} ${esc(T.cta.catalogue)}</a></div>
    <p class="muted small"><a class="link-arrow" href="${u(lang, 'distributors/')}">${esc(T.cta.b2b)} ${icon('arrow')}</a></p>
  </div>
</div></section>
<section class="section alt"><div class="wrap">
  <div class="sec-head"><div><p class="eyebrow">${esc(T.news.updated)}</p><h2>${esc(H.newsTitle)}</h2><p class="muted">${esc(H.newsLead)}</p></div><a class="link-arrow" href="${u(lang, 'news/')}">${esc(T.cta.allNews)} ${icon('arrow')}</a></div>
  <div class="grid-news">${news.slice(0, 3).map(n => newsCard(n, lang)).join('')}</div>
</div></section>`;
    write(`${lang}/index.html`, layout(lang, { title: `${BRAND} – ${H.metaTitle}`, rawTitle: true, desc: H.metaDesc, path: '', body: home, nav: 'home', bodyClass: 'home', preload: '/img/hero.webp',
      jsonld: [orgLD(), { '@context': 'https://schema.org', '@type': 'WebSite', name: BRAND, url: SITE + u(lang), inLanguage: lang }] }));

    /* PRODUCTS LISTING */
    const P_ = T.products;
    const filters = `<div class="filters" role="search">
      <label class="search">${icon('search')}<input type="search" placeholder="${esc(P_.search)}" aria-label="${esc(P_.search)}" data-filter-q></label>
      <div class="chips" role="group" aria-label="${esc(P_.category)}"><span class="chip-label">${esc(P_.category)}</span><button class="chip" aria-pressed="true" data-filter-cat="">${esc(P_.all)}</button>${cats.map(c => `<button class="chip" aria-pressed="false" data-filter-cat="${c.id}">${esc(c[lang].name)}</button>`).join('')}</div>
      <div class="chips" role="group" aria-label="${esc(P_.useCase)}"><span class="chip-label">${esc(P_.useCase)}</span><button class="chip" aria-pressed="true" data-filter-use="">${esc(P_.all)}</button>${uses.map(c => `<button class="chip" aria-pressed="false" data-filter-use="${c.id}">${esc(c[lang].name)}</button>`).join('')}</div>
      <p class="count" aria-live="polite"><span data-count>${products.length}</span> / ${products.length} ${esc(P_.results)}</p></div>`;
    write(`${lang}/products/index.html`, layout(lang, { title: P_.title, desc: P_.metaDesc, path: 'products/', nav: 'products',
      body: pageHead(BRAND, P_.title, P_.lead, crumbs(lang, [[P_.title, u(lang, 'products/')]])) + `<section class="section tight"><div class="wrap">${filters}<div class="grid-products" data-list>${products.map((p, i) => productCard(p, lang, i)).join('')}</div><div class="empty" data-empty hidden><p>${esc(P_.none)}</p><button class="btn btn-ghost" data-reset>${esc(P_.reset)}</button></div></div></section>`,
      jsonld: [crumbLD(lang, [[P_.title, u(lang, 'products/')]]), { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: products.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + u(lang, 'products/' + p.slug + '/'), name: pl(p, lang).name })) }] }));

    /* CATEGORY PAGES */
    for (const c of cats) {
      const list = products.filter(p => p.category === c.id);
      const cr = [[P_.title, u(lang, 'products/')], [c[lang].name, u(lang, 'products/category/' + c.id + '/')]];
      write(`${lang}/products/category/${c.id}/index.html`, layout(lang, { title: c[lang].name, desc: c[lang].desc, path: `products/category/${c.id}/`, nav: 'products',
        body: pageHead(P_.category, c[lang].name, c[lang].desc, crumbs(lang, cr)) + `<section class="section tight"><div class="wrap"><div class="chips static">${cats.map(x => `<a class="chip" href="${u(lang, 'products/category/' + x.id + '/')}"${x.id === c.id ? ' aria-current="page"' : ''}>${esc(x[lang].name)}</a>`).join('')}</div><div class="grid-products">${list.map((p, i) => productCard(p, lang, i)).join('') || `<p class="muted">${esc(P_.none)}</p>`}</div></div></section>`,
        jsonld: [crumbLD(lang, cr)] }));
    }

    /* PRODUCT DETAIL */
    for (const p of products) {
      const L = pl(p, lang), cat = catById[p.category];
      const cr = [[P_.title, u(lang, 'products/')], [cat[lang].name, u(lang, 'products/category/' + cat.id + '/')], [L.name, u(lang, 'products/' + p.slug + '/')]];
      const waText = lang === 'es' ? `Hola, soy un fabricante/integrador y me interesa el módulo ${L.name} (Ref. ${p.sku}). ¿Me podéis enviar precio OEM, MOQ, plazo y, si aplica, un kit de evaluación?` : `Hello, I am a manufacturer/integrator interested in the ${L.name} module (Ref. ${p.sku}). Please send OEM pricing, MOQ, lead time and, if available, evaluation kit details.`;
      const mail = `mailto:${cfg.contact.salesEmail}?subject=${encodeURIComponent((lang === 'es' ? 'Solicitud de precio OEM: ' : 'OEM pricing request: ') + L.name + ' (' + p.sku + ')')}&body=${encodeURIComponent(waText)}`;
      const evalMail = `mailto:${cfg.contact.salesEmail}?subject=${encodeURIComponent((lang === 'es' ? 'Solicitud de kit de evaluación: ' : 'Evaluation kit request: ') + L.name + ' (' + p.sku + ')')}&body=${encodeURIComponent(waText)}`;
      const engMail = `mailto:${cfg.contact.salesEmail}?subject=${encodeURIComponent((lang === 'es' ? 'Consulta de ingeniería: ' : 'Engineering enquiry: ') + L.name + ' (' + p.sku + ')')}&body=${encodeURIComponent(waText)}`;
      const cartData = { sku: p.sku, slug: p.slug, name: L.name, price: p.price, currency: p.currency, image: p.images[0], url: u(lang, 'products/' + p.slug + '/') };
      const body = `
<section class="pd-top"><div class="wrap">${crumbs(lang, cr)}
 <div class="pd-grid">
  <div class="gallery" data-gallery aria-label="${esc(P_.gallery)}">
    <div class="g-main"><img src="${p.images[0]}" alt="${esc(L.name)} – ${esc(L.subtitle)}" width="1024" height="768" data-g-main fetchpriority="high"><span class="g-badge">${esc(p.sku)}</span></div>
    ${p.images.length > 1 ? `<div class="g-thumbs">${p.images.map((im, i) => `<button class="g-thumb" aria-pressed="${i === 0}" data-g-src="${im}" aria-label="${esc(L.name)} ${i + 1}"><img src="${im}" alt="" width="160" height="120" loading="lazy"></button>`).join('')}</div>` : ''}
  </div>
  <div class="pd-info">
    <p class="eyebrow">${esc(L.category_label)}</p>
    <h1>${esc(L.name)}</h1><p class="pd-sub">${esc(L.subtitle)}</p>
    <p class="pd-tag">${esc(L.tagline)}</p>
    <ul class="pd-stats">${L.stats.map(s => `<li><b>${esc(s.value)}${s.unit ? `<small>${esc(s.unit)}</small>` : ''}</b><span>${esc(s.label)}</span></li>`).join('')}</ul>
    <div class="buy-box" data-product='${esc(JSON.stringify(cartData))}'>
      <div class="bb-row"><div><span class="muted small">${esc(P_.price)}</span><div class="bb-price">${esc(P_.priceOnRequest)}</div><span class="muted small">${esc(P_.vat)}</span></div><div class="bb-meta"><span>${esc(P_.sku)} <b>${esc(p.sku)}</b></span><span class="stock">${icon('check')} ${esc(P_.stock_on_request)}</span></div></div>
      <ul class="bb-terms"><li>${esc(T.oem.moq)}: ${ph('[MOQ]')}</li><li>${esc(T.oem.leadTime)}: ${ph('[LEAD TIME]')}</li><li>${phText(T.oem.certs)}</li></ul>
      <div class="bb-actions">
        <div class="qty"><button type="button" data-qty="-1" aria-label="-">−</button><input type="number" min="1" value="1" aria-label="${esc(T.quote.qty)}" data-qty-input><button type="button" data-qty="1" aria-label="+">+</button></div>
        <button class="btn btn-primary" data-add-quote>${icon('list')} <span>${esc(T.cta.addQuote)}</span></button>
      </div>
      <div class="bb-actions wrap-actions"><a class="btn btn-ghost" href="${esc(mail)}">${icon('mail')} ${esc(T.cta.quote)}</a><a class="btn btn-ghost" href="${esc(evalMail)}">${icon('box')} ${esc(T.cta.samples)}</a><a class="btn btn-ghost" href="${esc(engMail)}">${icon('chat')} ${esc(T.cta.engineering)}</a><a class="btn btn-wa" href="${waLink(waText)}" target="_blank" rel="noopener">${WA} ${esc(T.cta.whatsapp)}</a></div>
    </div>
    <div class="downloads"><h2 class="h-sm">${esc(P_.downloads)}</h2>${p.downloads.map(d => `<a class="dl" href="${d.file[lang] || d.file.en}" download>${icon('file')}<span>${esc(d.label[lang] || d.label.en)}</span>${icon('download')}</a>`).join('')}</div>
  </div>
 </div></div></section>
<nav class="pd-tabs" aria-label="${esc(L.name)}"><div class="wrap"><a href="#overview">${esc(P_.overview)}</a><a href="#specs">${esc(P_.specs)}</a><a href="#box">${esc(P_.box)}</a><a href="#apps">${esc(P_.apps)}</a></div></nav>
<section class="section" id="overview"><div class="wrap pd-overview">
  <div><h2>${esc(P_.overview)}</h2>${L.description.map(d => `<p>${esc(d)}</p>`).join('')}</div>
  <div><h2>${esc(P_.features)}</h2><div class="feat-grid">${L.features.map(f => `<div class="feat reveal">${icon(f.icon)}<b>${esc(f.title)}</b><span>${esc(f.text)}</span></div>`).join('')}</div></div>
</div></section>
<section class="section alt" id="specs"><div class="wrap"><h2>${esc(P_.specs)}</h2>
  <div class="spec-groups">${L.specs.map(g => `<div class="spec reveal"><h3>${esc(g.group)}</h3><table><tbody>${g.rows.map(r => `<tr><th scope="row">${esc(r[0])}</th><td>${esc(r[1])}</td></tr>`).join('')}</tbody></table></div>`).join('')}</div>
</div></section>
<section class="section"><div class="wrap grid-3">
  <div class="panel" id="box"><h2 class="h-sm">${icon('box')} ${esc(P_.box)}</h2><ul class="checks">${L.in_the_box.map(x => `<li>${icon('check')}${esc(x)}</li>`).join('')}</ul></div>
  <div class="panel"><h2 class="h-sm">${icon('link')} ${esc(P_.compat)}</h2><p>${esc(L.compatibility)}</p></div>
  <div class="panel" id="apps"><h2 class="h-sm">${icon('target')} ${esc(P_.apps)}</h2><ul class="checks">${L.applications.map(x => `<li>${icon('check')}${esc(x)}</li>`).join('')}</ul></div>
</div></section>
<section class="section alt"><div class="wrap"><h2>${esc(P_.related)}</h2><div class="grid-products g3">${(p.related || []).map(s => bySlug[s]).filter(Boolean).map(r => productCard(r, lang)).join('')}</div></div></section>`;
      const ld = { '@context': 'https://schema.org', '@type': 'Product', name: L.name, sku: p.sku, mpn: p.sku, description: L.description.join(' '), image: p.images.map(i => SITE + i).concat(SITE + p.og_image),
        brand: { '@type': 'Brand', name: BRAND }, category: cat[lang].name, url: SITE + u(lang, 'products/' + p.slug + '/'),
        additionalProperty: L.specs.flatMap(g => g.rows.map(r => ({ '@type': 'PropertyValue', name: r[0], value: r[1] }))) };
      if (p.price != null) ld.offers = { '@type': 'Offer', price: p.price, priceCurrency: p.currency, availability: 'https://schema.org/InStock', url: ld.url };
      write(`${lang}/products/${p.slug}/index.html`, layout(lang, { title: `${L.name} – ${L.subtitle}`, desc: `${L.tagline} ${L.description[0]}`.slice(0, 158), path: `products/${p.slug}/`, nav: 'products', bodyClass: 'product', ogImage: p.og_image, ogType: 'product', preload: p.images[0],
        body, jsonld: [ld, crumbLD(lang, cr)] }));
    }

    /* QUOTE LIST (cart-ready) */
    const Q = T.quote;
    write(`${lang}/quote/index.html`, layout(lang, { title: Q.title, desc: Q.lead, path: 'quote/', nav: '',
      body: pageHead(T.nav.quote, Q.title, Q.lead, crumbs(lang, [[Q.title, u(lang, 'quote/')]])) + `<section class="section tight"><div class="wrap quote-grid">
      <div><div class="quote-list" data-quote-list><p class="muted">${esc(Q.empty)}</p></div><a class="link-arrow" href="${u(lang, 'products/')}">${esc(T.cta.explore)} ${icon('arrow')}</a></div>
      <form class="panel form" data-form="quote" novalidate><h2 class="h-sm">${esc(T.cta.quote)}</h2>${formFields(lang, 'quote')}<div class="btn-row"><button class="btn btn-primary" type="submit">${icon('mail')} ${esc(Q.sendEmail)}</button><button class="btn btn-wa" type="button" data-quote-wa>${WA} ${esc(Q.sendWa)}</button></div><p class="form-msg" role="status"></p></form>
      </div></section>` }));

    /* SOLUTIONS */
    const S = T.solutions;
    write(`${lang}/solutions/index.html`, layout(lang, { title: S.title, desc: S.metaDesc, path: 'solutions/', nav: 'solutions',
      body: pageHead(T.nav.solutions, S.title, S.lead, crumbs(lang, [[S.title, u(lang, 'solutions/')]])) + uses.map((x, i) => {
        const rec = products.filter(p => p.use_cases.includes(x.id));
        return `<section class="section ${i % 2 ? 'alt' : ''}" id="${x.id}"><div class="wrap sol"><div class="sol-txt reveal"><span class="why-ic">${icon(x.icon)}</span><h2>${esc(x[lang].name)}</h2><p class="lead">${esc(x[lang].desc)}</p><a class="btn btn-ghost" href="${u(lang, 'products/')}?use=${x.id}">${esc(T.cta.explore)} ${icon('arrow')}</a></div>
        <div><h3 class="h-sm muted">${esc(S.recommended)}</h3><div class="mini-list">${rec.map(p => `<a class="mini" href="${u(lang, 'products/' + p.slug + '/')}"><img src="${p.images[0]}" alt="" loading="lazy" width="120" height="90"><span><b>${esc(pl(p, lang).name)}</b><small>${esc(pl(p, lang).subtitle)}</small></span>${icon('arrow')}</a>`).join('')}</div></div></div></section>`;
      }).join(''), jsonld: [crumbLD(lang, [[S.title, u(lang, 'solutions/')]])] }));

    /* B2B */
    const B = T.b2b;
    write(`${lang}/distributors/index.html`, layout(lang, { title: B.title, desc: B.metaDesc, path: 'distributors/', nav: 'b2b',
      body: pageHead(T.oem.eyebrow, B.title, B.lead, crumbs(lang, [[B.title, u(lang, 'distributors/')]])) + `<section class="section tight"><div class="wrap"><div class="grid-why">${B.benefits.map(w => `<div class="why reveal"><span class="why-ic">${icon(w[0])}</span><h3>${esc(w[1])}</h3><p>${phText(w[2])}</p></div>`).join('')}</div>
      <div class="oem-panel reveal">
        <h3>${esc(T.oem.tiersTitle)}</h3>
        <p class="muted small">${esc(T.oem.tiersLead)}</p>
        <div class="table-wrap"><table class="oem-table"><thead><tr>${T.oem.tiersHead.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${T.oem.tiers.map(r => `<tr>${r.map(c => `<td>${phText(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
        <p class="muted small">${phText(T.oem.certs)}</p>
      </div></div></section>
      <section class="section alt"><div class="wrap form-wrap"><div><h2>${esc(B.formTitle)}</h2><p class="muted">${esc(H.b2bLead)}</p><p class="muted small">${esc(B.distributorNote)}</p>
      <div class="btn-row"><a class="btn btn-ghost" href="${u(lang, 'quote/')}">${esc(T.cta.quote)}</a><a class="btn btn-ghost" href="${u(lang, 'contact/')}">${esc(T.cta.engineering)}</a><a class="btn btn-ghost" href="${kitPdf}" download>${icon('download')} ${esc(T.cta.catalogue)}</a></div>
      <ul class="contact-list big"><li>${icon('mail')}<a href="mailto:${esc(cfg.contact.salesEmail)}">${ph(cfg.contact.salesEmail)}</a></li><li>${WA}<a href="${waLink(lang === 'es' ? 'Hola, soy un fabricante/integrador y quiero información OEM.' : 'Hello, I am a manufacturer/integrator and would like OEM information.')}" target="_blank" rel="noopener">WhatsApp</a></li></ul></div>
      <form class="panel form" data-form="b2b" novalidate>${formFields(lang, 'b2b')}<button class="btn btn-primary" type="submit">${esc(T.cta.send)} ${icon('arrow')}</button><p class="form-msg" role="status"></p></form></div></section>` }));

    /* SUPPORT */
    const SU = T.support;
    const faqLD = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: SU.faq.map(q => ({ '@type': 'Question', name: q[0], acceptedAnswer: { '@type': 'Answer', text: q[1] } })) };
    write(`${lang}/support/index.html`, layout(lang, { title: SU.title, desc: SU.metaDesc, path: 'support/', nav: 'support',
      body: pageHead(T.nav.support, SU.title, SU.lead, crumbs(lang, [[SU.title, u(lang, 'support/')]])) + `<section class="section tight"><div class="wrap support-grid"><div class="faq">${SU.faq.map(q => `<details class="reveal"><summary>${esc(q[0])}</summary><p>${PREVIEW && isPh(q[1]) ? q[1].replace(/\[[^\]]+\]/g, m => `<span class="ph">${esc(m)}</span>`) : esc(q[1])}</p></details>`).join('')}</div>
      <aside><div class="panel"><h2 class="h-sm">${icon('file')} ${esc(SU.docsTitle)}</h2><p class="muted small">${esc(SU.docsLead)}</p><a class="dl" href="${kitPdf}" download>${icon('file')}<span>${esc(T.cta.catalogue)}</span>${icon('download')}</a>${products.map(p => `<a class="dl" href="${p.downloads[0].file[lang]}" download>${icon('file')}<span>${esc(pl(p, lang).name)}</span>${icon('download')}</a>`).join('')}</div>
      <div class="panel"><h2 class="h-sm">${icon('chat')} ${esc(T.nav.contact)}</h2><ul class="contact-list"><li>${icon('mail')}<a href="mailto:${esc(cfg.contact.email)}">${ph(cfg.contact.email)}</a></li><li>${WA}<a href="${waLink(BRAND)}" target="_blank" rel="noopener">WhatsApp</a></li></ul></div></aside></div></section>`,
      jsonld: [faqLD, crumbLD(lang, [[SU.title, u(lang, 'support/')]])] }));

    /* ABOUT */
    const A = T.about;
    write(`${lang}/about/index.html`, layout(lang, { title: A.title, desc: A.metaDesc, path: 'about/', nav: '',
      body: pageHead(BRAND, A.title, A.lead, crumbs(lang, [[A.title, u(lang, 'about/')]])) + `<section class="section tight"><div class="wrap about-grid"><div class="prose">${A.p.map(x => `<p>${esc(tokens(x))}</p>`).join('')}<p class="muted small">${ph(cfg.brand.legalName)} · ${ph(cfg.contact.address)}</p></div><div class="about-img"><img src="/img/hero.webp" alt="" loading="lazy" width="1280" height="720"></div></div></section>
      <section class="section alt"><div class="wrap"><div class="grid-why g3">${A.values.map(w => `<div class="why reveal"><span class="why-ic">${icon(w[0])}</span><h3>${esc(w[1])}</h3><p>${esc(w[2])}</p></div>`).join('')}</div></div></section>`,
      jsonld: [orgLD()] }));

    /* CONTACT */
    const C = T.contact;
    write(`${lang}/contact/index.html`, layout(lang, { title: C.title, desc: C.metaDesc, path: 'contact/', nav: 'contact',
      body: pageHead(T.nav.contact, C.title, C.lead, crumbs(lang, [[C.title, u(lang, 'contact/')]])) + `<section class="section tight"><div class="wrap form-wrap"><div>
      <ul class="contact-cards"><li><span class="why-ic">${icon('mail')}</span><div><small>Email</small><a href="mailto:${esc(cfg.contact.email)}">${ph(cfg.contact.email)}</a><a href="mailto:${esc(cfg.contact.salesEmail)}">${ph(cfg.contact.salesEmail)}</a></div></li>
      <li><span class="why-ic">${icon('phone')}</span><div><small>${esc(T.quote.phone)}</small><a href="tel:${digits(cfg.contact.phone)}">${ph(cfg.contact.phone)}</a></div></li>
      <li><span class="why-ic wa">${WA}</span><div><small>WhatsApp</small><a href="${waLink(BRAND)}" target="_blank" rel="noopener">${ph('+' + cfg.contact.whatsapp)}</a></div></li>
      <li><span class="why-ic">${icon('map')}</span><div><small>${lang === 'es' ? 'Dirección' : 'Address'}</small><span>${ph(cfg.contact.address)}</span></div></li>
      <li><span class="why-ic">${icon('clock')}</span><div><small>${esc(C.hours)}</small><span>${esc(cfg.contact.hours[lang])}</span></div></li></ul></div>
      <form class="panel form" data-form="contact" novalidate><h2 class="h-sm">${esc(C.formTitle)}</h2>${formFields(lang, 'contact')}<button class="btn btn-primary" type="submit">${esc(T.cta.send)} ${icon('arrow')}</button><p class="form-msg" role="status"></p></form></div></section>`,
      jsonld: [{ ...orgLD(), '@type': 'Organization', address: cfg.contact.address, contactPoint: [{ '@type': 'ContactPoint', contactType: 'sales', email: cfg.contact.salesEmail, telephone: cfg.contact.phone, availableLanguage: ['English', 'Spanish'] }] }] }));

    /* NEWS */
    const N = T.news;
    const [first, ...rest] = news;
    write(`${lang}/news/index.html`, layout(lang, { title: N.title, desc: N.metaDesc, path: 'news/', nav: 'news', lastmod: news[0]?.date,
      body: pageHead(N.updated, N.title, N.lead, crumbs(lang, [[N.title, u(lang, 'news/')]])) + `<section class="section tight"><div class="wrap">${first ? newsCard(first, lang, true) : ''}<div class="grid-news">${rest.map(n => newsCard(n, lang)).join('')}</div></div></section>`,
      jsonld: [crumbLD(lang, [[N.title, u(lang, 'news/')]]), { '@context': 'https://schema.org', '@type': 'CollectionPage', name: N.title, hasPart: news.map(n => ({ '@type': 'NewsArticle', headline: nt(n, 'title', lang), datePublished: n.date, url: SITE + u(lang, 'news/' + n.slug + '/') })) }] }));
    for (const n of news) {
      const img = n.image || `/img/news/${n.slug}.svg`;
      const cr = [[N.title, u(lang, 'news/')], [nt(n, 'title', lang), u(lang, 'news/' + n.slug + '/')]];
      const more = news.filter(x => x !== n).slice(0, 3);
      const body = `<article class="article"><header class="art-head"><div class="wrap narrow">${crumbs(lang, cr)}<p class="meta">${icon('calendar')}<time datetime="${n.date}">${esc(N.published)} ${fmtDate(n.date, lang)}</time> · ${esc(N.sourceLabel)}: ${esc(n.source || '')}</p><h1>${esc(nt(n, 'title', lang))}</h1><p class="lead">${esc(nt(n, 'summary', lang))}</p><p class="tags">${n.tags.map(t => `<span>#${esc(t)}</span>`).join('')}</p></div></header>
      <div class="wrap narrow"><figure class="art-img"><img src="${img}" alt="${esc(n.image_alt || nt(n, 'title', lang))}" width="1200" height="630"></figure>
      <div class="prose">${md(n.body[lang] || n.body.en)}</div>
      ${n.source_url ? `<a class="btn btn-ghost source-btn" href="${esc(n.source_url)}" target="_blank" rel="noopener nofollow">${icon('external')} ${esc(T.cta.source)} – ${esc(n.source || '')}</a>` : ''}
      <p class="muted small disclaimer">${esc(N.disclaimer)}</p></div></article>
      <section class="section alt"><div class="wrap"><div class="sec-head"><h2>${esc(T.cta.allNews)}</h2><a class="link-arrow" href="${u(lang, 'news/')}">${esc(T.cta.viewAll)} ${icon('arrow')}</a></div><div class="grid-news">${more.map(x => newsCard(x, lang)).join('')}</div></div></section>`;
      write(`${lang}/news/${n.slug}/index.html`, layout(lang, { title: nt(n, 'title', lang), desc: nt(n, 'summary', lang).slice(0, 158), path: `news/${n.slug}/`, nav: 'news', ogType: 'article', ogImage: n.image, lastmod: n.date, body,
        jsonld: [{ '@context': 'https://schema.org', '@type': 'NewsArticle', headline: nt(n, 'title', lang).slice(0, 110), description: nt(n, 'summary', lang), datePublished: n.date, dateModified: n.updated || n.date, inLanguage: lang,
          image: [SITE + img], author: { '@type': 'Organization', name: BRAND, url: SITE }, publisher: { '@type': 'Organization', name: BRAND, logo: { '@type': 'ImageObject', url: SITE + cfg.brand.appleTouchIcon } },
          mainEntityOfPage: SITE + u(lang, 'news/' + n.slug + '/'), isBasedOn: n.source_url, citation: n.source_url }, crumbLD(lang, cr)] }));
    }

    /* LEGAL */
    for (const k of ['legal-notice', 'privacy', 'cookies', 'terms']) {
      const f = path.join(ROOT, 'content/legal', lang, k + '.md');
      const { data, body } = frontmatter(fs.readFileSync(fs.existsSync(f) ? f : path.join(ROOT, 'content/legal', DEF, k + '.md'), 'utf8'));
      let html = md(body); if (PREVIEW) html = html.replace(/\[[^\]<]{2,}\]/g, m => `<span class="ph">${m}</span>`);
      write(`${lang}/legal/${k}/index.html`, layout(lang, { title: data.title, desc: `${data.title} – ${BRAND}`, path: `legal/${k}/`, nav: '',
        body: pageHead(T.footer.legal, data.title, '', crumbs(lang, [[data.title, u(lang, 'legal/' + k + '/')]])) + `<section class="section tight"><div class="wrap narrow prose legal">${html}</div></section>` }));
    }

    /* 404 */
    write(`${lang}/404.html`, layout(lang, { title: T.notFound.title, desc: T.notFound.lead, path: '404.html', nav: '',
      body: `<section class="section nf"><div class="wrap center"><p class="nf-code">404</p><h1>${esc(T.notFound.title)}</h1><p class="lead">${esc(T.notFound.lead)}</p><a class="btn btn-primary" href="${u(lang)}">${esc(T.nav.home)}</a> <a class="btn btn-ghost" href="${u(lang, 'products/')}">${esc(T.nav.products)}</a></div></section>` }));
    pagesForSitemap.pop();
  }

  /* root: language redirect */
  write('index.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(BRAND)}</title><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="canonical" href="${SITE}/${DEF}/">${LANGS.map(l => `<link rel="alternate" hreflang="${l}" href="${SITE}/${l}/">`).join('')}<link rel="alternate" hreflang="x-default" href="${SITE}/${DEF}/"><meta name="robots" content="noindex,follow"><link rel="icon" href="${cfg.brand.favicon}"><style>body{background:${cfg.colors.bg};color:${cfg.colors.text};font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0}a{color:${cfg.colors.primary}}</style>
<script>location.replace('/${DEF}/');</script>
<noscript><meta http-equiv="refresh" content="0; url=/${DEF}/"></noscript></head><body><p>${LANGS.map(l => `<a href="/${l}/">${esc(I18N[l].langName)}</a>`).join(' · ')}</p></body></html>`);
  fs.copyFileSync(path.join(DIST, DEF, '404.html'), path.join(DIST, '404.html'));

  /* sitemap + robots */
  const today = new Date().toISOString().slice(0, 10);
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pagesForSitemap.map(p => `  <url><loc>${p.loc}</loc><lastmod>${p.lastmod || today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
  write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
  /* RSS feed for news (EN) */
  write('en/news/feed.xml', `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${esc(BRAND)} – ${esc(I18N.en.news.title)}</title><link>${SITE}/en/news/</link><description>${esc(I18N.en.news.metaDesc)}</description>${news.map(n => `<item><title>${esc(n.title)}</title><link>${SITE}/en/news/${n.slug}/</link><guid>${SITE}/en/news/${n.slug}/</guid><pubDate>${new Date(n.date + 'T08:00:00Z').toUTCString()}</pubDate><description>${esc(n.summary)}</description></item>`).join('')}</channel></rss>`);
  /* hosting helpers */
  write('_headers', `/assets/*\n  Cache-Control: public, max-age=604800\n/img/*\n  Cache-Control: public, max-age=2592000\n/fonts/*\n  Cache-Control: public, max-age=31536000, immutable\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n`);
  write('.htaccess', `ErrorDocument 404 /404.html\nOptions -Indexes\n<IfModule mod_expires.c>\nExpiresActive On\nExpiresByType image/webp "access plus 30 days"\nExpiresByType text/css "access plus 7 days"\nExpiresByType application/javascript "access plus 7 days"\n</IfModule>\n`);
  console.log(`Built ${pagesForSitemap.length} indexable pages · ${products.length} products · ${news.length} news → dist/`);
}
build();
