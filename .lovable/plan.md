
# Auto-Save X-Service Invoice PDF to Policy Files

## What Happens Now
1. New X-Service policy is created in AB
2. AB syncs it to X-Service (fire-and-forget)
3. X-Service returns `{ policy_id: "uuid", success: true }`
4. **Nothing else happens** -- the invoice URL is lost

## What Should Happen
1. New X-Service policy is created in AB
2. AB syncs it to X-Service
3. X-Service returns `{ policy_id: "uuid", success: true }`
4. **NEW**: AB builds the invoice URL (`https://preview--x-service.lovable.app/invoice/{policy_id}`)
5. **NEW**: AB saves this URL as a file record in `media_files` so it appears in the policy's files tab

## What X-Service Needs to Provide

X-Service already returns `policy_id` in its sync response -- that's all we need. The invoice URL follows a known pattern:

```
https://preview--x-service.lovable.app/invoice/{policy_id}
```

**No changes needed on X-Service side.** AB will construct the URL from the returned `policy_id`.

## Implementation

### Change 1: Update `sync-to-xservice` edge function

After a successful sync, if X-Service returns a `policy_id`, automatically:
1. Build the invoice URL: `{xservice_base_url}/invoice/{policy_id}`
2. Insert a record into `media_files` with:
   - `cdn_url` = the invoice URL
   - `entity_type` = `"policy_insurance"` (so it appears in the Insurance Files tab)
   - `entity_id` = the AB policy ID
   - `original_name` = `"فاتورة X-Service.pdf"` (X-Service Invoice)
   - `mime_type` = `"application/pdf"`
   - `size` = 0 (external link, not stored on Bunny)
   - `uploaded_by` = null (system-generated)

This runs inside the existing fire-and-forget sync call, so it won't slow down the user.

### Change 2: Store X-Service base URL from settings

The `xservice_settings.api_url` contains the Supabase functions URL (e.g., `https://xxx.supabase.co/functions/v1/ab-sync-receive`). We need the frontend base URL for invoices.

Add a new field `invoice_base_url` to `xservice_settings` (e.g., `https://preview--x-service.lovable.app`). Or we derive it from the existing `api_url` by stripping the Supabase path.

**Simpler approach**: Store the invoice base URL in `xservice_settings`. Add a text field in the X-Service settings page for the user to enter it.

### Change 3: Settings page UI update

Add an input field in the X-Service settings page:
- Label: "رابط فواتير X-Service" (X-Service Invoice URL)
- Placeholder: `https://preview--x-service.lovable.app`
- Saved to `xservice_settings.invoice_base_url`

## Technical Details

| File | Change |
|---|---|
| Database migration | Add `invoice_base_url TEXT` column to `xservice_settings` |
| `sync-to-xservice/index.ts` | After successful sync, insert `media_files` record with invoice URL |
| `XServiceSettings.tsx` | Add invoice base URL input field |

### Database Migration

```sql
ALTER TABLE xservice_settings
ADD COLUMN IF NOT EXISTS invoice_base_url TEXT;
```

### Sync Function Logic (after success)

```typescript
// After successful sync response
if (response.ok && xservicePolicyId && settings.invoice_base_url) {
  const invoiceUrl = `${settings.invoice_base_url}/invoice/${xservicePolicyId}`;
  
  await supabase.from("media_files").insert({
    original_name: "فاتورة X-Service.pdf",
    mime_type: "application/pdf",
    size: 0,
    cdn_url: invoiceUrl,
    storage_path: null,
    entity_type: "policy_insurance",
    entity_id: policy_id,
    uploaded_by: null,
    branch_id: null,
  });
}
```

## Result
- Every new X-Service policy will automatically have its invoice appear in the policy's files section
- No manual steps needed
- Only applies to new policies (not retroactive to old ones)
- User just needs to enter the X-Service invoice base URL once in settings
