import { SHEETS } from '../config.js';
import { AppError, matchesQuery, stripMeta, today } from '../utils/errors.js';
import { mutateSheet, readSheet } from './excelService.js';

export async function listSites({ status, q, limit = 50, offset = 0 } = {}) {
  let rows = await readSheet(SHEETS.sites);
  if (status) rows = rows.filter((r) => r.Status === status);
  if (q) rows = rows.filter((r) => matchesQuery(r, q, ['SiteCode', 'SiteName']));
  const total = rows.length;
  return { data: rows.slice(offset, offset + limit).map(stripMeta), total };
}

export async function getSite(siteCode) {
  const rows = await readSheet(SHEETS.sites);
  const row = rows.find((r) => r.SiteCode === siteCode);
  if (!row) throw new AppError('NOT_FOUND', `Site ${siteCode} not found`, 404);
  return stripMeta(row);
}

export async function createSite(payload) {
  return mutateSheet(SHEETS.sites, (ctx) => {
    const rows = ctx.readRows();
    if (rows.some((r) => r.SiteCode === payload.SiteCode)) {
      throw new AppError('DUPLICATE_KEY', `SiteCode ${payload.SiteCode} already exists`, 409);
    }
    const now = today();
    const row = {
      ...payload,
      City: payload.City ?? null,
      Region: payload.Region ?? null,
      StorageLocation: payload.StorageLocation ?? null,
      Remarks: payload.Remarks ?? null,
      CreatedOn: now,
      UpdatedOn: now,
    };
    ctx.appendRow(row);
    return row;
  });
}

export async function updateSite(siteCode, patch) {
  return mutateSheet(SHEETS.sites, (ctx) => {
    const rows = ctx.readRows();
    const existing = rows.find((r) => r.SiteCode === siteCode);
    if (!existing) throw new AppError('NOT_FOUND', `Site ${siteCode} not found`, 404);
    const updated = { ...stripMeta(existing), ...patch, UpdatedOn: today() };
    ctx.updateRow(existing.__rowNumber, updated);
    return updated;
  });
}
