
# إصلاح مشكلة "فشل إرسال الطلب إلى Edge Function" - الرسائل الجماعية

## المشكلة المكتشفة

عند النقر على "إرسال" في نافذة الرسائل الجماعية، يظهر خطأ:
```
خطأ - Failed to send a request to the Edge Function
```

### دليل من السجلات:
```
OPTIONS | 404 | send-bulk-debt-sms
```

**السبب الجذري:**  
الـ Edge Function `send-bulk-debt-sms` **موجودة في الكود** لكنها **غير منشورة (NOT DEPLOYED)** على الخادم.

---

## الحل

### نشر Edge Function

الـ Function موجودة وصحيحة في:
- `supabase/functions/send-bulk-debt-sms/index.ts` ✅
- معرَّفة في `supabase/config.toml` ✅

**لا يوجد تغييرات في الكود** - فقط يجب نشر الـ Function.

---

## التفاصيل التقنية

### الـ Function تستخدم:
- `verify_jwt = true` - تتطلب مصادقة المستخدم
- تتصل بـ `sms_settings` للحصول على بيانات الـ SMS
- تستخدم RPC `report_client_debts` للحصول على العملاء المدينين
- ترسل رسائل عبر 019sms API

### الكود موجود ويعمل:
```typescript
// CORS headers ✅
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, ..."
};

// OPTIONS handler ✅
if (req.method === "OPTIONS") {
  return new Response("ok", { headers: corsHeaders });
}

// Auth verification ✅
const token = authHeader.replace("Bearer ", "");
const { data: { user }, error: authError } = await supabase.auth.getUser(token);
```

---

## النتيجة المتوقعة بعد النشر

- ✅ زر "إرسال" في الرسائل الجماعية يعمل
- ✅ إرسال رسائل تذكير لجميع العملاء المدينين
- ✅ تسجيل الرسائل في `sms_logs`
