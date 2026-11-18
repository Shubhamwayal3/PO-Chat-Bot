# 02 — Excel Data Model

## Workbook

| Property | Value |
|----------|--------|
| File | `data/PO_Cycle_Master.xlsx` |
| Format | `.xlsx` |
| Sheets | `ArticleMaster`, `VendorMaster`, `SiteMaster`, `PurchaseOrder` |

**Rule:** Row 1 = headers. Data from row 2. No merged cells. No formulas required for MVP.

---

## Design choice: flat PO rows

Each **PO line** is one row. Header fields (vendor, site, dates, status) repeat on every line of the same `PONumber`.

Why: Excel-friendly; simple filter/update; no second “PO Header” sheet for MVP.

---

## 1. ArticleMaster (Material)

| # | Column | Type | Required | Notes |
|---|--------|------|----------|-------|
| 1 | ArticleCode | Text | Yes | PK, e.g. `A10001` |
| 2 | ArticleDesc | Text | Yes | Short description |
| 3 | UoM | Text | Yes | EA, KG, BOX, L… |
| 4 | MaterialGroup | Text | No | Category |
| 5 | BasePrice | Number | Yes | Standard price |
| 6 | Currency | Text | Yes | INR, USD… |
| 7 | Status | Text | Yes | Active / Inactive |
| 8 | LeadTimeDays | Number | No | Default procurement lead time |
| 9 | CreatedOn | Date | No | ISO or Excel date |
| 10 | UpdatedOn | Date | No | Last change |

**PK:** `ArticleCode`  
**Chat examples:** “add article A10001”, “deactivate article A10001”

---

## 2. VendorMaster

| # | Column | Type | Required | Notes |
|---|--------|------|----------|-------|
| 1 | VendorCode | Text | Yes | PK, e.g. `V1001` |
| 2 | VendorName | Text | Yes | Legal / trade name |
| 3 | City | Text | No | |
| 4 | Country | Text | Yes | IN, US… |
| 5 | PaymentTerms | Text | No | NET30, NET45… |
| 6 | Currency | Text | Yes | Default PO currency |
| 7 | ContactEmail | Text | No | |
| 8 | Status | Text | Yes | Active / Inactive |
| 9 | CreatedOn | Date | No | |
| 10 | UpdatedOn | Date | No | |

**PK:** `VendorCode`

---

## 3. SiteMaster (Plant)

| # | Column | Type | Required | Notes |
|---|--------|------|----------|-------|
| 1 | SiteCode | Text | Yes | PK, e.g. `S100` |
| 2 | SiteName | Text | Yes | Plant / DC name |
| 3 | City | Text | No | |
| 4 | Region | Text | No | State / zone |
| 5 | Country | Text | Yes | |
| 6 | StorageLocation | Text | No | Default SLoc, e.g. `0001` |
| 7 | Status | Text | Yes | Active / Inactive |
| 8 | CreatedOn | Date | No | |
| 9 | UpdatedOn | Date | No | |
| 10 | Remarks | Text | No | Free text |

**PK:** `SiteCode`

---

## 4. PurchaseOrder (Transactional)

| # | Column | Type | Required | Notes |
|---|--------|------|----------|-------|
| 1 | PONumber | Text | Yes | Business key; same for all lines of one PO |
| 2 | POItem | Number | Yes | Line number: 10, 20, 30… |
| 3 | VendorCode | Text | Yes | FK → VendorMaster |
| 4 | SiteCode | Text | Yes | FK → SiteMaster |
| 5 | ArticleCode | Text | Yes | FK → ArticleMaster |
| 6 | Quantity | Number | Yes | > 0 |
| 7 | UoM | Text | Yes | Prefer match Article UoM |
| 8 | NetPrice | Number | Yes | Price per unit |
| 9 | Currency | Text | Yes | Prefer match Vendor currency |
| 10 | DeliveryDate | Date | Yes | Expected delivery |
| 11 | ASNNumber | Text | No | Advance Shipping Notice number |
| 12 | ConfirmASNQty | Number | No | Confirmed ASN quantity (default 0) |
| 13 | GRQuantity | Number | No | Goods receipt quantity (default 0) |
| 14 | PODate | Date | Yes | Document date |
| 15 | Status | Text | Yes | Draft / Ordered / PartiallyReceived / Closed / Cancelled |
| 16 | CreatedBy | Text | No | User or `chatbot` |
| 17 | UpdatedOn | Date | No | |

**Composite key:** `PONumber` + `POItem`  
**Header fields shared on lines:** VendorCode, SiteCode, PODate, Status (keep consistent per PONumber)

> Columns exceed “max 10” slightly on PO because transactional docs need more fields. Masters stay ≤ 10. If you must hard-cap at 10 on PO, drop `CreatedBy`, `UpdatedOn`, and fold Status into a later phase — not recommended.

---

## Validation rules (enforce in API)

1. Master create: PK unique; Status ∈ {Active, Inactive}.  
2. Master update: cannot change PK; soft-delete via Status = Inactive.  
3. PO create:  
   - Vendor / Site / Article exist and Status = Active  
   - Quantity > 0, NetPrice ≥ 0  
   - POItem unique within PONumber  
4. PO update: allow Quantity, NetPrice, DeliveryDate, ASNNumber, ConfirmASNQty, GRQuantity, Status (and line add).  
5. ConfirmASNQty / GRQuantity ≥ 0; typically ConfirmASNQty ≤ Quantity and GRQuantity ≤ ConfirmASNQty (soft guideline for MVP).  
6. Cancelled PO: no further qty/price/ASN/GR changes (status-only or reject).  

---

## Numbering suggestion

| Entity | Pattern | Example |
|--------|---------|---------|
| Article | `A` + 5 digits | A10001 |
| Vendor | `V` + 4 digits | V1001 |
| Site | `S` + 3 digits | S100 |
| PO | `45` + 8 digits | 4500000001 |

API can auto-generate next PO number if user does not supply one.

---

## 5. Stock (Inventory by Article + Site)

| # | Column | Type | Required | Notes |
|---|--------|------|----------|-------|
| 1 | ArticleCode | Text | Yes | FK → ArticleMaster |
| 2 | SiteCode | Text | Yes | FK → SiteMaster |
| 3 | StockQty | Number | Yes | On-hand quantity |
| 4 | UoM | Text | No | Usually from article / PO |
| 5 | UpdatedOn | Date | No | Last GR-driven change |

**Composite key:** `ArticleCode` + `SiteCode`  

**Rule:** Stock changes **only** when Goods Receipt (`GRQuantity`) is posted/changed on a PO line.  
ASN create/confirm does **not** update stock. Delta = new GR − previous GR.

---

## Naming conventions in Excel

- Sheet names: PascalCase, no spaces (API-friendly).  
- Headers: PascalCase, exact match to API field names.  
- Empty cells for optional fields are allowed; required fields must be filled.
