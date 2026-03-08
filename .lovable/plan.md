

## Problem

The browser tab shows "AB" because `useSiteSettings()` queries `site_settings` without filtering by `agent_id`. It grabs the first (and only) row, which has `site_title = "AB"` for agent `8149eee0...`. On Thiqa super admin pages, it should show "Thiqa" instead.

## Fix

**`src/hooks/useSiteSettings.tsx`** — Update the query to scope by current agent context:

1. Import `useAgentContext` to get the current `agentId` and `isThiqaSuperAdmin`.
2. If `isThiqaSuperAdmin` (not impersonating), return `null` from the query so the fallback "Thiqa" in `SiteHelmet` kicks in.
3. If there's an `agentId`, filter the query with `.eq('agent_id', agentId)`.
4. Add `agentId` and `isThiqaSuperAdmin` to the `queryKey` so it re-fetches correctly when switching contexts.

This ensures:
- **Super admin (no impersonation)** → title = "Thiqa" (fallback)
- **Super admin impersonating agent** → title = agent's custom title
- **Regular agent user** → title = their agent's custom title

