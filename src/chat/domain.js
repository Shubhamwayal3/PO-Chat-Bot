/**
 * Business scope this chatbot understands (simplified SAP MM P2P).
 * Anything outside this should return an honest "I don't know".
 */

export const KNOWN_CAPABILITIES = [
  'Article / material master (create, list, show, update status/price)',
  'Vendor master (create, list, show, deactivate)',
  'Site / plant master (create, list, show)',
  'Purchase order create / show / list / cancel',
  'ASN create (ASN number + confirmed qty on PO line)',
  'Goods receipt qty update on PO line (GRQuantity)',
  'Stock by Article + Site (updated only when GR is posted)',
];

export const OUT_OF_SCOPE_HINTS = [
  /invoice|miro|payment|fi\b|finance|gl\b/i,
  /goods\s*issue|delivery\s*note(?!\s*asn)|shipment\s*track/i,
  /hr\b|payroll|employee|leave/i,
  /sales\s*order|customer\s*master|sd\b|billing/i,
  /warehouse\s*bin|wm\b|transfer\s*order/i,
  /production\s*order|bom\b|mrp\b/i,
];

export function isLikelyOutOfScope(text) {
  return OUT_OF_SCOPE_HINTS.some((re) => re.test(text));
}

export function unknownBusinessReply(message) {
  if (isLikelyOutOfScope(message)) {
    return [
      "I don't know how to do that in this project.",
      'This chatbot covers a simplified SAP MM Procure-to-Pay scope only:',
      ...KNOWN_CAPABILITIES.map((c) => `• ${c}`),
      '',
      'Invoice, payment, sales, HR, production, and full WM are not available here.',
    ].join('\n');
  }

  return [
    "I don't know that request from the current project context.",
    'I can help with master data (Article, Vendor, Site) and transactional data (PO, ASN, GR qty).',
    '',
    'Examples:',
    '• create 10 new articles of category shoes',
    '• create vendor Acme Supplies in Mumbai country IN currency INR',
    '• create site Pune Hub city Pune region West country IN',
    '• create PO / create ASN',
    '• list articles | show PO 4500000001',
    '',
    'If a required field is missing, I will ask for it before writing to Excel.',
  ].join('\n');
}
