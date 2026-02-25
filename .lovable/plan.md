
# Financial Reports - Complete 2026 Filter Fix

## What's Already Done
The `fetchFinancialData` function in `FinancialReports.tsx` already has all the `.gte('created_at', '2026-01-01')` filters applied from the previous edit. The `get_company_balance` RPC also accepts `p_from_date`.

## What's Still Missing

### 1. `useProfitSummary.ts` - Not filtered to 2026
The "ربح AB الإجمالي" (Total AB Profit) card on the Financial Reports page uses `useProfitSummary()`, which fetches policies starting from `yearStart` (dynamic current year start). This needs to be hardcoded to `2026-01-01` so profit data also starts from 2026.

Additionally, the `broker_settlements` query inside this hook has NO date filter at all.

**Changes:**
- Change the policies query from `.gte('start_date', yearStart)` to `.gte('start_date', '2026-01-01')`
- Add `.gte('created_at', '2026-01-01')` to the broker settlements query
- Keep the today/month/year breakdowns working within 2026+ data

### 2. localStorage Cache Serving Old Data
The Financial Reports page caches data in `localStorage` for 5 minutes. Even after the code changes, the user might see old cached data. We need to bust the cache by changing the cache key.

**Change:**
- Update `CACHE_KEY` from `"ab_financial_reports_cache"` to `"ab_financial_reports_cache_2026"` to invalidate old cached data

## Files to Change

| File | Change |
|---|---|
| `src/hooks/useProfitSummary.ts` | Filter policies to `>= 2026-01-01` instead of dynamic year start; add date filter to broker settlements |
| `src/pages/FinancialReports.tsx` | Update cache key to bust old cached data |

## Technical Details

### useProfitSummary.ts
```typescript
// Line 80: Change from:
.gte('start_date', yearStart);
// To:
.gte('start_date', '2026-01-01');

// Line 88: Add date filter to broker settlements:
.eq('status', 'completed')
.gte('created_at', '2026-01-01');
```

### FinancialReports.tsx
```typescript
// Line 32: Change cache key
const CACHE_KEY = "ab_financial_reports_cache_2026";
```
