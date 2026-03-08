

# Multi-Tenant SaaS Transformation Plan

## Scope Assessment

This is a major architectural transformation affecting **every table, every RLS policy, every query, and every UI component** in the system. The codebase has:

- **40+ database tables** that need `agent_id`
- **100+ RLS policies** that need rewriting
- **3 core security functions** (`can_access_branch`, `is_active_user`, `has_role`) that need agent-awareness
- **60+ edge functions** that query data without agent scoping
- **All frontend queries** that insert/filter data

This cannot be done in one step. It must be phased.

---

## Phase 1: Database Foundation (Migration)

### New Tables

```sql
-- 1. Agents table
CREATE TABLE public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ar text,
  email text UNIQUE NOT NULL,
  phone text,
  logo_url text,
  plan text NOT NULL DEFAULT 'basic'
    CHECK (plan IN ('basic', 'pro')),
  subscription_status text NOT NULL DEFAULT 'active'
    CHECK (subscription_status IN ('active', 'suspended', 'expired')),
  subscription_expires_at timestamptz,
  monthly_price numeric DEFAULT 300,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Agent-User mapping
CREATE TABLE public.agent_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)  -- each user belongs to exactly one agent
);

-- 3. Feature flags per agent
CREATE TABLE public.agent_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  enabled boolean DEFAULT true,
  UNIQUE(agent_id, feature_key)
);

-- 4. Subscription payment log
CREATE TABLE public.agent_subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  plan text NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  received_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz DEFAULT now()
);
```

### Add `agent_id` Column to All Business Tables

Tables that need `agent_id uuid REFERENCES agents(id)`:

**Core business data:**
- `clients`, `cars`, `policies`, `policy_payments`, `policy_groups`
- `insurance_companies`, `pricing_rules`, `insurance_categories`
- `brokers`, `broker_settlements`, `broker_settlement_items`
- `company_settlements`, `company_settlement_items`
- `ab_ledger`, `expenses`

**Supporting data:**
- `branches`, `profiles`, `user_roles`
- `client_payments`, `client_debits`, `client_notes`, `client_children`
- `customer_wallet_transactions`, `customer_signatures`
- `car_accidents`, `accident_reports`, `accident_third_parties`
- `accident_report_files`, `accident_report_notes`, `accident_report_reminders`
- `correspondence_letters`, `business_contacts`
- `cheque_reminders`, `sms_logs`, `automated_sms_log`
- `notifications`, `tasks`, `media_files`
- `road_services`, `accident_fee_services`
- `company_road_service_prices`, `company_accident_fee_prices`
- `company_accident_templates`
- `auth_settings`, `site_settings`, `xservice_settings`
- `form_templates`, `invoice_templates`
- `repair_claims`, `lead_chats`, `lead_notes`

All columns will be `nullable` initially (to not break existing data), then backfilled.

### Core Security Functions Update

The key insight: instead of rewriting every RLS policy individually, we update the **3 core helper functions** to be agent-aware, plus add a new `get_user_agent_id()` function:

```sql
-- Get agent_id for current user
CREATE OR REPLACE FUNCTION public.get_user_agent_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT agent_id FROM agent_users WHERE user_id = _user_id LIMIT 1
$$;

-- Updated can_access_branch: also checks agent_id match
-- Updated is_active_user: also checks agent subscription
-- Updated has_role: scoped to agent
```

Then add a **universal RLS helper**:

```sql
CREATE OR REPLACE FUNCTION public.agent_matches(
  _user_id uuid, _row_agent_id uuid
) RETURNS boolean ...
```

Every existing RLS policy gets an additional `AND agent_matches(auth.uid(), agent_id)` clause.

---

## Phase 2: RLS Policy Updates

All ~100 existing RLS policies need updating. The pattern is consistent — add `agent_matches` check to every policy. This will be done via a single large migration that:

1. Drops all existing policies
2. Recreates them with agent scoping
3. Adds policies for the 4 new tables

Thiqa super admin bypasses agent scoping (sees everything).

---

## Phase 3: Auth & Context Changes

### `useAuth.tsx` Updates
- After login, fetch `agent_users` to get `agent_id`
- Fetch `agents` row to check `subscription_status`
- Fetch `agent_feature_flags` for the agent
- Expose `agentId`, `agentPlan`, `agentFeatures`, `isThiqaSuperAdmin` in context
- If subscription expired/suspended → redirect to `/subscription-expired` page

### New `useAgentFeatures` Hook
- Returns which features are enabled for the current agent
- Used by Sidebar to hide/show nav items
- Used by route guards to block direct URL access

### `ProtectedRoute` / `AdminRoute` Updates
- Check subscription status before allowing access
- Check feature flags for feature-gated routes

---

## Phase 4: Frontend — Agent Scoping

### Every insert/mutation needs `agent_id`
- All `supabase.from('clients').insert(...)` calls must include `agent_id`
- Create a helper: `useAgentInsert()` or modify existing mutation patterns
- This affects ~50+ files across the app

### Sidebar (`Sidebar.tsx`)
- Add `featureKey` property to NavItem interface
- Filter items by `agent_feature_flags`
- Add new "إدارة ثقة" (Thiqa Admin) group, visible only to `thiqa_super_admin`

---

## Phase 5: Thiqa Super Admin Panel (New Pages)

### New Pages
1. **`/thiqa/agents`** — Agents list table with status, plan, expiry
2. **`/thiqa/agents/:agentId`** — Agent detail: edit info, toggle features, record payment, extend subscription
3. **`/thiqa/payments`** — All subscription payments log
4. **`/thiqa/agents/new`** — Create agent form (creates agent + auth user)

### New Components
- `ThiqaAdminRoute` — route guard for thiqa super admin only
- `AgentDrawer` — create/edit agent
- `AgentFeatureFlagsEditor` — toggle features per agent
- `SubscriptionPaymentModal` — record cash payment

---

## Phase 6: Edge Functions

All ~60 edge functions that query business data need `agent_id` scoping. Most will get it from the authenticated user's JWT → `agent_users` lookup. This is the largest effort after the RLS migration.

---

## Implementation Order

Given the massive scope, I recommend implementing in this order:

1. **Migration 1**: Create new tables (agents, agent_users, agent_feature_flags, agent_subscription_payments)
2. **Migration 2**: Add `agent_id` column to all existing tables (nullable, no FK constraint yet)
3. **Migration 3**: Create helper functions (`get_user_agent_id`, `agent_matches`)
4. **Auth context**: Update `useAuth` to fetch agent info
5. **Subscription gate**: Block expired agents
6. **Feature flag system**: Hook + sidebar integration
7. **Thiqa Admin pages**: Build the admin panel
8. **Migration 4**: Update all RLS policies with agent scoping
9. **Frontend mutations**: Add agent_id to all inserts
10. **Edge functions**: Add agent scoping

**Estimated total: 8-12 implementation rounds.**

Shall I proceed with steps 1-4 first (database foundation + auth context)?

