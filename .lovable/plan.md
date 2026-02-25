

# Fix: Client Name Missing in SMS History

## Problem

The SMS history page joins `sms_logs.client_id` to `clients.full_name` to show the client name. However, most edge functions that insert into `sms_logs` don't set `client_id` -- only signature and some invoice functions do. This is why names appear only for some rows.

From the database: out of the last 20 SMS logs, only 6 have `client_id` set (all signature type). The rest are NULL.

## Affected Edge Functions

| Function | Sets `client_id`? | Fix needed |
|---|---|---|
| `send-sms` (manual) | No | Yes -- accept `client_id` from request body |
| `send-invoice-sms` | Yes (sometimes null) | Minor -- ensure always set |
| `send-correspondence-sms` | No | Yes -- look up from letter recipient |
| `send-bulk-debt-sms` | No | Yes -- has client data available |
| `send-signature-sms` | Yes | OK |
| `send-accident-signature-sms` | No | Yes -- has client data |
| `payment-result` | Yes | OK |
| `send-renewal-reminders` | Yes | OK |
| `cron-birthday-license-sms` | No (uses wrong column name `message_content`) | Yes |
| `send-marketing-sms` | No (uses wrong column name `message_content`) | Yes |
| `send-package-invoice-sms` | Yes | OK |

## Additional Issue

Some functions use `message_content` instead of `message` as the column name, which means those inserts silently fail (the column doesn't exist). The actual column is `message`.

## Solution

### 1. Fix edge functions to pass `client_id`

Update each affected function to include `client_id` in the `sms_logs` insert when the data is available.

### 2. Fix wrong column names

Change `message_content` to `message` in `cron-birthday-license-sms`, `send-marketing-sms`, and `send-correspondence-sms`.

### 3. Backfill existing records

Run a migration to set `client_id` on existing NULL records by matching phone numbers to known clients:

```sql
UPDATE sms_logs sl
SET client_id = c.id
FROM clients c
WHERE sl.client_id IS NULL
  AND c.phone_number IS NOT NULL
  AND c.deleted_at IS NULL
  AND sl.phone_number = c.phone_number;
```

### 4. Also pass `created_by` where available

Several functions have the authenticated user ID available but don't pass it as `created_by`.

## Files to Change

| File | Changes |
|---|---|
| `supabase/functions/send-sms/index.ts` | Accept optional `client_id` from body, pass to insert |
| `supabase/functions/send-bulk-debt-sms/index.ts` | Pass `client_id` from client data |
| `supabase/functions/send-correspondence-sms/index.ts` | Fix column `message_content` to `message`, look up client |
| `supabase/functions/send-accident-signature-sms/index.ts` | Pass `client_id` |
| `supabase/functions/cron-birthday-license-sms/index.ts` | Fix column `message_content` to `message`, pass `client_id` |
| `supabase/functions/send-marketing-sms/index.ts` | Fix column `message_content` to `message` |
| Database migration | Backfill `client_id` on existing records |

