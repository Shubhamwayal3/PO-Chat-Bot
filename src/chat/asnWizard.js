import { listPurchaseOrders, getPurchaseOrder } from '../services/poService.js';
import { createAsnOnPurchaseOrder } from '../services/poService.js';
import { AppError } from '../utils/errors.js';
import { formatPo, formatPoList } from './replyFormatter.js';

export function nextAsnField(slots = {}) {
  if (!slots.PONumber) return 'PONumber';
  if (slots.ConfirmASNQty == null || slots.ConfirmASNQty === '') return 'ConfirmASNQty';
  return null;
}

async function promptPoNumber() {
  const { data } = await listPurchaseOrders({ limit: 20 });
  const open = data.filter((p) => p.Status !== 'Cancelled' && p.Status !== 'Closed');
  const list = formatPoList(open);
  return {
    reply: 'Create ASN — enter PO number (e.g. 4500000001):\n(Type cancel to abort)',
    table: list.table,
    needsSlots: ['PONumber'],
    awaitingField: 'PONumber',
    slots: {},
    wizard: 'create_asn',
  };
}

async function promptQty(slots) {
  let poHint = '';
  let table = null;
  try {
    const po = await getPurchaseOrder(slots.PONumber);
    const formatted = formatPo(po);
    table = formatted.table;
    const line = po.items?.[0];
    poHint = line
      ? `\nPO ${po.PONumber} item ${line.POItem} ordered qty = ${line.Quantity}` +
        (line.ASNNumber ? `, existing ASN ${line.ASNNumber}` : '')
      : '';
  } catch {
    // ignore — validation happens on apply
  }

  return {
    reply: `PO ${slots.PONumber}${poHint}\n\nEnter confirmed ASN quantity:\n(Type cancel to abort)`,
    table,
    needsSlots: ['ConfirmASNQty'],
    awaitingField: 'ConfirmASNQty',
    slots,
    wizard: 'create_asn',
  };
}

export async function buildAsnPrompt(slots = {}) {
  const field = nextAsnField(slots);
  if (field === 'PONumber') return promptPoNumber();
  if (field === 'ConfirmASNQty') return promptQty(slots);
  return null;
}

export async function continueCreateAsnWizard({ slots = {}, message }) {
  const text = String(message || '').trim();
  let current = { ...slots };

  if (/^(cancel|exit|stop)$/i.test(text)) {
    return { reply: 'ASN creation cancelled.', wizard: null, slots: {} };
  }

  const field = nextAsnField(current);

  // Starting prompt (no answer yet)
  if (!field) {
    // all filled — create
    return finalizeAsn(current);
  }

  if (!text) {
    return buildAsnPrompt(current);
  }

  if (field === 'PONumber') {
    const poNumber = text.match(/\b(45\d{8})\b/)?.[1] || text.replace(/\D/g, '');
    if (!/^\d{10}$/.test(poNumber) && !/^45\d{8}$/.test(poNumber)) {
      throw new AppError('VALIDATION_ERROR', 'Enter a valid PO number (e.g. 4500000001).');
    }
    const normalized = poNumber.startsWith('45') ? poNumber : poNumber;
    await getPurchaseOrder(normalized); // throws if missing
    current.PONumber = normalized;
    return promptQty(current);
  }

  if (field === 'ConfirmASNQty') {
    const qty = Number(text.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/)?.[1]);
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new AppError('VALIDATION_ERROR', 'Enter a quantity greater than 0.');
    }
    current.ConfirmASNQty = qty;
    return finalizeAsn(current);
  }

  return buildAsnPrompt(current);
}

async function finalizeAsn(slots) {
  const result = await createAsnOnPurchaseOrder({
    PONumber: slots.PONumber,
    ConfirmASNQty: slots.ConfirmASNQty,
    POItem: slots.POItem,
    ASNNumber: slots.ASNNumber,
  });
  const formatted = formatPo(result.po);
  return {
    reply: `ASN ${result.asn.ASNNumber} created for PO ${result.asn.PONumber} item ${result.asn.POItem}. Confirm ASN qty = ${result.asn.ConfirmASNQty}.`,
    table: formatted.table,
    data: result.po,
    asn: result.asn,
    wizard: null,
    slots: {},
  };
}

export async function startOrRunCreateAsn(slots = {}) {
  const current = { ...slots };
  const missing = nextAsnField(current);
  if (!missing) return finalizeAsn(current);
  const prompt = await buildAsnPrompt(current);
  return {
    ...prompt,
    reply: missing === 'PONumber'
      ? `Let's create an ASN.\n\n${prompt.reply}`
      : prompt.reply,
  };
}
