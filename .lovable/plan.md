

# Fix: Workers Can't See X-Service Invoice Files

## Root Cause

The RLS (row-level security) policy on `media_files` for reading requires:
```
can_access_branch(auth.uid(), branch_id) AND deleted_at IS NULL
```

X-Service invoice records are inserted by the backend with `branch_id = NULL` and `uploaded_by = NULL`. When `branch_id` is NULL, the `can_access_branch()` check fails, blocking all non-admin workers from seeing these files.

## Fix

Two changes needed:

### 1. Update the `sync-to-xservice` edge function

When inserting the invoice record into `media_files`, include the `branch_id` from the policy being synced. The policy already has a `branch_id` field available in the query.

### 2. Backfill existing records

Run a migration to set `branch_id` on existing X-Service invoice records by looking up the linked policy's branch.

## Technical Details

| File | Change |
|---|---|
| `supabase/functions/sync-to-xservice/index.ts` | Pass `branch_id` from the policy row when inserting the media file |
| Database migration | Backfill `branch_id` on existing X-Service invoice records |

### Edge Function Change

```typescript
// When inserting the invoice media_files record, include branch_id from the policy
await supabase.from("media_files").insert({
  original_name: "فاتورة X-Service.pdf",
  mime_type: "application/pdf",
  cdn_url: invoiceUrl,
  storage_path: null,
  entity_type: "policy_insurance",
  entity_id: policy_id,
  size: 0,
  branch_id: policy.branch_id,  // <-- ADD THIS
});
```

### Backfill Migration

```sql
UPDATE media_files mf
SET branch_id = p.branch_id
FROM policies p
WHERE mf.entity_id = p.id::text
  AND mf.entity_type = 'policy_insurance'
  AND mf.storage_path IS NULL
  AND mf.size = 0
  AND mf.branch_id IS NULL;
```

This ensures both existing and future X-Service invoice files are visible to workers who have branch access.
