
# خطة: تحسين تقرير التجديدات + إضافة رابط لملف العميل

## المشكلتان

### 1. رابط إلى ملف العميل
في جدول التجديدات، عند النقر على اسم العميل، يجب فتح ملف العميل مباشرة.

### 2. إزالة العملاء الذين جددوا بالفعل
العميل "احمد محمود سالم" يظهر في قائمة التجديدات لأن لديه وثائق انتهت في `2026-01-31` و `2026-02-04`، **لكنه فعلياً جدد وثائق جديدة لنفس السيارة** تبدأ من `2026-02-01` وتنتهي `2027-01-31`.

المشكلة في دالة `report_renewals` أنها لا تتحقق من وجود وثائق أحدث لنفس السيارة.

---

## الحل التقني

### 1. إضافة رابط إلى ملف العميل

**الملف:** `src/pages/PolicyReports.tsx`

```typescript
// في السطور 1104-1110 - تحويل اسم العميل إلى رابط قابل للنقر
<TableCell onClick={(e) => e.stopPropagation()}>
  <div>
    <button
      onClick={() => window.location.href = `/clients?open=${client.client_id}`}
      className="font-medium hover:text-primary hover:underline transition-colors text-right"
    >
      {client.client_name}
    </button>
    {client.client_file_number && (
      <p className="text-xs text-muted-foreground">{client.client_file_number}</p>
    )}
  </div>
</TableCell>
```

---

### 2. تحديث دالة `report_renewals` لاستبعاد الوثائق المجددة

**المنطق الجديد:**
- للكل وثيقة منتهية، نتحقق هل يوجد وثيقة **أحدث** لنفس السيارة ونفس نوع التأمين
- إذا وُجدت وثيقة أحدث (start_date أكبر) → نستبعد الوثيقة القديمة من التقرير

**تحديث الـ SQL:**

```sql
CREATE OR REPLACE FUNCTION public.report_renewals(...)
RETURNS TABLE(...)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_offset integer;
  v_total bigint;
  v_policy_type public.policy_type_parent;
BEGIN
  v_offset := (p_page - 1) * p_page_size;
  v_policy_type := NULLIF(p_policy_type, '')::public.policy_type_parent;

  -- Count total distinct clients (only those without renewed policies)
  SELECT COUNT(DISTINCT c.id)
  INTO v_total
  FROM policies p
  JOIN clients c ON c.id = p.client_id
  WHERE p.deleted_at IS NULL
    AND p.cancelled IS NOT TRUE
    AND p.transferred IS NOT TRUE
    AND (p_start_date IS NULL OR p.end_date >= p_start_date)
    AND (p_end_date IS NULL OR p.end_date <= p_end_date)
    AND (v_policy_type IS NULL OR p.policy_type_parent = v_policy_type)
    AND (p_created_by IS NULL OR p.created_by_admin_id = p_created_by)
    AND (
      p_search IS NULL
      OR c.full_name ILIKE '%' || p_search || '%'
      OR c.phone_number ILIKE '%' || p_search || '%'
      OR c.file_number ILIKE '%' || p_search || '%'
      OR c.id_number ILIKE '%' || p_search || '%'
    )
    -- ⭐ NEW: Exclude policies that have been renewed (newer policy exists for same car + type)
    AND NOT EXISTS (
      SELECT 1 FROM policies newer
      WHERE newer.client_id = p.client_id
        AND newer.car_id = p.car_id
        AND newer.policy_type_parent = p.policy_type_parent
        AND newer.deleted_at IS NULL
        AND newer.cancelled IS NOT TRUE
        AND newer.transferred IS NOT TRUE
        AND newer.start_date > p.start_date  -- Newer policy
        AND newer.end_date > CURRENT_DATE    -- Still active
    );

  RETURN QUERY
  WITH client_policies AS (
    SELECT
      c.id as cid,
      c.full_name,
      c.file_number,
      c.phone_number,
      p.id as pid,
      p.end_date,
      p.insurance_price,
      p.policy_type_parent,
      COALESCE(prt.renewal_status, 'not_contacted') as rstatus,
      prt.notes as rnotes
    FROM policies p
    JOIN clients c ON c.id = p.client_id
    LEFT JOIN policy_renewal_tracking prt ON prt.policy_id = p.id
    WHERE p.deleted_at IS NULL
      AND p.cancelled IS NOT TRUE
      AND p.transferred IS NOT TRUE
      AND (p_start_date IS NULL OR p.end_date >= p_start_date)
      AND (p_end_date IS NULL OR p.end_date <= p_end_date)
      AND (v_policy_type IS NULL OR p.policy_type_parent = v_policy_type)
      AND (p_created_by IS NULL OR p.created_by_admin_id = p_created_by)
      AND (
        p_search IS NULL
        OR c.full_name ILIKE '%' || p_search || '%'
        OR c.phone_number ILIKE '%' || p_search || '%'
        OR c.file_number ILIKE '%' || p_search || '%'
        OR c.id_number ILIKE '%' || p_search || '%'
      )
      -- ⭐ NEW: Exclude renewed policies
      AND NOT EXISTS (
        SELECT 1 FROM policies newer
        WHERE newer.client_id = p.client_id
          AND newer.car_id = p.car_id
          AND newer.policy_type_parent = p.policy_type_parent
          AND newer.deleted_at IS NULL
          AND newer.cancelled IS NOT TRUE
          AND newer.transferred IS NOT TRUE
          AND newer.start_date > p.start_date
          AND newer.end_date > CURRENT_DATE
      )
  ),
  aggregated AS (
    -- ... باقي المنطق كما هو
  )
  -- ...
END;
$function$
```

---

### 3. تحديث دالة `get_client_renewal_policies` أيضاً

نفس المنطق يُطبق على الدالة التي تجلب وثائق العميل المفصلة.

---

### 4. تحديث دالة `report_renewals_summary`

لضمان تطابق الأرقام في الملخص مع الجدول.

---

## ملخص التغييرات

| الملف/الدالة | التغيير |
|-------------|---------|
| `PolicyReports.tsx` | إضافة رابط للعميل قابل للنقر |
| `report_renewals` (SQL) | إضافة شرط NOT EXISTS لاستبعاد الوثائق المجددة |
| `get_client_renewal_policies` (SQL) | نفس شرط الاستبعاد |
| `report_renewals_summary` (SQL) | نفس شرط الاستبعاد |

---

## النتيجة المتوقعة

1. **النقر على اسم العميل** → يفتح ملفه في `/clients?open={client_id}`
2. **العميل "احمد محمود سالم"** → يختفي من قائمة التجديدات لأنه جدد بالفعل
3. **التقرير يعرض فقط** الوثائق التي تحتاج فعلاً للتجديد (لا يوجد بديل أحدث)
