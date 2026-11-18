import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

export const config = {
  port: Number(process.env.PORT || 3000),
  workbookPath: path.resolve(
    root,
    process.env.WORKBOOK_PATH || './data/PO_Cycle_Master.xlsx'
  ),
  apiKey: process.env.API_KEY || '',
  root,
};

export const SHEETS = {
  articles: 'ArticleMaster',
  vendors: 'VendorMaster',
  sites: 'SiteMaster',
  purchaseOrders: 'PurchaseOrder',
  stock: 'Stock',
};

export const ARTICLE_COLUMNS = [
  'ArticleCode',
  'ArticleDesc',
  'UoM',
  'MaterialGroup',
  'BasePrice',
  'Currency',
  'Status',
  'LeadTimeDays',
  'CreatedOn',
  'UpdatedOn',
];

export const VENDOR_COLUMNS = [
  'VendorCode',
  'VendorName',
  'City',
  'Country',
  'PaymentTerms',
  'Currency',
  'ContactEmail',
  'Status',
  'CreatedOn',
  'UpdatedOn',
];

export const SITE_COLUMNS = [
  'SiteCode',
  'SiteName',
  'City',
  'Region',
  'Country',
  'StorageLocation',
  'Status',
  'CreatedOn',
  'UpdatedOn',
  'Remarks',
];

export const PO_COLUMNS = [
  'PONumber',
  'POItem',
  'VendorCode',
  'SiteCode',
  'ArticleCode',
  'Quantity',
  'UoM',
  'NetPrice',
  'Currency',
  'DeliveryDate',
  'ASNNumber',
  'ConfirmASNQty',
  'GRQuantity',
  'PODate',
  'Status',
  'CreatedBy',
  'UpdatedOn',
];

export const PO_STATUSES = [
  'Draft',
  'Ordered',
  'PartiallyReceived',
  'Closed',
  'Cancelled',
];

/** Stock by Article + Site. Updated only on Goods Receipt. */
export const STOCK_COLUMNS = [
  'ArticleCode',
  'SiteCode',
  'StockQty',
  'UoM',
  'UpdatedOn',
];
