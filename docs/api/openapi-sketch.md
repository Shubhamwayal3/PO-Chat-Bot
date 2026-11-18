# OpenAPI Sketch (informal)

Not a full OpenAPI YAML — use this as the contract while scaffolding. Convert to `openapi.yaml` when APIs stabilize.

## Servers

- `http://localhost:3000/api/v1`

## Tags

`Health`, `Articles`, `Vendors`, `Sites`, `PurchaseOrders`, `Chat`

---

## Endpoints summary

| Method | Path | Tag |
|--------|------|-----|
| GET | `/health` | Health |
| GET | `/articles` | Articles |
| GET | `/articles/{articleCode}` | Articles |
| POST | `/articles` | Articles |
| PATCH | `/articles/{articleCode}` | Articles |
| GET | `/vendors` | Vendors |
| GET | `/vendors/{vendorCode}` | Vendors |
| POST | `/vendors` | Vendors |
| PATCH | `/vendors/{vendorCode}` | Vendors |
| GET | `/sites` | Sites |
| GET | `/sites/{siteCode}` | Sites |
| POST | `/sites` | Sites |
| PATCH | `/sites/{siteCode}` | Sites |
| GET | `/purchase-orders` | PurchaseOrders |
| GET | `/purchase-orders/{poNumber}` | PurchaseOrders |
| POST | `/purchase-orders` | PurchaseOrders |
| PATCH | `/purchase-orders/{poNumber}` | PurchaseOrders |
| POST | `/purchase-orders/{poNumber}/items` | PurchaseOrders |
| PATCH | `/purchase-orders/{poNumber}/items/{poItem}` | PurchaseOrders |
| POST | `/chat/actions` | Chat |

---

## Shared schemas

### Article

```json
{
  "ArticleCode": "string",
  "ArticleDesc": "string",
  "UoM": "string",
  "MaterialGroup": "string|null",
  "BasePrice": "number",
  "Currency": "string",
  "Status": "Active|Inactive",
  "LeadTimeDays": "number|null",
  "CreatedOn": "date|null",
  "UpdatedOn": "date|null"
}
```

### Vendor

```json
{
  "VendorCode": "string",
  "VendorName": "string",
  "City": "string|null",
  "Country": "string",
  "PaymentTerms": "string|null",
  "Currency": "string",
  "ContactEmail": "string|null",
  "Status": "Active|Inactive",
  "CreatedOn": "date|null",
  "UpdatedOn": "date|null"
}
```

### Site

```json
{
  "SiteCode": "string",
  "SiteName": "string",
  "City": "string|null",
  "Region": "string|null",
  "Country": "string",
  "StorageLocation": "string|null",
  "Status": "Active|Inactive",
  "CreatedOn": "date|null",
  "UpdatedOn": "date|null",
  "Remarks": "string|null"
}
```

### PurchaseOrder (grouped)

```json
{
  "PONumber": "string",
  "VendorCode": "string",
  "SiteCode": "string",
  "PODate": "date",
  "Status": "Draft|Ordered|PartiallyReceived|Closed|Cancelled",
  "CreatedBy": "string|null",
  "UpdatedOn": "date|null",
  "items": [
    {
      "POItem": "number",
      "ArticleCode": "string",
      "Quantity": "number",
      "UoM": "string",
      "NetPrice": "number",
      "Currency": "string",
      "DeliveryDate": "date",
      "ASNNumber": "string|null",
      "ConfirmASNQty": "number",
      "GRQuantity": "number"
    }
  ]
}
```

### ChatActionRequest

```json
{
  "action": "create_po|get_po|update_po_status|create_article|...",
  "slots": { },
  "confirm": true
}
```

### Error

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {}
  }
}
```

---

## Query params (list endpoints)

| Param | Meaning |
|-------|---------|
| `status` | Filter Active/Inactive or PO status |
| `q` | Free-text search on code/name |
| `vendor` | PO filter |
| `site` | PO filter |
| `limit` | Default 50 |
| `offset` | Default 0 |
