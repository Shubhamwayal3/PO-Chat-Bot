import { SHEETS, STOCK_COLUMNS } from '../config.js';
import { AppError, stripMeta, today } from '../utils/errors.js';
import { mutateSheet, mutateWorkbook, readSheet } from './excelService.js';
import { applyStockDeltaOnCtx } from './stockService.js';

function groupPo(rows) {
  if (!rows.length) return null;
  const first = rows[0];
  return {
    PONumber: first.PONumber,
    VendorCode: first.VendorCode,
    SiteCode: first.SiteCode,
    PODate: first.PODate,
    Status: first.Status,
    CreatedBy: first.CreatedBy ?? null,
    UpdatedOn: first.UpdatedOn ?? null,
    items: rows
      .slice()
      .sort((a, b) => Number(a.POItem) - Number(b.POItem))
      .map((r) => ({
        POItem: Number(r.POItem),
        ArticleCode: r.ArticleCode,
        Quantity: Number(r.Quantity),
        UoM: r.UoM,
        NetPrice: Number(r.NetPrice),
        Currency: r.Currency,
        DeliveryDate: r.DeliveryDate,
        ASNNumber: r.ASNNumber ?? null,
        ConfirmASNQty: Number(r.ConfirmASNQty ?? 0),
        GRQuantity: Number(r.GRQuantity ?? 0),
      })),
  };
}

function nextPoNumber(rows) {
  let max = 4500000000;
  for (const r of rows) {
    const n = Number(String(r.PONumber).replace(/\D/g, ''));
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return String(max + 1);
}

async function loadMasters() {
  const [articles, vendors, sites] = await Promise.all([
    readSheet(SHEETS.articles),
    readSheet(SHEETS.vendors),
    readSheet(SHEETS.sites),
  ]);
  return { articles, vendors, sites };
}

function assertActive(entity, codeField, code, errCode) {
  if (!entity || entity.Status !== 'Active') {
    throw new AppError(
      errCode,
      `${codeField} ${code} does not exist or is Inactive`,
      400,
      { field: codeField, value: code }
    );
  }
}

export async function listPurchaseOrders({
  status,
  vendor,
  site,
  limit = 50,
  offset = 0,
} = {}) {
  let rows = await readSheet(SHEETS.purchaseOrders);
  if (status) rows = rows.filter((r) => r.Status === status);
  if (vendor) rows = rows.filter((r) => r.VendorCode === vendor);
  if (site) rows = rows.filter((r) => r.SiteCode === site);

  const byPo = new Map();
  for (const r of rows) {
    if (!byPo.has(r.PONumber)) byPo.set(r.PONumber, []);
    byPo.get(r.PONumber).push(r);
  }
  const all = [...byPo.values()].map(groupPo);
  const total = all.length;
  return { data: all.slice(offset, offset + limit), total };
}

export async function getPurchaseOrder(poNumber) {
  const rows = (await readSheet(SHEETS.purchaseOrders)).filter(
    (r) => r.PONumber === poNumber
  );
  if (!rows.length) {
    throw new AppError('NOT_FOUND', `PO ${poNumber} not found`, 404);
  }
  return groupPo(rows);
}

export async function createPurchaseOrder(payload) {
  const masters = await loadMasters();
  const vendor = masters.vendors.find((v) => v.VendorCode === payload.VendorCode);
  const site = masters.sites.find((s) => s.SiteCode === payload.SiteCode);
  assertActive(vendor, 'VendorCode', payload.VendorCode, 'FK_VENDOR_NOT_FOUND');
  assertActive(site, 'SiteCode', payload.SiteCode, 'FK_SITE_NOT_FOUND');

  const resolvedItems = payload.items.map((item, idx) => {
    const article = masters.articles.find((a) => a.ArticleCode === item.ArticleCode);
    assertActive(article, 'ArticleCode', item.ArticleCode, 'FK_ARTICLE_NOT_FOUND');
    return {
      ArticleCode: item.ArticleCode,
      Quantity: item.Quantity,
      UoM: item.UoM || article.UoM,
      NetPrice: item.NetPrice ?? Number(article.BasePrice),
      Currency: item.Currency || vendor.Currency,
      DeliveryDate: item.DeliveryDate,
      POItem: item.POItem ?? (idx + 1) * 10,
      ASNNumber: item.ASNNumber ?? null,
      ConfirmASNQty: item.ConfirmASNQty ?? 0,
      GRQuantity: item.GRQuantity ?? 0,
    };
  });

  return mutateSheet(SHEETS.purchaseOrders, (ctx) => {
    const rows = ctx.readRows();
    const poNumber = payload.PONumber || nextPoNumber(rows);
    if (rows.some((r) => r.PONumber === poNumber)) {
      throw new AppError('DUPLICATE_KEY', `PONumber ${poNumber} already exists`, 409);
    }

    const now = today();
    const poDate = payload.PODate || now;
    const status = payload.Status || 'Ordered';
    const createdBy = payload.CreatedBy || 'chatbot';

    for (const item of resolvedItems) {
      ctx.appendRow({
        PONumber: poNumber,
        POItem: item.POItem,
        VendorCode: payload.VendorCode,
        SiteCode: payload.SiteCode,
        ArticleCode: item.ArticleCode,
        Quantity: item.Quantity,
        UoM: item.UoM,
        NetPrice: item.NetPrice,
        Currency: item.Currency,
        DeliveryDate: item.DeliveryDate,
        ASNNumber: item.ASNNumber,
        ConfirmASNQty: item.ConfirmASNQty,
        GRQuantity: item.GRQuantity,
        PODate: poDate,
        Status: status,
        CreatedBy: createdBy,
        UpdatedOn: now,
      });
    }

    return groupPo(
      resolvedItems.map((item) => ({
        PONumber: poNumber,
        VendorCode: payload.VendorCode,
        SiteCode: payload.SiteCode,
        PODate: poDate,
        Status: status,
        CreatedBy: createdBy,
        UpdatedOn: now,
        ...item,
      }))
    );
  });
}

export async function updatePurchaseOrder(poNumber, patch) {
  return mutateSheet(SHEETS.purchaseOrders, (ctx) => {
    const rows = ctx.readRows().filter((r) => r.PONumber === poNumber);
    if (!rows.length) throw new AppError('NOT_FOUND', `PO ${poNumber} not found`, 404);

    if (rows[0].Status === 'Cancelled' && patch.Status !== 'Cancelled') {
      // allow only if already cancelled and no other field changes that matter
    }
    if (rows[0].Status === 'Cancelled' && (patch.DeliveryDate || patch.VendorCode || patch.SiteCode)) {
      throw new AppError('PO_LOCKED_STATUS', 'Cancelled PO cannot be changed', 400);
    }

    const now = today();
    for (const row of rows) {
      const updates = { UpdatedOn: now };
      if (patch.Status) updates.Status = patch.Status;
      if (patch.VendorCode) updates.VendorCode = patch.VendorCode;
      if (patch.SiteCode) updates.SiteCode = patch.SiteCode;
      if (patch.DeliveryDate) updates.DeliveryDate = patch.DeliveryDate;
      ctx.updateRow(row.__rowNumber, updates);
    }

    const refreshed = ctx.readRows().filter((r) => r.PONumber === poNumber);
    return groupPo(refreshed);
  });
}

export async function addPurchaseOrderItem(poNumber, item) {
  const masters = await loadMasters();
  const article = masters.articles.find((a) => a.ArticleCode === item.ArticleCode);
  assertActive(article, 'ArticleCode', item.ArticleCode, 'FK_ARTICLE_NOT_FOUND');

  return mutateSheet(SHEETS.purchaseOrders, (ctx) => {
    const rows = ctx.readRows().filter((r) => r.PONumber === poNumber);
    if (!rows.length) throw new AppError('NOT_FOUND', `PO ${poNumber} not found`, 404);
    if (rows[0].Status === 'Cancelled') {
      throw new AppError('PO_LOCKED_STATUS', 'Cannot add lines to Cancelled PO', 400);
    }

    const vendor = masters.vendors.find((v) => v.VendorCode === rows[0].VendorCode);
    const maxItem = Math.max(...rows.map((r) => Number(r.POItem) || 0), 0);
    const poItem = item.POItem ?? maxItem + 10;
    if (rows.some((r) => Number(r.POItem) === Number(poItem))) {
      throw new AppError('DUPLICATE_KEY', `POItem ${poItem} already exists on ${poNumber}`, 409);
    }

    const now = today();
    ctx.appendRow({
      PONumber: poNumber,
      POItem: poItem,
      VendorCode: rows[0].VendorCode,
      SiteCode: rows[0].SiteCode,
      ArticleCode: item.ArticleCode,
      Quantity: item.Quantity,
      UoM: item.UoM || article.UoM,
      NetPrice: item.NetPrice ?? Number(article.BasePrice),
      Currency: item.Currency || vendor?.Currency || rows[0].Currency,
      DeliveryDate: item.DeliveryDate,
      ASNNumber: item.ASNNumber ?? null,
      ConfirmASNQty: item.ConfirmASNQty ?? 0,
      GRQuantity: item.GRQuantity ?? 0,
      PODate: rows[0].PODate,
      Status: rows[0].Status,
      CreatedBy: rows[0].CreatedBy,
      UpdatedOn: now,
    });

    return groupPo(ctx.readRows().filter((r) => r.PONumber === poNumber));
  });
}

export async function updatePurchaseOrderItem(poNumber, poItem, patch) {
  if (patch.ArticleCode) {
    const masters = await loadMasters();
    const article = masters.articles.find((a) => a.ArticleCode === patch.ArticleCode);
    assertActive(article, 'ArticleCode', patch.ArticleCode, 'FK_ARTICLE_NOT_FOUND');
  }

  // GR changes must update Stock in the same workbook save
  if (patch.GRQuantity != null) {
    return mutateWorkbook((wb) => {
      const ctx = wb.getSheet(SHEETS.purchaseOrders);
      const rows = ctx.readRows().filter((r) => r.PONumber === poNumber);
      if (!rows.length) throw new AppError('NOT_FOUND', `PO ${poNumber} not found`, 404);
      if (rows[0].Status === 'Cancelled') {
        throw new AppError('PO_LOCKED_STATUS', 'Cancelled PO cannot be changed', 400);
      }

      const line = rows.find((r) => Number(r.POItem) === Number(poItem));
      if (!line) {
        throw new AppError('NOT_FOUND', `PO ${poNumber} item ${poItem} not found`, 404);
      }

      const oldGr = Number(line.GRQuantity ?? 0);
      const newGr = Number(patch.GRQuantity);
      if (!Number.isFinite(newGr) || newGr < 0) {
        throw new AppError('VALIDATION_ERROR', 'GRQuantity must be >= 0', 400);
      }
      const orderedQty = Number(line.Quantity);
      if (newGr > orderedQty) {
        throw new AppError(
          'VALIDATION_ERROR',
          `GR quantity ${newGr} cannot exceed PO quantity ${orderedQty}`,
          400
        );
      }

      const delta = newGr - oldGr;
      const updates = { ...patch, UpdatedOn: today() };
      // Line-level status from GR (header fields may still differ across lines)
      if (newGr <= 0) {
        /* leave status unless caller patched it */
      } else if (newGr < orderedQty) {
        updates.Status = patch.Status || 'PartiallyReceived';
      } else {
        updates.Status = patch.Status || 'Closed';
      }

      ctx.updateRow(line.__rowNumber, updates);

      let stock = null;
      if (delta !== 0) {
        const stockCtx = wb.ensureSheet(SHEETS.stock, STOCK_COLUMNS);
        stock = applyStockDeltaOnCtx(stockCtx, {
          ArticleCode: line.ArticleCode,
          SiteCode: line.SiteCode,
          delta,
          UoM: line.UoM,
        });
      }

      const po = groupPo(ctx.readRows().filter((r) => r.PONumber === poNumber));
      return { po, stock, grDelta: delta };
    });
  }

  return mutateSheet(SHEETS.purchaseOrders, (ctx) => {
    const rows = ctx.readRows().filter((r) => r.PONumber === poNumber);
    if (!rows.length) throw new AppError('NOT_FOUND', `PO ${poNumber} not found`, 404);
    if (rows[0].Status === 'Cancelled') {
      throw new AppError('PO_LOCKED_STATUS', 'Cancelled PO cannot be changed', 400);
    }

    const line = rows.find((r) => Number(r.POItem) === Number(poItem));
    if (!line) {
      throw new AppError('NOT_FOUND', `PO ${poNumber} item ${poItem} not found`, 404);
    }

    ctx.updateRow(line.__rowNumber, { ...patch, UpdatedOn: today() });
    return groupPo(ctx.readRows().filter((r) => r.PONumber === poNumber));
  });
}

function nextAsnNumber(allRows) {
  let max = 90000;
  for (const r of allRows) {
    const m = String(r.ASNNumber || '').match(/ASN(\d+)/i);
    if (m) {
      const n = Number(m[1]);
      if (n > max) max = n;
    }
  }
  return `ASN${max + 1}`;
}

/**
 * Create/update ASN on a PO line: sets ASNNumber + ConfirmASNQty in Excel.
 */
export async function createAsnOnPurchaseOrder({
  PONumber,
  ConfirmASNQty,
  POItem,
  ASNNumber,
}) {
  const qty = Number(ConfirmASNQty);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new AppError('VALIDATION_ERROR', 'ConfirmASNQty must be greater than 0', 400, {
      field: 'ConfirmASNQty',
    });
  }

  return mutateSheet(SHEETS.purchaseOrders, (ctx) => {
    const allRows = ctx.readRows();
    const rows = allRows.filter((r) => r.PONumber === PONumber);
    if (!rows.length) throw new AppError('NOT_FOUND', `PO ${PONumber} not found`, 404);
    if (rows[0].Status === 'Cancelled') {
      throw new AppError('PO_LOCKED_STATUS', 'Cannot create ASN on Cancelled PO', 400);
    }

    let line;
    if (POItem != null && POItem !== '') {
      line = rows.find((r) => Number(r.POItem) === Number(POItem));
      if (!line) {
        throw new AppError('NOT_FOUND', `PO ${PONumber} item ${POItem} not found`, 404);
      }
    } else if (rows.length === 1) {
      line = rows[0];
    } else {
      // Prefer first line without ASN, else first line
      line = rows.find((r) => !r.ASNNumber) || rows[0];
    }

    const orderedQty = Number(line.Quantity);
    if (qty > orderedQty) {
      throw new AppError(
        'VALIDATION_ERROR',
        `Confirm ASN qty ${qty} cannot exceed PO quantity ${orderedQty}`,
        400,
        { field: 'ConfirmASNQty', orderedQty }
      );
    }

    const asn = ASNNumber || line.ASNNumber || nextAsnNumber(allRows);
    const now = today();
    ctx.updateRow(line.__rowNumber, {
      ASNNumber: asn,
      ConfirmASNQty: qty,
      UpdatedOn: now,
    });

    const po = groupPo(ctx.readRows().filter((r) => r.PONumber === PONumber));
    const updatedItem = po.items.find((i) => Number(i.POItem) === Number(line.POItem));
    return {
      po,
      asn: {
        PONumber,
        POItem: Number(line.POItem),
        ASNNumber: asn,
        ConfirmASNQty: qty,
        ArticleCode: updatedItem?.ArticleCode,
      },
    };
  });
}

export { stripMeta };
