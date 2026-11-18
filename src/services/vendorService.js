import { SHEETS } from '../config.js';
import { AppError, matchesQuery, stripMeta, today } from '../utils/errors.js';
import { mutateSheet, readSheet } from './excelService.js';

export async function listVendors({ status, q, limit = 50, offset = 0 } = {}) {
  let rows = await readSheet(SHEETS.vendors);
  if (status) rows = rows.filter((r) => r.Status === status);
  if (q) rows = rows.filter((r) => matchesQuery(r, q, ['VendorCode', 'VendorName']));
  const total = rows.length;
  return { data: rows.slice(offset, offset + limit).map(stripMeta), total };
}

export async function getVendor(vendorCode) {
  const rows = await readSheet(SHEETS.vendors);
  const row = rows.find((r) => r.VendorCode === vendorCode);
  if (!row) throw new AppError('NOT_FOUND', `Vendor ${vendorCode} not found`, 404);
  return stripMeta(row);
}

export async function createVendor(payload) {
  return mutateSheet(SHEETS.vendors, (ctx) => {
    const rows = ctx.readRows();
    if (rows.some((r) => r.VendorCode === payload.VendorCode)) {
      throw new AppError('DUPLICATE_KEY', `VendorCode ${payload.VendorCode} already exists`, 409);
    }
    const now = today();
    const row = {
      ...payload,
      City: payload.City ?? null,
      PaymentTerms: payload.PaymentTerms ?? null,
      ContactEmail: payload.ContactEmail ?? null,
      CreatedOn: now,
      UpdatedOn: now,
    };
    ctx.appendRow(row);
    return row;
  });
}

export async function updateVendor(vendorCode, patch) {
  return mutateSheet(SHEETS.vendors, (ctx) => {
    const rows = ctx.readRows();
    const existing = rows.find((r) => r.VendorCode === vendorCode);
    if (!existing) throw new AppError('NOT_FOUND', `Vendor ${vendorCode} not found`, 404);
    const updated = { ...stripMeta(existing), ...patch, UpdatedOn: today() };
    ctx.updateRow(existing.__rowNumber, updated);
    return updated;
  });
}
