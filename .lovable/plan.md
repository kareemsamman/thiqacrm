
# إصلاح 3 مشاكل في صفحة المصروفات (سندات القبض والصرف)

## المشاكل

1. **عمود "بواسطة" يعرض "-" دائماً** للسندات المولّدة من بوليصات/دفعات: السبب أن الاستعلام لا يجلب `created_by_admin_id` ولا يربطه بجدول `profiles` للحصول على اسم المستخدم.

2. **لا يوجد فلتر بتاريخ محدد**: حالياً يمكن فقط التنقل بين الأشهر، لكن لا يمكن اختيار نطاق تاريخ محدد (من - إلى).

3. **الترتيب والتاريخ خاطئ**: عمود "التاريخ" يعرض `expense_date` (تاريخ الدفع) وعمود "وقت الإنشاء" يعرض نفس القيمة لأن السندات المولّدة تستخدم `payment_date` كقيمة `created_at`. يجب استخدام `created_at` الحقيقي من قاعدة البيانات والترتيب بحسبه.

## الحل

### 1. جلب اسم المنشئ لكل أنواع السندات

- **دفعات البوليصات (`policy_payments`)**: إضافة `created_at, created_by_admin_id, creator:profiles!policy_payments_created_by_admin_id_fkey(full_name)` للاستعلام
- **مستحقات الشركات (`policies`)**: إضافة `created_at, creator:profiles!policies_created_by_admin_id_fkey(full_name)` للاستعلام  
- **عمولات إلزامي (`policies`)**: نفس الإضافة

### 2. استخدام `created_at` الحقيقي من قاعدة البيانات

بدل `created_at: pp.payment_date` يصبح `created_at: pp.created_at` للدفعات، وبدل `created_at: p.start_date` يصبح `created_at: p.created_at` للبوليصات.

### 3. إضافة فلتر تاريخ (من - إلى)

إضافة حقلين `ArabicDatePicker` للتاريخ (من / إلى) في منطقة الفلاتر. عند اختيار تاريخ، يتم تصفية النتائج على مستوى العميل (client-side) بناءً على `created_at`.

---

## التفاصيل التقنية

### ملف: `src/pages/Expenses.tsx`

**1. تعديل استعلام `policy_payments` (سطر ~183):**

اضافة `created_at` و `creator:profiles!policy_payments_created_by_admin_id_fkey(full_name)` في الـ select

**2. تعديل استعلام `policies` للمستحقات (سطر ~193):**

اضافة `created_at, creator:profiles!policies_created_by_admin_id_fkey(full_name)` في الـ select

**3. تعديل استعلام `policies` للإلزامي (سطر ~204):**

نفس الإضافة

**4. تعديل تحويل `policyExpenses` (سطر ~245):**

```js
created_at: pp.created_at,  // بدل pp.payment_date
created_by_name: pp.creator?.full_name || null,
```

**5. تعديل تحويل `companyDueExpenses` (سطر ~271):**

```js
created_at: p.created_at,  // بدل p.start_date
created_by_name: p.creator?.full_name || null,
```

**6. تعديل تحويل `elzamiVouchers` (سطر ~299):**

```js
created_at: p.created_at,  // بدل p.start_date
created_by_name: p.creator?.full_name || null,
```

**7. إضافة متغيرات حالة لفلتر التاريخ (بعد سطر ~106):**

```js
const [dateFrom, setDateFrom] = useState<string>('');
const [dateTo, setDateTo] = useState<string>('');
```

**8. إضافة حقول التاريخ في منطقة الفلاتر (بعد سطر ~658):**

إضافة صف جديد بحقلين `ArabicDatePicker` (من / إلى) مع زر "مسح" لإعادة تعيين الفلتر.

**9. تعديل فلترة النتائج (سطر ~329):**

إضافة فلتر client-side يصفي بحسب `created_at` عندما يكون `dateFrom` أو `dateTo` محددين.

**10. تحديث الترتيب:**

الترتيب الرئيسي يصبح بحسب `created_at` تنازلياً (الأحدث أولاً) لأن هذا ما يريده المستخدم.

### لا تغييرات في قاعدة البيانات
