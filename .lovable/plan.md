

## Problem

All notification trigger functions (`notify_on_payment_received`, `notify_on_policy_created`, `notify_on_client_created`, `notify_on_customer_signature`, `notify_on_customer_signature_insert`) select target users using only `branch_id` filtering — they never check `agent_id`. This causes cross-agent notification leakage: when one agent creates data, users from other agents receive those notifications too.

## Root Cause

Example from `notify_on_payment_received`:
```sql
SELECT ARRAY_AGG(p.id) INTO v_admin_users
FROM public.profiles p
WHERE p.status = 'active'
  AND (p.branch_id IS NULL OR p.branch_id = NEW.branch_id);
```
No `agent_id` join — picks up ALL active users.

## Fix

Update all 5 notification trigger functions to join `agent_users` and filter by `NEW.agent_id`:

```sql
SELECT ARRAY_AGG(p.id) INTO v_admin_users
FROM public.profiles p
JOIN public.agent_users au ON au.user_id = p.id
WHERE p.status = 'active'
  AND au.agent_id = NEW.agent_id
  AND (p.branch_id IS NULL OR p.branch_id = NEW.branch_id);
```

Also set `agent_id` on the inserted notification rows so the `auto_set_agent_id` trigger and RLS work correctly.

## Cleanup

Delete the 2 orphaned notifications for `diwacix494@feriwor.com` that were incorrectly created:
```sql
DELETE FROM notifications WHERE user_id = '87fbbad6-178b-444d-bd10-73377dbaa66d';
```

## Single Migration

One migration with:
1. `CREATE OR REPLACE FUNCTION` for all 5 triggers, adding `agent_id` filtering
2. `DELETE` orphan notifications for the affected user

## Technical Detail

- Tables involved: `notifications`, `profiles`, `agent_users`
- The `NEW` row (from policies, payments, clients, customer_signatures) already has `agent_id` set by the `auto_set_agent_id` trigger which fires BEFORE INSERT
- The notification INSERT already has `auto_set_agent_id` trigger, but explicitly passing `agent_id` is safer

