

# Fix Print Header Styling + PDF Page Extraction

## Problems

1. **Header page looks plain/ugly** - no borders, no proper card-style layout, just plain text centered on page
2. **PDF files fail to render in print** - shows red error "فشل في تحميل PDF" because pdf.js page rendering is failing (likely the canvas render call or worker initialization issue with pdfjs-dist v5)

## Changes

### AccidentFilesSection.tsx - Two fixes

#### Fix 1: Redesign the print header page
Replace the current plain header with a professional, bordered card-style layout:
- Add a proper bordered container with shadow effect
- AB Insurance logo/branding at top
- Clean table with alternating row colors and proper borders
- Larger, bolder typography
- Professional look matching an insurance document

#### Fix 2: Fix PDF page extraction
The issue is likely with pdfjs-dist v5 API differences. Fix the approach:
- Use `new Uint8Array(arrayBuffer)` for the data parameter (v5 requirement)
- Set the worker source correctly for v5 (`pdf.worker.min.mjs`)
- Add proper error handling with fallback: if pdf.js extraction fails, show a link instead of the red error
- Add a visual loading indicator while PDFs are being processed

### Updated Print Header Design

```text
+--------------------------------------------------+
|  ┌──────────────────────────────────────────┐     |
|  │        بلاغ حادث - AB Insurance          │     |
|  │  ────────────────────────────────────     │     |
|  │                                          │     |
|  │  رقم البلاغ:        11                   │     |
|  │  رقم البوليصة:      23232                │     |
|  │  تاريخ الحادث:      27/02/2026           │     |
|  │  العميل:            Kareem Test          │     |
|  │  المركبة:           21212121             │     |
|  │  شركة التأمين:      اراضي مقدسة          │     |
|  └──────────────────────────────────────────┘     |
+--------------------------------------------------+
```

Styled with:
- Bordered card with rounded corners and subtle shadow
- Header with background color band
- Table rows with alternating background
- Proper spacing and professional fonts

### PDF Fix Details

The current code uses:
```typescript
await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
```

pdfjs-dist v5 changed the render API. Will update to:
```typescript
const renderTask = page.render({ canvasContext: ctx, viewport });
await renderTask.promise;
```

Also ensure data is passed as `Uint8Array`:
```typescript
const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
```

## File to Change

| File | Change |
|---|---|
| `src/components/accident-reports/AccidentFilesSection.tsx` | Redesign print header HTML/CSS + fix pdf.js rendering for v5 |

