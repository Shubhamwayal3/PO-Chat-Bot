import { createArticle, listArticles } from '../services/articleService.js';
import { createVendor, listVendors } from '../services/vendorService.js';
import { createSite, listSites } from '../services/siteService.js';
import { AppError } from '../utils/errors.js';
import { formatList } from './replyFormatter.js';

function titleCase(text) {
  return String(text || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function nextCode(rows, field, prefix, pad) {
  let max = 0;
  for (const r of rows) {
    const m = String(r[field] || '').match(new RegExp(`^${prefix}(\\d+)$`, 'i'));
    if (m) max = Math.max(max, Number(m[1]));
  }
  const next = max + 1;
  return `${prefix}${String(next).padStart(pad, '0')}`;
}

/* -------------------- Articles (single + bulk) -------------------- */

export function nextArticleField(slots = {}) {
  const count = Number(slots.count || 1);
  if (count > 1) {
    if (!slots.MaterialGroup) return 'MaterialGroup';
    if (!slots.UoM) return 'UoM';
    if (slots.BasePrice == null || slots.BasePrice === '') return 'BasePrice';
    if (!slots.Currency) return 'Currency';
    return null;
  }
  if (!slots.ArticleDesc && !slots.MaterialGroup) return 'ArticleDesc';
  if (!slots.UoM) return 'UoM';
  if (slots.BasePrice == null || slots.BasePrice === '') return 'BasePrice';
  if (!slots.Currency) return 'Currency';
  return null;
}

export async function buildArticlePrompt(slots = {}) {
  const field = nextArticleField(slots);
  const count = Number(slots.count || 1);
  const soFar = [
    count > 1 && `Count: ${count}`,
    slots.MaterialGroup && `Category: ${slots.MaterialGroup}`,
    slots.ArticleDesc && `Desc: ${slots.ArticleDesc}`,
    slots.UoM && `UoM: ${slots.UoM}`,
    slots.BasePrice != null && slots.BasePrice !== '' && `Price: ${slots.BasePrice}`,
    slots.Currency && `Currency: ${slots.Currency}`,
  ]
    .filter(Boolean)
    .join(' · ');

  const prefix = soFar ? `So far → ${soFar}\n\n` : '';
  const prompts = {
    MaterialGroup: 'Enter category / material group (e.g. shoes):',
    ArticleDesc: 'Enter article description:',
    UoM: 'Enter unit of measure (e.g. EA, KG, BOX):',
    BasePrice: 'Enter base price (number):',
    Currency: 'Enter currency (e.g. INR, USD):',
  };

  return {
    reply: `${prefix}${prompts[field]}\n(Type cancel to abort)`,
    needsSlots: [field],
    awaitingField: field,
    slots,
    wizard: count > 1 ? 'create_articles' : 'create_article',
  };
}

export async function continueArticleWizard({ slots = {}, message, bulk = false }) {
  const text = String(message || '').trim();
  let current = { ...slots, count: Number(slots.count || (bulk ? 2 : 1)) };
  if (bulk && current.count < 2) current.count = Number(slots.count || 2);

  if (/^(cancel|exit|stop)$/i.test(text)) {
    return { reply: 'Article creation cancelled.', wizard: null, slots: {} };
  }

  const field = nextArticleField(current);
  if (!field) {
    if (/^(yes|y|confirm|ok|create)$/i.test(text)) return finalizeArticles(current);
    if (/^(no|n)$/i.test(text)) {
      return { reply: 'Article creation cancelled.', wizard: null, slots: {} };
    }
    if (!text) return buildArticleConfirm(current);
    return {
      ...buildArticleConfirm(current),
      reply: `Please reply yes or no.\n\n${buildArticleConfirm(current).reply}`,
    };
  }

  if (!text) return buildArticlePrompt(current);

  if (field === 'MaterialGroup' || field === 'ArticleDesc') {
    current[field] = text;
  } else if (field === 'UoM') {
    current.UoM = text.toUpperCase();
  } else if (field === 'BasePrice') {
    const n = Number(text.replace(/,/g, ''));
    if (!Number.isFinite(n) || n < 0) {
      throw new AppError('VALIDATION_ERROR', 'Enter a valid base price.');
    }
    current.BasePrice = n;
  } else if (field === 'Currency') {
    current.Currency = text.toUpperCase();
  }

  const next = nextArticleField(current);
  if (next) return buildArticlePrompt(current);
  return buildArticleConfirm(current);
}

function buildArticleConfirm(slots) {
  const count = Number(slots.count || 1);
  const category = slots.MaterialGroup || 'GENERAL';
  const desc = slots.ArticleDesc || titleCase(category);
  return {
    reply: [
      count > 1
        ? `Confirm create ${count} articles in category "${category}"?`
        : `Confirm create article "${desc}"?`,
      `• UoM: ${slots.UoM}`,
      `• Base price: ${slots.BasePrice} ${slots.Currency}`,
      `• Codes will be auto-generated`,
      '',
      'Reply yes to create, or no to cancel.',
    ].join('\n'),
    needsConfirm: true,
    awaitingField: null,
    slots,
    wizard: count > 1 ? 'create_articles' : 'create_article',
  };
}

async function finalizeArticles(slots) {
  const count = Number(slots.count || 1);
  const { data: existing } = await listArticles({ limit: 5000 });
  let seedCode = slots.ArticleCode;
  const created = [];

  for (let i = 0; i < count; i += 1) {
    const code =
      i === 0 && seedCode
        ? seedCode
        : nextCode([...existing, ...created], 'ArticleCode', 'A', 5);
    const category = slots.MaterialGroup || 'GENERAL';
    const desc =
      count > 1
        ? `${titleCase(category)} ${i + 1}`
        : slots.ArticleDesc || titleCase(category);

    const row = await createArticle({
      ArticleCode: code,
      ArticleDesc: desc,
      UoM: slots.UoM || 'EA',
      MaterialGroup: category,
      BasePrice: Number(slots.BasePrice),
      Currency: slots.Currency || 'INR',
      Status: 'Active',
      LeadTimeDays: slots.LeadTimeDays ?? 7,
    });
    created.push(row);
  }

  const formatted = formatList(
    count > 1 ? `Created articles` : 'Created article',
    created,
    ['ArticleCode', 'ArticleDesc', 'MaterialGroup', 'BasePrice', 'Currency', 'Status']
  );

  return {
    ...formatted,
    reply: `Created ${created.length} article(s) in Excel.`,
    table: formatted.table,
    data: created,
    wizard: null,
    slots: {},
  };
}

export async function startArticleCreate(slots = {}, bulk = false) {
  const current = {
    ...slots,
    count: Number(slots.count || (bulk ? 2 : 1)),
    Currency: slots.Currency || undefined,
  };
  if (bulk && current.count < 1) current.count = 1;
  const field = nextArticleField(current);
  if (!field) return buildArticleConfirm(current);
  const prompt = await buildArticlePrompt(current);
  return {
    ...prompt,
    reply:
      current.count > 1
        ? `Let's create ${current.count} articles.\n\n${prompt.reply}`
        : `Let's create an article.\n\n${prompt.reply}`,
  };
}

/* -------------------- Vendor -------------------- */

export function nextVendorField(slots = {}) {
  if (!slots.VendorName) return 'VendorName';
  if (!slots.Country) return 'Country';
  if (!slots.Currency) return 'Currency';
  return null;
}

export async function buildVendorPrompt(slots = {}) {
  const field = nextVendorField(slots);
  const prompts = {
    VendorName: 'Enter vendor name:',
    Country: 'Enter country code (e.g. IN):',
    Currency: 'Enter currency (e.g. INR):',
  };
  const soFar = [
    slots.VendorName && `Name: ${slots.VendorName}`,
    slots.City && `City: ${slots.City}`,
    slots.Country && `Country: ${slots.Country}`,
    slots.Currency && `Currency: ${slots.Currency}`,
  ]
    .filter(Boolean)
    .join(' · ');
  return {
    reply: `${soFar ? `So far → ${soFar}\n\n` : ''}${prompts[field]}\n(Type cancel to abort)`,
    needsSlots: [field],
    awaitingField: field,
    slots,
    wizard: 'create_vendor',
  };
}

export async function continueVendorWizard({ slots = {}, message }) {
  const text = String(message || '').trim();
  let current = { ...slots };
  if (/^(cancel|exit|stop)$/i.test(text)) {
    return { reply: 'Vendor creation cancelled.', wizard: null, slots: {} };
  }

  const field = nextVendorField(current);
  if (!field) {
    if (/^(yes|y|confirm|ok|create)$/i.test(text)) return finalizeVendor(current);
    if (/^(no|n)$/i.test(text)) {
      return { reply: 'Vendor creation cancelled.', wizard: null, slots: {} };
    }
    if (!text) return buildVendorConfirm(current);
    return {
      ...buildVendorConfirm(current),
      reply: `Please reply yes or no.\n\n${buildVendorConfirm(current).reply}`,
    };
  }
  if (!text) return buildVendorPrompt(current);

  if (field === 'VendorName') current.VendorName = text;
  if (field === 'Country') current.Country = text.toUpperCase().slice(0, 2);
  if (field === 'Currency') current.Currency = text.toUpperCase();

  if (nextVendorField(current)) return buildVendorPrompt(current);
  return buildVendorConfirm(current);
}

function buildVendorConfirm(slots) {
  return {
    reply: [
      'Confirm create vendor:',
      `• Name: ${slots.VendorName}`,
      `• City: ${slots.City || '-'}`,
      `• Country: ${slots.Country}`,
      `• Currency: ${slots.Currency}`,
      '',
      'Reply yes to create, or no to cancel.',
    ].join('\n'),
    needsConfirm: true,
    slots,
    wizard: 'create_vendor',
  };
}

async function finalizeVendor(slots) {
  const { data: existing } = await listVendors({ limit: 5000 });
  const code = slots.VendorCode || nextCode(existing, 'VendorCode', 'V', 4);
  const row = await createVendor({
    VendorCode: code,
    VendorName: slots.VendorName,
    City: slots.City || null,
    Country: slots.Country || 'IN',
    PaymentTerms: slots.PaymentTerms || 'NET30',
    Currency: slots.Currency || 'INR',
    ContactEmail: slots.ContactEmail || null,
    Status: 'Active',
  });
  return {
    reply: `Vendor ${row.VendorCode} — ${row.VendorName} created.`,
    data: row,
    wizard: null,
    slots: {},
  };
}

export async function startVendorCreate(slots = {}) {
  const field = nextVendorField(slots);
  if (!field) return buildVendorConfirm(slots);
  const prompt = await buildVendorPrompt(slots);
  return { ...prompt, reply: `Let's create a vendor.\n\n${prompt.reply}` };
}

/* -------------------- Site -------------------- */

export function nextSiteField(slots = {}) {
  if (!slots.SiteName) return 'SiteName';
  if (!slots.Country) return 'Country';
  return null;
}

export async function buildSitePrompt(slots = {}) {
  const field = nextSiteField(slots);
  const prompts = {
    SiteName: 'Enter site / plant name:',
    Country: 'Enter country code (e.g. IN):',
  };
  const soFar = [
    slots.SiteName && `Name: ${slots.SiteName}`,
    slots.City && `City: ${slots.City}`,
    slots.Region && `Region: ${slots.Region}`,
    slots.Country && `Country: ${slots.Country}`,
  ]
    .filter(Boolean)
    .join(' · ');
  return {
    reply: `${soFar ? `So far → ${soFar}\n\n` : ''}${prompts[field]}\n(Type cancel to abort)`,
    needsSlots: [field],
    awaitingField: field,
    slots,
    wizard: 'create_site',
  };
}

export async function continueSiteWizard({ slots = {}, message }) {
  const text = String(message || '').trim();
  let current = { ...slots };
  if (/^(cancel|exit|stop)$/i.test(text)) {
    return { reply: 'Site creation cancelled.', wizard: null, slots: {} };
  }

  const field = nextSiteField(current);
  if (!field) {
    if (/^(yes|y|confirm|ok|create)$/i.test(text)) return finalizeSite(current);
    if (/^(no|n)$/i.test(text)) {
      return { reply: 'Site creation cancelled.', wizard: null, slots: {} };
    }
    if (!text) return buildSiteConfirm(current);
    return {
      ...buildSiteConfirm(current),
      reply: `Please reply yes or no.\n\n${buildSiteConfirm(current).reply}`,
    };
  }
  if (!text) return buildSitePrompt(current);

  if (field === 'SiteName') current.SiteName = text;
  if (field === 'Country') current.Country = text.toUpperCase().slice(0, 2);

  if (nextSiteField(current)) return buildSitePrompt(current);
  return buildSiteConfirm(current);
}

function buildSiteConfirm(slots) {
  return {
    reply: [
      'Confirm create site:',
      `• Name: ${slots.SiteName}`,
      `• City: ${slots.City || '-'}`,
      `• Region: ${slots.Region || '-'}`,
      `• Country: ${slots.Country}`,
      '',
      'Reply yes to create, or no to cancel.',
    ].join('\n'),
    needsConfirm: true,
    slots,
    wizard: 'create_site',
  };
}

async function finalizeSite(slots) {
  const { data: existing } = await listSites({ limit: 5000 });
  const code = slots.SiteCode || nextCode(existing, 'SiteCode', 'S', 3);
  const row = await createSite({
    SiteCode: code,
    SiteName: slots.SiteName,
    City: slots.City || null,
    Region: slots.Region || null,
    Country: slots.Country || 'IN',
    StorageLocation: slots.StorageLocation || '0001',
    Status: 'Active',
    Remarks: slots.Remarks || null,
  });
  return {
    reply: `Site ${row.SiteCode} — ${row.SiteName} created.`,
    data: row,
    wizard: null,
    slots: {},
  };
}

export async function startSiteCreate(slots = {}) {
  const field = nextSiteField(slots);
  if (!field) return buildSiteConfirm(slots);
  const prompt = await buildSitePrompt(slots);
  return { ...prompt, reply: `Let's create a site.\n\n${prompt.reply}` };
}
