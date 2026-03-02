

# Update PolicySuccessDialog Button Labels

Change the first two buttons and their section header from "فاتورة التأمين" to "بوليصة التأمين" in the Policy Success Dialog.

## Changes in `src/components/policies/PolicySuccessDialog.tsx`

| Location | Current Text | New Text |
|---|---|---|
| Section label (line ~243) | `فاتورة التأمين` | `بوليصة التأمين` |
| Print button (line ~252) | `طباعة فاتورة التأمين` | `طباعة بوليصة التأمين` |
| SMS button (line ~263) | `إرسال فاتورة التأمين SMS` / `تم إرسال فاتورة التأمين SMS` | `إرسال بوليصة التأمين SMS` / `تم إرسال بوليصة التأمين SMS` |
| Dialog description (line ~232) | `يمكنك طباعة فاتورة التأمين أو فاتورة الدفع أو إرسالها للعميل عبر SMS` | `يمكنك طباعة بوليصة التأمين أو فاتورة الدفع أو إرسالها للعميل عبر SMS` |

The "فاتورة الدفع" (Payment Invoice) section remains unchanged -- only the insurance document buttons are renamed.

