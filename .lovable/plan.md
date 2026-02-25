
# Fix: Auto-refresh Client Wallet After Payment Changes

## Problem

When you add/edit/delete a payment inside the **Policy Details Drawer** (on the customer profile page), the drawer refreshes its own data but does NOT notify the parent `ClientDetails` page. So the wallet summary cards (Total Paid, Total Remaining, Profit) stay stale until you manually refresh the browser.

## Root Cause

In `src/components/policies/PolicyDetailsDrawer.tsx`, the `handlePaymentsChange` function (line 641) only calls `fetchPolicyDetails()` (its own internal refresh). It does **not** call `onUpdated?.()` which is the callback that tells `ClientDetails` to refresh payment summary, wallet balance, and policies.

## Fix

### File: `src/components/policies/PolicyDetailsDrawer.tsx`

**One-line fix** -- Add `onUpdated?.()` to `handlePaymentsChange`:

```typescript
const handlePaymentsChange = () => {
  if (policyId) {
    sessionStorage.removeItem(`policy_cache_${policyId}`);
  }
  setTimeout(() => {
    fetchPolicyDetails();
  }, 150);
  // NEW: Notify parent to refresh wallet/summary
  onUpdated?.();
};
```

This ensures that every time a payment is added, edited, or deleted from within the policy drawer, the parent `ClientDetails` page immediately refreshes:
- Payment summary (total paid / total remaining)
- Wallet balance (refunds)
- Policy list (payment status badges)
- Payment history tab

### No other files need changes

The `ClientDetails` page already has the correct `onUpdated` callback wired up (line 2082-2086) that calls `fetchPolicies()`, `fetchPaymentSummary()`, and `fetchPayments()`. It just was never being triggered from payment changes.

The same applies to `DebtPaymentModal`, `SinglePolicyPaymentModal`, and `PackagePaymentModal` -- those already have their own `onSuccess` callbacks that refresh the parent. Only the in-drawer payment section (`PolicyPaymentsSection`) was missing the parent notification.
