# Version 1 Acceptance Checklist

Cursor must copy this checklist into `docs/V1_ACCEPTANCE_REPORT.md` and mark each item PASS, FAIL, or BLOCKED with exact evidence.

## Customer experience

- [ ] Responsive website/PWA installs and runs.
- [ ] Expo mobile app starts and supports the main customer journey.
- [ ] Active vehicles display approximate location, freshness timestamp, status, service zone, and per-vehicle inventory.
- [ ] Customer can choose pickup or eligible nearby delivery.
- [ ] Cart is locked to one vehicle and explains vehicle changes.
- [ ] Checkout validates customer and fulfillment details.
- [ ] Successful order safely reserves/deducts stock.
- [ ] Customer receives confirmation and can view order status.
- [ ] Concept Lab submissions persist.
- [ ] Menu, story, catering, and business content are admin editable.

## Operator experience

- [ ] Owner/admin authentication and permissions work.
- [ ] Driver route start/stop and consent-based location sharing work.
- [ ] Driver can update status, inventory availability, and order status.
- [ ] Kitchen can create batches, assign/transfer stock, and record corrections/spoilage.
- [ ] Owner can manage vehicles, products, pricing, service zones, hours, users, settings, and content.
- [ ] Low-stock and operational states are visible.
- [ ] Audit records exist for sensitive changes.

## Backend

- [ ] Persistent relational database with migrations and deterministic seed data.
- [ ] Server-side validation and structured errors.
- [ ] Authentication, RBAC, rate limiting, and protected private endpoints.
- [ ] Transaction-safe inventory and passing concurrency test.
- [ ] Order cancellation/restock behavior is tested.
- [ ] Order state transitions are validated.
- [ ] Payment operations are idempotent and demo mode works without credentials.
- [ ] Public location privacy and driver consent controls work.
- [ ] Health and readiness endpoints work.

## Quality

- [ ] Root `npm run check` passes.
- [ ] Root `npm run test` passes.
- [ ] Root `npm run build` passes.
- [ ] README contains Windows-first setup and demo credentials.
- [ ] `.env.example` documents every setting.
- [ ] No dead buttons, fake success states, unimplemented routes, or hidden runtime errors.
- [ ] `docs/V1_ARCHITECTURE.md` and `docs/V1_ACCEPTANCE_REPORT.md` are complete.
