## Why

The checkout flow has loyalty tiers (Silver 5%, Gold 10%) that are computed
(`tierPercent`) but never applied, and no support for promotional coupons.
The autumn campaign needs both mechanisms active and working together so
customers see a real monetary benefit at checkout.

## What Changes

- Apply tier-level discounts to the order subtotal.
- Support percentage and fixed-amount promotional coupons, optionally
  restricted to a product category or gated by a minimum subtotal.
- Define stacking rules (tier first, then coupons) and rounding policy
  (Math.round per step).
- Expose a `priceOrder()` function that returns a full price breakdown.

## Capabilities

### New Capabilities
- `pricing-discounts`: Discount engine — tier discounts, coupon validation,
  stacking rules, rounding, and price breakdown calculation.

### Modified Capabilities
_(none — existing pricing functions are consumed, not changed)_

## Impact

- **New file:** `app/src/discounts.ts` (implementation) + `discounts.test.ts`
- **Modified:** `app/src/index.ts` (re-exports `priceOrder`, `PriceBreakdown`)
- **Unchanged:** `app/src/pricing.ts` signatures, `app/src/types.ts` shapes
- **No new runtime dependencies**
