/* Site JS – no dependencies. RFQ list, filters, gallery, forms, cookies. */
(function () {
  'use strict';
  var S = window.SITE || {}, T = S.t || {}, d = document;
  d.documentElement.classList.add('js');
  var $ = function (s, c) { return (c || d).querySelector(s); }, $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var store = { get: function (k, def) { try { return JSON.parse(localStorage.getItem(k)) || def; } catch (e) { return def; } }, set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };

  /* language memory */
  try { localStorage.setItem('lang', S.lang); } catch (e) {}
  $$('[data-lang]').forEach(function (a) { a.addEventListener('click', function () { try { localStorage.setItem('lang', a.dataset.lang); } catch (e) {} }); });

  /* header + mobile menu */
  var hdr = $('.site-header');
  var onScroll = function () { hdr && hdr.classList.toggle('scrolled', window.scrollY > 10); };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  var tog = $('.menu-toggle');
  if (tog) tog.addEventListener('click', function () { var o = d.body.classList.toggle('menu-open'); tog.setAttribute('aria-expanded', o); });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && d.body.classList.contains('menu-open')) { d.body.classList.remove('menu-open'); tog.setAttribute('aria-expanded', false); } });

  /* reveal on scroll */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    $$('.reveal').forEach(function (el, i) { el.style.transitionDelay = (i % 4) * 70 + 'ms'; io.observe(el); });
  } else $$('.reveal').forEach(function (el) { el.classList.add('in'); });

  function toast(msg) { var t = d.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg; d.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); }); setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 400); }, 2600); }

  /* ===== RFQ list (items have sku, qty, name) ===== */
  var Q = {
    items: function () { return store.get('quote-list', []); },
    save: function (it) { store.set('quote-list', it); Q.badge(); },
    add: function (p, qty) { var it = Q.items(), f = it.filter(function (x) { return x.sku === p.sku; })[0];
      if (f) f.qty += qty; else it.push({ sku: p.sku, slug: p.slug, name: p.name, price: p.price, currency: p.currency, image: p.image, url: p.url, qty: qty }); Q.save(it); },
    badge: function () { var n = Q.items().reduce(function (a, x) { return a + x.qty; }, 0); $$('[data-quote-count]').forEach(function (b) { b.textContent = n; b.hidden = !n; }); },
    text: function () { return Q.items().map(function (x) { return '• ' + x.qty + ' × ' + x.name + ' (Ref. ' + x.sku + ')'; }).join('\n'); }
  };
  window.QuoteList = Q; // hook for a future Stripe/Shopify checkout
  Q.badge();
  var box = $('[data-product]');
  if (box) {
    var prod = JSON.parse(box.dataset.product), qi = $('[data-qty-input]', box);
    $$('[data-qty]', box).forEach(function (b) { b.addEventListener('click', function () { qi.value = Math.max(1, (parseInt(qi.value, 10) || 1) + parseInt(b.dataset.qty, 10)); }); });
    var addB = $('[data-add-quote]', box);
    addB.addEventListener('click', function () { Q.add(prod, Math.max(1, parseInt(qi.value, 10) || 1)); addB.querySelector('span').textContent = T.added + ' ✓'; toast(T.added + ': ' + prod.name);
      setTimeout(function () { addB.querySelector('span').textContent = T.addQuote; }, 2200); });
  }
  var ql = $('[data-quote-list]');
  function renderQuote() {
    if (!ql) return; var it = Q.items();
    if (!it.length) { ql.innerHTML = '<p class="muted">' + T.empty + '</p>'; return; }
    ql.innerHTML = it.map(function (x, i) {
      return '<div class="q-item"><img src="' + x.image + '" alt=""><div class="q-name"><a href="' + x.url + '">' + x.name + '</a><small>Ref. ' + x.sku + '</small></div>' +
        '<div class="qty"><button type="button" data-qq="' + i + '" data-d="-1" aria-label="-">−</button><input type="number" min="1" value="' + x.qty + '" data-qi="' + i + '" aria-label="' + T.qty + '"><button type="button" data-qq="' + i + '" data-d="1" aria-label="+">+</button></div>' +
        '<button class="q-rm" type="button" data-rm="' + i + '" aria-label="' + T.remove + '">✕</button></div>';
    }).join('');
  }
  if (ql) {
    renderQuote();
    ql.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; var it = Q.items();
      if (b.dataset.rm != null) it.splice(+b.dataset.rm, 1);
      if (b.dataset.qq != null) it[+b.dataset.qq].qty = Math.max(1, it[+b.dataset.qq].qty + (+b.dataset.d));
      Q.save(it); renderQuote(); });
    ql.addEventListener('change', function (e) { if (e.target.dataset.qi == null) return; var it = Q.items(); it[+e.target.dataset.qi].qty = Math.max(1, parseInt(e.target.value, 10) || 1); Q.save(it); });
  }

  /* ===== Forms: POST to endpoint if configured, else mailto ===== */
  function collect(form) { var o = {}; new FormData(form).forEach(function (v, k) { if (k === 'consent') return; o[k] = o[k] ? o[k] + ', ' + v : v; }); return o; }
  function bodyText(form, data) { var lines = []; if (form.dataset.form === 'quote') lines.push(T.intro, Q.text(), '');
    Object.keys(data).forEach(function (k) { if (data[k]) lines.push(k + ': ' + data[k]); }); return lines.join('\n'); }
  $$('form[data-form]').forEach(function (form) {
    var msg = $('.form-msg', form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var data = collect(form), kind = form.dataset.form, subject = '[' + S.brand + '] ' + (kind === 'quote' ? 'OEM pricing / RFQ' : kind === 'b2b' ? 'OEM / partner enquiry' : (data.subject || 'Engineering enquiry'));
      if (kind === 'quote') data.items = Q.text();
      if (S.endpoint) {
        fetch(S.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(Object.assign({ _subject: subject, form: kind, lang: S.lang }, data)) })
          .then(function (r) { if (!r.ok) throw 0; msg.className = 'form-msg'; msg.textContent = T.sent; form.reset(); })
          .catch(function () { msg.className = 'form-msg err'; msg.textContent = 'Error – please email ' + S.email; });
      } else {
        msg.className = 'form-msg'; msg.textContent = T.mailto;
        location.href = 'mailto:' + S.email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(bodyText(form, data));
      }
    });
  });
  var qwa = $('[data-quote-wa]');
  if (qwa) qwa.addEventListener('click', function () { var f = qwa.closest('form'), data = collect(f);
    var txt = T.intro + '\n' + Q.text() + (data.name ? '\n\n' + data.name : '') + (data.company ? ' – ' + data.company : '') + (data.message ? '\n' + data.message : '');
    window.open('https://wa.me/' + S.wa + '?text=' + encodeURIComponent(txt), '_blank', 'noopener'); });

  /* ===== Product filters ===== */
  var list = $('[data-list]');
  if (list) {
    var cards = $$('.product-card', list), qIn = $('[data-filter-q]'), countEl = $('[data-count]'), empty = $('[data-empty]');
    var st = new URLSearchParams(location.search), state = { cat: st.get('cat') || '', use: st.get('use') || '', q: st.get('q') || '' };
    var apply = function () {
      var n = 0, q = state.q.trim().toLowerCase();
      cards.forEach(function (c) { var ok = (!state.cat || c.dataset.cat === state.cat) && (!state.use || c.dataset.uses.split(' ').indexOf(state.use) > -1) && (!q || c.dataset.search.indexOf(q) > -1);
        c.hidden = !ok; if (ok) { n++; c.classList.add('in'); } });
      countEl.textContent = n; empty.hidden = n > 0;
      $$('[data-filter-cat]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.filterCat === state.cat); });
      $$('[data-filter-use]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.filterUse === state.use); });
      var p = new URLSearchParams(); if (state.cat) p.set('cat', state.cat); if (state.use) p.set('use', state.use); if (state.q) p.set('q', state.q);
      history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : ''));
    };
    $$('[data-filter-cat]').forEach(function (b) { b.addEventListener('click', function () { state.cat = b.dataset.filterCat; apply(); }); });
    $$('[data-filter-use]').forEach(function (b) { b.addEventListener('click', function () { state.use = b.dataset.filterUse; apply(); }); });
    qIn.value = state.q; qIn.addEventListener('input', function () { state.q = qIn.value; apply(); });
    $('[data-reset]').addEventListener('click', function () { state = { cat: '', use: '', q: '' }; qIn.value = ''; apply(); });
    apply();
  }

  /* ===== Gallery ===== */
  var g = $('[data-gallery]');
  if (g) { var main = $('[data-g-main]', g);
    $$('[data-g-src]', g).forEach(function (b) { b.addEventListener('click', function () { main.style.opacity = 0; setTimeout(function () { main.src = b.dataset.gSrc; main.style.opacity = 1; }, 150);
      $$('[data-g-src]', g).forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); }); }); }

  /* ===== Cookies + optional analytics (only after consent) ===== */
  var ck = $('#cookie'), choice = store.get('cookie-consent', null);
  function loadAnalytics() { var a = S.analytics || {};
    if (a.plausibleDomain) { var s = d.createElement('script'); s.defer = true; s.dataset.domain = a.plausibleDomain; s.src = 'https://plausible.io/js/script.js'; d.head.appendChild(s); }
    if (a.gaMeasurementId) { var g2 = d.createElement('script'); g2.async = true; g2.src = 'https://www.googletagmanager.com/gtag/js?id=' + a.gaMeasurementId; d.head.appendChild(g2);
      window.dataLayer = window.dataLayer || []; window.gtag = function () { dataLayer.push(arguments); }; gtag('js', new Date()); gtag('config', a.gaMeasurementId, { anonymize_ip: true }); } }
  if (choice === 'accept') loadAnalytics();
  if (ck && !choice) { ck.hidden = false;
    $$('[data-cookie]', ck).forEach(function (b) { b.addEventListener('click', function () { store.set('cookie-consent', b.dataset.cookie); ck.hidden = true; if (b.dataset.cookie === 'accept') loadAnalytics(); }); }); }
})();
