export function helpText() {
  return [
    'I understand simplified SAP MM Procure-to-Pay in this project.',
    '',
    'Master data:',
    '• create 10 new articles of category shoes',
    '• create vendor Acme Supplies in Mumbai country IN currency INR',
    '• create site Pune Hub city Pune region West country IN',
    '• list / show articles, vendors, sites',
    '',
    'Transactional:',
    '• create PO (guided) / show PO / list PO / cancel PO',
    '• create ASN (asks PO + qty)',
    '• post GR for PO 4500000001 qty 8  → also updates Stock',
    '• list stock',
    '',
    'Stock is maintained per Article + Site and increases only on Goods Receipt (not on ASN).',
    'If a required field is missing, I ask before writing Excel.',
    "If something is outside this project scope, I will say I don't know.",
  ].join('\n');
}

function cell(value) {
  if (value == null || value === '') return '';
  return String(value);
}

/** Build structured table + ASCII fallback for chat replies. */
export function buildTable(title, rows, columns) {
  if (!rows?.length) {
    return {
      reply: `No ${title} found.`,
      table: null,
    };
  }

  const cols = columns.map((c) => (typeof c === 'string' ? { key: c, label: c } : c));
  const tableRows = rows.map((row) =>
    Object.fromEntries(cols.map(({ key }) => [key, cell(row[key])]))
  );

  const labels = cols.map((c) => c.label);
  const keys = cols.map((c) => c.key);
  const widths = keys.map((key, i) =>
    Math.max(labels[i].length, ...tableRows.map((r) => cell(r[key]).length))
  );

  const pad = (text, w) => cell(text).padEnd(w, ' ');
  const header = labels.map((l, i) => pad(l, widths[i])).join(' | ');
  const divider = widths.map((w) => '-'.repeat(w)).join('-+-');
  const body = tableRows
    .map((r) => keys.map((k, i) => pad(r[k], widths[i])).join(' | '))
    .join('\n');

  return {
    reply: `${title} (${rows.length})\n${header}\n${divider}\n${body}`,
    table: {
      title,
      columns: cols.map(({ key, label }) => ({ key, label })),
      rows: tableRows,
    },
  };
}

export function formatList(label, rows, fields) {
  return buildTable(label, rows, fields);
}

export function formatPo(po) {
  if (!po) return { reply: 'PO not found.', table: null };

  const header = `PO ${po.PONumber} | Vendor ${po.VendorCode} | Site ${po.SiteCode} | Status ${po.Status} | Date ${po.PODate}`;
  const items = (po.items || []).map((item) => ({
    POItem: item.POItem,
    ArticleCode: item.ArticleCode,
    Quantity: item.Quantity,
    UoM: item.UoM,
    NetPrice: item.NetPrice,
    Currency: item.Currency,
    DeliveryDate: item.DeliveryDate,
    ASNNumber: item.ASNNumber ?? '',
    ConfirmASNQty: item.ConfirmASNQty ?? 0,
    GRQuantity: item.GRQuantity ?? 0,
  }));

  const built = buildTable('PO items', items, [
    'POItem',
    'ArticleCode',
    'Quantity',
    'UoM',
    { key: 'ASNNumber', label: 'ASN Number' },
    { key: 'ConfirmASNQty', label: 'Confirm ASN Qty' },
    { key: 'GRQuantity', label: 'GR Qty' },
    'DeliveryDate',
  ]);

  return {
    reply: `${header}\n\n${built.reply}`,
    table: built.table
      ? { ...built.table, title: `PO ${po.PONumber} items`, caption: header }
      : null,
  };
}

export function formatPoList(pos) {
  const rows = (pos || []).map((p) => ({
    PONumber: p.PONumber,
    VendorCode: p.VendorCode,
    SiteCode: p.SiteCode,
    Status: p.Status,
    PODate: p.PODate,
    Lines: p.items?.length ?? 0,
  }));
  return buildTable('Purchase orders', rows, [
    'PONumber',
    'VendorCode',
    'SiteCode',
    'Status',
    'PODate',
    'Lines',
  ]);
}
