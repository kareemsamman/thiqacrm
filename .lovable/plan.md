

# Simplify Accident Report Form - Upload-Based Workflow

## Current State
The accident report form has 8 tabs with many manual fields (accident details, owner/driver info, third party, damages, injuries, attachments, files, signature). The user fills everything digitally.

## New Workflow
After selecting a customer and policy, the form becomes a simple **file upload and gallery** page:
1. Select customer + policy (existing wizard - keep as-is)
2. Land on a simplified page with:
   - Policy info card (customer, car, company - keep)
   - Status dropdown + notes/reminders (keep)
   - **Main area**: File upload zone + gallery of all uploaded files
   - **Print button**: Opens a print view showing all image/PDF pages (excludes videos)
3. No more manual form fields (no accident details tab, no driver tab, no damages tab, etc.)

## What Changes

### AccidentReportForm.tsx - Major Rewrite
Remove all 8 tabs and their form fields. Replace with:
- Keep: header, policy info card, status dropdown, notes/reminders dialogs
- Keep: `AccidentFilesSection` component (already handles file uploads)
- Add: Video upload support (mp4, webm, mov) to the accepted file types
- Add: "Print All" button that opens a print-friendly view of all uploaded images/PDFs (excluding videos)
- Remove: All form state variables for accident details, driver info, damages, third parties, etc.
- Remove: Save/Submit logic for form fields (keep only file management + status + notes)

### AccidentFilesSection.tsx - Enhance
- Add video file support (mp4, webm, mov)
- Add a "Print All" button that generates a printable view
- Show video files with a video icon/thumbnail but mark them as "not printable"
- In print view: render each image full-page, embed PDFs page-by-page, skip videos

### Database
- No schema changes needed. The `accident_reports` table and `accident_report_files` table already exist and support this workflow.
- The form fields in `accident_reports` become optional/unused (they stay in the table but won't be filled from the UI anymore).

## Detailed UI Layout (New AccidentReportForm)

```text
+------------------------------------------+
| [Back] Accident Report                   |
|   Policy: XXX - Client - Car             |
|   [Status dropdown] [Notes] [Reminders]  |
+------------------------------------------+
| Policy Info Card (client, car, company)  |
+------------------------------------------+
|                                          |
| Upload Zone (drag & drop)                |
| [Choose Files]                           |
|                                          |
| Uploaded Files Grid:                     |
| [img1] [img2] [pdf1] [video1]           |
| [img3] [pdf2] ...                        |
|                                          |
| [Print All Pages]  (excludes videos)     |
+------------------------------------------+
```

## Print View Behavior
- Opens new window / print dialog
- Each image rendered full-width on its own "page"
- PDF pages rendered inline (using existing PdfJsViewer or img conversion)
- Videos are skipped with a note "Video file - not included in print"
- CSS `@media print` rules handle page breaks

## Files to Change

| File | Change |
|---|---|
| `src/pages/AccidentReportForm.tsx` | Remove all form tabs/fields, keep header + policy card + status + notes/reminders. Replace body with file upload section + print button |
| `src/components/accident-reports/AccidentFilesSection.tsx` | Add video support, add "Print All" button, add print-friendly gallery view |

## What We Keep
- AccidentReportWizard (customer + policy selection) - unchanged
- AccidentReports list page - unchanged
- Notes and reminders dialogs - unchanged
- Status management - unchanged
- The `accident_reports` DB row is still created to track status, notes, reminders

## What We Remove from UI
- Accident details tab (date, time, location, description)
- Owner/driver tab
- Third party tab
- Damages tab
- Old attachments tab (replaced by unified files section)
- Injured persons tab
- Signature tab
- Save draft / Submit buttons for form fields

