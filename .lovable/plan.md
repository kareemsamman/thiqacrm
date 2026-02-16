
# Fix: Marketing SMS shows "failed" even though it sends successfully

## Problem
The SMS actually sends successfully (confirmed in logs), but the edge function crashes AFTER sending because lines 210 and 216-217 reference `sentCount` and `failedCount` variables that were removed in the previous fix but their references were left behind.

The error from logs:
```
ReferenceError: sentCount is not defined
```

## Fix

### File: `supabase/functions/send-marketing-sms/index.ts`

**Line 210** - Replace undefined variables with actual values:
```typescript
console.log(`Campaign completed: ${recipients.length} sent, 0 failed`);
```

**Lines 212-219** - Replace undefined variables in response:
```typescript
return new Response(
  JSON.stringify({
    success: true,
    campaignId: campaign.id,
    sentCount: recipients.length,
    failedCount: 0,
  }),
  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);
```

Two lines changed - replaces undefined variable references with `recipients.length` and `0`.
