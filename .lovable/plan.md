

# Rebrand to Thiqa (ثقة) — Light Professional Design

## Overview
Replace all "AB Insurance / AB تأمين" branding with "Thiqa" (ثقة), use the uploaded SVG logo, apply the blurred gradient background to the login page, and refine the color palette for a clean, light, professional look.

## Files to Change

### 1. Copy uploaded assets into project
- Copy `Group_2.svg` → `src/assets/thiqa-logo.svg`
- Copy `SCR-20260107-hrpn_1.png` → `public/images/thiqa-bg.png` (login background)

### 2. `index.html` — Update title, meta, favicon
- Title: `ثقة للتأمين`
- Description: `نظام إدارة التأمين`
- Remove old favicon/OG image references (SiteHelmet handles dynamic ones)

### 3. `src/index.css` — Refined light color palette
- Shift primary from teal (`174 72% 40%`) to a refined deep blue-indigo (`225 65% 50%`) for a more professional feel
- Keep the light background, adjust accent colors to complement
- Subtle refinements to card shadows, glass effect

### 4. `src/pages/Login.tsx` — Full redesign
- Split-screen layout: left side = blurred gradient background image with Thiqa logo overlay, right side = login form
- Use the SVG logo instead of "AB" text fallback
- Update default text from "AB تأمين" → "ثقة للتأمين"
- Clean, minimal card design on the right

### 5. `src/components/layout/Sidebar.tsx` — Logo update
- Import the Thiqa SVG logo
- Replace "AB" text fallback with the SVG logo
- Update default title from "AB تأمين" → "ثقة للتأمين"

### 6. Edge functions & other hardcoded references (~10 files)
Update all "AB Insurance" / "AB تأمين" strings to "Thiqa" / "ثقة للتأمين" in:
- `supabase/functions/send-signature-sms/index.ts`
- `supabase/functions/signature-page/index.ts`
- `supabase/functions/test-smtp/index.ts`
- `supabase/functions/process-cheque-scan/index.ts`
- `supabase/functions/generate-correspondence-html/index.ts`
- `supabase/functions/sync-whatsapp-chat/index.ts`
- `src/components/clients/ClientDetails.tsx`
- `src/pages/Expenses.tsx`

### 7. `src/pages/BrandingSettings.tsx` — No structural changes
The branding settings page already supports dynamic logo/title. Just the default fallbacks update.

## Color Palette (New)
```
--primary: 225 65% 50%        (professional blue)
--primary-foreground: 0 0% 100%
--accent: 225 50% 55%
--ring: 225 65% 50%
--sidebar-primary: 225 65% 50%
```

All other colors (background, card, muted, destructive, success, warning) stay light and clean — minor tweaks only.

## No structural/DB changes needed — purely visual rebrand.

