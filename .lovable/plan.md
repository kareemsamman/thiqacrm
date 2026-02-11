

# Fix: DB Trigger + Payment Summary Breakdown for Office Commission

## Problem 1: Database Trigger Blocks Save
The error `Payment total exceeds policy insurance_price (total=1400.00, price=1200.00)` comes from the `validate_policy_payment_total()` trigger. It compares total payments against `insurance_price` only, but now payments can include the office commission amount (₪200). The trigger must include `office_commission` in the allowed total.

## Problem 2: Summary Bar Lacks Breakdown
The PaymentSummaryBar shows "إجمالي الوثيقة ₪1,400" but doesn't explain that it's ₪1,200 (ELZAMI price) + ₪200 (عمولة مكتب). The user needs to see this breakdown.

## Changes

### 1. Database Migration - Update trigger
Update `validate_policy_payment_total()` to use `insurance_price + COALESCE(office_commission, 0)` instead of just `insurance_price`:

```sql
-- Single policy:
SELECT p.insurance_price + COALESCE(p.office_commission, 0), p.group_id
INTO v_policy_price, v_group_id ...

-- Package group:
SELECT COALESCE(SUM(pkg.insurance_price + COALESCE(pkg.office_commission, 0)), 0)
INTO v_policy_price ...
```

### 2. PaymentSummaryBar - Show commission breakdown
Add an optional `officeCommission` prop. When > 0, show a small line under the total:
- "₪1,400" (total)
- Below it in smaller text: "₪1,200 تأمين + ₪200 عمولة مكتب"

### 3. Step4Payments - Pass commission prop
Pass `pricing.officeCommission` to `PaymentSummaryBar`.

| File | Change |
|------|--------|
| New DB migration | Update `validate_policy_payment_total()` to include `office_commission` |
| `src/components/policies/wizard/PaymentSummaryBar.tsx` | Add `officeCommission` prop, show breakdown text |
| `src/components/policies/wizard/Step4Payments.tsx` | Pass `officeCommission` to `PaymentSummaryBar` |

