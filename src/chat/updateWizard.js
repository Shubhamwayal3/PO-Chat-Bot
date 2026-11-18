import { getArticle, updateArticle, listArticles } from '../services/articleService.js';
import { getVendor, updateVendor, listVendors } from '../services/vendorService.js';
import { getSite, updateSite, listSites } from '../services/siteService.js';
import {
  getPurchaseOrder,
  listPurchaseOrders,
  updatePurchaseOrder,
  updatePurchaseOrderItem,
} from '../services/poService.js';
import { AppError } from '../utils/errors.js';
import { formatList, formatPo, formatPoList } from './replyFormatter.js';
import { continueCreateAsnWizard, startOrRunCreateAsn } from './asnWizard.js';

function cancelReply(label) {
  return { reply: `${label} update cancelled.`, wizard: null, slots: {} };
}

/* -------- Article update -------- */
export async function startUpdateArticle(slots = {}) {
  if (slots.ArticleCode) return promptArticlePatch(slots);
  const { data } = await listArticles({ limit: 20 });
  const table = formatList('Articles', data, [
    'ArticleCode',
    'ArticleDesc',
    'BasePrice',
    'Status',
  ]).table;
  return {
    reply: 'Update Article — enter Article code (e.g. A10001):\n(Type cancel to abort)',
    table,
    awaitingField: 'ArticleCode',
    needsSlots: ['ArticleCode'],
    slots: {},
    wizard: 'update_article',
  };
}

async function promptArticlePatch(slots) {
  const article = await getArticle(slots.ArticleCode);
  return {
    reply: [
      `Article ${article.ArticleCode} — ${article.ArticleDesc}`,
      `Current price ${article.BasePrice} ${article.Currency} | Status ${article.Status}`,
      '',
      'Enter update as: price 500   OR   status Inactive',
      '(Type cancel to abort)',
    ].join('\n'),
    awaitingField: 'patch',
    needsSlots: ['patch'],
    slots: { ArticleCode: slots.ArticleCode },
    wizard: 'update_article',
  };
}

export async function continueUpdateArticle({ slots = {}, message }) {
  const text = String(message || '').trim();
  if (/^(cancel|exit|stop)$/i.test(text)) return cancelReply('Article');

  if (!slots.ArticleCode) {
    const code = text.match(/\b(A\d+)\b/i)?.[1]?.toUpperCase() || text.toUpperCase();
    await getArticle(code);
    return promptArticlePatch({ ArticleCode: code });
  }

  const price = text.match(/price\s+(\d+(?:\.\d+)?)/i)?.[1];
  const status = text.match(/status\s+(Active|Inactive)/i)?.[1];
  const patch = {};
  if (price != null) patch.BasePrice = Number(price);
  if (status) patch.Status = status;
  if (!Object.keys(patch).length) {
    if (/^(Active|Inactive)$/i.test(text)) patch.Status = text[0].toUpperCase() + text.slice(1).toLowerCase();
    else if (/^\d+(\.\d+)?$/.test(text)) patch.BasePrice = Number(text);
  }
  if (!Object.keys(patch).length) {
    throw new AppError('VALIDATION_ERROR', 'Enter like: price 500  or  status Inactive');
  }

  const data = await updateArticle(slots.ArticleCode, patch);
  return {
    reply: `Article ${data.ArticleCode} updated.`,
    data,
    wizard: null,
    slots: {},
  };
}

/* -------- Vendor update -------- */
export async function startUpdateVendor(slots = {}) {
  if (slots.VendorCode) return promptVendorPatch(slots);
  const { data } = await listVendors({ limit: 20 });
  const table = formatList('Vendors', data, [
    'VendorCode',
    'VendorName',
    'City',
    'Status',
  ]).table;
  return {
    reply: 'Update Vendor — enter Vendor code (e.g. V1001):\n(Type cancel to abort)',
    table,
    awaitingField: 'VendorCode',
    needsSlots: ['VendorCode'],
    slots: {},
    wizard: 'update_vendor',
  };
}

async function promptVendorPatch(slots) {
  const vendor = await getVendor(slots.VendorCode);
  return {
    reply: [
      `Vendor ${vendor.VendorCode} — ${vendor.VendorName} | Status ${vendor.Status}`,
      '',
      'Enter update as: status Inactive   OR   name New Name',
      '(Type cancel to abort)',
    ].join('\n'),
    awaitingField: 'patch',
    needsSlots: ['patch'],
    slots: { VendorCode: slots.VendorCode },
    wizard: 'update_vendor',
  };
}

export async function continueUpdateVendor({ slots = {}, message }) {
  const text = String(message || '').trim();
  if (/^(cancel|exit|stop)$/i.test(text)) return cancelReply('Vendor');

  if (!slots.VendorCode) {
    const code = text.match(/\b(V\d+)\b/i)?.[1]?.toUpperCase() || text.toUpperCase();
    await getVendor(code);
    return promptVendorPatch({ VendorCode: code });
  }

  const patch = {};
  const status = text.match(/status\s+(Active|Inactive)/i)?.[1];
  const name = text.match(/name\s+(.+)$/i)?.[1]?.trim();
  if (status) patch.Status = status;
  if (name) patch.VendorName = name;
  if (!Object.keys(patch).length) {
    if (/^(Active|Inactive)$/i.test(text)) {
      patch.Status = text[0].toUpperCase() + text.slice(1).toLowerCase();
    }
  }
  if (!Object.keys(patch).length) {
    throw new AppError('VALIDATION_ERROR', 'Enter like: status Inactive  or  name Acme Corp');
  }

  const data = await updateVendor(slots.VendorCode, patch);
  return {
    reply: `Vendor ${data.VendorCode} updated.`,
    data,
    wizard: null,
    slots: {},
  };
}

/* -------- Site update -------- */
export async function startUpdateSite(slots = {}) {
  if (slots.SiteCode) return promptSitePatch(slots);
  const { data } = await listSites({ limit: 20 });
  const table = formatList('Sites', data, ['SiteCode', 'SiteName', 'City', 'Status']).table;
  return {
    reply: 'Update Site — enter Site code (e.g. S100):\n(Type cancel to abort)',
    table,
    awaitingField: 'SiteCode',
    needsSlots: ['SiteCode'],
    slots: {},
    wizard: 'update_site',
  };
}

async function promptSitePatch(slots) {
  const site = await getSite(slots.SiteCode);
  return {
    reply: [
      `Site ${site.SiteCode} — ${site.SiteName} | Status ${site.Status}`,
      '',
      'Enter update as: status Inactive   OR   name New Plant Name',
      '(Type cancel to abort)',
    ].join('\n'),
    awaitingField: 'patch',
    needsSlots: ['patch'],
    slots: { SiteCode: slots.SiteCode },
    wizard: 'update_site',
  };
}

export async function continueUpdateSite({ slots = {}, message }) {
  const text = String(message || '').trim();
  if (/^(cancel|exit|stop)$/i.test(text)) return cancelReply('Site');

  if (!slots.SiteCode) {
    const code = text.match(/\b(S\d+)\b/i)?.[1]?.toUpperCase() || text.toUpperCase();
    await getSite(code);
    return promptSitePatch({ SiteCode: code });
  }

  const patch = {};
  const status = text.match(/status\s+(Active|Inactive)/i)?.[1];
  const name = text.match(/name\s+(.+)$/i)?.[1]?.trim();
  if (status) patch.Status = status;
  if (name) patch.SiteName = name;
  if (!Object.keys(patch).length) {
    if (/^(Active|Inactive)$/i.test(text)) {
      patch.Status = text[0].toUpperCase() + text.slice(1).toLowerCase();
    }
  }
  if (!Object.keys(patch).length) {
    throw new AppError('VALIDATION_ERROR', 'Enter like: status Inactive  or  name Pune Plant');
  }

  const data = await updateSite(slots.SiteCode, patch);
  return {
    reply: `Site ${data.SiteCode} updated.`,
    data,
    wizard: null,
    slots: {},
  };
}

/* -------- PO update -------- */
export async function startUpdatePo(slots = {}) {
  if (slots.PONumber) return promptPoPatch(slots);
  const { data } = await listPurchaseOrders({ limit: 20 });
  return {
    reply: 'Update PO — enter PO number (e.g. 4500000001):\n(Type cancel to abort)',
    table: formatPoList(data).table,
    awaitingField: 'PONumber',
    needsSlots: ['PONumber'],
    slots: {},
    wizard: 'update_po',
  };
}

async function promptPoPatch(slots) {
  const po = await getPurchaseOrder(slots.PONumber);
  const formatted = formatPo(po);
  return {
    reply: [
      `PO ${po.PONumber} | Status ${po.Status}`,
      '',
      'Enter update as: status Cancelled   OR   status Ordered',
      'For GR qty: gr 8   (optional: item 10 gr 8)',
      '(Type cancel to abort)',
    ].join('\n'),
    table: formatted.table,
    awaitingField: 'patch',
    needsSlots: ['patch'],
    slots: { PONumber: slots.PONumber },
    wizard: 'update_po',
  };
}

export async function continueUpdatePo({ slots = {}, message }) {
  const text = String(message || '').trim();
  if (/^(cancel|exit|stop)$/i.test(text)) return cancelReply('PO');

  if (!slots.PONumber) {
    const poNumber = text.match(/\b(45\d{8})\b/)?.[1] || text.replace(/\D/g, '');
    await getPurchaseOrder(poNumber);
    return promptPoPatch({ PONumber: poNumber });
  }

  const status = text.match(/status\s+(Draft|Ordered|PartiallyReceived|Closed|Cancelled)/i)?.[1];
  const gr = text.match(/(?:gr|goods\s*receipt)\s+(\d+(?:\.\d+)?)/i)?.[1];
  const item = Number(text.match(/item\s+(\d+)/i)?.[1]);

  if (status) {
    const data = await updatePurchaseOrder(slots.PONumber, { Status: status });
    const formatted = formatPo(data);
    return {
      reply: `PO ${data.PONumber} status set to ${data.Status}.`,
      table: formatted.table,
      data,
      wizard: null,
      slots: {},
    };
  }

  if (gr != null) {
    const po = await getPurchaseOrder(slots.PONumber);
    const line =
      (Number.isFinite(item) ? po.items.find((i) => Number(i.POItem) === item) : null) ||
      po.items[0];
    if (!line) throw new AppError('NOT_FOUND', 'No PO item found', 404);
    const result = await updatePurchaseOrderItem(slots.PONumber, line.POItem, {
      GRQuantity: Number(gr),
    });
    const data = result.po || result;
    const stock = result.stock;
    const formatted = formatPo(data);
    const stockMsg = stock
      ? `\nStock ${stock.ArticleCode} @ ${stock.SiteCode}: ${stock.StockQty} ${stock.UoM || ''} (Δ ${stock.delta > 0 ? '+' : ''}${stock.delta}).`
      : '';
    return {
      reply: `PO ${slots.PONumber} item ${line.POItem} GR qty set to ${gr}.${stockMsg}`,
      table: formatted.table,
      data,
      stock,
      wizard: null,
      slots: {},
    };
  }

  throw new AppError(
    'VALIDATION_ERROR',
    'Enter like: status Cancelled   or   gr 8   or   item 10 gr 8'
  );
}

/* -------- ASN update = same guided flow, tagged as update (Associate allowed) -------- */
function asUpdateAsn(result) {
  if (!result) return result;
  if (result.wizard === 'create_asn') return { ...result, wizard: 'update_asn' };
  return result;
}

export async function startUpdateAsn(slots = {}) {
  return asUpdateAsn(await startOrRunCreateAsn(slots));
}

export async function continueUpdateAsn(args) {
  return asUpdateAsn(await continueCreateAsnWizard(args));
}
