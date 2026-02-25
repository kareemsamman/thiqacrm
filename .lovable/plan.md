

# Fix: "ثالث/شامل" Still Showing + Package Companies Missing

## Problems

1. **"ثالث/شامل" still appears** in the type column for packages. The previous RPC migration didn't apply — the function still uses `ARRAY_AGG(DISTINCT p.policy_type_parent::text)` which returns `THIRD_FULL` as-is, and the frontend maps it to "ثالث/شامل".

2. **Company column shows only one company** for packages. The RPC returns only `(ARRAY_AGG(...))[1]` for company — the first one. Packages can have policies from different companies, so all should be listed.

## Solution

### 1. Fix the RPC `report_created_policies`

Two changes in the `grouped_policies` CTE:

- **Types**: Replace `ARRAY_AGG(DISTINCT p.policy_type_parent::text)` with child-aware resolution:
```sql
ARRAY_AGG(DISTINCT 
  CASE 
    WHEN p.policy_type_parent::text = 'THIRD_FULL' AND p.policy_type_child IS NOT NULL 
      THEN p.policy_type_child::text
    ELSE p.policy_type_parent::text
  END
)
```
This returns `FULL` or `THIRD` instead of `THIRD_FULL`.

- **Companies**: Add a new output column `package_companies text[]` that collects all distinct company names:
```sql
ARRAY_AGG(DISTINCT COALESCE(ic.name_ar, ic.name)) as grp_company_names
```

### 2. Update frontend (PolicyReports.tsx)

- **Type column** (line 1079): Already uses `policyTypeLabels[type]` — since we added `FULL: 'شامل'` and `THIRD: 'ثالث'` labels in the previous change, this will work automatically once the RPC returns correct values.

- **Company column** (line 1090): For packages, show all companies from the new `package_companies` array, each on its own line. For single policies, keep as-is.

- **Renewals tab** (lines 1474-1478): The `policy_types` array from `report_renewals_service` also returns raw parent types. Fix that RPC too.

- **Renewed tab** (lines 1769-1773): Same issue with `report_renewed_policies`.

### 3. Fix renewal RPCs

Update `report_renewals_service` and `report_renewed_policies` to also return child-resolved type labels instead of raw `THIRD_FULL`.

## Files Changed

| File | Change |
|---|---|
| Database migration | Re-create `report_created_policies` with child-aware types + `package_companies` column |
| Database migration | Update `report_renewals_service` type aggregation |
| `src/pages/PolicyReports.tsx` | Show `package_companies` list in company column for packages |

## Technical Details

### New RPC output column
- `package_companies text[]` — array of distinct company names (Arabic preferred) for all policies in the package

### Frontend company display for packages
```tsx
// Line 1090 area
<TableCell>
  {policy.is_package && policy.package_companies?.length > 0 ? (
    <div className="flex flex-col gap-0.5">
      {policy.package_companies.filter(Boolean).map((name, i) => (
        <span key={i} className="text-sm">{name}</span>
      ))}
    </div>
  ) : (
    policy.company_name_ar || policy.company_name || '-'
  )}
</TableCell>
```
