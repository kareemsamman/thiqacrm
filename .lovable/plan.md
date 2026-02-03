
# خطة: تسجيل جميع رسائل SMS المُرسلة عبر 019sms في سجل الرسائل

## المشكلة الحالية

صفحة "سجل الرسائل النصية" لا تعرض جميع الرسائل المرسلة عبر 019sms لأن العديد من Edge Functions تُرسل SMS ولكن **لا تُسجّل في جدول `sms_logs`**.

### تحليل المشكلة

| Edge Function | يُرسل SMS | يُسجّل في sms_logs |
|--------------|-----------|------------------|
| `send-invoice-sms` | ✅ | ❌ **غير مُسجّل** |
| `send-package-invoice-sms` | ✅ | ❌ **غير مُسجّل** |
| `send-sms` (يدوي) | ✅ | ⚠️ التسجيل من الـ caller |
| `cron-renewal-reminders` | ✅ | ❌ **غير مُسجّل** |
| `payment-result` | ✅ | ❌ **غير مُسجّل** |
| `send-signature-sms` | ✅ | ✅ مُسجّل |
| `send-renewal-reminders` | ✅ | ✅ مُسجّل |
| `send-marketing-sms` | ✅ | ✅ مُسجّل |

---

## الحل المقترح

إضافة تسجيل SMS في جميع الـ Edge Functions التي ترسل رسائل ولكن لا تسجّلها.

---

## التغييرات المطلوبة

### 1. تعديل `send-invoice-sms/index.ts`

بعد إرسال SMS بنجاح (سطر ~375)، إضافة:

```typescript
// Log to sms_logs
await supabase.from('sms_logs').insert({
  branch_id: policy.branch_id,
  client_id: policy.client_id,
  policy_id: policy_id,
  phone_number: cleanPhone,
  message: smsMessage,
  sms_type: 'invoice',
  status: 'sent',
  sent_at: new Date().toISOString(),
});
```

### 2. تعديل `send-package-invoice-sms/index.ts`

بعد إرسال SMS بنجاح (سطر ~352)، إضافة نفس التسجيل مع أول policy_id من الباقة.

### 3. تعديل `cron-renewal-reminders/index.ts`

إضافة تسجيل SMS بعد الإرسال الناجح:

```typescript
await supabase.from('sms_logs').insert({
  branch_id: policy.branch_id,
  client_id: policy.client_id,
  policy_id: policy.id,
  phone_number: cleanPhone,
  message: smsMessage,
  sms_type: 'reminder_1week', // أو حسب نوع التذكير
  status: smsSuccess ? 'sent' : 'failed',
  error_message: smsSuccess ? null : apiMessage,
  sent_at: new Date().toISOString(),
});
```

### 4. تعديل `payment-result/index.ts`

إضافة تسجيل بعد إرسال SMS تأكيد الدفع.

### 5. تعديل `send-sms/index.ts`

تسجيل الرسالة مباشرة داخل الـ Edge Function بدلاً من الاعتماد على الـ caller:

```typescript
// Log to sms_logs (after successful send)
await supabase.from('sms_logs').insert({
  phone_number: cleanPhone,
  message: message,
  sms_type: 'manual',
  status: 'sent',
  sent_at: new Date().toISOString(),
});
```

---

## تحديث نوع SMS الجديد

قد نحتاج إضافة أنواع جديدة لـ `sms_type` enum:
- `payment_confirmation` - تأكيد الدفع
- `payment_receipt` - إيصال الدفع

```sql
ALTER TYPE sms_type ADD VALUE 'payment_confirmation';
ALTER TYPE sms_type ADD VALUE 'payment_receipt';
```

---

## الملفات المتأثرة

| الملف | نوع التغيير |
|-------|-------------|
| `supabase/functions/send-invoice-sms/index.ts` | إضافة تسجيل SMS |
| `supabase/functions/send-package-invoice-sms/index.ts` | إضافة تسجيل SMS |
| `supabase/functions/cron-renewal-reminders/index.ts` | إضافة تسجيل SMS |
| `supabase/functions/payment-result/index.ts` | إضافة تسجيل SMS |
| `supabase/functions/send-sms/index.ts` | نقل التسجيل للداخل |
| قاعدة البيانات | إضافة قيم enum جديدة |
| `src/pages/SmsHistory.tsx` | إضافة أنواع SMS الجديدة للعرض |

---

## النتيجة المتوقعة

بعد التعديل:
- ✅ جميع رسائل الفواتير (invoices) ستظهر في السجل
- ✅ رسائل الباقات ستظهر
- ✅ تأكيدات الدفع ستظهر
- ✅ كل رسالة ستحتوي على النص الكامل للعرض
- ✅ ربط الرسالة بالعميل والوثيقة للتتبع

---

## ملخص

المشكلة ليست في صفحة العرض، بل في أن Edge Functions المسؤولة عن إرسال الفواتير والتذكيرات **لا تُسجّل الرسائل في قاعدة البيانات**. الحل هو إضافة `supabase.from('sms_logs').insert(...)` بعد كل عملية إرسال SMS ناجحة.
