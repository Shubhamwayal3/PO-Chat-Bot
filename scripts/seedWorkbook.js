import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import {
  ARTICLE_COLUMNS,
  PO_COLUMNS,
  SITE_COLUMNS,
  STOCK_COLUMNS,
  VENDOR_COLUMNS,
  config,
} from '../src/config.js';

const articles = [
  ['A10001', 'A4 Copy Paper Ream', 'EA', 'OFFICE', 250, 'INR', 'Active', 5, '2026-11-01', '2026-11-01'],
  ['A10002', 'Ball Point Pen Blue', 'EA', 'OFFICE', 10, 'INR', 'Active', 3, '2026-11-01', '2026-11-01'],
  ['A10003', 'Safety Helmet', 'EA', 'PPE', 450, 'INR', 'Active', 10, '2026-11-01', '2026-11-01'],
  ['A10004', 'Industrial Grease 1kg', 'KG', 'MRO', 320, 'INR', 'Active', 7, '2026-11-01', '2026-11-01'],
  ['A10005', 'USB-C Cable 1m', 'EA', 'IT-ACC', 199, 'INR', 'Inactive', 7, '2026-11-01', '2026-11-15'],
];

const vendors = [
  ['V1001', 'Bharat Office Mart', 'Mumbai', 'IN', 'NET30', 'INR', 'sales@bom.example', 'Active', '2026-11-01', '2026-11-01'],
  ['V1002', 'SafeWear India', 'Pune', 'IN', 'NET45', 'INR', 'orders@safewear.example', 'Active', '2026-11-01', '2026-11-01'],
  ['V1003', 'TechCable Co', 'Bengaluru', 'IN', 'NET15', 'INR', 'support@techcable.example', 'Active', '2026-11-01', '2026-11-01'],
  ['V1004', 'Legacy Supplies', 'Delhi', 'IN', 'NET30', 'INR', null, 'Inactive', '2026-10-01', '2026-11-10'],
];

const sites = [
  ['S100', 'Mumbai DC', 'Mumbai', 'West', 'IN', '0001', 'Active', '2026-11-01', '2026-11-01', 'Main DC'],
  ['S200', 'Pune Plant', 'Pune', 'West', 'IN', '0001', 'Active', '2026-11-01', '2026-11-01', 'Manufacturing'],
  ['S300', 'Delhi Hub', 'Delhi', 'North', 'IN', '0002', 'Active', '2026-11-01', '2026-11-01', null],
  ['S400', 'Old Warehouse', 'Nagpur', 'West', 'IN', '0001', 'Inactive', '2026-09-01', '2026-11-01', 'Do not use'],
];

const purchaseOrders = [
  // PONumber, POItem, Vendor, Site, Article, Qty, UoM, Price, Curr, Delivery, ASNNumber, ConfirmASNQty, GRQuantity, PODate, Status, CreatedBy, UpdatedOn
  ['4500000001', 10, 'V1001', 'S100', 'A10001', 100, 'EA', 240, 'INR', '2026-11-30', 'ASN90001', 100, 80, '2026-11-18', 'PartiallyReceived', 'chatbot', '2026-11-18'],
  ['4500000001', 20, 'V1001', 'S100', 'A10002', 500, 'EA', 9, 'INR', '2026-11-30', 'ASN90001', 500, 0, '2026-11-18', 'Ordered', 'chatbot', '2026-11-18'],
  ['4500000002', 10, 'V1002', 'S200', 'A10003', 50, 'EA', 440, 'INR', '2026-12-05', null, 0, 0, '2026-11-18', 'Draft', 'chatbot', '2026-11-18'],
];

// Stock mirrors goods already receipted (A10001 @ S100 GR=80). ASN alone does not create stock.
const stock = [
  // ArticleCode, SiteCode, StockQty, UoM, UpdatedOn
  ['A10001', 'S100', 80, 'EA', '2026-11-18'],
];

function addSheet(workbook, name, columns, rows) {
  const sheet = workbook.addWorksheet(name);
  sheet.addRow(columns);
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row) => sheet.addRow(row));
  columns.forEach((_, i) => {
    sheet.getColumn(i + 1).width = 16;
  });
}

async function main() {
  const dir = path.dirname(config.workbookPath);
  fs.mkdirSync(dir, { recursive: true });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PO Cycle Chatbot';
  workbook.created = new Date();

  addSheet(workbook, 'ArticleMaster', ARTICLE_COLUMNS, articles);
  addSheet(workbook, 'VendorMaster', VENDOR_COLUMNS, vendors);
  addSheet(workbook, 'SiteMaster', SITE_COLUMNS, sites);
  addSheet(workbook, 'PurchaseOrder', PO_COLUMNS, purchaseOrders);
  addSheet(workbook, 'Stock', STOCK_COLUMNS, stock);

  await workbook.xlsx.writeFile(config.workbookPath);
  console.log(`Seeded workbook: ${config.workbookPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
