

# تحويل الفلاتر إلى اختيار متعدد (Multi-Select) في صفحة تسوية الشركات والفاتورة الضريبية

## ما سيتغير
حاليا الفلاتر (الوسيط، الشركة، نوع الوثيقة) تسمح باختيار عنصر واحد فقط. سيتم تحويلها إلى اختيار متعدد بحيث يمكنك مثلا اختيار 3 شركات و2 نوع وثيقة معا.

## شكل الفلتر الجديد
- كل فلتر سيعرض قائمة بها checkboxes بدل الاختيار الواحد
- الزر يعرض عدد العناصر المختارة (مثلا: "3 شركات")
- إذا لم يتم اختيار شيء يعرض "الكل"
- زر "مسح" داخل كل فلتر لإزالة الاختيار

## التفاصيل التقنية

### 1. إنشاء مكوّن `MultiSelectFilter` جديد (ملف جديد)
**ملف:** `src/components/shared/MultiSelectFilter.tsx`

مكون عام يقبل:
- `options: {value, label}[]`
- `selected: string[]`
- `onChange: (selected: string[]) => void`
- `placeholder: string` (مثلا "جميع الشركات")
- `label: string`

يستخدم Popover مع قائمة checkboxes داخلية وبحث نصي اختياري.

### 2. تحديث صفحة CompanySettlement
**ملف:** `src/pages/CompanySettlement.tsx`

- تغيير `selectedBroker: string` إلى `selectedBrokers: string[]`
- تغيير `selectedCompany: string` إلى `selectedCompanies: string[]`
- تغيير `selectedCategory: string` إلى `selectedCategories: string[]`
- تحديث كل Select إلى `MultiSelectFilter`
- تحديث استدعاءات RPC لتمرير المصفوفات
- تحديث استدعاء `generate-tax-invoice` لتمرير المصفوفات

### 3. تحديث دوال قاعدة البيانات (migration جديد)
تحديث الدوال التالية لقبول مصفوفات بدل قيمة واحدة:

**`report_company_settlement`:**
- `p_broker_id uuid` -> `p_broker_ids uuid[] DEFAULT NULL`
- `p_company_id uuid` -> `p_company_ids uuid[] DEFAULT NULL`
- `p_policy_type_parent` -> `p_policy_types policy_type_parent[] DEFAULT NULL`
- تحديث شروط WHERE لاستخدام `= ANY(...)` بدل `=`

**`report_company_settlement_company_options`:**
- نفس التغييرات للبارامترات المشتركة

### 4. تحديث Edge Function للفاتورة الضريبية
**ملف:** `supabase/functions/generate-tax-invoice/index.ts`

- تغيير `company_id` إلى `company_ids: string[] | null`
- تغيير `policy_type` إلى `policy_types: string[] | null`
- إضافة `broker_ids: string[] | null` (حاليا غير موجود في الفاتورة)
- تحديث استعلام الوثائق ليستخدم `.in()` بدل `.eq()` عند وجود مصفوفة
- تحديث عنوان الفاتورة ليعرض أسماء الشركات المختارة

### ترتيب التنفيذ
1. إنشاء مكون `MultiSelectFilter`
2. تنفيذ migration لتحديث دوال SQL
3. تحديث `CompanySettlement.tsx` (الفلاتر + استدعاءات RPC + استدعاء الفاتورة)
4. تحديث `generate-tax-invoice/index.ts` (قبول المصفوفات)
5. نشر Edge Function

