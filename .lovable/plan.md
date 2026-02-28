

# Plan: AB Admin Delete Access + Expense Invoice Improvements

## Task 1: Allow AB Admin to Delete Policies

The `delete-policy` edge function currently only allows `morshed500@gmail.com`. The AB Admin user (ID: `8a1401ed-8965-44d6-be97-4a66d84d3aec`) has `admin` role but email `0546060886@phone.local`, so they are blocked.

**Fix**: Update the edge function to check both the super admin email AND admin role from `user_roles` table.

### File: `supabase/functions/delete-policy/index.ts`
- After verifying the user token, also check if the user has `admin` role in `user_roles` table
- Allow deletion if user is super admin OR has admin role

## Task 2: Show Export Button on "All" Tab

Currently the export button only shows for `receipt` or `payment` tabs. When "الكل" (all) is selected, it should show both export options.

### File: `src/pages/Expenses.tsx`
- Change `showExportButton` to also include `voucherFilter === 'all'`
- When `all` is selected, show two buttons: one for קבלה (receipt) and one for חשבונית זיכוי (payment)
- Each button exports only the relevant voucher type from the current data (filtering by `voucher_type`)

## Task 3: Reverse Table Column Order (RTL) + Redesign Header

The invoice table currently has שורה on the left. It should be RTL with שורה on the right side, matching the uploaded reference images.

### File: `src/lib/expenseInvoiceBuilder.ts`

**Table column order reversed (RTL direction):**
- Change document direction from `ltr` to `rtl`
- Column order right-to-left: שורה | פרטים | קטגוריה | גורם | אמצעי תשלום | תאריך | סכום ₪
- Amount column aligned to left (as shown in reference image)

**Header redesign to match Rivhit receipt (3rd image):**
- Bordered box at top with thick border
- Right side: Business name (בשיר אבו סנינה), address (בית חנינא חדשה, ירושלים), phone (026307377)
- Center: AB Insurance logo
- Left side: עוסק מורשה 212426498
- Below the box: Title row with document type (קבלה / חשבונית זיכוי), מספר חשבונית (invoice number starting from 01), and העתק label
- Horizontal rules separating sections

**Add מספר חשבונית:**
- Accept an invoice number parameter (default starting from `01`)
- Display as `מספר: 01/000001` format in the header section

## Files to Change

| File | Change |
|---|---|
| `supabase/functions/delete-policy/index.ts` | Allow admin-role users (not just super admin email) to delete policies |
| `src/pages/Expenses.tsx` | Show export buttons on "all" tab (two buttons for receipt + payment) |
| `src/lib/expenseInvoiceBuilder.ts` | RTL table layout, Rivhit-style header matching reference image, add מספר חשבונית |

## Technical Details

### delete-policy Edge Function Change
```typescript
// After user verification, check admin role too
const isSuper = user.email === SUPER_ADMIN_EMAIL;
if (!isSuper) {
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .single();
  if (!roleData) {
    return new Response(JSON.stringify({ error: 'Only admins can delete policies' }), { status: 403 });
  }
}
```

### Expenses.tsx Export Button Changes
- `showExportButton` becomes `true` for `all`, `receipt`, or `payment` tabs
- For `all` tab: render two export buttons (one for receipts, one for payments)
- Each filters the `expenses` array by `voucher_type` before passing to builder

### Invoice Builder Header (matching reference image 3)
```text
+----------------------------------------------------------+
|  עוסק מורשה 212426498    [LOGO]    בשיר אבו סנינה        |
|                                    בית חנינא חדשה, ירושלים |
|                                    טלפון: 026307377       |
+----------------------------------------------------------+
  קבלה            מספר: 01              העתק
  ─────────────────────────────────────────
```

- Thick black border around header box
- Business info on the right, tax ID on the left, logo centered
- Document title and number below the box

