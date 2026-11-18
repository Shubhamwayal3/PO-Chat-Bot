export class AppError extends Error {
  constructor(code, message, status = 400, details = undefined) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function stripMeta(row) {
  if (!row) return row;
  const { __rowNumber, ...rest } = row;
  return rest;
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function matchesQuery(row, q, fields) {
  if (!q) return true;
  const needle = String(q).toLowerCase();
  return fields.some((f) => String(row[f] ?? '').toLowerCase().includes(needle));
}
