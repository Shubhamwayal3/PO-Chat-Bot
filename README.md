# PO Cycle Chatbot — Project Startup Kit

Replicate a simplified **SAP MM Procure-to-Pay (P2P)** flow in a single chatbot window, backed by one Excel workbook (masters + purchase orders) and REST APIs for read / create / update.

---

## Decision (Excel layout)

**One Excel file with 5 sheets** (not separate files).

| Reason | Detail |
|--------|--------|
| Single source of truth | Business user opens one file; chatbot and APIs share the same store |
| Referential checks | PO can validate Article / Vendor / Site in the same workbook |
| Simpler ops | One path, one lock strategy, one backup |
| Fits scope | Max ~10 columns per sheet; demo / MVP volume |

Separate files later only if concurrency, size, or multi-team ownership becomes a problem.

**Workbook path (suggested):** `data/PO_Cycle_Master.xlsx`

**Sheets:**

1. `ArticleMaster` — material / article master  
2. `VendorMaster` — supplier master  
3. `SiteMaster` — plant / site master  
4. `PurchaseOrder` — transactional PO header + line (flat rows)  
5. `Stock` — on-hand qty by Article + Site (updated only on Goods Receipt)

---

## Startup kit index

| File | Purpose |
|------|---------|
| [docs/00-decisions.md](docs/00-decisions.md) | Locked product/tech decisions |
| [docs/01-vision-and-scope.md](docs/01-vision-and-scope.md) | Purpose, goals, in/out of scope, persona |
| [docs/02-excel-data-model.md](docs/02-excel-data-model.md) | Sheet columns, keys, sample rows, validation rules |
| [docs/03-api-design.md](docs/03-api-design.md) | REST endpoints for read / create / update |
| [docs/04-chatbot-flows.md](docs/04-chatbot-flows.md) | Conversational intents mapped to P2P steps |
| [docs/05-architecture.md](docs/05-architecture.md) | Components, tech choices, concurrency |
| [docs/06-project-structure.md](docs/06-project-structure.md) | Suggested folders and first files to create |
| [docs/07-roadmap.md](docs/07-roadmap.md) | Phased build plan (MVP → enrich) |
| [docs/api/openapi-sketch.md](docs/api/openapi-sketch.md) | Endpoint sketch + request/response shapes |
| [docs/samples/sample-rows.md](docs/samples/sample-rows.md) | Seed data for all four sheets |

---

## Quick start

```bash
npm install
npm run seed
npm start
```

- API: `http://localhost:3000/api/v1/health`  
- Chat UI: `http://localhost:3000`  
- Workbook: `data/PO_Cycle_Master.xlsx`

Dev mode (auto-restart): `npm run dev`

Stack: **Node.js + Express + exceljs + zod** (see `docs/00-decisions.md`).

---

## SAP MM mapping (simplified)

| SAP concept | This project |
|-------------|--------------|
| Material Master | Article Master sheet |
| Vendor Master | Vendor Master sheet |
| Plant / Site | Site Master sheet |
| Purchase Order (ME21N) | Purchase Order sheet (create / change via chat) |
| Display PO (ME23N) | Chat: “show PO …” |
| Goods Receipt / Invoice | Out of MVP (roadmap Phase 3+) |

---

## Suggested stack (default)

- **Backend:** Node.js (Express/Fastify) *or* Python (FastAPI)  
- **Excel:** `exceljs` (Node) *or* `openpyxl` (Python)  
- **Chat UI:** simple web chat or Teams/WhatsApp adapter later  
- **LLM (optional):** intent parsing + slot filling; deterministic API still owns writes  

Final stack choice is documented in `docs/05-architecture.md`.
