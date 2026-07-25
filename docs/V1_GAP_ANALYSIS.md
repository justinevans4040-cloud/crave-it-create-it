# V1 Gap Analysis

Inspected 2026-07-24 against `CURSOR_START_HERE.md` and the original voice transcript.

## What already works

- Vanilla web PWA on `:4173` with trucks / menu / concept / story sections
- Node fleet API on `:8787` with storefront + order placement
- Mutation queue + atomic JSON persist for inventory deduction
- Seeded Las Vegas vehicles, classics, street corn, Concept Lab items
- Expo mobile scaffold with shared contracts package

## Core product truth (from transcript)

Customers must see **which cars are out**, **how many tamales each has**, **what side of town**, and as sales happen **stock deducts per truck**. Nearby drop-off while the route is in the area. Concept: *you crave it, I create it* — any idea becomes a tamal.

## Biggest gaps before this upgrade

| Area | Gap |
|------|-----|
| Customer cart | Single-item dialog only; no vehicle-locked multi-item cart |
| Live feel | Static seed timestamps; no polling / nearest-truck UX |
| Concept Lab | LocalStorage only; not on API |
| Order tracking | No confirmation surface or status lookup |
| Operator | No driver/kitchen/owner surfaces |
| Persistence | JSON file, not relational DB / migrations |
| Auth / RBAC | None |
| Tests | Check script only; no inventory concurrency test |
| Mobile | Scaffold only; not parity with web |

## Upgrade strategy (this pass)

1. Harden API: multi-item orders, concept submissions, order lookup, inventory ledger, cancel/restock, demo ops endpoints.
2. Rebuild customer web into a real neighborhood food app: nearest kitchen, live inventory, vehicle-locked cart, checkout, tracking, Concept Lab persistence.
3. Add a demo operator board (`/ops.html`) for route/stock/order advancement without requiring cloud credentials.
4. Keep demo mode zero-secrets. Defer Postgres + real auth to the next persistence pass without blocking local V1 customer flow.
