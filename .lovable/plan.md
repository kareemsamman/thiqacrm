
# Fix: Search crashes page with white screen

## Problem
When you type in the search box on the settlement detail page, the page goes completely white.

## Root Cause
In the search filter (line 159), the code calls:
```
getInsuranceTypeLabelLocal(policy).toLowerCase()
```
This function (line 351) returns `POLICY_TYPE_LABELS[policy.policy_type_parent]` which can be `undefined` if a policy has an unexpected type. Calling `.toLowerCase()` on `undefined` throws an error and crashes the entire component.

## Fix

### File: `src/pages/CompanySettlementDetail.tsx`

**1. Line 351** - Add fallback to prevent undefined return:
```typescript
return POLICY_TYPE_LABELS[policy.policy_type_parent] || policy.policy_type_parent || '';
```

**2. Line 159** - Add safety net in the search filter:
```typescript
const insuranceLabel = (getInsuranceTypeLabelLocal(policy) || '').toLowerCase();
```

Two small one-line changes that prevent the crash completely.
