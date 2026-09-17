import type { Order, Coupon, LineItem } from "./types.js";
import {
  subtotalKopecks,
  shippingKopecks,
  tierPercent,
  lineTotalKopecks,
} from "./pricing.js";

export interface PriceBreakdown {
  subtotalKopecks: number;
  tierDiscountKopecks: number;
  couponDiscountKopecks: number;
  shippingKopecks: number;
  totalKopecks: number;
  appliedCoupons: string[];
  skippedCoupons: Array<{ code: string; reason: string }>;
}

function categorySubtotalKopecks(
  order: Order,
  category: LineItem["category"],
): number {
  return order.items
    .filter((i) => i.category === category)
    .reduce((sum, i) => sum + lineTotalKopecks(i), 0);
}

function isCouponExpired(coupon: Coupon, now: Date): boolean {
  return new Date(coupon.expiresAt) <= now;
}

function calcCouponDiscount(
  coupon: Coupon,
  order: Order,
  afterTier: number,
): number {
  if (coupon.category) {
    const base = categorySubtotalKopecks(order, coupon.category);
    if (coupon.kind === "percent") {
      return Math.round((base * coupon.value) / 100);
    }
    return Math.min(coupon.value, base);
  }

  if (coupon.kind === "percent") {
    return Math.round((afterTier * coupon.value) / 100);
  }
  return Math.min(coupon.value, afterTier);
}

export function priceOrder(
  order: Order,
  coupons: Coupon[],
  now: Date = new Date(),
): PriceBreakdown {
  const subtotal = subtotalKopecks(order);
  const shipping = shippingKopecks(order);
  const tierPct = tierPercent(order);
  const tierDiscount = Math.round((subtotal * tierPct) / 100);
  const afterTier = subtotal - tierDiscount;

  const couponMap = new Map<string, Coupon>();
  for (const c of coupons) {
    couponMap.set(c.code, c);
  }

  const seen = new Set<string>();
  const uniqueCodes: string[] = [];
  for (const code of order.coupons) {
    if (!seen.has(code)) {
      seen.add(code);
      uniqueCodes.push(code);
    }
  }

  const appliedCoupons: string[] = [];
  const skippedCoupons: Array<{ code: string; reason: string }> = [];

  type ScopeKey = string;
  const scopeWinners = new Map<
    ScopeKey,
    { coupon: Coupon; discount: number }
  >();

  for (const code of uniqueCodes) {
    const coupon = couponMap.get(code);
    if (!coupon) {
      skippedCoupons.push({ code, reason: "unknown-code" });
      continue;
    }

    if (isCouponExpired(coupon, now)) {
      skippedCoupons.push({ code, reason: "expired" });
      continue;
    }

    if (
      coupon.minSubtotalKopecks !== undefined &&
      subtotal < coupon.minSubtotalKopecks
    ) {
      skippedCoupons.push({ code, reason: "min-subtotal-not-met" });
      continue;
    }

    const discount = calcCouponDiscount(coupon, order, afterTier);
    const scopeKey = coupon.category ?? "__global__";

    const existing = scopeWinners.get(scopeKey);
    if (!existing || discount > existing.discount) {
      if (existing) {
        skippedCoupons.push({
          code: existing.coupon.code,
          reason: "less-favorable",
        });
      }
      scopeWinners.set(scopeKey, { coupon, discount });
    } else {
      skippedCoupons.push({ code, reason: "less-favorable" });
    }
  }

  let totalCouponDiscount = 0;
  for (const [, { coupon, discount }] of scopeWinners) {
    appliedCoupons.push(coupon.code);
    totalCouponDiscount += discount;
  }

  const discountedSubtotal = Math.max(
    0,
    subtotal - tierDiscount - totalCouponDiscount,
  );

  return {
    subtotalKopecks: subtotal,
    tierDiscountKopecks: tierDiscount,
    couponDiscountKopecks: totalCouponDiscount,
    shippingKopecks: shipping,
    totalKopecks: discountedSubtotal + shipping,
    appliedCoupons,
    skippedCoupons,
  };
}
