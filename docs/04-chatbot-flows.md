# 04 — Chatbot Flows (P2P in one window)

## Design principle

Chat = **business intent + slots** (flexible NLU in `src/chat/nlu.js`).  
Excel writes always go through APIs (never invent rows without validation).

Flow:

```
User message → Business NLU → Slot fill / confirm → API call → Natural language reply
```

If the request is outside this project's P2P scope, reply honestly: **I don't know**.

---

## Intent catalog

| Intent ID | User says (examples) | API |
|-----------|----------------------|-----|
| `help` | “what can you do?” | — |
| `list_articles` | “show articles”, “list active materials” | `GET /articles` |
| `get_article` | “details of A10001” | `GET /articles/A10001` |
| `create_article` | “create article …” | `POST /articles` |
| `update_article` | “set A10001 price to 55” | `PATCH /articles/...` |
| `list_vendors` | “list vendors” | `GET /vendors` |
| `get_vendor` | “vendor V1001” | `GET /vendors/...` |
| `create_vendor` | “add vendor …” | `POST /vendors` |
| `update_vendor` | “deactivate vendor V1001” | `PATCH /vendors/...` |
| `list_sites` | “list sites / plants” | `GET /sites` |
| `get_site` | “site S100” | `GET /sites/...` |
| `create_site` | “add site …” | `POST /sites` |
| `update_site` | “rename site S100 to …” | `PATCH /sites/...` |
| `create_po` | “create PO for vendor V1001 site S100 article A10001 qty 100” | `POST /purchase-orders` |
| `get_po` | “show PO 4500000001” | `GET /purchase-orders/...` |
| `list_pos` | “open POs for vendor V1001” | `GET /purchase-orders?vendor=` |
| `update_po_status` | “cancel PO 4500000001” | `PATCH /purchase-orders/...` |
| `update_po_line` | “change qty on PO … item 10 to 80” | `PATCH .../items/...` |
| `add_po_line` | “add line to PO … article A10002 qty 5” | `POST .../items` |

---

## Create PO — happy path (script)

1. **User:** Create a PO for vendor V1001 at site S100, article A10001, quantity 100, price 50, delivery 30-Nov-2026.  
2. **Bot:** Confirms slots (missing currency → default from vendor).  
3. **Bot:** “Confirm create PO?” → User: Yes.  
4. **API:** `POST /purchase-orders`  
5. **Bot:** “PO **4500000001** created. 1 line. Status Ordered.”

### Required slots for `create_po`

| Slot | Required | Default |
|------|----------|---------|
| VendorCode | Yes | — |
| SiteCode | Yes | — |
| items[].ArticleCode | Yes | — |
| items[].Quantity | Yes | — |
| items[].NetPrice | No | Article.BasePrice |
| items[].UoM | No | Article.UoM |
| items[].Currency | No | Vendor.Currency |
| items[].DeliveryDate | Yes | — |
| PODate | No | today |
| Status | No | `Ordered` |

Ask only for missing required slots (multi-turn).

---

## Confirmation policy

| Action | Confirm before write? |
|--------|------------------------|
| Create / update master | Yes if LLM-parsed; No if structured form |
| Create PO | **Always** |
| Cancel PO | **Always** |
| Read / list | No |

---

## Sample dialogues

### Master maintain

```
User: Add vendor V2001 name Acme Supplies country IN currency INR
Bot: Ready to create Vendor V2001 – Acme Supplies (IN, INR, Active). Confirm?
User: Yes
Bot: Vendor V2001 created.
```

### Display PO

```
User: Show PO 4500000001
Bot: PO 4500000001 | Vendor V1001 | Site S100 | Status Ordered | Date 2026-11-18
     Item 10 | A10001 | Qty 100 EA @ 50 INR | Delivery 2026-11-30
```

### Change

```
User: Cancel PO 4500000001
Bot: This will set Status=Cancelled for all lines. Confirm?
User: Confirm
Bot: PO 4500000001 cancelled.
```

---

## SAP MM analogy (what the user “feels”)

| Chat intent | SAP-ish TCode feel |
|-------------|--------------------|
| create_article / vendor / site | MM01 / XK01 / plant maintain (toy) |
| create_po | ME21N |
| get_po / list_pos | ME23N / ME2N |
| update_po_* | ME22N |

Goods receipt / invoice stay for later phases (`07-roadmap.md`).

---

## Guardrails

- Never invent Article/Vendor/Site codes that fail FK checks — propose “create master first”.  
- On validation error, reply with field-level fix hint.  
- Log every write: timestamp, intent, payload, PO/master key.
