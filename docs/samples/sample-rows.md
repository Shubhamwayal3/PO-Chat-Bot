# Sample / Seed Rows

Use these when creating `data/PO_Cycle_Master.xlsx` (manually or via seed script).

---

## ArticleMaster

| ArticleCode | ArticleDesc | UoM | MaterialGroup | BasePrice | Currency | Status | LeadTimeDays | CreatedOn | UpdatedOn |
|-------------|-------------|-----|---------------|-----------|----------|--------|--------------|-----------|-----------|
| A10001 | A4 Copy Paper Ream | EA | OFFICE | 250 | INR | Active | 5 | 2026-11-01 | 2026-11-01 |
| A10002 | Ball Point Pen Blue | EA | OFFICE | 10 | INR | Active | 3 | 2026-11-01 | 2026-11-01 |
| A10003 | Safety Helmet | EA | PPE | 450 | INR | Active | 10 | 2026-11-01 | 2026-11-01 |
| A10004 | Industrial Grease 1kg | KG | MRO | 320 | INR | Active | 7 | 2026-11-01 | 2026-11-01 |
| A10005 | USB-C Cable 1m | EA | IT-ACC | 199 | INR | Inactive | 7 | 2026-11-01 | 2026-11-15 |

---

## VendorMaster

| VendorCode | VendorName | City | Country | PaymentTerms | Currency | ContactEmail | Status | CreatedOn | UpdatedOn |
|------------|------------|------|---------|--------------|----------|--------------|--------|-----------|-----------|
| V1001 | Bharat Office Mart | Mumbai | IN | NET30 | INR | sales@bom.example | Active | 2026-11-01 | 2026-11-01 |
| V1002 | SafeWear India | Pune | IN | NET45 | INR | orders@safewear.example | Active | 2026-11-01 | 2026-11-01 |
| V1003 | TechCable Co | Bengaluru | IN | NET15 | INR | support@techcable.example | Active | 2026-11-01 | 2026-11-01 |
| V1004 | Legacy Supplies | Delhi | IN | NET30 | INR | | Inactive | 2026-10-01 | 2026-11-10 |

---

## SiteMaster

| SiteCode | SiteName | City | Region | Country | StorageLocation | Status | CreatedOn | UpdatedOn | Remarks |
|----------|----------|------|--------|---------|-----------------|--------|-----------|-----------|---------|
| S100 | Mumbai DC | Mumbai | West | IN | 0001 | Active | 2026-11-01 | 2026-11-01 | Main DC |
| S200 | Pune Plant | Pune | West | IN | 0001 | Active | 2026-11-01 | 2026-11-01 | Manufacturing |
| S300 | Delhi Hub | Delhi | North | IN | 0002 | Active | 2026-11-01 | 2026-11-01 | |
| S400 | Old Warehouse | Nagpur | West | IN | 0001 | Inactive | 2026-09-01 | 2026-11-01 | Do not use |

---

## PurchaseOrder

| PONumber | POItem | VendorCode | SiteCode | ArticleCode | Quantity | UoM | NetPrice | Currency | DeliveryDate | ASNNumber | ConfirmASNQty | GRQuantity | PODate | Status | CreatedBy | UpdatedOn |
|----------|--------|------------|----------|-------------|----------|-----|----------|----------|--------------|-----------|---------------|------------|--------|--------|-----------|-----------|
| 4500000001 | 10 | V1001 | S100 | A10001 | 100 | EA | 240 | INR | 2026-11-30 | ASN90001 | 100 | 80 | 2026-11-18 | PartiallyReceived | chatbot | 2026-11-18 |
| 4500000001 | 20 | V1001 | S100 | A10002 | 500 | EA | 9 | INR | 2026-11-30 | ASN90001 | 500 | 0 | 2026-11-18 | Ordered | chatbot | 2026-11-18 |
| 4500000002 | 10 | V1002 | S200 | A10003 | 50 | EA | 440 | INR | 2026-12-05 | | 0 | 0 | 2026-11-18 | Draft | chatbot | 2026-11-18 |

---

## Seed checklist

1. Create blank workbook.  
2. Add four sheets with exact names from `02-excel-data-model.md`.  
3. Paste headers (row 1) then sample rows.  
4. Save as `data/PO_Cycle_Master.xlsx`.  
5. Hit `GET /articles` after API is up — expect 5 articles.
