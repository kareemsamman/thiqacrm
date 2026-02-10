
# Add Office Commission (عمولة للمكتب) for ELZAMI Policies

## Overview
When creating an ELZAMI policy, AB sometimes charges the customer an office commission (عمولة للمكتب) for handling the ELZAMI on their behalf. This amount defaults to 0 but can be edited. If the customer also has a THIRD_FULL policy with AB, the commission is typically 0 but should still be editable.

This commission:
- Is money the customer owes AB (enters their debt/wallet)
- Should appear in invoices, policy details, reports, and everywhere the policy financials are shown
- Is separate from the ELZAMI insurance price (which goes entirely to the insurance company)

## Database Changes

### 1. Add `office_commission` column to `policies` table
```sql
ALTER TABLE public.policies
ADD COLUMN office_commission numeric DEFAULT 0 NOT NULL;
```
This column stores the commission amount for any policy (primarily used for ELZAMI). Default is 0.

## Frontend Changes

### 2. Policy Wizard - Step 3 (`Step3PolicyDetails.tsx`)
- When `policy_type_parent === 'ELZAMI'`, show a new input field "عمولة للمكتب (₪)" after the price field
- Default value: 0
- Editable numeric input

### 3. PolicyForm type (`wizard/types.ts`)
- Add `office_commission: string` to `PolicyForm` interface (default `"0"`)

### 4. Wizard State (`usePolicyWizardState.ts`)
- Add `office_commission` to initial policy state and reset logic

### 5. Policy Insert (`PolicyWizard.tsx`)
- Pass `office_commission` value when inserting the policy
- For package addons with ELZAMI type, also pass the addon's `office_commission`

### 6. PackageAddon type (`wizard/types.ts`)
- Add `office_commission?: string` to `PackageAddon` interface for ELZAMI addons

### 7. Package Builder Section (`PackageBuilderSection.tsx`)
- When ELZAMI addon is enabled, show "عمولة للمكتب" input field

### 8. Pricing Breakdown (`PricingCard.tsx` and `usePolicyWizardState.ts`)
- Include `office_commission` in `PricingBreakdown` type
- Add it to `payablePrice` (since it counts as client debt)
- Show it as a line item in the pricing card: "+ عمولة للمكتب: X₪"

### 9. Policy Edit Drawer (`PolicyEditDrawer.tsx`)
- When editing an ELZAMI policy, show the "عمولة للمكتب" field
- Fetch the current value and allow editing
- Save the updated value on save

### 10. Policy Details Drawer (`PolicyDetailsDrawer.tsx`)
- In the financial section, show "عمولة للمكتب" if > 0
- Include it in the total display

### 11. Client Debt Calculation
- The `office_commission` should be added to the client's payable amount
- Debt = SUM(non-ELZAMI prices) + SUM(office_commission for ELZAMI policies) - SUM(payments)
- This affects: `DebtTracking.tsx`, `ClientDetails.tsx` debt views, `DebtPaymentModal.tsx`
- Need to update the debt SQL view/query to include `office_commission`

### 12. Invoice Generation (`generate-invoices/index.ts`)
- Include `office_commission` as a line item in the invoice if > 0
- Label: "عمولة مكتب" (AR) / "עמלת משרד" (HE)

### 13. Policy Table Views
- `PolicyTableView.tsx` and `PolicyCardsView.tsx`: Include `office_commission` in payment status calculations where relevant
- `PolicyCardInfo.tsx`: Show commission badge if > 0

### 14. Reports
- `FinancialReports.tsx`: Include office commissions in profit/revenue calculations
- `ClientReportModal.tsx`: Show office commission in policy breakdown

## How Debt Works After This Change

Currently:
```
Client Debt = SUM(insurance_price WHERE type != ELZAMI) - SUM(payments)
```

After:
```
Client Debt = SUM(insurance_price WHERE type != ELZAMI) + SUM(office_commission) - SUM(payments)
```

The office commission is treated like additional revenue from the customer, tracked as part of their debt to AB.

## Files to Change

| File | Change |
|------|--------|
| DB Migration | Add `office_commission` column to `policies` |
| `src/components/policies/wizard/types.ts` | Add field to `PolicyForm`, `PackageAddon`, `PricingBreakdown` |
| `src/components/policies/wizard/usePolicyWizardState.ts` | Add to state, pricing calc, reset |
| `src/components/policies/wizard/Step3PolicyDetails.tsx` | Show commission input for ELZAMI |
| `src/components/policies/wizard/PackageBuilderSection.tsx` | Show commission input for ELZAMI addon |
| `src/components/policies/wizard/PricingCard.tsx` | Show commission line item |
| `src/components/policies/PolicyWizard.tsx` | Pass commission on insert |
| `src/components/policies/PolicyEditDrawer.tsx` | Edit commission field |
| `src/components/policies/PolicyDetailsDrawer.tsx` | Display commission |
| `src/components/policies/cards/PolicyCardInfo.tsx` | Show commission if > 0 |
| `src/pages/DebtTracking.tsx` | Include commission in debt calc |
| `src/components/clients/ClientDetails.tsx` | Include commission in debt display |
| `src/components/debt/DebtPaymentModal.tsx` | Include commission in remaining calc |
| `src/pages/FinancialReports.tsx` | Include in revenue calculations |
| `src/components/clients/ClientReportModal.tsx` | Show in report |
| `supabase/functions/generate-invoices/index.ts` | Add commission line to invoice |
