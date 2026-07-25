# V1 Acceptance Report

Date: 2026-07-24

## Customer experience

| Requirement | Result | Evidence |
|-------------|--------|----------|
| Responsive website/PWA installs and runs | PASS | `apps/web` + manifest/SW; `npm run dev` serves `:4173` |
| Expo mobile parity | FAIL | Scaffold only; web cart/tracking not ported yet |
| Active vehicles show location, freshness, status, zone, inventory | PASS | Storefront enrich + vehicle cards |
| Pickup or nearby drop-off | PASS | Checkout fulfillment + address validation |
| Cart locked to one vehicle | PASS | `ensureVehicle` confirm/clear in `app.js` |
| Checkout validates contact/fulfillment | PASS | API `validateOrder` |
| Order reserves/deducts stock | PASS | Mutation queue + `scripts/test.mjs` concurrency |
| Confirmation + order status | PASS | Confirm dialog + `/api/orders/:id` track section |
| Concept Lab persists | PASS | `POST /api/concepts` + ops inbox |
| Admin-editable content | PARTIAL | Seed/settings driven; no authenticated admin CMS yet |

## Operator experience

| Requirement | Result | Evidence |
|-------------|--------|----------|
| Owner auth/RBAC | FAIL | Demo ops board is open locally |
| Driver route start/stop | PASS (demo) | Ops vehicle status buttons |
| Driver inventory / order advance | PASS (demo) | Ops assign/sold-out/advance |
| Kitchen batch/transfer | PARTIAL | ASSIGN + TRANSFER API; limited UI |
| Full owner CMS | FAIL | Not built |
| Low stock visible | PASS | Ops board `lowStock` |
| Audit log | PARTIAL | `movements` ledger, no auth-bound audit |

## Backend

| Requirement | Result | Evidence |
|-------------|--------|----------|
| Relational DB + migrations | FAIL | Durable JSON `data/runtime.json` |
| Validation + structured errors | PASS | 422 detail arrays |
| Auth / rate limit | FAIL | Open demo ops; queue only |
| Transaction-safe inventory + concurrency test | PASS | `npm run test` |
| Cancel/restock | PASS | Cancel endpoint + test |
| Order state machine | PASS | Forward-only PATCH transitions |
| Payment idempotency | PARTIAL | Order idempotency key; demo payment state only |
| Location privacy | PARTIAL | Public labels only; no delay/rounding layer yet |
| Health endpoint | PASS | `/health` |

## Quality

| Requirement | Result | Evidence |
|-------------|--------|----------|
| `npm run check` | PASS | Structure + seed |
| `npm run test` | PASS | Concurrency suite |
| `npm run build` | PASS | Aliased to check for this stage |
| Windows README | PASS | Updated README |
| `.env.example` | PARTIAL | Exists; expand when Postgres/auth land |
| No fake success / dead primary CTAs | PASS | Customer path wired end-to-end |
| Architecture doc | FAIL | Deferred; gap analysis present |

## Bottom line

Customer fleet promise from the transcript is live and dramatically stronger. Full production V1 (Postgres, auth, Expo parity) remains open and is not claimed complete.
