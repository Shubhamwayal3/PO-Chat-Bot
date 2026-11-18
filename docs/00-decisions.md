# 00 — Key Decisions

Record product decisions here so implementation stays aligned.

## D1 — Storage layout

**Decision:** One Excel file (`PO_Cycle_Master.xlsx`) with **four sheets**.

**Alternatives rejected:** Separate `.xlsx` per master/transaction; database-first MVP.

**Why:** Single window for business users, simpler FK checks, fits small column/row MVP. Revisit if write contention or file size becomes painful (then keep API, swap store).

## D2 — PO shape

**Decision:** Flat line rows; header fields repeated per line; API groups by `PONumber`.

**Why:** Excel-native; no header/item sheet join for MVP.

## D3 — Write path

**Decision:** Chat never writes Excel directly. Always **API → Excel Service**.

**Why:** Validation, numbering, audit, lock in one place.

## D4 — Master column cap

**Decision:** Masters ≤ 10 columns. PO may exceed 10 for operational fields.

## D5 — Status model (PO)

Allowed: `Draft` | `Ordered` | `PartiallyReceived` | `Closed` | `Cancelled`

GR/IR sheets deferred to roadmap Phase 5.

## D6 — Stack

**Decision:** Node.js (ESM) + Express + exceljs + zod.

**Why:** Matches chat UI in JS, fast local API, `exceljs` handles xlsx well for MVP.

## D7 — Roles

**Decision:** Two roles selected at each page load / refresh (in-memory only):

| Role | Permissions |
|------|-------------|
| Associate | Read + Update only |
| Manager | Create + Read + Update |

**Enforcement:** UI hides/locks Create for Associate; API requires `X-User-Role` and blocks POST creates for Associate.
