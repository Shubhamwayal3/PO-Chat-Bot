import { SHEETS, STOCK_COLUMNS } from '../config.js';
import { AppError, matchesQuery, stripMeta, today } from '../utils/errors.js';
import { mutateWorkbook, readSheet } from './excelService.js';

export async function listStock({ article, site, q, limit = 100, offset = 0 } = {}) {
  let rows = [];
  try {
    rows = await readSheet(SHEETS.stock);
  } catch (err) {
    if (err.code === 'SHEET_NOT_FOUND') return { data: [], total: 0 };
    throw err;
  }
  if (article) rows = rows.filter((r) => r.ArticleCode === article);
  if (site) rows = rows.filter((r) => r.SiteCode === site);
  if (q) rows = rows.filter((r) => matchesQuery(r, q, ['ArticleCode', 'SiteCode']));
  const total = rows.length;
  return {
    data: rows
      .slice(offset, offset + limit)
      .map((r) => ({
        ...stripMeta(r),
        StockQty: Number(r.StockQty ?? 0),
      })),
    total,
  };
}

export async function getStock(articleCode, siteCode) {
  const { data } = await listStock({ article: articleCode, site: siteCode, limit: 1 });
  if (!data.length) {
    return {
      ArticleCode: articleCode,
      SiteCode: siteCode,
      StockQty: 0,
      UoM: null,
      UpdatedOn: null,
    };
  }
  return data[0];
}

/**
 * Apply stock delta for Article + Site.
 * Positive delta = goods receipt increase.
 * Called only from GR posting paths.
 */
export function applyStockDeltaOnCtx(stockCtx, { ArticleCode, SiteCode, delta, UoM }) {
  if (!ArticleCode || !SiteCode) {
    throw new AppError('VALIDATION_ERROR', 'ArticleCode and SiteCode required for stock');
  }
  const amount = Number(delta);
  if (!Number.isFinite(amount) || amount === 0) {
    return null;
  }

  const rows = stockCtx.readRows();
  const existing = rows.find(
    (r) => r.ArticleCode === ArticleCode && r.SiteCode === SiteCode
  );
  const now = today();

  if (existing) {
    const nextQty = Number(existing.StockQty ?? 0) + amount;
    if (nextQty < 0) {
      throw new AppError(
        'VALIDATION_ERROR',
        `Stock for ${ArticleCode} at ${SiteCode} cannot go below 0`,
        400
      );
    }
    stockCtx.updateRow(existing.__rowNumber, {
      StockQty: nextQty,
      UoM: UoM || existing.UoM,
      UpdatedOn: now,
    });
    return {
      ArticleCode,
      SiteCode,
      StockQty: nextQty,
      UoM: UoM || existing.UoM,
      delta: amount,
      UpdatedOn: now,
    };
  }

  if (amount < 0) {
    throw new AppError(
      'VALIDATION_ERROR',
      `No stock row for ${ArticleCode} / ${SiteCode} to reduce`,
      400
    );
  }

  stockCtx.appendRow({
    ArticleCode,
    SiteCode,
    StockQty: amount,
    UoM: UoM || null,
    UpdatedOn: now,
  });
  return {
    ArticleCode,
    SiteCode,
    StockQty: amount,
    UoM: UoM || null,
    delta: amount,
    UpdatedOn: now,
  };
}

export async function adjustStock(payload) {
  return mutateWorkbook((wb) => {
    const stockCtx = wb.ensureSheet(SHEETS.stock, STOCK_COLUMNS);
    return applyStockDeltaOnCtx(stockCtx, payload);
  });
}

export { STOCK_COLUMNS };
