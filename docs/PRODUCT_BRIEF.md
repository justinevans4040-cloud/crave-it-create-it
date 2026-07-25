# Product Brief — Mobile Kitchen Route Platform

## Working brand

**Crave It, I Create It** is a placeholder identity built from the vendor’s own phrase. The final business name, logo, legal entity, contact information, and exact menu still need confirmation.

## Product promise

Customers can open the website or app and immediately answer four questions:

1. Which mobile kitchen is closest?
2. What does that specific vehicle have left?
3. Can I meet it, or can it drop off while it is nearby?
4. What is the family and creative story behind the food?

## Customer surfaces

- Home: nearest vehicle, current route status, popular items
- Trucks: card view for every vehicle, zone, last known location, ETA, live inventory
- Menu: classic tamales, street corn, and current specialty items
- Order: pickup or nearby drop-off, contact information, item reservation
- Concept Lab: submit unusual tamal ideas
- Story: family recipe, grandmother, staff, quotes, catering or booking

## Operator surfaces planned next

- Driver mode: start/stop route, GPS sharing, stock deduction, order queue
- Kitchen mode: prepare batch, assign stock to vehicles, transfer stock between vehicles
- Owner dashboard: all vehicle inventory, sales totals, route performance, low-stock alerts
- Admin content: menu, prices, photos, story, quotes, service zones

## Core domain model

- Vehicle — a moving point of sale with its own route, status, and delivery radius
- Product — a sellable menu or Concept Lab item
- Inventory — quantity of a product physically assigned to one vehicle
- Location update — timestamped GPS coordinate and human-readable area
- Order — reservation tied to one vehicle and one fulfillment method
- Inventory movement — auditable stock assignment, sale, transfer, spoilage, or correction

## Safety and privacy requirements

- Do not expose a private home kitchen address publicly.
- Driver location sharing must be explicit and automatically stop when a route ends.
- Public location should be rounded or delayed when needed for driver safety.
- Phone numbers and delivery addresses must be protected and removed from public views.
- Payment and tax details should be handled by a compliant processor rather than stored directly.
