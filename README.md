# Crave It, I Create It

Standalone mobile kitchen fleet site for a Las Vegas tamale / street-corn business.

**Core idea:** every truck is its own moving kitchen with live inventory. Customers see where it is, what’s left, and reserve pickup or nearby drop-off. Sales deduct that truck’s stock. Concept Lab: *you crave it, I create it.*

## Live / production

```bash
npm start
```

Serves the customer site, driver board, ops board, and API on one port (`PORT`, default `4173`).

Deploy: connect this repo to [Render](https://render.com) (Blueprint uses `render.yaml`) or any Node host with:

- Build: `npm install`
- Start: `npm start`
- Env: `OPS_ALLOW_REMOTE=1`, `OPS_TOKEN=<secret>`

## Local development

```bash
npm run dev
```

- Customer PWA: http://localhost:4173
- Driver: http://localhost:4173/driver.html
- Ops: http://localhost:4173/ops.html
- API: http://localhost:8788/health

Windows: double-click `START-WINDOWS.bat`.

## What works

- Live fleet map + nearest-truck sorting
- Per-vehicle inventory with refresh
- Vehicle-locked cart + checkout + order tracking
- Concept Lab submissions
- Driver POS (orders / stock / GPS ping)
- Demo ops board
- Installable PWA (iPhone + Android)

```bash
npm run check
npm run test
```

## Layout

```text
apps/web         Customer + driver + ops PWA
apps/mobile      Expo scaffold
services/api     Fleet API
packages/contracts Shared types
data             Seed inventory
docs             Product notes
scripts/prod-server.mjs  Production all-in-one server
```
