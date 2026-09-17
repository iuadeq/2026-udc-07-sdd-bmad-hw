## Approach

Single new module `app/src/discounts.ts` exporting `priceOrder()` and
`PriceBreakdown`. Consumes existing `subtotalKopecks`, `shippingKopecks`,
`tierPercent`, and `lineTotalKopecks` from `pricing.ts` without altering them.

## Key decisions

1. **Coupon lookup**: `priceOrder` takes a `Coupon[]` catalogue — the caller
   resolves codes from `order.coupons` against this catalogue.
2. **Scope keying**: category coupons keyed by `coupon.category`, global coupons
   by a sentinel `"__global__"`. One winner per key.
3. **Winner selection**: iterate codes in input order, track best-so-far per
   scope, replace if new discount is strictly larger.
4. **`now` injection**: optional `Date` parameter (default `new Date()`) for
   deterministic test control of expiration checks.

## Data flow

```
order.items  ──► subtotalKopecks ─┬─► tierDiscount = round(subtotal × tier%)
                                  │
order.coupons ─► dedupe ─► lookup ─► validate (expired? minSubtotal?)
                                     │
                              ┌──────┘
                              ▼
                     calcDiscount per coupon
                     scope-winner selection
                              │
                              ▼
            discountedSubtotal = max(0, subtotal − tier − coupons)
            total = discountedSubtotal + shipping
```

## Alternatives considered

- **Additive stacking**: simpler but gives larger-than-expected discounts.
  Rejected per spec decision D-1.
- **Proportional tier distribution across categories**: complex with no visible
  user benefit. Category coupons use original category subtotal instead.
