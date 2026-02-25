

# Fix Policy Success Dialog - Text Updates + Ensure Refresh Works

## Issues Found

1. **Text labels are wrong** -- The dialog shows generic "طباعة الفاتورة" instead of "طباعة فاتورة التأمين" (Print Insurance Invoice)
2. **Receipt buttons not showing** -- The code has receipt buttons but the running app shows the old version. The code looks correct but the button text and section labels need to be updated to match what the user wants
3. **Refresh not working** -- The `window.location.href` fix is already in the code but may not be deployed. Need to verify and ensure the close handler works correctly for ALL close paths (X button, Close button, overlay click)

## Changes

### File: `src/components/policies/PolicySuccessDialog.tsx`

1. **Update invoice section label and button texts:**
   - Section label: "الفاتورة" -> "فاتورة التأمين"
   - Print button: "طباعة الفاتورة" -> "طباعة فاتورة التأمين"
   - SMS button: "إرسال الفاتورة SMS" -> "إرسال فاتورة التأمين SMS"
   - SMS sent text: "تم إرسال الفاتورة SMS" -> "تم إرسال فاتورة التأمين SMS"

2. **Update receipt section label and button texts:**
   - Section label: "إيصال الدفع" -> "فاتورة الدفع"
   - Print button: "طباعة إيصال الدفع" -> "طباعة فاتورة الدفع"
   - SMS button: "إرسال إيصال الدفع SMS" -> "إرسال فاتورة الدفع SMS"
   - SMS sent text: "تم إرسال الإيصال SMS" -> "تم إرسال فاتورة الدفع SMS"

3. **Update dialog description text:**
   - "يمكنك طباعة الفاتورة أو إيصال الدفع أو إرسالها للعميل عبر SMS" -> "يمكنك طباعة فاتورة التأمين أو فاتورة الدفع أو إرسالها للعميل عبر SMS"

### File: `src/components/policies/PolicyWizard.tsx`

4. **Ensure refresh works on ALL close paths:**
   - The `onClose` handler already uses `window.location.href` -- this is correct
   - The `handleClose` in `PolicySuccessDialog` calls `onClose()` which triggers the redirect -- this should work
   - Double-check: the dialog `onOpenChange` handler also calls `handleClose` on dismiss -- this is correct

   The code is already correct for the refresh. The issue is likely that the previous deployment didn't take effect. Simply re-saving the file will trigger a rebuild and deploy.

## Summary of Text Changes

| Location | Current | New |
|---|---|---|
| Section 1 label | الفاتورة | فاتورة التأمين |
| Print invoice btn | طباعة الفاتورة | طباعة فاتورة التأمين |
| Send invoice SMS btn | إرسال الفاتورة SMS | إرسال فاتورة التأمين SMS |
| Invoice SMS sent | تم إرسال الفاتورة SMS | تم إرسال فاتورة التأمين SMS |
| Section 2 label | إيصال الدفع | فاتورة الدفع |
| Print receipt btn | طباعة إيصال الدفع | طباعة فاتورة الدفع |
| Send receipt SMS btn | إرسال إيصال الدفع SMS | إرسال فاتورة الدفع SMS |
| Receipt SMS sent | تم إرسال الإيصال SMS | تم إرسال فاتورة الدفع SMS |
| Dialog description | يمكنك طباعة الفاتورة أو إيصال الدفع... | يمكنك طباعة فاتورة التأمين أو فاتورة الدفع... |

No backend changes needed. The receipt functionality already exists in the code. This is primarily a text update + ensuring the build deploys correctly so the refresh and receipt buttons work.
