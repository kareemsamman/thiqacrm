
# خطة: إصلاح تقرير PDF التجديدات

## المشاكل المكتشفة

### المشكلة 1: عدد الزبائن في PDF (83) لا يطابق الواجهة (77)

**السبب:**
- **الواجهة** تستخدم `report_renewals_summary` التي تستثني الزبائن الذين تم تجديدهم:
  ```sql
  FILTER (WHERE cs.client_status != 'renewed')
  ```
- **PDF** يستخدم `report_renewals_service` التي ترجع **جميع** الزبائن بما فيهم الـ 6 الذين تم تجديدهم

**الحل:** تعديل `report_renewals_service` لاستثناء الزبائن المجددين (renewed) من النتائج

---

### المشكلة 2: تفاصيل الوثائق مفقودة في PDF

**الحالي:** يظهر صف واحد لكل زبون مع أرقام السيارات والأنواع مجمعة
**المطلوب:** عرض كل وثيقة بشكل منفصل تحت الزبون (كما في الأكورديون)

**الحل:** إنشاء دالة جديدة تُرجع الوثائق الفردية لكل زبون، وتحديث HTML لعرضها

---

## التغييرات المطلوبة

### 1. تحديث دالة `report_renewals_service` (Database Migration)

```sql
-- إضافة شرط لاستثناء الزبائن المجددين
WHERE ...
  AND NOT EXISTS (
    SELECT 1 FROM policies newer
    WHERE newer.client_id = c.id
      AND newer.car_id IS NOT DISTINCT FROM p.car_id
      AND newer.policy_type_parent = p.policy_type_parent
      AND newer.cancelled = false
      AND newer.start_date > p.start_date
      AND newer.end_date > CURRENT_DATE
  )
```

### 2. إنشاء دالة جديدة `report_renewals_service_detailed`

```sql
-- ترجع الوثائق الفردية مع معلومات الزبون والشركة
CREATE FUNCTION report_renewals_service_detailed(
  p_end_month date,
  p_days_remaining int,
  p_policy_type text
)
RETURNS TABLE(
  client_id uuid,
  client_name text,
  client_file_number text,
  client_phone text,
  policy_id uuid,
  car_number text,
  policy_type_parent text,
  company_name_ar text,
  end_date date,
  days_remaining int,
  insurance_price numeric,
  renewal_status text
)
```

### 3. تحديث Edge Function `generate-renewals-report`

```typescript
// جلب البيانات التفصيلية بدلاً من المجمعة
const { data: policies } = await supabase.rpc('report_renewals_service_detailed', {
  p_end_month: `${month}-01`,
  p_days_remaining: days_filter,
  p_policy_type: policy_type
});

// تجميع الوثائق حسب الزبون
const clientsMap = new Map<string, { info: ClientInfo, policies: PolicyInfo[] }>();
```

### 4. تحديث HTML Template

```html
<!-- لكل زبون -->
<tr class="client-header">
  <td colspan="10">${client.name} - ${client.phone}</td>
</tr>
<!-- الوثائق تحت الزبون -->
<tr class="policy-row">
  <td></td>
  <td>السيارة: ${policy.car_number}</td>
  <td>${policy.policy_type}</td>
  <td>${policy.company}</td>
  <td>${policy.end_date}</td>
  <td>${policy.days_remaining} يوم</td>
  <td>₪${policy.price}</td>
  <td>${policy.status}</td>
</tr>
```

---

## ملخص الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| **Database Migration** | تحديث `report_renewals_service` لاستثناء المجددين + إنشاء دالة تفصيلية جديدة |
| `supabase/functions/generate-renewals-report/index.ts` | استخدام الدالة الجديدة + تحديث HTML Template |

---

## النتيجة المتوقعة

| قبل | بعد |
|-----|-----|
| 83 زبون في PDF | 77 زبون (يطابق الواجهة) |
| صف واحد لكل زبون | صفوف للوثائق تحت كل زبون |
| أنواع مجمعة: "إلزامي, ثالث/شامل" | كل وثيقة منفصلة بتفاصيلها |
