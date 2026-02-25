

# Fix X-Service Sync (Non-Visa) + Add Sync Status Indicator

## Problem 1: Sync still not working for non-Visa packages

The database confirms that the latest Road Service policies for "Kareem Test" (created at 07:01, 06:49, 06:26, 06:20) have ZERO entries in `xservice_sync_log`. The sync is never triggered.

**Root cause**: The sync logic at line 1430-1442 was designed for the Visa path, where the temp policy gets CONVERTED to the first addon type. In non-Visa path, this logic is wrong:

| Step | What happens | Problem |
|---|---|---|
| Line 825 | `policyIdToUse` = ELZAMI main policy ID | Correct |
| Line 891 | `_pkgFirstAddonType` = `'road_service'` | Correct |
| Line 1431 | Checks if first addon type is X-Service type: YES | Correct |
| Line 1432 | Pushes `policyIdToUse` (ELZAMI ID!) as if it's Road Service | **WRONG** -- this is the ELZAMI policy |
| Line 1437 | Skips road_service addon because `addon.type === _pkgFirstAddonType` | **WRONG** -- the actual Road Service gets skipped |

So the sync tries to sync the ELZAMI policy as a road service (which `sync-to-xservice` skips because ELZAMI isn't a sync type), and the actual Road Service addon is never synced.

**Fix**: Add a boolean flag `_tempConvertedToAddon` that is `true` only in the Visa path (where `policyIdToUse` IS the first addon). In non-Visa path, don't skip any addons and don't push `policyIdToUse` as an addon.

### File: `src/components/policies/PolicyWizard.tsx`

**Change 1**: Add a tracking flag alongside the hoisted variables (line 829):
```typescript
var _pkgFirstAddonType: string | null = null;
var _pkgMainAddonId: string | null = null;
var _tempConvertedToAddon = false; // Only true in Visa path
```

**Change 2**: Set `_tempConvertedToAddon = true` in the Visa path where the temp policy gets converted (around line 1030).

**Change 3**: Fix the sync logic (line 1430-1442) to use the flag:
```typescript
if (packageMode && packageAddons) {
  const tempTypeMap = { ... };

  // Only in Visa path: temp policy was converted to first addon type
  if (_tempConvertedToAddon && _pkgFirstAddonType) {
    const firstAddonTypeParent = tempTypeMap[_pkgFirstAddonType];
    if (firstAddonTypeParent && xserviceTypes.includes(firstAddonTypeParent)) {
      policyIdsToSync.push(policyIdToUse);
    }
  }

  // Check ALL addon policies (don't skip first addon in non-Visa path)
  packageAddons.forEach((addon: any) => {
    if (!addon.enabled) return;
    // In Visa path, skip first addon (already handled via temp policy above)
    if (_tempConvertedToAddon && addon.type === _pkgFirstAddonType) return;
    const addonParent = tempTypeMap[addon.type];
    if (addonParent && xserviceTypes.includes(addonParent) && addon._savedPolicyId) {
      policyIdsToSync.push(addon._savedPolicyId);
    }
  });

  // Check main policy from Step 3 (if created as separate addon in Visa path)
  if (xserviceTypes.includes(mainType) && _pkgMainAddonId) {
    policyIdsToSync.push(_pkgMainAddonId);
  }
}
```

---

## Problem 2: No sync status indicator on package components

The user wants to see a green/red indicator on each Road Service or Accident Fee row in the "Package Components Table" (visible in the Policy Details Drawer), showing whether the policy was synced to X-Service.

### File: `src/components/policies/PackageComponentsTable.tsx`

- Add an optional `syncStatuses` prop: `Record<string, 'success' | 'failed' | 'pending' | null>`
- For ROAD_SERVICE and ACCIDENT_FEE_EXEMPTION rows, show a small colored dot next to the type icon:
  - Green dot = synced successfully
  - Red dot = sync failed
  - Orange dot = pending/no log yet
  - No dot = not a syncable type (ELZAMI, etc.)

### File: `src/components/policies/PolicyDetailsDrawer.tsx`

- In `fetchPolicyDetails()`, after loading package policies, query `xservice_sync_log` for all service-type policy IDs to get their latest sync status
- Pass the statuses as a prop to `PackageComponentsTable`
- The query: `SELECT DISTINCT ON (policy_id) policy_id, status FROM xservice_sync_log WHERE policy_id IN (...) ORDER BY policy_id, created_at DESC`

### Visual Design

In each service policy row, next to the type icon, a small 8x8 circle:

```
[Shield icon] الزامي                    -- no dot (not syncable)
[Truck icon] [green dot] خدمات الطريق   -- synced to X
[Truck icon] [red dot] خدمات الطريق     -- sync failed
```

Tooltip on hover showing: "تمت المزامنة مع X-Service" (green) or "فشلت المزامنة مع X-Service" (red).

---

## Summary of Changes

| File | Change |
|---|---|
| `PolicyWizard.tsx` | Add `_tempConvertedToAddon` flag; fix sync logic to not skip addons in non-Visa path |
| `PackageComponentsTable.tsx` | Add optional `syncStatuses` prop; render colored dot for service-type policies |
| `PolicyDetailsDrawer.tsx` | Query `xservice_sync_log` for service policies; pass statuses to table |
