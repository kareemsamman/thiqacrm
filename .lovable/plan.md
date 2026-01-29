
# Implementation Plan: Multiple Children / Additional Drivers per Customer

## Overview
Transform the current single additional driver (under24_driver) field into a multi-child/driver system with proper relational tables, reusable selection in Policy Wizard, and display in Invoices/PDF/SMS.

---

## Phase 1: Database Schema Changes

### A) New Table: `client_children`
```sql
CREATE TABLE public.client_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  id_number TEXT NOT NULL,
  birth_date DATE NULL,
  phone TEXT NULL,
  relation TEXT NULL,  -- ابن/ابنة/زوج/سائق إضافي
  notes TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (client_id, id_number)
);

CREATE INDEX idx_client_children_client_id ON public.client_children(client_id);
```

### B) New Table: `policy_children`
```sql
CREATE TABLE public.policy_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES client_children(id) ON DELETE RESTRICT,
  UNIQUE (policy_id, child_id)
);

CREATE INDEX idx_policy_children_policy_id ON public.policy_children(policy_id);
```

### C) RLS Policies
Apply branch-based isolation matching existing patterns:
- `client_children`: Access via parent client's branch
- `policy_children`: Access via parent policy's branch

### D) Migration of Existing Data
Migrate existing `under24_driver_name` and `under24_driver_id` from `clients` table into `client_children`:
```sql
INSERT INTO client_children (client_id, full_name, id_number, relation)
SELECT id, under24_driver_name, under24_driver_id, 'سائق إضافي'
FROM clients
WHERE under24_driver_name IS NOT NULL 
  AND under24_driver_id IS NOT NULL;
```

---

## Phase 2: UI Components

### A) New Component: `ClientChildrenManager.tsx`
A reusable component for managing children/additional drivers:
- Displays list of existing children in a compact table
- Add row button (+ إضافة سائق/تابع)
- Each row has: Name*, ID Number*, Birth Date, Relation dropdown, Phone, Remove button
- Inline validation (name + ID required, valid Israeli ID)
- Delete protection: show warning if child is linked to any policy

### B) Update `ClientDrawer.tsx`
- Replace single under24 driver fields with `ClientChildrenManager`
- Keep `under24_type` for backward compatibility (none/client/additional_driver)
- When `under24_type = additional_driver`, show children manager
- Save logic: upsert children, handle removals

### C) Update `CreateClientForm.tsx` (Policy Wizard)
- When `under24_type = additional_driver`, show inline children manager
- Support adding multiple children during policy creation
- Store pending children in wizard state

---

## Phase 3: Policy Wizard Integration

### A) Update Wizard State (`usePolicyWizardState.ts`)
Add new state:
```typescript
const [clientChildren, setClientChildren] = useState<ClientChild[]>([]);
const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
const [newChildren, setNewChildren] = useState<NewChildForm[]>([]);
```

### B) New Component: `PolicyChildrenSelector.tsx`
Display after client selection in Step 1:
- Show existing children as checkboxes for multi-select
- "Add new child" button that adds inline form
- New children are added to both `client_children` and selected for policy

### C) Save Logic Updates
On policy save:
1. Insert any new children to `client_children`
2. Replace rows in `policy_children` (delete + insert selected)

---

## Phase 4: Invoice & PDF Updates

### A) Update `generate-invoices` Edge Function
Fetch policy children:
```typescript
const { data: policyChildren } = await supabase
  .from('policy_children')
  .select(`
    id,
    child:client_children(full_name, id_number, birth_date, relation)
  `)
  .eq('policy_id', policy_id);
```

Add to metadata:
```typescript
additional_drivers: policyChildren?.map(pc => ({
  name: pc.child.full_name,
  id_number: pc.child.id_number,
  birth_date: pc.child.birth_date,
  relation: pc.child.relation
})) || []
```

### B) Update Invoice Template Placeholders
Add `{{additional_drivers}}` placeholder that renders as:
```html
<!-- Arabic -->
<h4>السائقين الإضافيين / التابعين</h4>
<ul>
  {{#each additional_drivers}}
  <li>{{name}} - {{id_number}}</li>
  {{/each}}
</ul>
```

### C) Update SMS Templates
Include children names in renewal/invoice SMS if present.

---

## Phase 5: Types & Exports

### A) New Types
```typescript
interface ClientChild {
  id: string;
  client_id: string;
  full_name: string;
  id_number: string;
  birth_date: string | null;
  phone: string | null;
  relation: string | null;
  notes: string | null;
}

interface PolicyChild {
  id: string;
  policy_id: string;
  child_id: string;
  child?: ClientChild;
}

const RELATION_OPTIONS = [
  { value: 'ابن', label: 'ابن' },
  { value: 'ابنة', label: 'ابنة' },
  { value: 'زوج', label: 'زوج' },
  { value: 'زوجة', label: 'زوجة' },
  { value: 'سائق إضافي', label: 'سائق إضافي' },
  { value: 'أخرى', label: 'أخرى' },
];
```

---

## Technical Considerations

### Backward Compatibility
- Keep existing `under24_type`, `under24_driver_name`, `under24_driver_id` fields in `clients` table (don't remove)
- UI will use new `client_children` table going forward
- Migration script populates `client_children` from legacy fields

### Branch Isolation (RLS)
```sql
-- client_children: inherit from parent client
CREATE POLICY "Branch users can manage client_children"
ON public.client_children FOR ALL TO authenticated
USING (
  is_active_user(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM clients c 
    WHERE c.id = client_children.client_id 
    AND can_access_branch(auth.uid(), c.branch_id)
  )
);

-- policy_children: inherit from parent policy
CREATE POLICY "Branch users can manage policy_children"
ON public.policy_children FOR ALL TO authenticated
USING (
  is_active_user(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM policies p 
    WHERE p.id = policy_children.policy_id 
    AND can_access_branch(auth.uid(), p.branch_id)
  )
);
```

### Delete Protection
- `policy_children.child_id` uses `ON DELETE RESTRICT` to prevent deleting children that are linked to policies
- UI shows warning message when attempting to delete a linked child

---

## Files to Create/Modify

### New Files
1. `supabase/migrations/[timestamp]_add_client_children_tables.sql`
2. `src/components/clients/ClientChildrenManager.tsx`
3. `src/components/policies/wizard/PolicyChildrenSelector.tsx`
4. `src/types/clientChildren.ts`

### Modified Files
1. `src/components/clients/ClientDrawer.tsx` - Add children section
2. `src/components/policies/wizard/CreateClientForm.tsx` - Replace single driver with children manager
3. `src/components/policies/wizard/Step1BranchTypeClient.tsx` - Add children selector after client selection
4. `src/components/policies/wizard/usePolicyWizardState.ts` - Add children state
5. `src/components/policies/wizard/types.ts` - Add children types
6. `src/components/policies/PolicyWizard.tsx` - Save children on policy creation
7. `supabase/functions/generate-invoices/index.ts` - Fetch and include children
8. `src/integrations/supabase/types.ts` - Auto-updated by schema change

---

## Acceptance Criteria Checklist

- [ ] Customer can add/remove multiple children on create/edit
- [ ] Duplicate ID numbers prevented per customer
- [ ] Policy wizard shows customer's children for selection
- [ ] Policy wizard allows adding new children inline
- [ ] Adding child in policy also saves to customer
- [ ] Invoice/PDF shows selected children for that policy
- [ ] SMS templates can include children names
- [ ] RLS/branch isolation enforced
- [ ] Mobile responsive UI
- [ ] RTL layout preserved
