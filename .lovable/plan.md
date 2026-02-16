

# إضافة تاريخ الإصدار في 3 أماكن

## المشكلة
1. **معالج إنشاء الوثيقة (Step3)**: حقل تاريخ الإصدار موجود فقط لنوع `THIRD_FULL`، المطلوب إظهاره لجميع الأنواع وتحريكه ليكون قبل تواريخ البداية/النهاية
2. **تعديل الباقة (PackagePolicyEditModal)**: لا يوجد حقل تاريخ الإصدار. المطلوب إضافته لكل مكون في الباقة، والقيمة الافتراضية = تاريخ البدء
3. **تعديل وثيقة مفردة (PolicyEditDrawer)**: الحقل حالياً يظهر فقط لـ `THIRD_FULL`، المطلوب إظهاره لجميع الأنواع

## التعديلات

### 1. Step3PolicyDetails.tsx - نقل الحقل وجعله لجميع الأنواع
- نقل حقل "تاريخ الإصدار" من بعد التواريخ إلى **قبل** حقول البداية/النهاية
- إزالة شرط `policy.policy_type_parent === 'THIRD_FULL'` ليظهر لجميع الأنواع
- الافتراضي يبقى = تاريخ البداية

### 2. PackagePolicyEditModal.tsx - إضافة issue_date لكل مكون
- إضافة `issueDate` في `EditState` interface
- جلب `issue_date` من DB عند تحميل الباقة
- عرض حقل ArabicDatePicker لتاريخ الإصدار في كل مكون (بعد تاريخ البدء وقبل السعر)
- القيمة الافتراضية = `startDate` لكل مكون
- حفظ `issue_date` عند الضغط على "حفظ جميع التغييرات"

### 3. PolicyEditDrawer.tsx - إزالة شرط THIRD_FULL
- حقل تاريخ الإصدار يظهر لجميع أنواع الوثائق وليس فقط `THIRD_FULL`

## التفاصيل التقنية

### ملف `src/components/policies/wizard/Step3PolicyDetails.tsx`
- سطر 850-863: نقل block تاريخ الإصدار إلى قبل سطر 827 (قبل تواريخ البداية/النهاية)
- إزالة شرط `policy.policy_type_parent === 'THIRD_FULL'` من الحقل

### ملف `src/components/policies/PackagePolicyEditModal.tsx`
- سطر 99-103: إضافة `issueDate: string` في `EditState`
- سطر 161-178: إضافة `issue_date` في select query وتعبئة `issueDate` في `EditState`
- سطر 611-638: إضافة حقل ArabicDatePicker لتاريخ الإصدار بين start/end dates والسعر (يتحول إلى grid-cols-4)
- سطر 512-523: إضافة `issue_date` في استعلام التحديث

### ملف `src/components/policies/PolicyEditDrawer.tsx`
- إزالة شرط `formData.policy_type_parent === 'THIRD_FULL'` من حقل تاريخ الإصدار ليظهر لجميع الأنواع
- تحديث منطق الحفظ ليرسل `issue_date` لجميع الأنواع

### ملف `src/components/policies/PolicyDetailsDrawer.tsx`
- إزالة شرط `policy.policy_type_parent === 'THIRD_FULL'` لعرض تاريخ الإصدار لجميع الأنواع

