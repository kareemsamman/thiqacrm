

# إصلاح تكامل Rivhit API حسب التوثيق الرسمي

## المشكلة المكتشفة

بعد مقارنة الكود الحالي مع توثيق Rivhit API الرسمي (PDF)، وجدت خطأ في قراءة الاستجابة (Response parsing).

### بنية الاستجابة حسب التوثيق الرسمي:

```text
{
  "error_code": 0,
  "client_message": "",
  "debug_message": "",
  "data": {
    "document_type": 1,
    "document_number": 12345,
    "document_link": "https://...",
    "print_status": 0,
    "customer_id": 101
  }
}
```

### الكود الحالي (خاطئ):
```typescript
// يقرأ document_number من المستوى الأول - خطأ!
result.document_number
```

### الكود الصحيح:
```typescript
// يجب قراءته من داخل data
result.data.document_number
```

## التغييرات المطلوبة

### ملف: `supabase/functions/send-to-rivhit/index.ts`

| سطر | قبل | بعد |
|------|------|------|
| 104 | `result.error_code`, `result.document_number` | `result.error_code`, `result.data.document_number` |
| 106-111 | يقرأ `document_number` مباشرة | يقرأ من `result.data` |
| 116 | `result.error_description` | `result.debug_message` (حسب التوثيق) |

### التغييرات التفصيلية:

1. إصلاح قراءة رقم المستند من `result.data.document_number`
2. إصلاح قراءة رسالة الخطأ من `result.debug_message` بدل `result.error_description`
3. إضافة log لـ `result.data` و `result.debug_message` للتشخيص
4. إرجاع `document_link` (رابط PDF) في النتيجة أيضا

### بعد الإصلاح: اختبار مباشر

سأقوم بإرسال طلب تجريبي للتحقق من أن الاتصال يعمل بشكل صحيح مع التوكن المحدّث.

