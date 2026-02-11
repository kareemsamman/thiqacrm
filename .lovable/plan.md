
# Fix Payment Summary to Include Office Commission (عمولة للمكتب)

## Problem
When creating an ELZAMI policy with price ₪1,000 and office commission ₪200:
- "إجمالي الوثيقة" shows ₪1,000 instead of ₪1,200
- The auto-locked payment covers ₪1,000 (correct), but the remaining ₪200 commission is not reflected
- The system says "تم دفع كامل المبلغ" even though the commission hasn't been paid

## Root Cause
The `PaymentSummaryBar` and `remainingToPay` use `pricing.totalPrice` which does NOT include `officeCommission`. The total shown to the user should be `totalPrice + officeCommission`.

## Changes

### 1. `src/components/policies/wizard/usePolicyWizardState.ts`
Update `remainingToPay` and `paymentsExceedPrice` to use `totalPrice + officeCommission`:
```
// Before:
const remainingToPay = pricing.totalPrice - totalPaidPayments;
const paymentsExceedPrice = totalPaidPayments > pricing.totalPrice ...

// After:
const displayTotal = pricing.totalPrice + pricing.officeCommission;
const remainingToPay = displayTotal - totalPaidPayments;
const paymentsExceedPrice = totalPaidPayments > displayTotal ...
```

### 2. `src/components/policies/wizard/Step4Payments.tsx`
Pass `pricing.totalPrice + pricing.officeCommission` to `PaymentSummaryBar` instead of `pricing.totalPrice`:
```
<PaymentSummaryBar
  totalPrice={pricing.totalPrice + pricing.officeCommission}
  ...
/>
```

This way:
- ELZAMI ₪1,000 + Commission ₪200 = "إجمالي الوثيقة" shows ₪1,200
- Locked payment covers ₪1,000
- "المتبقي" shows ₪200 (the commission still owed)
- User can add a manual payment of ₪200 to cover the commission

No database or other component changes needed -- just the display/calculation in the wizard.
