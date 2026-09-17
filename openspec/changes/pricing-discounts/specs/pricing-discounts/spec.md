# Capability: pricing-discounts

Discount engine for applying loyalty-tier and promotional-coupon discounts to
an order, returning a full price breakdown.

## Requirements

### REQ-TIER: Loyalty tier discount
The system MUST compute a tier discount as
`Math.round(subtotal × tierPercent / 100)` where `tierPercent` comes from the
existing `tierPercent()` function (Silver 5%, Gold 10%, none 0%).

### REQ-COUPON-PERCENT: Percentage coupon
A coupon with `kind: "percent"` MUST discount by
`Math.round(base × value / 100)` where base depends on scope (REQ-COUPON-SCOPE).

### REQ-COUPON-FIXED: Fixed-amount coupon
A coupon with `kind: "fixed"` MUST discount by `min(value, base)`, capped at
the relevant base to prevent over-discounting.

### REQ-COUPON-SCOPE: Coupon scope
- Category coupon: base = sum of line totals for items matching `coupon.category`.
- Global coupon (no category): base = subtotal minus tier discount (sequential).

### REQ-STACKING: Sequential stacking
Tier discount is applied first (on subtotal). Global coupons operate on the
post-tier remainder. Category coupons operate on their category subtotal.

### REQ-MULTI-COUPON: Multiple coupons
All valid coupons apply, but at most one per scope (one global + one per
category). When two compete in the same scope, the one yielding the larger
discount in kopecks wins.

### REQ-EXPIRED: Expired coupon handling
A coupon whose `expiresAt ≤ now` MUST be silently skipped and reported in
`skippedCoupons` with reason `"expired"`.

### REQ-MIN-SUBTOTAL: Minimum subtotal gate
`minSubtotalKopecks` is checked against the **original** subtotal (before any
discounts). If not met, the coupon is skipped with reason
`"min-subtotal-not-met"`.

### REQ-FLOOR: Non-negative subtotal
The discounted subtotal MUST NOT go below 0. Shipping is added on top.

### REQ-ROUNDING: Rounding policy
`Math.round` (half-up) at each discount calculation step.

### REQ-DEDUP: Duplicate coupon codes
Duplicate codes in `order.coupons` are deduplicated; each code applies at most
once.

### REQ-EMPTY: Empty order
An order with no items yields all-zero breakdown.

## Scenarios

### SC-1: Gold tier, no coupons
GIVEN subtotal = 100 000 kop, tier = gold
THEN tierDiscount = 10 000, total = 90 000 + shipping

### SC-2: Expired coupon ignored
GIVEN coupon expiresAt in the past
THEN couponDiscount = 0, coupon in skippedCoupons

### SC-3: Two category coupons — best wins
GIVEN two coupons on "fresh" (10% and 20%), fresh subtotal = 20 000
THEN 20% applied (4 000 kop), 10% skipped

### SC-4: Discount exceeds subtotal — floor at 0
GIVEN subtotal = 5 000, gold tier (500 kop), fixed coupon 10 000
THEN total = 0 + shipping

### SC-5: Sequential stacking
GIVEN subtotal = 100 000, gold (10 000 off), global 15%
THEN coupon = 15% of 90 000 = 13 500, total = 76 500 + shipping
