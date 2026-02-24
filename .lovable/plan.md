

# Fix Renewal Reminders - Batch Processing (Same as Marketing SMS Fix)

## Problem
The `send-renewal-reminders` edge function processes ALL policies in a single invocation, sending SMS one by one with no batching. With 100+ policies, it hits the 60-second edge function timeout and stops after only ~14 messages.

## Solution
Apply the same batch processing pattern already used in `send-marketing-sms`:

### 1. Refactor `send-renewal-reminders` Edge Function
- Process a maximum of **200 policies per invocation**
- After processing a batch, if more policies remain, the function **triggers itself** to handle the next batch
- Track progress using a `batch_id` stored in a lightweight tracking mechanism

### 2. How It Works

**First call (from UI):**
1. Fetch all matching policies
2. Store the full list of policy IDs in a temporary batch record (or pass via self-invocation)
3. Send SMS for the first 200 policies
4. If more remain, call itself with the remaining policy IDs

**Continuation calls:**
1. Receive remaining policy IDs
2. Send SMS for the next 200
3. Repeat until done
4. Return final totals

### 3. Implementation Details

**File: `supabase/functions/send-renewal-reminders/index.ts`**

- Add `BATCH_SIZE = 200` constant
- Accept optional `continuation_policy_ids` and `running_sent_count` / `running_skipped_count` in request body
- On first call: fetch policies, filter by cooldown, collect IDs to process
- Process up to 200 policies per invocation
- If more remain after batch: fire-and-forget `fetch()` to self with remaining IDs and accumulated counts
- Return immediately with batch results (sent/skipped so far + remaining count)
- On final batch: return complete totals

**File: `src/pages/PolicyReports.tsx`**

- Update `handleSendReminders` to show a more informative toast: include "remaining" count if returned
- No major UI changes needed since the function handles continuation automatically

### 4. Key Code Changes

The function will:
- Split policy processing: first 200 go in current batch, rest passed to self-invocation
- Use `fetch(selfUrl, { method: 'POST', body: ... })` (fire-and-forget) to trigger next batch, same pattern as marketing SMS
- Keep the auth token forwarded to continuation calls
- Accumulate sent/skipped/error counts across batches

### 5. Safety
- Each invocation processes at most 200 policies (~20-40 seconds)
- Self-invocation ensures all policies get processed even with 1000+ recipients
- If a batch fails mid-way, remaining policies simply don't get sent (no data corruption)
- Cooldown check prevents duplicate sends on retry
