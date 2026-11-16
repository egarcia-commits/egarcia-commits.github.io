'use strict';
/* Production-only wording. Draft builds keep the [PLACEHOLDER] source text.
   Loaded by build.js when PROD=1. */

const ON_REQ = { en: 'On request', es: 'Bajo consulta' };
const PRICE = { en: 'Price on request', es: 'Precio bajo consulta' };

const I18N_EXACT = {
  en: {
    'Products and documentation under your brand. Custom firmware and branding are available on request, subject to [MOQ].':
      'Products and documentation under your brand. Custom firmware and branding are available on request.',
    'Standard lead time: [LEAD TIME]. Confirmed in writing with every quotation.':
      'Lead times are confirmed in writing with every quotation.',
    'Regulatory status: [CE/FCC – to confirm]. Applicable markings are confirmed with each offer.':
      '',
    'The figures below are placeholders and will be confirmed in your quotation.':
      'Volume pricing, minimum order quantities and lead times are confirmed in your quotation.',
    'Certifications: [CE/FCC – to confirm].':
      '',
    'Products and documentation under your own brand. Custom firmware and branding on request, subject to [MOQ].':
      'Products and documentation under your own brand. Custom firmware and branding are available on request.',
    'Tiered OEM pricing based on annual volume. Unit prices and MOQ are confirmed in your quotation: [PRICE] / [MOQ].':
      'Tiered OEM pricing based on annual volume. Unit prices and minimum order quantities are confirmed in your quotation.',
    'Use the Request OEM pricing form or add modules to an RFQ. Tell us your company, role, country and expected annual volume, and we will send a tailored offer with pricing, [MOQ] and [LEAD TIME].':
      'Use the Request OEM pricing form or add modules to an RFQ. Tell us your company, role, country and expected annual volume, and we will send a tailored offer with pricing, minimum order quantity and lead time.',
    'Yes. White-label branding and custom firmware are available for OEMs and integrators, subject to [MOQ]. Contact our team with your requirements.':
      'Yes. White-label branding and custom firmware are available for OEMs and integrators on request. Contact our team with your requirements.',
    'Yes. Use the RFQ form or the “Request samples / evaluation kit” button on a product page. Evaluation kit pricing and lead time: [PRICE] / [LEAD TIME].':
      'Yes. Use the RFQ form or the “Request samples / evaluation kit” button on a product page. Evaluation kit pricing and lead time are provided on request.',
    'Send an RFQ by email. We confirm price, [MOQ], availability and [LEAD TIME], then issue a pro-forma invoice. Sales are currently made to businesses by quotation.':
      'Send an RFQ by email. We confirm price, minimum order quantity, availability and lead time, then issue a pro-forma invoice. Sales are currently made to businesses by quotation.',
    '[SHIPPING COUNTRIES AND DELIVERY TIMES – PLACEHOLDER]. Standard lead time: [LEAD TIME]. Exact shipping cost and lead time are confirmed with every quotation.':
      'Shipping countries, costs and lead times are confirmed with every quotation.',
    'Business (B2B) warranty terms are stated in each offer: [WARRANTY TERMS – to confirm]. See our Terms & Conditions.':
      'Business (B2B) warranty terms are stated in each offer. See our Terms & Conditions.',
    'Regulatory status: [CE/FCC – to confirm]. Users are responsible for configuring and operating radio equipment in compliance with local law (for example CE <14 dBm EIRP for 5.8 GHz in the EU).':
      'Applicable markings and regulatory status are confirmed with each offer. Users are responsible for configuring and operating radio equipment in compliance with local law (for example CE <14 dBm EIRP for 5.8 GHz in the EU).'
  },
  es: {
    'Productos y documentación con tu marca. Firmware y branding a medida bajo pedido, sujetos a [MOQ].':
      'Productos y documentación con tu marca. Firmware y branding a medida bajo pedido.',
    'Plazo estándar: [LEAD TIME]. Se confirma por escrito en cada presupuesto.':
      'Los plazos de entrega se confirman por escrito en cada presupuesto.',
    'Estado normativo: [CE/FCC – to confirm]. El marcado aplicable se confirma en cada oferta.':
      '',
    'Las cifras siguientes son provisionales y se confirmarán en tu presupuesto.':
      'Las tarifas por volumen, el pedido mínimo y los plazos de entrega se confirman en tu presupuesto.',
    'Certificaciones: [CE/FCC – to confirm].':
      '',
    'Productos y documentación con tu propia marca. Firmware y branding a medida bajo pedido, sujetos a [MOQ].':
      'Productos y documentación con tu propia marca. Firmware y branding a medida bajo pedido.',
    'Tarifas OEM por tramos según el volumen anual. Precio unitario y MOQ se confirman en el presupuesto: [PRICE] / [MOQ].':
      'Tarifas OEM por tramos según el volumen anual. El precio unitario y el pedido mínimo se confirman en el presupuesto.',
    'Usa el formulario de solicitud de precio OEM o añade módulos a una solicitud. Indica empresa, cargo, país y volumen anual previsto y te enviaremos una oferta con precios, [MOQ] y [LEAD TIME].':
      'Usa el formulario de solicitud de precio OEM o añade módulos a una solicitud. Indica empresa, cargo, país y volumen anual previsto y te enviaremos una oferta con precios, pedido mínimo y plazo de entrega.',
    'Sí. La marca blanca y el firmware a medida están disponibles para OEM e integradores, sujetos a [MOQ]. Contacta con nuestro equipo con tus requisitos.':
      'Sí. La marca blanca y el firmware a medida están disponibles para OEM e integradores bajo consulta. Contacta con nuestro equipo con tus requisitos.',
    'Sí. Usa el formulario de solicitud o el botón «Solicitar muestras / kit de evaluación» en la ficha de producto. Precio y plazo del kit de evaluación: [PRICE] / [LEAD TIME].':
      'Sí. Usa el formulario de solicitud o el botón «Solicitar muestras / kit de evaluación» en la ficha de producto. El precio y el plazo del kit de evaluación se facilitan bajo consulta.',
    'Envía una solicitud por email. Confirmamos precio, [MOQ], disponibilidad y [LEAD TIME] y emitimos una factura proforma. Las ventas se hacen actualmente a empresas mediante presupuesto.':
      'Envía una solicitud por email. Confirmamos precio, pedido mínimo, disponibilidad y plazo de entrega y emitimos una factura proforma. Las ventas se hacen actualmente a empresas mediante presupuesto.',
    '[PAÍSES DE ENVÍO Y PLAZOS DE ENTREGA – PENDIENTE]. Plazo estándar: [LEAD TIME]. El coste y el plazo exactos se confirman en cada presupuesto.':
      'Los países de envío, costes y plazos se confirman en cada presupuesto.',
    'Las condiciones de garantía para empresas (B2B) se indican en cada oferta: [WARRANTY TERMS – to confirm]. Consulta nuestras Condiciones generales.':
      'Las condiciones de garantía para empresas (B2B) se indican en cada oferta. Consulta nuestras Condiciones generales.',
    'Estado normativo: [CE/FCC – to confirm]. El usuario es responsable de configurar y utilizar el equipo radioeléctrico conforme a la ley local (p. ej. CE <14 dBm EIRP en 5,8 GHz en la UE).':
      'El marcado aplicable y el estado normativo se confirman en cada oferta. El usuario es responsable de configurar y utilizar el equipo radioeléctrico conforme a la ley local (p. ej. CE <14 dBm EIRP en 5,8 GHz en la UE).'
  }
};

/* Fallback token replacements if a leftover exact string was missed. */
const TOKEN_FALLBACK = [
  [/\b\[PRICE\]\b/g, lang => PRICE[lang]],
  [/\b\[MOQ\]\b/g, lang => ON_REQ[lang]],
  [/\b\[LEAD TIME\]\b/g, lang => ON_REQ[lang]],
  [/\b\[SAMPLE QTY\]\b/g, lang => ON_REQ[lang]],
  [/\b\[VOLUME\]\b/g, lang => ON_REQ[lang]],
  [/\[Tier [123]\]/g, lang => lang === 'es' ? 'Tramo bajo consulta' : 'Tier on request'],
  [/\[CE\/FCC – to confirm\]/g, () => ''],
  [/\[WARRANTY TERMS – to confirm\]/g, lang => ON_REQ[lang]],
  [/\[SHIPPING COUNTRIES AND DELIVERY TIMES – PLACEHOLDER\]/g, lang => PRICE.en && (lang === 'es' ? 'Bajo consulta' : 'On request')],
  [/\[PAÍSES DE ENVÍO Y PLAZOS DE ENTREGA – PENDIENTE\]/g, () => 'Bajo consulta']
];

function applyString(s, lang) {
  if (typeof s !== 'string') return s;
  const map = I18N_EXACT[lang] || I18N_EXACT.en;
  if (Object.prototype.hasOwnProperty.call(map, s)) return map[s];
  let out = s;
  for (const [re, fn] of TOKEN_FALLBACK) out = out.replace(re, fn(lang));
  return out;
}

function walk(value, lang) {
  if (Array.isArray(value)) {
    return value.map(v => walk(v, lang)).filter(v => v !== '' && v != null);
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) out[k] = walk(value[k], lang);
    return out;
  }
  return applyString(value, lang);
}

function applyToI18n(i18n) {
  for (const lang of Object.keys(i18n)) {
    if (!i18n[lang] || typeof i18n[lang] !== 'object') continue;
    const next = walk(i18n[lang], lang);
    /* Pricing table: keep evaluation kit + one production-volume row, all "on request". */
    if (next.oem) {
      next.oem.certs = '';
      if (Array.isArray(next.oem.items)) {
        next.oem.items = next.oem.items.filter(row => {
          const title = Array.isArray(row) ? row[1] : '';
          const body = Array.isArray(row) ? row[2] : '';
          const blob = `${title} ${body}`.toLowerCase();
          return !/certif|normativo|regulatory status/.test(blob);
        });
      }
      if (Array.isArray(next.oem.tiers)) {
        next.oem.tiers = lang === 'es'
          ? [
              ['Kit de evaluación', 'Bajo consulta', 'Precio bajo consulta', '—', 'Bajo consulta'],
              ['Volúmenes de producción', 'Bajo consulta', 'Precio bajo consulta', 'Bajo consulta', 'Bajo consulta']
            ]
          : [
              ['Evaluation kit', 'On request', 'Price on request', '—', 'On request'],
              ['Production volumes', 'On request', 'Price on request', 'On request', 'On request']
            ];
      }
    }
    Object.keys(next).forEach(k => { i18n[lang][k] = next[k]; });
  }
  return i18n;
}

function applyToLegal(src, lang) {
  let s = String(src || '');
  /* Drop the draft "template – have it reviewed" banner. */
  s = s.replace(/^>\s*\*\*(?:Template|Plantilla)[^\n]*(?:\n(?:>[^\n]*|))?\n+/m, '');
  /* Cookie analytics row – analytics is not enabled. */
  s = s.replace(/\| \[ANALYTICS[^\n]+\n/g, '');
  s = s.replace(/\| \[ANALÍTICA[^\n]+\n/g, '');
  s = s.replace(/\[CITY\]/g, 'Madrid');
  s = s.replace(/\[CIUDAD\]/g, 'Madrid');
  s = s.replace('Payment methods: [BANK TRANSFER / CARD / OTHER].', 'Payment methods are confirmed in each quotation.');
  s = s.replace('Formas de pago: [TRANSFERENCIA / TARJETA / OTRAS].', 'Las formas de pago se indican en cada presupuesto.');
  s = s.replace('Shipping times and costs: [PENDING]. Stated in every offer.', 'Shipping times and costs are stated in every offer.');
  s = s.replace('Plazos y costes de envío: [PENDIENTE]. Se indicarán en cada oferta.', 'Los plazos y costes de envío se indican en cada oferta.');
  s = s.replace('Return costs are borne by [CUSTOMER / COMPANY].', 'Return costs, if a consumer sale were made, are confirmed in writing.');
  s = s.replace('Los gastos de devolución correrán a cargo de [CLIENTE / EMPRESA].', 'Los gastos de devolución, si se realizara una venta a un consumidor, se confirman por escrito.');
  s = s.replace('For business customers, the warranty stated in the offer applies: [PENDING].', 'For business customers, the warranty stated in the offer applies.');
  s = s.replace('Para clientes profesionales, la garantía será la indicada en la oferta: [PENDIENTE].', 'Para clientes profesionales, la garantía será la indicada en la oferta.');
  s = s.replace('Service providers (web hosting, email, form handling [PROVIDER]) may access it under data processing agreements.', 'Service providers (web hosting and email) may access it under data processing agreements.');
  s = s.replace('Podrán acceder a ellos proveedores de servicios (alojamiento web, correo electrónico, gestión de formularios [PROVEEDOR])', 'Podrán acceder a ellos proveedores de servicios (alojamiento web y correo electrónico)');
  return s;
}

const LEFTOVER_RE = /\[[A-ZÁÉÍÓÚÜÑ][^[\]]{0,80}\]|yourdomain/gi;

function findLeftovers(text) {
  const m = String(text || '').match(LEFTOVER_RE) || [];
  return [...new Set(m)];
}

module.exports = { applyToI18n, applyToLegal, findLeftovers, ON_REQ, PRICE };
