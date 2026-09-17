# Task E (bonus) — Шлях 3: власний агент-рецензент специфікації

## Що зробили

Створив агента-рецензента специфікації (Spec Reviewer Agent), чиє завдання —
адверсаріально перевірити `docs/spec/pricing-discounts.md` на незакриті
неоднозначності, відсутні edge cases і внутрішні суперечності.

## Промпт

```
You are a **Spec Reviewer Agent**. Your job: adversarially review
docs/spec/pricing-discounts.md for unclosed ambiguities, missing edge
cases, and internal contradictions.

Read these files:
1. docs/spec/pricing-discounts.md (the spec)
2. materials/feature-request.md (the original ticket)
3. app/src/types.ts (the type contract)

Then produce a structured review. For each finding:
- ID: REVIEW-N
- Severity: HIGH / MEDIUM / LOW
- What: the specific gap
- Example scenario: a concrete case where two engineers would disagree

Look specifically for:
1. Ambiguities the spec CLAIMS to resolve but actually doesn't fully close
2. Edge cases not covered by any AC
3. Contradictions between decisions
4. Missing interactions between features
5. Contract gaps
```

## Перевірка на реальному прикладі — що він знайшов

Агент знайшов **7 знахідок** (2 HIGH, 3 MEDIUM, 2 LOW):

### HIGH severity

**REVIEW-1: Percent coupon value > 100 не визначено.**
`Coupon.value` типізовано як `number` з коментарем "For percent: 0-100", але
специфікація не має правила валідації. Два інженери можуть обрізати до 100% або
застосувати 150% як є. Конкретний сценарій: купон 150% на 10 000 коп. — знижка
15 000 (обрізається floor) чи 10 000 (clamp percent)?
**Вердикт: справжня знахідка.** Я не подумав про невалідний input. Варто додати
D-13 з рішенням (clamp до 100% або reject).

**REVIEW-2: D-1/D-5 взаємодія для category coupons.**
D-1 каже "послідовно", D-5 каже "category subtotal = оригінальна сума
категорії". Отже category coupon фактично адитивний з tier, не послідовний.
Сценарій: Gold + 50% fresh, замовлення 100% fresh → різниця 5 000 коп.
**Вердикт: справжня знахідка, але свідоме рішення.** Я обрав цю модель
(category coupon на оригінальному category subtotal) свідомо, щоб уникнути
складного пропорційного розподілу tier по категоріях. Проте специфікація не
пояснює цю асиметрію явно — варто було б додати примітку.

### MEDIUM severity

**REVIEW-3: Global fixed coupon cap з tier.**
AC-4 не розрізняє cap по afterTier vs original subtotal, бо fixed > обох.
**Вердикт: валідне зауваження.** Додатковий AC з fixed між afterTier і subtotal
прояснив би поведінку.

**REVIEW-4: Items з quantity 0 або від'ємним.**
Ніде не специфіковано поведінку для quantity ≤ 0.
**Вердикт: справжня прогалина**, але це скоріше validation layer до discount
engine, виходить за scope цієї фічі.

**REVIEW-5: Tie-breaking при рівних знижках.**
Два купони дають однакову знижку в одному scope — хто виграє?
**Вердикт: справжня прогалина.** Код бере "строго більший", тобто при рівності
виграє перший по порядку. Варто явно зафіксувати в D-10.

### LOW severity

**REVIEW-6: Timezone для expiresAt.**
**REVIEW-7: Unknown coupon code — без AC.**
Обидва — валідні, але мінорні зауваження.

## Чи була це справжня знахідка

З 7 знахідок **5 — справжні прогалини** в специфікації (REVIEW-1, -2, -3, -4, -5),
які могли б привести до різної поведінки у двох незалежних реалізацій. 2 з них
(REVIEW-1, REVIEW-5) — однозначні баги специфікації, які я б хотів виправити
перед production.

Агент-рецензент виявився корисним: він знайшов речі, які автор специфікації
пропустив через «прокляття знання» (curse of knowledge) — я знав, як збираюсь
реалізувати, тому не помічав місць, де текст дозволяє іншу інтерпретацію.
Часу він зайняв ~30 секунд, тобто ROI дуже високий.
