# Простежуваність: spec → code → tests (Task C)

**Специфікація:** `docs/spec/pricing-discounts.md`
**Реалізація:** `app/src/discounts.ts`
**Тести:** `app/src/discounts.test.ts`

## Таблиця

| AC | Що перевіряє | Де реалізовано (файл:символ) | Тест (назва) | Статус |
|---|---|---|---|---|
| AC-1 | Знижка за рівень Gold 10% на 1 000 грн | `discounts.ts:priceOrder` (tierDiscount = Math.round(subtotal × tierPct / 100)) | `AC-1: Gold tier 10% на 1 000 грн без промокодів` | ✅ |
| AC-2 | Прострочений промокод ігнорується | `discounts.ts:isCouponExpired` | `AC-2: прострочений промокод мовчки ігнорується` | ✅ |
| AC-3 | Два промокоди на одну категорію — вигідніший | `discounts.ts:priceOrder` (scopeWinners, "less-favorable") | `AC-3: два промокоди на одну категорію — застосовується вигідніший` | ✅ |
| AC-4 | Знижка перевищує суму → обмеження до 0 | `discounts.ts:priceOrder` (Math.max(0, ...)) | `AC-4: знижка перевищує суму — floor at 0 + доставка` | ✅ |
| AC-5 | Купон на категорію від суми категорії | `discounts.ts:categorySubtotalKopecks`, `calcCouponDiscount` | `AC-5: промокод на категорію рахується від category subtotal` | ✅ |
| AC-6 | Мін. сума перевіряється до знижок | `discounts.ts:priceOrder` (subtotal < coupon.minSubtotalKopecks) | `AC-6: minSubtotalKopecks перевіряється проти оригінального subtotal` | ✅ |
| AC-7 | Послідовне рівень + глобальний купон | `discounts.ts:priceOrder` (afterTier = subtotal − tierDiscount; купон від afterTier) | `AC-7: послідовне застосування tier + global coupon` | ✅ |
| AC-8 | Фіксований промокод без обмежень | `discounts.ts:calcCouponDiscount` (kind === "fixed", Math.min) | `AC-8: фіксований промокод без обмежень` | ✅ |
| AC-9 | Порожнє замовлення → все нулі | `discounts.ts:priceOrder` (subtotalKopecks([]) = 0) | `AC-9: порожнє замовлення — все нулі` | ✅ |
| AC-10 | Половинка копійки → Math.round вгору | `discounts.ts:priceOrder` (Math.round при tierDiscount) | `AC-10: половинка копійки округлюється вгору` | ✅ |
| AC-11 | Дублікат коду → один раз | `discounts.ts:priceOrder` (seen Set, uniqueCodes) | `AC-11: дублікат промокоду — застосовується лише раз` | ✅ |
| AC-12 | Мін. сума не досягнута → пропуск | `discounts.ts:priceOrder` (subtotal < coupon.minSubtotalKopecks) | `AC-12: minSubtotalKopecks не досягнуто — промокод не застосовується` | ✅ |

## Зворотна перевірка

- **Чи є в коді поведінка, якої немає в жодному AC?** Немає. Кожна гілка в
  `discounts.ts` покрита відповідним AC:
  - `isCouponExpired` → AC-2
  - `categorySubtotalKopecks` → AC-5
  - `calcCouponDiscount` (percent/fixed × category/global) → AC-5, AC-7, AC-8
  - scope-winner logic → AC-3
  - dedup (seen Set) → AC-11
  - Math.max(0, ...) → AC-4
  - Є ще обробка `"unknown-code"` (промокод не знайдений у каталозі) — це
    захисний код, не покритий окремим AC. Додаю як AC-додатковий не вважаю
    потрібним: це не бізнес-вимога, а технічний guard, і його покриття у
    контексті AC-2/AC-12 де промокоди просто пропускаються.

- **Чи є AC без тесту?** Немає — кожен AC-1…AC-12 має відповідний тест.

- **Чи є тест, який не мапиться на жоден AC?** Немає — усі 12 тестів названі
  за AC і відповідають рівно одному критерію.

## Що з цього вийшло

Зворотна перевірка виявила одну мінорну розбіжність: код обробляє випадок
`"unknown-code"` (промокод не знайдений у каталозі купонів), який не описаний
жодним AC. Це захисний код, а не бізнес-вимога, тому я вирішив не додавати
окремий AC — це б роздуло специфікацію без реальної цінності. Якби це був
production code, варто було б додати AC-13 для unknown coupon.

Специфікацію після початку реалізації правити не довелось — 12 рішень із таблиці
D-1…D-12 виявились достатніми для повної реалізації без додаткових запитань.
Це скоріше свідчить про те, що задача невелика за скоупом, ніж про те, що
специфікація ідеальна.
