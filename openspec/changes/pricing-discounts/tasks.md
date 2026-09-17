# Tasks — pricing-discounts

## Task 1: Create `app/src/discounts.ts`
- [ ] Export `PriceBreakdown` interface
- [ ] Export `priceOrder(order, coupons, now?)` function
- [ ] Implement tier discount (REQ-TIER)
- [ ] Implement coupon validation: expired (REQ-EXPIRED), minSubtotal (REQ-MIN-SUBTOTAL)
- [ ] Implement coupon discount calculation (REQ-COUPON-PERCENT, REQ-COUPON-FIXED, REQ-COUPON-SCOPE)
- [ ] Implement scope-winner logic (REQ-MULTI-COUPON)
- [ ] Implement deduplication (REQ-DEDUP)
- [ ] Implement floor at 0 (REQ-FLOOR)
- [ ] Apply Math.round per step (REQ-ROUNDING)

## Task 2: Write tests `app/src/discounts.test.ts`
- [ ] AC-1: Gold tier 10% on 1 000 грн
- [ ] AC-2: Expired coupon silently ignored
- [ ] AC-3: Two coupons on same category — best wins
- [ ] AC-4: Discount exceeds subtotal — floor at 0 (boundary)
- [ ] AC-5: Category coupon base = category subtotal
- [ ] AC-6: minSubtotalKopecks checked before discounts
- [ ] AC-7: Sequential tier + global coupon
- [ ] AC-8: Fixed coupon, no restrictions
- [ ] AC-9: Empty order — all zeros (boundary)
- [ ] AC-10: Half-kopeck rounds up (boundary)
- [ ] AC-11: Duplicate coupon code — applied once
- [ ] AC-12: minSubtotal not met — coupon skipped

## Task 3: Update `app/src/index.ts`
- [ ] Re-export `PriceBreakdown` type and `priceOrder` function

## Task 4: Verify
- [ ] `npm test` — all 20 tests green (8 existing + 12 new)
- [ ] `npm run typecheck` — no errors
