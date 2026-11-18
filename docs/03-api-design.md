# 03 — API Design

Base URL (local): `http://localhost:3000/api/v1`

All responses JSON. Excel is the persistence layer.

## Common conventions

| Item | Convention |
|------|------------|
| Success | `200` / `201` with `{ "data": ... }` |
| Client error | `400` `{ "error": { "code", "message", "details?" } }` |
| Not found | `404` |
| Conflict (duplicate PK) | `409` |
| Sheet query param / path | `article` \| `vendor` \| `site` \| `po` |

### Resource map

| Sheet | Resource path segment |
|-------|------------------------|
| ArticleMaster | `/articles` |
| VendorMaster | `/vendors` |
| SiteMaster | `/sites` |
| PurchaseOrder | `/purchase-orders` |

---

## Health

```
GET /health
→ { "status": "ok", "workbook": "PO_Cycle_Master.xlsx", "writable": true }
```

---

## Articles

```
GET    /articles
GET    /articles/:articleCode
POST   /articles
PATCH  /articles/:articleCode
```

**POST body (example)**

```json
{
  "ArticleCode": "A10005",
  "ArticleDesc": "USB-C Cable 1m",
  "UoM": "EA",
  "MaterialGroup": "IT-ACC",
  "BasePrice": 199,
  "Currency": "INR",
  "Status": "Active",
  "LeadTimeDays": 7
}
```

**PATCH:** partial fields only (never change `ArticleCode`).

**GET filters (optional query):** `status`, `q` (search code/desc), `limit`, `offset`

---

## Vendors

```
GET    /vendors
GET    /vendors/:vendorCode
POST   /vendors
PATCH  /vendors/:vendorCode
```

Same patterns as articles.

---

## Sites

```
GET    /sites
GET    /sites/:siteCode
POST   /sites
PATCH  /sites/:siteCode
```

---

## Purchase Orders

### List / get

```
GET /purchase-orders
GET /purchase-orders/:poNumber
```

`GET :poNumber` returns **all line items** for that PO:

```json
{
  "data": {
    "PONumber": "4500000001",
    "VendorCode": "V1001",
    "SiteCode": "S100",
    "PODate": "2026-11-18",
    "Status": "Ordered",
    "items": [
      {
        "POItem": 10,
        "ArticleCode": "A10001",
        "Quantity": 100,
        "UoM": "EA",
        "NetPrice": 50,
        "Currency": "INR",
        "DeliveryDate": "2026-11-30"
      }
    ]
  }
}
```

### Create PO (header + lines)

```
POST /purchase-orders
```

```json
{
  "VendorCode": "V1001",
  "SiteCode": "S100",
  "PODate": "2026-11-18",
  "Status": "Ordered",
  "CreatedBy": "chatbot",
  "items": [
    {
      "ArticleCode": "A10001",
      "Quantity": 100,
      "UoM": "EA",
      "NetPrice": 50,
      "Currency": "INR",
      "DeliveryDate": "2026-11-30"
    }
  ]
}
```

Server assigns `PONumber` (and `POItem` 10, 20…) if omitted.  
Validates FKs and Active status before write.

### Update PO header fields (all lines of that PO)

```
PATCH /purchase-orders/:poNumber
```

```json
{ "Status": "Cancelled", "DeliveryDate": "2026-12-05" }
```

`DeliveryDate` on header patch can optionally cascade to all lines (document in implementation).

### Add / update line

```
POST   /purchase-orders/:poNumber/items
PATCH  /purchase-orders/:poNumber/items/:poItem
```

---

## Chat-facing facade (optional but useful)

Single endpoint so the bot does not juggle many REST calls:

```
POST /chat/actions
```

```json
{
  "action": "create_po",
  "slots": {
    "VendorCode": "V1001",
    "SiteCode": "S100",
    "items": [{ "ArticleCode": "A10001", "Quantity": 10 }]
  }
}
```

Supported `action` values: see `04-chatbot-flows.md`.

---

## Concurrency

- Serialize Excel writes with an in-process mutex / queue.  
- Read may share file; write: open → mutate → save → close.  
- On save failure, return `503` with retry hint.

---

## Auth (MVP)

- Local: none or `x-api-key` header.  
- Production later: JWT / OAuth.

---

## Error example

```json
{
  "error": {
    "code": "FK_VENDOR_NOT_FOUND",
    "message": "VendorCode V9999 does not exist or is Inactive",
    "details": { "field": "VendorCode", "value": "V9999" }
  }
}
```

Error codes to implement early: `VALIDATION_ERROR`, `DUPLICATE_KEY`, `FK_*_NOT_FOUND`, `PO_LOCKED_STATUS`, `WORKBOOK_BUSY`.
