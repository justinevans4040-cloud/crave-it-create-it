# Hostile Audit — Crave It, I Create It (2026-07-24)

Subagents were usage-blocked. Audit + babysit fixes done in-process.

## Verdict

**Not production-ready.** Core fleet promise holds after P0 lockdown. Demo-local only.

## Findings

| Sev | Finding | Status |
|-----|---------|--------|
| P0 | `GET /api/orders` dumped all orders with full PII | **FIXED** — phone required; responses redacted |
| P0 | `/api/ops/*` open to anyone on the network | **FIXED** — `x-ops-token` + localhost-only + API binds `127.0.0.1` |
| P0 | Public storefront exposed exact GPS | **FIXED** — fuzzed `mapLatitude`/`mapLongitude` only |
| P1 | CORS `*` | **FIXED** — allowlist localhost:4173 |
| P1 | Order track by ID alone (enumeration) | **FIXED** — phone required |
| P1 | Cancel without proof of ownership | **FIXED** — phone or ops token |
| P2 | No rate limits on order/concept POST | **FIXED** — basic IP buckets |
| P2 | Expo mobile not at web parity | OPEN |
| P2 | JSON file store, not Postgres | OPEN |
| P3 | Default ops token is demo-known | Acceptable for local; change via `OPS_TOKEN` |

## Babysit note

No git remote / PR exists, so GitHub babysit does not apply. Loop = audit → fix P0/P1 → retest until green.

## Re-verify commands

```bash
npm run check
npm run test
```

Manual: open storefront without auth token; ops board without token must 401; order list without phone must 400.
