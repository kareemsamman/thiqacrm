

# إصلاح سعر المزامنة — إرسال سعر الخدمة بدل سعر العميل

## المشكلة
حالياً المزامنة ترسل `insurance_price` (السعر الذي يدفعه العميل لـ AB) كـ `sell_price` إلى X-Service. لكن المطلوب إرسال **سعر الخدمة** (ما يدفعه AB لمزود الخدمة) — وهو المخزن في `payed_for_company` على الوثيقة.

مثال: إذا العميل يدفع ₪500 لـ AB، و AB يدفع ₪250 لشركة خدمات الطريق، المطلوب إرسال ₪250 وليس ₪500.

## التغييرات المطلوبة

### 1. ملف `supabase/functions/bulk-sync-to-xservice/index.ts`
- إضافة `payed_for_company` إلى الـ select (سطر 55)
- تغيير `sell_price: policy.insurance_price` إلى `sell_price: policy.payed_for_company || 0` (سطر 118)

### 2. ملف `supabase/functions/sync-to-xservice/index.ts`
- إضافة `payed_for_company` إلى الـ select (سطر 59-60)
- تغيير `sell_price: policy.insurance_price` إلى `sell_price: policy.payed_for_company || 0` (سطر 129)

### 3. إعادة نشر الدالتين

---

## القسم التقني

العمود `payed_for_company` في جدول `policies` يحتوي على المبلغ الذي يدفعه AB لمزود الخدمة (شركة خدمات الطريق أو إعفاء رسوم الحادث). هذا هو نفس السعر الذي يضعه مدير X-Service في نظامه لكل خدمة.

التعديل بسيط: إضافة العمود للـ select واستخدامه بدل `insurance_price` في الـ payload.
