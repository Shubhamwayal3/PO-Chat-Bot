import { listArticles } from '../services/articleService.js';
import { listVendors } from '../services/vendorService.js';
import { listSites } from '../services/siteService.js';
import { getArticle } from '../services/articleService.js';
import { AppError } from '../utils/errors.js';

/** Ordered fields collected for guided create PO. */
export const CREATE_PO_STEPS = [
  'VendorCode',
  'SiteCode',
  'ArticleCode',
  'Quantity',
  'NetPrice',
  'DeliveryDate',
];

export function normalizeCreatePoSlots(slots = {}) {
  const next = { ...slots };
  if (!next.items) next.items = [];
  if (!next.items.length) next.items = [{}];
  const item = { ...next.items[0] };
  if (next.ArticleCode && !item.ArticleCode) item.ArticleCode = next.ArticleCode;
  if (next.Quantity != null && item.Quantity == null) item.Quantity = next.Quantity;
  if (next.NetPrice != null && item.NetPrice == null) item.NetPrice = next.NetPrice;
  if (next.DeliveryDate && !item.DeliveryDate) item.DeliveryDate = next.DeliveryDate;
  next.items = [item];
  return next;
}

export function getMissingCreatePoFields(slots) {
  const s = normalizeCreatePoSlots(slots);
  const item = s.items[0] || {};
  const missing = [];
  if (!s.VendorCode) missing.push('VendorCode');
  if (!s.SiteCode) missing.push('SiteCode');
  if (!item.ArticleCode) missing.push('ArticleCode');
  if (item.Quantity == null || item.Quantity === '' || Number(item.Quantity) <= 0) {
    missing.push('Quantity');
  }
  // NetPrice is optional — skip from required missing if explicitly marked
  if (item.NetPrice == null && !s._priceSkipped) missing.push('NetPrice');
  if (!item.DeliveryDate) missing.push('DeliveryDate');
  return missing;
}

export function nextCreatePoField(slots) {
  const missing = getMissingCreatePoFields(slots);
  return missing[0] || null;
}

function parseDate(text) {
  const t = String(text).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const d = m[1].padStart(2, '0');
    const mo = m[2].padStart(2, '0');
    return `${m[3]}-${mo}-${d}`;
  }
  return null;
}

/** Apply a free-text answer to the current wizard field. */
export async function applyCreatePoAnswer(slots, field, answer) {
  const s = normalizeCreatePoSlots(slots);
  const item = { ...s.items[0] };
  const raw = String(answer || '').trim();
  if (!raw) throw new AppError('VALIDATION_ERROR', 'Please provide a value.');

  if (/^(cancel|exit|stop)$/i.test(raw)) {
    return { cancelled: true };
  }

  switch (field) {
    case 'VendorCode': {
      const code = (raw.match(/\b(V\d+)\b/i)?.[1] || raw).toUpperCase();
      const { data } = await listVendors({ q: code, status: 'Active' });
      const hit = data.find((v) => v.VendorCode.toUpperCase() === code);
      if (!hit) {
        throw new AppError(
          'FK_VENDOR_NOT_FOUND',
          `Vendor ${code} not found or Inactive. Try again (e.g. V1001).`
        );
      }
      s.VendorCode = hit.VendorCode;
      break;
    }
    case 'SiteCode': {
      const code = (raw.match(/\b(S\d+)\b/i)?.[1] || raw).toUpperCase();
      const { data } = await listSites({ q: code, status: 'Active' });
      const hit = data.find((v) => v.SiteCode.toUpperCase() === code);
      if (!hit) {
        throw new AppError(
          'FK_SITE_NOT_FOUND',
          `Site ${code} not found or Inactive. Try again (e.g. S100).`
        );
      }
      s.SiteCode = hit.SiteCode;
      break;
    }
    case 'ArticleCode': {
      const code = (raw.match(/\b(A\d+)\b/i)?.[1] || raw).toUpperCase();
      const article = await getArticle(code).catch(() => null);
      if (!article || article.Status !== 'Active') {
        throw new AppError(
          'FK_ARTICLE_NOT_FOUND',
          `Article ${code} not found or Inactive. Try again (e.g. A10001).`
        );
      }
      item.ArticleCode = article.ArticleCode;
      if (item.NetPrice == null) {
        // keep for later; show base price in prompt
        s._articleBasePrice = Number(article.BasePrice);
        s._articleCurrency = article.Currency;
      }
      break;
    }
    case 'Quantity': {
      const qty = Number(raw.replace(/,/g, ''));
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new AppError('VALIDATION_ERROR', 'Enter a quantity greater than 0.');
      }
      item.Quantity = qty;
      break;
    }
    case 'NetPrice': {
      if (/^(skip|default|same|base)$/i.test(raw)) {
        s._priceSkipped = true;
        item.NetPrice = undefined;
      } else {
        const price = Number(raw.replace(/,/g, ''));
        if (!Number.isFinite(price) || price < 0) {
          throw new AppError('VALIDATION_ERROR', 'Enter a valid price, or type skip for article base price.');
        }
        item.NetPrice = price;
        s._priceSkipped = true; // collected
      }
      break;
    }
    case 'DeliveryDate': {
      const date = parseDate(raw);
      if (!date) {
        throw new AppError('VALIDATION_ERROR', 'Enter delivery date as YYYY-MM-DD (e.g. 2026-12-15).');
      }
      item.DeliveryDate = date;
      break;
    }
    default:
      throw new AppError('VALIDATION_ERROR', `Unknown field ${field}`);
  }

  s.items = [item];
  return { slots: s };
}

export async function buildCreatePoPrompt(slots, field) {
  const s = normalizeCreatePoSlots(slots);
  const collected = [
    s.VendorCode && `Vendor: ${s.VendorCode}`,
    s.SiteCode && `Site: ${s.SiteCode}`,
    s.items?.[0]?.ArticleCode && `Article: ${s.items[0].ArticleCode}`,
    s.items?.[0]?.Quantity != null && `Qty: ${s.items[0].Quantity}`,
    s.items?.[0]?.NetPrice != null && `Price: ${s.items[0].NetPrice}`,
    s.items?.[0]?.DeliveryDate && `Delivery: ${s.items[0].DeliveryDate}`,
  ]
    .filter(Boolean)
    .join(' · ');

  const prefix = collected ? `So far → ${collected}\n\n` : '';
  let ask = '';
  let hintTable = null;

  if (field === 'VendorCode') {
    const { data } = await listVendors({ status: 'Active', limit: 10 });
    ask = 'Enter Vendor code (e.g. V1001):';
    hintTable = {
      title: 'Active vendors',
      columns: [
        { key: 'VendorCode', label: 'Vendor' },
        { key: 'VendorName', label: 'Name' },
        { key: 'City', label: 'City' },
      ],
      rows: data.map((v) => ({
        VendorCode: v.VendorCode,
        VendorName: v.VendorName,
        City: v.City || '',
      })),
    };
  } else if (field === 'SiteCode') {
    const { data } = await listSites({ status: 'Active', limit: 10 });
    ask = 'Enter Site / Plant code (e.g. S100):';
    hintTable = {
      title: 'Active sites',
      columns: [
        { key: 'SiteCode', label: 'Site' },
        { key: 'SiteName', label: 'Name' },
        { key: 'City', label: 'City' },
      ],
      rows: data.map((v) => ({
        SiteCode: v.SiteCode,
        SiteName: v.SiteName,
        City: v.City || '',
      })),
    };
  } else if (field === 'ArticleCode') {
    const { data } = await listArticles({ status: 'Active', limit: 10 });
    ask = 'Enter Article code (e.g. A10001):';
    hintTable = {
      title: 'Active articles',
      columns: [
        { key: 'ArticleCode', label: 'Article' },
        { key: 'ArticleDesc', label: 'Description' },
        { key: 'BasePrice', label: 'Price' },
        { key: 'Currency', label: 'Curr' },
      ],
      rows: data.map((v) => ({
        ArticleCode: v.ArticleCode,
        ArticleDesc: v.ArticleDesc,
        BasePrice: String(v.BasePrice),
        Currency: v.Currency,
      })),
    };
  } else if (field === 'Quantity') {
    ask = 'Enter Quantity:';
  } else if (field === 'NetPrice') {
    const base = s._articleBasePrice;
    const curr = s._articleCurrency || '';
    ask = base != null
      ? `Enter Price (or type skip to use base price ${base} ${curr}):`
      : 'Enter Price (or type skip for article base price):';
  } else if (field === 'DeliveryDate') {
    ask = 'Enter Delivery date (YYYY-MM-DD):';
  }

  return {
    reply: `${prefix}${ask}\n(Type cancel to abort)`,
    table: hintTable,
    needsSlots: [field],
    awaitingField: field,
    slots: s,
    wizard: 'create_po',
  };
}

export function buildCreatePoConfirm(slots) {
  const s = normalizeCreatePoSlots(slots);
  const item = s.items[0];
  const priceText =
    item.NetPrice != null ? String(item.NetPrice) : 'article base price';
  return {
    reply: [
      'Please confirm Purchase Order:',
      `• Vendor: ${s.VendorCode}`,
      `• Site: ${s.SiteCode}`,
      `• Article: ${item.ArticleCode}`,
      `• Quantity: ${item.Quantity}`,
      `• Price: ${priceText}`,
      `• Delivery: ${item.DeliveryDate}`,
      '',
      'Reply yes to create, or no to cancel.',
    ].join('\n'),
    needsConfirm: true,
    wizard: 'create_po',
    slots: s,
    preview: s,
  };
}
