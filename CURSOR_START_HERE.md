# CURSOR — BUILD VERSION 1

You are working inside the existing **Crave It, I Create It** monorepo. Build a complete, locally runnable Version 1 of the website, mobile app, API, database, and operator tools.

## Non-negotiable instruction

Do **not** discard this scaffold, replace it with a generic template, or reduce the product to a menu/landing page. Inspect every existing file first, preserve working behavior, and evolve the current codebase in place.

The product is a mobile food-fleet platform. Every vehicle is an independent moving point of sale with its own public route status, approximate location, live inventory, delivery radius, and order queue. Customer orders must reserve and deduct inventory from the selected vehicle safely. The brand concept includes family recipes and a custom-food concept called **“You crave it, I create it.”**

The original transcript is at `docs/source/original-voice-transcript.txt`.

## Version 1 outcome

Deliver a production-candidate application that runs in demo mode without paid credentials and can be connected to real providers through environment variables.

### Customer website/PWA

Build a polished, mobile-first website with:

1. Home screen with active vehicle cards, nearest-vehicle prompt, featured products, route status, and clear ordering actions.
2. Fleet map and list showing approximate locations, last-updated time, service zone, ETA, current inventory, and whether pickup or delivery is available.
3. Menu grouped by classics, street corn, specials, desserts, bundles, and custom creations.
4. Cart tied to one selected vehicle. Prevent accidental mixed-vehicle carts.
5. Checkout for pickup or nearby drop-off with customer contact, address, notes, taxes/fees, order summary, and payment state.
6. Order confirmation and order-status tracking.
7. Concept Lab where customers can submit unusual tamal ideas.
8. Story/about section for family history, recipes, quotes, catering, and booking.
9. Installable PWA behavior, offline shell, responsive layouts, loading states, empty states, validation, accessible controls, and useful error messages.

### Native mobile app

Upgrade the Expo app so it offers the same primary customer journey as the website:

- Home
- Vehicles/map
- Menu
- Cart/checkout
- Order tracking
- Concept Lab
- Story/account

Use shared domain contracts and shared validation where practical. Keep platform-specific UI idiomatic. The app must start with one documented command.

### Operator portal

Create responsive role-based operator screens:

- **Owner/Admin:** manage products, prices, photos, service zones, operating hours, vehicles, users, taxes/fees, story content, custom requests, orders, and reporting.
- **Driver:** start/stop route, opt into location sharing, update vehicle status, see assigned inventory, mark items sold out, accept/advance orders, and stop public location sharing when the route ends.
- **Kitchen:** create batches, assign stock to vehicles, transfer stock between vehicles, record spoilage/corrections, and see low-stock alerts.

### Backend and data

Replace the JSON runtime store with a persistent relational database while retaining seed/demo data.

Required domain records:

- users and roles
- customers
- vehicles
- vehicle locations
- service zones
- products and product options
- vehicle inventory
- inventory movements
- carts
- orders and order items
- payments
- route sessions
- custom concept requests
- content/settings
- audit log

Required behavior:

1. Authentication and role-based authorization.
2. Database migrations and deterministic seed data.
3. Transaction-safe stock reservation and deduction. Never oversell under concurrent orders.
4. Idempotent order creation and payment webhook handling.
5. Order state machine: pending, accepted, preparing, ready, en_route, completed, cancelled, refunded.
6. Inventory ledger for assignment, sale, transfer, spoilage, return, and correction.
7. Public location privacy: approximate or delayed coordinates; never expose a private kitchen/home address.
8. Driver consent and automatic location-sharing shutdown at route end.
9. Server-side validation, structured errors, rate limiting, request logging, and health endpoints.
10. Demo adapters for maps, payments, SMS, push, and email so local V1 works without secrets.
11. Provider interfaces and environment variables for real services. Do not hard-code credentials.

## Recommended implementation approach

Keep the monorepo. Prefer TypeScript across new code. Use a maintained Postgres-compatible ORM and migration system. The local development path may use Docker Compose or a documented local database, but one command must start the full demo environment.

Do not make external services mandatory for local operation. Implement provider adapters:

- `demo` provider: deterministic local behavior
- `production` provider: enabled only when credentials exist

Use the existing API behavior as the compatibility baseline. Update `docs/API.md` with the final routes and examples.

## Visual direction

This is a real neighborhood food business, not a generic SaaS dashboard.

- Warm, bold Mexican street-food identity
- Deep chile red, roasted corn gold, crema white, charcoal, and restrained green accents
- Large food photography areas and highly visible inventory counts
- Vehicle cards should feel alive and easy to scan
- Clear pickup/delivery decisions
- Strong mobile hierarchy and large touch targets
- Rich visuals without clutter
- No lorem ipsum, generic startup copy, empty gray boxes, or tiny unreadable controls

Where final photos, logo, menu, prices, phone, and legal text are unknown, create admin-editable seeded content and clearly marked asset slots. Do not scatter placeholders through source code.

## Security and privacy

- Never store raw card details.
- Protect customer phone numbers and addresses.
- Do not expose admin/order endpoints publicly.
- Validate all inputs on the server.
- Use secure password/session handling.
- Add CSRF protection where relevant.
- Add rate limits to authentication, checkout, and public submission endpoints.
- Record security-sensitive admin actions in the audit log.
- Add `.env.example`; never commit secrets.

## Tests and quality gates

Create and run:

- unit tests for pricing, service-zone checks, order transitions, and inventory calculations
- integration tests for auth, order creation, inventory reservation, cancellation/restock, and role permissions
- a concurrency test proving the same stock cannot be sold twice
- web smoke tests for browse → cart → checkout → confirmation
- operator smoke tests for route start, inventory update, and order advancement
- type checking, linting, formatting, and production builds

The root commands must include at least:

```bash
npm run dev
npm run check
npm run test
npm run build
```

All four must be documented and pass before completion.

## Required final deliverables

1. Working web/PWA source.
2. Working Expo mobile source.
3. Working API and persistent database.
4. Owner/admin, driver, and kitchen interfaces.
5. Seeded demo accounts and data.
6. Database schema and migrations.
7. Automated tests.
8. Updated README with Windows-first setup instructions, plus Linux/macOS notes.
9. `.env.example` with every variable documented.
10. `docs/V1_ARCHITECTURE.md`.
11. `docs/V1_ACCEPTANCE_REPORT.md` listing every requirement as PASS, FAIL, or BLOCKED with exact evidence.
12. No placeholder buttons, dead routes, fake success messages, or unimplemented screens presented as complete.

## Execution order

1. Inspect and run the existing project.
2. Write a short gap analysis into `docs/V1_GAP_ANALYSIS.md`.
3. Establish the database, auth, and shared contracts.
4. Complete API and tests.
5. Complete customer website/PWA.
6. Complete operator portal.
7. Complete mobile app.
8. Run all quality gates and repair failures.
9. Produce the acceptance report.

Do not stop after scaffolding. Continue until the local Version 1 acceptance criteria pass or a genuinely external credential/business decision is the only blocker. External blockers must not prevent demo-mode completion.
