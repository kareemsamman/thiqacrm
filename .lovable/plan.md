

# Fix: Allow Workers to Save Repair Claims

## Problem

The `repair_claims` table has only ONE RLS policy:

```
"Admins can manage repair claims" — FOR ALL — requires admin role or super admin email
```

Workers are completely blocked from any operation on this table, which is why saving fails with "حدث خطأ أثناء الحفظ".

## Solution

Add an RLS policy that allows all authenticated users (including workers) to perform CRUD operations on `repair_claims`. Since the Claims section was already opened to workers (via `ProtectedRoute` instead of `AdminRoute`), the database permissions need to match.

### Database Migration

Add a new RLS policy:

```sql
CREATE POLICY "Authenticated users can manage repair claims"
ON public.repair_claims
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
```

Also check and fix the related tables that the claim drawer writes to (notes, reminders) if they have the same admin-only restriction:

- `repair_claim_notes`
- `repair_claim_reminders`

### No Code Changes Needed

The frontend code (`RepairClaimDrawer`, `RepairClaimDetail`) already works correctly — the only blocker is the database permission.

## Technical Details

| Table | Current Policy | Fix |
|---|---|---|
| `repair_claims` | Admin-only (ALL) | Add authenticated policy for ALL |
| `repair_claim_notes` | Check and fix if admin-only | Add authenticated policy if needed |
| `repair_claim_reminders` | Check and fix if admin-only | Add authenticated policy if needed |

