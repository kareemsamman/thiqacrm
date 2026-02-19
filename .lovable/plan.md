

# Fix: Inline Edit Row — Columns and Buttons Not Visible

## Problem
When editing a row, the inline edit controls (Select, DatePicker, Input) expand the row width beyond the visible area. The Save/Cancel buttons are in the last column which gets pushed off-screen, and there's no way to scroll to them easily.

## Solution
Two changes to fix this:

### 1. Make the Actions column sticky
Pin the "Actions" column to the left side of the table so Save/Cancel buttons are always visible during editing, regardless of horizontal scroll position.

### 2. Make inline edit controls more compact
Reduce widths of all inline edit inputs to prevent excessive row expansion:
- Client name input: `w-28` (keep)
- Car type select: `w-24` instead of `w-28`
- Insurance type select: `w-24`
- Company select: `w-28` instead of `w-32`
- Number inputs: `w-20` (keep)
- Date pickers: already `compact`

---

## Technical Details

### File: `src/pages/CompanySettlementDetail.tsx`

**1. Sticky Actions column (header + cells):**
- `TableHead` for Actions: add `sticky left-0 bg-background z-10`
- `TableCell` for Actions: add `sticky left-0 bg-background z-10`

This ensures Save/Cancel are always visible on the left side (RTL layout means `left-0` is the trailing edge).

**2. Reduce input widths** slightly to minimize horizontal overflow.

**3. No database changes, no new files.**

