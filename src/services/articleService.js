import { SHEETS } from '../config.js';
import { AppError, matchesQuery, stripMeta, today } from '../utils/errors.js';
import { mutateSheet, readSheet } from './excelService.js';

export async function listArticles({ status, q, limit = 50, offset = 0 } = {}) {
  let rows = await readSheet(SHEETS.articles);
  if (status) rows = rows.filter((r) => r.Status === status);
  if (q) rows = rows.filter((r) => matchesQuery(r, q, ['ArticleCode', 'ArticleDesc']));
  const total = rows.length;
  const data = rows.slice(offset, offset + limit).map(stripMeta);
  return { data, total };
}

export async function getArticle(articleCode) {
  const rows = await readSheet(SHEETS.articles);
  const row = rows.find((r) => r.ArticleCode === articleCode);
  if (!row) throw new AppError('NOT_FOUND', `Article ${articleCode} not found`, 404);
  return stripMeta(row);
}

export async function createArticle(payload) {
  return mutateSheet(SHEETS.articles, (ctx) => {
    const rows = ctx.readRows();
    if (rows.some((r) => r.ArticleCode === payload.ArticleCode)) {
      throw new AppError('DUPLICATE_KEY', `ArticleCode ${payload.ArticleCode} already exists`, 409);
    }
    const now = today();
    const row = {
      ...payload,
      MaterialGroup: payload.MaterialGroup ?? null,
      LeadTimeDays: payload.LeadTimeDays ?? null,
      CreatedOn: now,
      UpdatedOn: now,
    };
    ctx.appendRow(row);
    return row;
  });
}

export async function updateArticle(articleCode, patch) {
  return mutateSheet(SHEETS.articles, (ctx) => {
    const rows = ctx.readRows();
    const existing = rows.find((r) => r.ArticleCode === articleCode);
    if (!existing) throw new AppError('NOT_FOUND', `Article ${articleCode} not found`, 404);
    const updated = { ...stripMeta(existing), ...patch, UpdatedOn: today() };
    ctx.updateRow(existing.__rowNumber, updated);
    return updated;
  });
}
