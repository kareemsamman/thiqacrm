
# خطة إضافة الحقول الجديدة لمُعَيِّن القالب وإرفاق صور/ملفات للحوادث

## ملخص المتطلبات
1. إضافة الحقول الجديدة إلى قائمة الحقول في Template Mapper
2. تحديث Edge Function لتوليد PDF ليشمل الحقول الجديدة
3. إضافة واجهة رفع صور وملفات الحادث (صور السيارة، محاضر الشرطة، إلخ)

---

## الجزء الأول: إضافة الحقول الجديدة للـ Template Mapper

### الحقول المطلوب إضافتها:

| الحقل | المعرف | المجموعة |
|-------|--------|----------|
| اسم صاحب السيارة (إذا مختلف) | owner_name_override | المالك |
| هاتف صاحب السيارة (إذا مختلف) | owner_phone_override | المالك |
| درجة رخصة السائق | driver_license_grade | السائق |
| تاريخ إصدار رخصة السائق | driver_license_issue_date | السائق |
| رقم الشاصي | vehicle_chassis_number | المركبة |
| سرعة السيارة وقت الحادث | vehicle_speed_at_accident | الحادث |
| ملاحظات الموظف | employee_notes | التقرير |
| تاريخ توقيع الموظف | employee_signature_date | التقرير |
| توقيع العميل | customer_signature | التقرير |

### الملف: `src/pages/AccidentTemplateMapper.tsx`
إضافة الحقول الجديدة في مصفوفة `CANONICAL_FIELDS`

---

## الجزء الثاني: تحديث Edge Function

### الملف: `supabase/functions/generate-accident-pdf/index.ts`

1. تحديث interface `AccidentReport` ليشمل الحقول الجديدة
2. تحديث دالة `buildFieldValues()` لإضافة القيم الجديدة:
   - `owner_name_override` → من `report.owner_name`
   - `owner_phone_override` → من `report.owner_phone`
   - `driver_license_grade` → من `report.driver_license_grade`
   - `driver_license_issue_date` → من `report.driver_license_issue_date`
   - `vehicle_chassis_number` → من `report.vehicle_chassis_number`
   - `vehicle_speed_at_accident` → من `report.vehicle_speed_at_accident`
   - `employee_notes` → من `report.employee_notes`
   - `employee_signature_date` → من `report.employee_signature_date`
   - `customer_signature` → عرض صورة التوقيع إذا موجودة

---

## الجزء الثالث: إضافة واجهة رفع ملفات الحادث

### جدول `accident_report_files` (موجود مسبقاً)
يحتوي على:
- `accident_report_id` - معرف البلاغ
- `file_url` - رابط الملف
- `file_name` - اسم الملف
- `file_type` - نوع الملف (image/pdf)

### مكون جديد: `AccidentFilesSection.tsx`
Tab جديد في نموذج البلاغ لإدارة الملفات:
- استخدام مكون `FileUploader` الموجود
- عرض الملفات المرفقة حالياً مع إمكانية الحذف
- معاينة الصور والـ PDFs
- أنواع الملفات المدعومة: صور (jpg, png, webp) و PDF

### تحديث `AccidentReportForm.tsx`
- إضافة Tab جديد "الملفات والصور"
- عرض عدد الملفات المرفقة في الـ Tab

### تحديث `generate-accident-pdf/index.ts`
- استعلام عن الملفات المرفقة من `accident_report_files`
- إضافة قسم "المرفقات" في نهاية PDF (اختياري)
- أو إضافة صفحات إضافية للصور

---

## الملفات المتأثرة

| الملف | نوع التغيير |
|-------|-------------|
| `src/pages/AccidentTemplateMapper.tsx` | إضافة حقول جديدة |
| `supabase/functions/generate-accident-pdf/index.ts` | تحديث القيم والمرفقات |
| `src/components/accident-reports/AccidentFilesSection.tsx` | مكون جديد |
| `src/pages/AccidentReportForm.tsx` | إضافة Tab الملفات |

---

## سير العمل

```text
1. الموظف يفتح بلاغ الحادث
2. يملأ الحقول الجديدة (الشاصي، درجة الرخصة، إلخ)
3. ينتقل لـ Tab "الملفات والصور"
4. يرفع صور السيارة ومحاضر الشرطة
5. عند توليد PDF:
   - الحقول الجديدة تظهر في أماكنها المحددة بالقالب
   - المرفقات تظهر كصفحات إضافية (أو قسم منفصل)
```

---

## ملاحظات تقنية
- استخدام `FileUploader` الموجود مع `entityType: 'accident_report'`
- الملفات ترفع إلى Bunny CDN
- RLS على `accident_report_files` يجب التحقق منه
