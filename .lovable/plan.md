

# Fix Policy Success Dialog: Refresh + Receipt Send/Print

## Problems to Fix

1. **No refresh when closing success dialog** -- After creating a policy, pressing "Close" doesn't refresh/navigate back to the customer page properly
2. **Missing payment receipt option** -- The success dialog only has invoice send/print, but no way to send/print the **payment receipt** (the receipt HTML like `cdn.basheer-ab.com/receipts/...`)

## Solution

### 1. Fix Close/Refresh Behavior

The current `onClose` callback in `PolicyWizard.tsx` (line 1745-1758) already navigates to `/clients/{clientId}`, but the issue is that the `PolicySuccessDialog` closes the wizard dialog (`onOpenChange(false)`) which may not trigger a proper page refresh.

**Fix:** When closing the success dialog, force a page reload after navigation to ensure the client page shows the newly created policy.

**File: `src/components/policies/PolicyWizard.tsx`**
- In the `onClose` callback of `PolicySuccessDialog`, add `window.location.href = `/clients/${clientIdToNavigate}`` instead of just using `navigate()` -- this ensures a full reload showing the new policy data

### 2. Add Payment Receipt Send/Print to Success Dialog

**File: `src/components/policies/PolicySuccessDialog.tsx`**

Add two new buttons to the success dialog:
- **"طباعة إيصال الدفع" (Print Payment Receipt)** -- Calls `generate-payment-receipt` edge function, opens the receipt URL in a new tab
- **"إرسال إيصال الدفع SMS" (Send Payment Receipt SMS)** -- Generates the receipt then sends the URL to the customer via the `send-sms` edge function

The flow:
1. After policy creation, fetch the payment IDs for this policy from `policy_payments`
2. For each payment (or the first/main payment), generate a receipt via `generate-payment-receipt`
3. Open in new tab (print) or send via SMS (send)

**Updated dialog layout:**
```
-- Success checkmark + title --
-- Error message (if any) --

[Section: Invoice]
  [ Print Invoice button ]
  [ Send Invoice SMS button ]

[Section: Payment Receipt]
  [ Print Payment Receipt button ]
  [ Send Payment Receipt SMS button ]

[ Close button ]
```

### Technical Details

**File: `src/components/policies/PolicySuccessDialog.tsx`**

- Add state: `printingReceipt`, `sendingReceiptSms`, `receiptSmsSent`
- Add `useEffect` to fetch payment IDs when dialog opens: query `policy_payments` where `policy_id = policyId` (and for packages, all policy IDs in the group)
- `handlePrintReceipt()`: calls `generate-payment-receipt` with `payment_id`, opens `receipt_url` in new tab
- `handleSendReceiptSms()`: calls `generate-payment-receipt` to get the URL, then calls `send-sms` edge function with the receipt URL and client phone
- Add a `Separator` between invoice section and receipt section
- If no payments exist (e.g., deferred payment), hide the receipt section

**File: `src/components/policies/PolicyWizard.tsx`**

- Change the `onClose` handler (line 1745) to use `window.location.href` for full page reload instead of React Router `navigate()`:
```typescript
onClose={() => {
  const clientIdToNavigate = successPolicyData.clientId;
  setShowSuccessDialog(false);
  setSuccessPolicyData(null);
  onOpenChange(false);
  resetForm();
  
  if (clientIdToNavigate) {
    window.location.href = `/clients/${clientIdToNavigate}`;
  } else {
    onSaved?.();
  }
}}
```

**No new edge functions needed** -- we reuse `generate-payment-receipt` and `send-sms`.

