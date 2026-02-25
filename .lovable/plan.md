

# Fix Bulk Sync: Skip Unsyncable + Already-Synced Policies

## Problems Found

1. **All 300 failed because 94% of policies are unsyncable**: Out of 1,385 service policies, only 76 have a `service_id` set (the rest are legacy WordPress imports with no link to a specific road service or accident fee service). X-Service rejects them with: "Cannot determine service: multiple services found."

2. **No deduplication**: Bulk sync re-sends everything, including policies already successfully synced to X-Service.

## Data Breakdown

| Category | Count |
|---|---|
| Total ROAD_SERVICE + ACCIDENT_FEE policies | 1,385 |
| Have service_id (can be matched) | 76 |
| Have service_id AND price > 0 (fully syncable) | 73 |
| Missing service_id (will always fail) | 1,309 |

## Solution

### File 1: `supabase/functions/bulk-sync-to-xservice/index.ts`

Two changes:

**A. Skip already-synced policies**: Before fetching the batch, get all policy IDs that already have `status='success'` in `xservice_sync_log`. Exclude them from the query using `.not('id', 'in', (...))`.

**B. Skip policies without service_id**: Add a filter condition: only fetch policies where `road_service_id IS NOT NULL` OR `accident_fee_service_id IS NOT NULL`. This eliminates the 1,309 legacy policies that will always fail.

The query becomes:
```sql
SELECT * FROM policies
WHERE policy_type_parent IN ('ROAD_SERVICE', 'ACCIDENT_FEE_EXEMPTION')
  AND deleted_at IS NULL
  AND (road_service_id IS NOT NULL OR accident_fee_service_id IS NOT NULL)
  AND id NOT IN (SELECT DISTINCT policy_id FROM xservice_sync_log WHERE status = 'success')
ORDER BY created_at
```

### File 2: `src/pages/XServiceSettings.tsx`

**Update eligible count** to reflect the ACTUAL syncable count (policies with service_id that haven't been synced yet), not the raw total. This way the user sees "73 eligible" instead of "1,385 eligible".

Also add a small note showing how many are already synced and how many are skipped (no service_id).

### File 3: `supabase/functions/sync-to-xservice/index.ts` (minor)

No changes needed -- single sync already validates via X-Service response.

## Technical Details

### Bulk sync query changes

```typescript
// 1. Get already-synced policy IDs
const { data: alreadySynced } = await supabase
  .from("xservice_sync_log")
  .select("policy_id")
  .eq("status", "success");
const syncedIds = (alreadySynced || []).map(r => r.policy_id);

// 2. Query only unsycned policies WITH service_id
let query = supabase
  .from("policies")
  .select("id, ...")
  .in("policy_type_parent", types)
  .is("deleted_at", null)
  .or("road_service_id.not.is.null,accident_fee_service_id.not.is.null");

// Exclude already synced
if (syncedIds.length > 0) {
  query = query.not("id", "in", `(${syncedIds.join(",")})`);
}
```

### Frontend eligible count

```typescript
// Show actual syncable count (has service_id, not already synced)
const { count: totalWithService } = await supabase
  .from("policies")
  .select("id", { count: "exact", head: true })
  .in("policy_type_parent", ["ROAD_SERVICE", "ACCIDENT_FEE_EXEMPTION"])
  .is("deleted_at", null)
  .or("road_service_id.not.is.null,accident_fee_service_id.not.is.null");

const { data: alreadySynced } = await supabase
  .from("xservice_sync_log")
  .select("policy_id")
  .eq("status", "success");

const syncedCount = new Set((alreadySynced || []).map(r => r.policy_id)).size;
const eligible = (totalWithService || 0) - syncedCount;
```

## Result After Fix

- Eligible count will show ~73 instead of 1,385
- Already-synced policies won't be re-sent
- Legacy policies without service_id are skipped (no more guaranteed failures)
- Bulk sync will only process policies that actually CAN sync
