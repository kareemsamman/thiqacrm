

# Rename "صغير" Car Type to "اوتوبس زعير"

Replace all occurrences of the `small` car type label from "صغير" / "صغيرة" to "اوتوبس زعير" across all files.

## Files to Update

| File | Current Label | New Label |
|------|--------------|-----------|
| `src/components/cars/CarDrawer.tsx` | `دراجة نارية` | `اوتوبس زعير` |
| `src/pages/Cars.tsx` | `صغير` | `اوتوبس زعير` |
| `src/pages/CompanySettlementDetail.tsx` | `صغيرة` | `اوتوبس زعير` |
| `src/components/policies/PolicyDetailsDrawer.tsx` | `صغير` | `اوتوبس زعير` |
| `src/components/clients/ClientDetails.tsx` | `صغير` | `اوتوبس زعير` |
| `src/components/clients/ClientReportModal.tsx` | `صغير` | `اوتوبس زعير` |
| `src/components/policies/wizard/types.ts` | `صغير` | `اوتوبس زعير` |
| `supabase/functions/generate-invoice-pdf/index.ts` | `صغيرة` | `اوتوبس زعير` |
| `supabase/functions/send-invoice-sms/index.ts` | `صغيرة` | `اوتوبس زعير` |
| `supabase/functions/send-package-invoice-sms/index.ts` | `صغيرة` | `اوتوبس زعير` |

All changes are simple label replacements for the `small` key in car type mappings. No logic changes needed. The edge functions will be redeployed automatically.

