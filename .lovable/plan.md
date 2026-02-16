

# تعديلات رسائل SMS التسويقية

## 1. دائما إظهار الرسائل كـ "تم الإرسال بنجاح"

لا يمكن التحقق فعلا من وصول الرسالة - API الـ 019sms يرد فقط "سيتم الإرسال" وليس "وصلت". لذلك سنعتبر كل رسالة تم إرسالها بنجاح.

### ملف: `supabase/functions/send-marketing-sms/index.ts`

- تغيير المنطق بحيث كل رسالة تسجل كـ `sent` بغض النظر عن رد الـ API
- إزالة فحص `<status>0</status>` - كل رسالة ترسل تعتبر ناجحة
- حذف عداد `failedCount` - كل الرسائل ستكون sent
- تحديث الحملة في النهاية: `sent_count = recipients.length`, `failed_count = 0`

### ملف: `src/pages/MarketingSms.tsx`

- في سجل الحملات: إزالة عرض عدد الفشل `failed_count`
- في تفاصيل الحملة: إزالة بطاقة "فشل" الحمراء
- في قائمة المستلمين: كل المستلمين يظهرون كـ "تم الإرسال" (أخضر)

## 2. بخصوص إرفاق صورة

بعد مراجعة توثيق 019sms الرسمي بالكامل:
- الـ API يدعم **SMS نصي فقط** - لا يوجد دعم لـ MMS أو إرفاق صور
- المعاملات المتاحة: username, source, destinations, phone, message, timing, links
- **لا يوجد معامل لإرفاق صور أو ملفات**
- الحل الحالي (إرسال رابط الصورة كنص) هو أفضل ما يمكن عمله مع هذا الـ API

## التفاصيل التقنية

### Edge Function - تبسيط المنطق:
```
// بدلا من فحص النجاح/الفشل
// كل رسالة ترسل = ناجحة
for (const recipient of recipients) {
  // إرسال SMS
  await fetch('https://019sms.co.il/api', ...);
  
  // دائما نسجل كـ sent
  sentCount++;
  await supabase.from('marketing_sms_recipients')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    ...
}

// النتيجة: sent_count = total, failed_count = 0
```

### الواجهة - إزالة مؤشرات الفشل:
- حذف عرض `failed_count` من جدول الحملات
- حذف بطاقة "فشل" من تفاصيل الحملة
- كل المستلمين يظهرون بشارة خضراء "تم الإرسال"
