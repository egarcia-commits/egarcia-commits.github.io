# DUNADRON website

Static, **English-first** bilingual (English `/en/` default, Spanish `/es/` secondary) B2B catalogue
for HD digital FPV, low-light and thermal camera **modules sold to drone manufacturers, OEMs and
integrators**. There is no consumer checkout. **Zero dependencies**: only Node.js 18+ is needed to
build. The output in `dist/` is plain HTML/CSS/JS and runs on any cheap host (Netlify, Cloudflare
Pages, GitHub Pages, Vercel, or any Apache/Nginx hosting such as a regular cPanel plan).

```
node build.js              # builds ./dist         (draft / GitHub Pages)
PROD=1 node build.js       # builds ./dist-prod    (production for dunadron.com)
npm run build:prod         # same as PROD=1
npm run serve              # draft build + preview at http://localhost:8088
```

A production build turns off the draft banner, writes canonical URLs as `https://dunadron.com`,
replaces remaining `[PLACEHOLDER]` commercial lines with “on request / bajo consulta” wording,
and adds an Apache `.htaccess` (HTTPS, www→apex, 404, gzip, caching). The GitHub Pages draft
in `dist/` is unchanged unless you run a plain `node build.js`. Zip the contents of `dist-prod/`
(including the hidden `.htaccess`) to upload to the hosting `public_html`.

## Folder structure

| Path | What it is |
|---|---|
| `site.config.json` | **ONE file for brand name, logo, colours, email, phone, WhatsApp, domain, form endpoint, analytics.** |
| `products/*.json` | One file per product (EN + ES text, specs, images, downloads, price fields). |
| `news/*.md` | One Markdown file per "Drone Tech News" article. |
| `content/catalog.json` | Product categories and use cases / solutions. |
| `content/i18n.json` | All interface and page texts in EN and ES (home, FAQ, about, B2B…). |
| `content/legal/{en,es}/*.md` | Legal notice, privacy, cookies, terms (Spanish/EU templates). |
| `public/` | Static files copied as-is: images, fonts, PDF datasheets (`public/downloads/`). The `public/img/brand/_old/` archive is kept in source but excluded from `dist/`. |
| `src/` | `style.css` and `main.js` (copied to `/assets/`). |
| `build.js` | The generator (no npm packages). |

## Rebranding (e.g. DUNADRON → RAYODRON)

1. Open `site.config.json` and change `brand.name`, `brand.tagline`.
2. Replace the logo files in `public/img/brand/` (`mark.svg` = icon shown next to the name, `favicon.svg`,
   `favicon-32.png`, `icon-512.png`) or point `brand.logoMark` / `brand.logoFull` to new files.
   If `logoFull` is set, it replaces the icon + text logo in the header and footer.
3. Change colours in `colors` (if needed), contact details in `contact`, the domain in `site.url`.
4. `node build.js` and upload `dist/`.

Everything written in `[square brackets]` is a **placeholder**. While `site.previewBanner` is `true`,
placeholders are highlighted in yellow and a "DRAFT · for partner review" bar is shown. Leave this
`true` for the GitHub Pages draft. Production wording is applied automatically by `PROD=1 node build.js`
(or `npm run build:prod`); do not flip `previewBanner` in this file unless you also intend to rebuild
and redeploy the draft.

## How to add a product

1. Copy an existing file in `products/`, e.g. `products/03-nighteye-s2.json` → `products/07-my-new-camera.json`.
2. Edit the fields:
   - `slug` (URL: `/en/products/<slug>/`), `sku`, `order` (position in the list), `featured` (show on home page).
   - `category`: one of the ids in `content/catalog.json` (`video-systems`, `transmitters`, `cameras`, `thermal`, `antennas`) – add new categories there.
   - `use_cases`: ids from `content/catalog.json` (`sar`, `security`, `inspection`, `firefighting`, `fpv`, `oem`) – used by filters and the Solutions page.
   - `images`: put images in `public/img/products/` (webp or jpg, 4:3 recommended). First image = main image. `og_image` = JPG used for social sharing.
   - `downloads`: PDF datasheets in `public/downloads/en/` and `public/downloads/es/`.
   - `price` (`null` = "OEM pricing on request"), `currency`, `purchasable`, `stock` – commercial fields; the live site currently works by RFQ, not checkout.
   - `en` / `es`: name, subtitle, tagline, description, stats, features (icon names: clock, eye, sd, fan, cpu, radio, zap, layers, video, aperture, target, box, thermo, zoom, sliders, link), `specs` tables, `in_the_box`, `compatibility`, `applications`.
3. **Only use specifications from the manufacturer's manual. Never invent numbers. Never mention supplier names/logos.**
4. `node build.js` – the product appears in listings, filters, category page, sitemap and related products automatically.

## How to add a news article (weekly update)

1. Create a file in `news/` named `YYYY-MM-DD-short-slug.md` (copy `news/_TEMPLATE.md`; files starting with `_` are ignored).
2. Fill in the front matter:

```
---
title: "English headline"
title_es: "Titular en español"
date: 2026-11-22
summary: "1–2 sentence English summary in our own words."
summary_es: "Resumen en español."
source: "Publication name"
source_url: "https://original-article-url"
image: ""            # optional: /img/news/my-image.jpg (put the file in public/img/news/). Empty = auto-generated cover.
image_alt: ""
tags: [thermal, fpv]  # first tag decides the auto-cover colour style (thermal / regulation / research / other)
---
English body (Markdown)

<!--es-->

Cuerpo en español (Markdown)
```

3. Write **original** summaries – do not copy text from the source; always link `source_url`.
4. `node build.js` and upload `dist/`. The article appears first on `/en/news/` and `/es/news/`, in the
   home page "Latest news" strip (3 newest), the sitemap and the RSS feed (`/en/news/feed.xml`).
   Articles are sorted by `date`, newest first.

## Forms, quote list and payments

- Contact, distributor (B2B) and quote forms: if `forms.endpoint` is empty, they open the visitor's email app
  pre-filled to `contact.salesEmail`. Paste a Formspree / Getform / Basin URL in `forms.endpoint` to receive submissions directly.
- "Add to quote" stores items in the browser (`localStorage`, key `quote-list`) with sku, name, price, currency, qty.
  The quote page sends the list by email or WhatsApp. `window.QuoteList` is the hook for a future Stripe or Shopify
  (Buy Button / Storefront API) checkout – no live payments are active.

## SEO / performance included

Per-page title and description, canonical + hreflang (en/es/x-default), OpenGraph + Twitter cards, `sitemap.xml`,
`robots.txt`, JSON-LD (Organization, WebSite, Product, BreadcrumbList, FAQPage, NewsArticle, ItemList),
self-hosted fonts (no Google Fonts calls – GDPR friendly), WebP images, lazy loading, no frameworks,
cookie banner (analytics only load after consent), `_headers` (Netlify/Cloudflare) and `.htaccess` (Apache).

## Deploy

- **Netlify / Cloudflare Pages**: build command `node build.js`, publish directory `dist`.
- **Any hosting via FTP**: run `node build.js` locally and upload the contents of `dist/`.
