import { listArticles, getArticle } from '../services/articleService.js';
import { listVendors, getVendor } from '../services/vendorService.js';
import { listSites, getSite } from '../services/siteService.js';
import {
  createPurchaseOrder,
  getPurchaseOrder,
  listPurchaseOrders,
  updatePurchaseOrder,
  updatePurchaseOrderItem,
} from '../services/poService.js';
import { listStock } from '../services/stockService.js';
import { AppError } from '../utils/errors.js';
import { today } from '../utils/errors.js';
import {
  CREATE_CHAT_ACTIONS,
  CREATE_WIZARDS,
  assertCanCreate,
} from '../middleware/roles.js';
import { formatList, formatPo, formatPoList, helpText } from './replyFormatter.js';
import { parseUtterance } from './intents.js';
import { unknownBusinessReply } from './domain.js';
import {
  applyCreatePoAnswer,
  buildCreatePoConfirm,
  buildCreatePoPrompt,
  getMissingCreatePoFields,
  nextCreatePoField,
  normalizeCreatePoSlots,
} from './poWizard.js';
import { continueCreateAsnWizard, startOrRunCreateAsn } from './asnWizard.js';
import {
  continueArticleWizard,
  continueSiteWizard,
  continueVendorWizard,
  startArticleCreate,
  startSiteCreate,
  startVendorCreate,
} from './masterWizard.js';
import {
  continueUpdateArticle,
  continueUpdateAsn,
  continueUpdatePo,
  continueUpdateSite,
  continueUpdateVendor,
  startUpdateArticle,
  startUpdateAsn,
  startUpdatePo,
  startUpdateSite,
  startUpdateVendor,
} from './updateWizard.js';

async function continueCreatePoWizard({ slots = {}, message, confirm }) {
  let current = normalizeCreatePoSlots(slots);
  const text = String(message || '').trim();

  // Confirm step
  if (!getMissingCreatePoFields(current).length) {
    if (/^(yes|y|confirm|ok|create)$/i.test(text)) {
      return finalizeCreatePo(current);
    }
    if (/^(no|n|cancel|exit|stop)$/i.test(text)) {
      return { reply: 'PO creation cancelled.', wizard: null, slots: {} };
    }
    if (!text) return buildCreatePoConfirm(current);
    return {
      ...buildCreatePoConfirm(current),
      reply: `Please reply yes or no.\n\n${buildCreatePoConfirm(current).reply}`,
    };
  }

  const field = nextCreatePoField(current);
  if (!field) return buildCreatePoConfirm(current);

  // First prompt with no answer yet
  if (!text && confirm !== true) {
    return buildCreatePoPrompt(current, field);
  }

  // If this is the start (create PO click) with empty message handled elsewhere
  if (!text) {
    return buildCreatePoPrompt(current, field);
  }

  const applied = await applyCreatePoAnswer(current, field, text);
  if (applied.cancelled) {
    return { reply: 'PO creation cancelled.', wizard: null, slots: {} };
  }
  current = applied.slots;

  const next = nextCreatePoField(current);
  if (next) return buildCreatePoPrompt(current, next);
  return buildCreatePoConfirm(current);
}

async function finalizeCreatePo(resolvedSlots) {
  const s = normalizeCreatePoSlots(resolvedSlots);
  const payload = {
    VendorCode: s.VendorCode,
    SiteCode: s.SiteCode,
    PODate: s.PODate || today(),
    Status: s.Status || 'Ordered',
    CreatedBy: s.CreatedBy || 'chatbot',
    items: s.items.map((item) => ({
      ArticleCode: item.ArticleCode,
      Quantity: item.Quantity,
      NetPrice: item.NetPrice,
      DeliveryDate: item.DeliveryDate || s.DeliveryDate,
      UoM: item.UoM,
      Currency: item.Currency,
    })),
  };
  const data = await createPurchaseOrder(payload);
  const formatted = formatPo(data);
  return {
    reply: `PO ${data.PONumber} created. ${data.items.length} line(s). Status ${data.Status}.`,
    table: formatted.table,
    data,
    wizard: null,
    slots: {},
  };
}

export async function runChatAction({
  action,
  slots = {},
  confirm = true,
  message,
  wizard,
  awaitingField,
  role,
}) {
  let resolvedAction = action;
  let resolvedSlots = slots;
  let resolvedWizard = wizard || null;

  if (action === 'parse' || action === 'message') {
    // Continue guided wizards if active
    if (resolvedWizard === 'create_po' || slots._wizard === 'create_po') {
      assertCanCreate(role);
      return continueCreatePoWizard({
        slots: resolvedSlots,
        message,
        confirm: false,
      });
    }
    if (resolvedWizard === 'create_asn' || slots._wizard === 'create_asn') {
      assertCanCreate(role);
      return continueCreateAsnWizard({
        slots: resolvedSlots,
        message,
      });
    }
    if (resolvedWizard === 'create_article' || resolvedWizard === 'create_articles') {
      assertCanCreate(role);
      return continueArticleWizard({
        slots: resolvedSlots,
        message,
        bulk: resolvedWizard === 'create_articles',
      });
    }
    if (resolvedWizard === 'create_vendor') {
      assertCanCreate(role);
      return continueVendorWizard({ slots: resolvedSlots, message });
    }
    if (resolvedWizard === 'create_site') {
      assertCanCreate(role);
      return continueSiteWizard({ slots: resolvedSlots, message });
    }
    if (resolvedWizard === 'update_article') {
      return continueUpdateArticle({ slots: resolvedSlots, message });
    }
    if (resolvedWizard === 'update_vendor') {
      return continueUpdateVendor({ slots: resolvedSlots, message });
    }
    if (resolvedWizard === 'update_site') {
      return continueUpdateSite({ slots: resolvedSlots, message });
    }
    if (resolvedWizard === 'update_po') {
      return continueUpdatePo({ slots: resolvedSlots, message });
    }
    if (resolvedWizard === 'update_asn') {
      return continueUpdateAsn({ slots: resolvedSlots, message });
    }

    const parsed = parseUtterance(message || slots.text || '');
    resolvedAction = parsed.action;
    resolvedSlots = { ...parsed.slots, ...slots };
  }

  if (
    CREATE_CHAT_ACTIONS.has(resolvedAction) ||
    (resolvedWizard && CREATE_WIZARDS.has(resolvedWizard))
  ) {
    assertCanCreate(role);
  }

  // Explicit continue
  if (resolvedAction === 'continue_create_po') {
    assertCanCreate(role);
    return continueCreatePoWizard({
      slots: resolvedSlots,
      message,
      confirm: false,
    });
  }

  switch (resolvedAction) {
    case 'help':
      return { reply: helpText(), data: null, wizard: null };

    case 'list_articles': {
      const { data } = await listArticles({ status: resolvedSlots.status, q: resolvedSlots.q });
      const formatted = formatList('Articles', data, [
        'ArticleCode',
        'ArticleDesc',
        'BasePrice',
        'Currency',
        'Status',
      ]);
      return { ...formatted, data, wizard: null };
    }
    case 'get_article': {
      const data = await getArticle(resolvedSlots.ArticleCode);
      return {
        reply: `${data.ArticleCode} — ${data.ArticleDesc} | ${data.BasePrice} ${data.Currency} | ${data.UoM} | ${data.Status}`,
        data,
        wizard: null,
      };
    }
    case 'create_article': {
      return startArticleCreate(resolvedSlots, false);
    }
    case 'create_articles': {
      return startArticleCreate(
        { ...resolvedSlots, count: Number(resolvedSlots.count || 1) },
        true
      );
    }
    case 'update_article': {
      return startUpdateArticle(resolvedSlots);
    }

    case 'list_vendors': {
      const { data } = await listVendors({ status: resolvedSlots.status, q: resolvedSlots.q });
      const formatted = formatList('Vendors', data, [
        'VendorCode',
        'VendorName',
        'City',
        'Currency',
        'Status',
      ]);
      return { ...formatted, data, wizard: null };
    }
    case 'get_vendor': {
      const data = await getVendor(resolvedSlots.VendorCode);
      return {
        reply: `${data.VendorCode} — ${data.VendorName} | ${data.City || '-'} | ${data.Currency} | ${data.Status}`,
        data,
        wizard: null,
      };
    }
    case 'create_vendor': {
      return startVendorCreate(resolvedSlots);
    }
    case 'update_vendor': {
      return startUpdateVendor(resolvedSlots);
    }

    case 'list_sites': {
      const { data } = await listSites({ status: resolvedSlots.status, q: resolvedSlots.q });
      const formatted = formatList('Sites', data, [
        'SiteCode',
        'SiteName',
        'City',
        'Status',
      ]);
      return { ...formatted, data, wizard: null };
    }
    case 'get_site': {
      const data = await getSite(resolvedSlots.SiteCode);
      return {
        reply: `${data.SiteCode} — ${data.SiteName} | ${data.City || '-'} | ${data.Status}`,
        data,
        wizard: null,
      };
    }
    case 'create_site': {
      return startSiteCreate(resolvedSlots);
    }
    case 'update_site': {
      return startUpdateSite(resolvedSlots);
    }
    case 'update_po': {
      return startUpdatePo(resolvedSlots);
    }
    case 'update_asn': {
      return startUpdateAsn(resolvedSlots);
    }

    case 'list_pos': {
      const { data } = await listPurchaseOrders({
        status: resolvedSlots.status,
        vendor: resolvedSlots.vendor || resolvedSlots.VendorCode,
        site: resolvedSlots.site || resolvedSlots.SiteCode,
      });
      const formatted = formatPoList(data);
      return { ...formatted, data, wizard: null };
    }
    case 'get_po': {
      const data = await getPurchaseOrder(resolvedSlots.PONumber);
      const formatted = formatPo(data);
      return { ...formatted, data, wizard: null };
    }
    case 'create_asn': {
      return startOrRunCreateAsn(resolvedSlots);
    }

    case 'update_gr': {
      if (!resolvedSlots.PONumber) {
        return {
          reply: 'Please provide PO number for goods receipt. Example: post GR for PO 4500000001 qty 8',
          needsSlots: ['PONumber'],
          wizard: null,
        };
      }
      if (resolvedSlots.GRQuantity == null) {
        return {
          reply: `PO ${resolvedSlots.PONumber}: enter goods receipt quantity.`,
          needsSlots: ['GRQuantity'],
          wizard: null,
        };
      }
      const po = await getPurchaseOrder(resolvedSlots.PONumber);
      const line =
        (resolvedSlots.POItem != null
          ? po.items.find((i) => Number(i.POItem) === Number(resolvedSlots.POItem))
          : null) || po.items[0];
      if (!line) throw new AppError('NOT_FOUND', `No items on PO ${resolvedSlots.PONumber}`, 404);
      const result = await updatePurchaseOrderItem(resolvedSlots.PONumber, line.POItem, {
        GRQuantity: Number(resolvedSlots.GRQuantity),
      });
      const data = result.po || result;
      const stock = result.stock;
      const formatted = formatPo(data);
      const stockMsg = stock
        ? `\nStock ${stock.ArticleCode} @ ${stock.SiteCode}: ${stock.StockQty} ${stock.UoM || ''} (Δ ${stock.delta > 0 ? '+' : ''}${stock.delta}).`
        : '';
      return {
        reply: `Goods receipt qty ${resolvedSlots.GRQuantity} posted on PO ${resolvedSlots.PONumber} item ${line.POItem}.${stockMsg}`,
        table: formatted.table,
        data,
        stock,
        wizard: null,
      };
    }

    case 'list_stock': {
      const { data } = await listStock({
        article: resolvedSlots.article || resolvedSlots.ArticleCode,
        site: resolvedSlots.site || resolvedSlots.SiteCode,
        q: resolvedSlots.q,
      });
      const formatted = formatList('Stock', data, [
        'ArticleCode',
        'SiteCode',
        'StockQty',
        'UoM',
        'UpdatedOn',
      ]);
      return { ...formatted, data, wizard: null };
    }

    case 'create_po': {
      const normalized = normalizeCreatePoSlots(resolvedSlots);
      const missing = getMissingCreatePoFields(normalized);

      // Guided flow when anything is missing (including bare "create PO")
      if (missing.length) {
        const field = nextCreatePoField(normalized);
        const prompt = await buildCreatePoPrompt(normalized, field);
        return {
          ...prompt,
          reply: `Let's create a Purchase Order.\n\n${prompt.reply}`,
        };
      }

      if (!confirm) {
        return buildCreatePoConfirm(normalized);
      }
      return finalizeCreatePo(normalized);
    }
    case 'update_po_status': {
      if (!resolvedSlots.PONumber || !resolvedSlots.Status) {
        throw new AppError('VALIDATION_ERROR', 'PONumber and Status are required');
      }
      if (!confirm) {
        return {
          reply: `Confirm set PO ${resolvedSlots.PONumber} status to ${resolvedSlots.Status}?`,
          needsConfirm: true,
        };
      }
      const data = await updatePurchaseOrder(resolvedSlots.PONumber, {
        Status: resolvedSlots.Status,
      });
      return { reply: `PO ${data.PONumber} status set to ${data.Status}.`, data, wizard: null };
    }

    case 'unknown':
      return {
        reply: unknownBusinessReply(message || resolvedSlots.text || ''),
        data: null,
        wizard: null,
      };

    default:
      throw new AppError('VALIDATION_ERROR', `Unsupported action: ${resolvedAction}`);
  }
}
