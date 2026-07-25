# API

Base: `http://localhost:8788`

## Public

| Method | Path | Notes |
|--------|------|-------|
| GET | `/health` | Liveness |
| GET | `/api/storefront?lat=&lng=` | Brand, vehicles (+distance), products, inventory |
| POST | `/api/orders` | Multi-item order; header `Idempotency-Key` optional |
| GET | `/api/orders/:id` | Order tracking |
| GET | `/api/orders?phone=` | Lookup by phone suffix |
| POST | `/api/orders/:id/cancel` | Cancel + restock |
| POST | `/api/concepts` | Concept Lab idea |

### Create order body

```json
{
  "vehicleId": "truck-sunrise",
  "customerName": "Alex",
  "customerPhone": "7025550100",
  "fulfillment": "PICKUP",
  "deliveryAddress": "optional for DROP_OFF",
  "notes": "",
  "items": [{ "productId": "tamal-red-chile", "quantity": 2 }]
}
```

## Ops (local demo, unprotected)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/ops/board` | Vehicles, orders, concepts, movements, low stock |
| PATCH | `/api/ops/vehicles/:id` | Status / location |
| POST | `/api/ops/inventory/adjust` | ASSIGN, TRANSFER, SPOILAGE, CORRECTION, SOLD_OUT |
| PATCH | `/api/ops/orders/:id` | Advance status forward |
| POST | `/api/ops/reset-demo` | Reload seed into runtime |
