import { describe, it, expect } from "vitest";
import { priceOrder } from "./discounts.js";
import type { Order, LineItem, Coupon } from "./types.js";

const NOW = new Date("2026-09-15T00:00:00Z");
const FUTURE = "2027-01-01T00:00:00Z";
const PAST = "2020-01-01T00:00:00Z";

const item = (over: Partial<LineItem> = {}): LineItem => ({
  sku: "AA-1",
  name: "Thing",
  unitPriceKopecks: 25_000,
  quantity: 1,
  category: "standard",
  ...over,
});

const order = (over: Partial<Order> = {}): Order => ({
  id: "o1",
  items: [item()],
  country: "UA",
  customerTier: "none",
  coupons: [],
  ...over,
});

describe("priceOrder — acceptance criteria", () => {
  it("AC-1: Gold tier 10% на 1 000 грн без промокодів", () => {
    const o = order({
      items: [item({ unitPriceKopecks: 100_000 })],
      customerTier: "gold",
    });
    const r = priceOrder(o, [], NOW);
    expect(r.subtotalKopecks).toBe(100_000);
    expect(r.tierDiscountKopecks).toBe(10_000);
    expect(r.couponDiscountKopecks).toBe(0);
    expect(r.totalKopecks).toBe(90_000 + r.shippingKopecks);
  });

  it("AC-2: прострочений промокод мовчки ігнорується", () => {
    const o = order({ coupons: ["AUTUMN15"] });
    const coupons: Coupon[] = [
      { code: "AUTUMN15", kind: "percent", value: 15, expiresAt: PAST },
    ];
    const r = priceOrder(o, coupons, NOW);
    expect(r.couponDiscountKopecks).toBe(0);
    expect(r.skippedCoupons).toEqual([
      { code: "AUTUMN15", reason: "expired" },
    ]);
    expect(r.appliedCoupons).toEqual([]);
  });

  it("AC-3: два промокоди на одну категорію — застосовується вигідніший", () => {
    const o = order({
      items: [item({ category: "fresh", unitPriceKopecks: 20_000 })],
      coupons: ["FRESH10", "FRESH20"],
    });
    const coupons: Coupon[] = [
      { code: "FRESH10", kind: "percent", value: 10, expiresAt: FUTURE, category: "fresh" },
      { code: "FRESH20", kind: "percent", value: 20, expiresAt: FUTURE, category: "fresh" },
    ];
    const r = priceOrder(o, coupons, NOW);
    expect(r.couponDiscountKopecks).toBe(4_000);
    expect(r.appliedCoupons).toEqual(["FRESH20"]);
    expect(r.skippedCoupons).toEqual([
      { code: "FRESH10", reason: "less-favorable" },
    ]);
  });

  it("AC-4: знижка перевищує суму — floor at 0 + доставка (граничний)", () => {
    const o = order({
      items: [item({ unitPriceKopecks: 5_000 })],
      customerTier: "gold",
      coupons: ["BIG"],
    });
    const coupons: Coupon[] = [
      { code: "BIG", kind: "fixed", value: 10_000, expiresAt: FUTURE },
    ];
    const r = priceOrder(o, coupons, NOW);
    expect(r.tierDiscountKopecks).toBe(500);
    expect(r.totalKopecks).toBe(r.shippingKopecks);
  });

  it("AC-5: промокод на категорію рахується від category subtotal", () => {
    const o = order({
      items: [
        item({ category: "fresh", unitPriceKopecks: 20_000 }),
        item({ category: "standard", unitPriceKopecks: 30_000 }),
      ],
      coupons: ["CATFRESH"],
    });
    const coupons: Coupon[] = [
      { code: "CATFRESH", kind: "percent", value: 10, expiresAt: FUTURE, category: "fresh" },
    ];
    const r = priceOrder(o, coupons, NOW);
    expect(r.couponDiscountKopecks).toBe(2_000);
  });

  it("AC-6: minSubtotalKopecks перевіряється проти оригінального subtotal", () => {
    const o = order({
      items: [item({ unitPriceKopecks: 60_000 })],
      customerTier: "gold",
      coupons: ["MIN50"],
    });
    const coupons: Coupon[] = [
      { code: "MIN50", kind: "percent", value: 10, expiresAt: FUTURE, minSubtotalKopecks: 50_000 },
    ];
    const r = priceOrder(o, coupons, NOW);
    expect(r.tierDiscountKopecks).toBe(6_000);
    expect(r.couponDiscountKopecks).toBe(Math.round(54_000 * 10 / 100));
    expect(r.appliedCoupons).toEqual(["MIN50"]);
  });

  it("AC-7: послідовне застосування tier + global coupon", () => {
    const o = order({
      items: [item({ unitPriceKopecks: 100_000 })],
      customerTier: "gold",
      coupons: ["SAVE15"],
    });
    const coupons: Coupon[] = [
      { code: "SAVE15", kind: "percent", value: 15, expiresAt: FUTURE },
    ];
    const r = priceOrder(o, coupons, NOW);
    expect(r.tierDiscountKopecks).toBe(10_000);
    expect(r.couponDiscountKopecks).toBe(13_500);
    expect(r.totalKopecks).toBe(76_500 + r.shippingKopecks);
  });

  it("AC-8: фіксований промокод без обмежень", () => {
    const o = order({
      items: [item({ unitPriceKopecks: 100_000 })],
      coupons: ["FIXED5K"],
    });
    const coupons: Coupon[] = [
      { code: "FIXED5K", kind: "fixed", value: 5_000, expiresAt: FUTURE },
    ];
    const r = priceOrder(o, coupons, NOW);
    expect(r.couponDiscountKopecks).toBe(5_000);
    expect(r.totalKopecks).toBe(95_000 + r.shippingKopecks);
  });

  it("AC-9: порожнє замовлення — все нулі (граничний)", () => {
    const o = order({ items: [] });
    const r = priceOrder(o, [], NOW);
    expect(r.subtotalKopecks).toBe(0);
    expect(r.tierDiscountKopecks).toBe(0);
    expect(r.couponDiscountKopecks).toBe(0);
    expect(r.shippingKopecks).toBe(0);
    expect(r.totalKopecks).toBe(0);
  });

  it("AC-10: половинка копійки округлюється вгору (граничний)", () => {
    const o = order({
      items: [item({ unitPriceKopecks: 100_005 })],
      customerTier: "gold",
    });
    const r = priceOrder(o, [], NOW);
    expect(r.tierDiscountKopecks).toBe(10_001);
  });

  it("AC-11: дублікат промокоду — застосовується лише раз", () => {
    const o = order({
      items: [item({ unitPriceKopecks: 50_000 })],
      coupons: ["SAVE10", "SAVE10"],
    });
    const coupons: Coupon[] = [
      { code: "SAVE10", kind: "percent", value: 10, expiresAt: FUTURE },
    ];
    const r = priceOrder(o, coupons, NOW);
    expect(r.couponDiscountKopecks).toBe(5_000);
    expect(r.appliedCoupons).toEqual(["SAVE10"]);
  });

  it("AC-12: minSubtotalKopecks не досягнуто — промокод не застосовується", () => {
    const o = order({
      items: [item({ unitPriceKopecks: 50_000 })],
      coupons: ["NEED80K"],
    });
    const coupons: Coupon[] = [
      { code: "NEED80K", kind: "percent", value: 20, expiresAt: FUTURE, minSubtotalKopecks: 80_000 },
    ];
    const r = priceOrder(o, coupons, NOW);
    expect(r.couponDiscountKopecks).toBe(0);
    expect(r.skippedCoupons).toEqual([
      { code: "NEED80K", reason: "min-subtotal-not-met" },
    ]);
  });
});
