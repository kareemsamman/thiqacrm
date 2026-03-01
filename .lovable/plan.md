

# Change "فاتورة ضريبية" to "بوليصة تأمين" in AB Policy Invoices

## What Changes

Two edge functions generate the AB policy invoice HTML. Both currently say "فاتورة ضريبية" (tax invoice) in the header. They will be updated to say "بوليصة تأمين" (insurance policy).

### Files to Change

| File | Current Text | New Text |
|---|---|---|
| `supabase/functions/send-invoice-sms/index.ts` (line 886) | `فاتورة ضريبية` | `بوليصة تأمين` |
| `supabase/functions/generate-invoice-pdf/index.ts` (line 469) | `إيصال / فاتورة ضريبية` | `بوليصة تأمين` |

### Not Changed (intentionally)

- **generate-tax-invoice**: This is the actual company settlement tax invoice -- it should remain "فاتورة ضريبية".
- **CompanySettlement / CompanySettlementDetail pages**: UI buttons for generating tax invoices -- should remain as-is.
- **send-package-invoice-sms**: Already says "فاتورة باقة تأمين" (package invoice) -- different context, left as-is.

Both edge functions will be redeployed after the change.
