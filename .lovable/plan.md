

# Fix X-Service Sync — Send service_id in Payload

## The Problem
When syncing a ROAD_SERVICE policy to X-Service, the system sends `sell_price` (company cost) to identify the service. For "زجاج" (glass only), `payed_for_company = 0`, so X-Service receives `sell_price=0` which doesn't match any of its services [250, 500, 600, 250, 150]. It asks for `policy.service_id` to resolve the ambiguity.

## The Fix
Add `service_id` to the `policy` object in the sync payload. This is a one-line addition.

### File: `supabase/functions/sync-to-xservice/index.ts`

Change the `requestPayload.policy` object (around line 126-132) to include:

```
policy: {
  service_type: serviceType,
  service_id: policy.road_service_id || policy.accident_fee_service_id || null,  // NEW
  start_date: policy.start_date,
  end_date: policy.end_date,
  sell_price: policy.payed_for_company || 0,
  notes: policy.notes || "",
},
```

This sends our internal `road_service_id` (or `accident_fee_service_id`) so X-Service can identify the exact service without relying on price matching.

### No other changes needed
- No database changes
- No frontend changes
- The policy already fetches `road_service_id` and `accident_fee_service_id` (line 61)

