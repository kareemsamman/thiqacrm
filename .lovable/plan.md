
# خطة: إصلاح ظهور العملاء المُجدَّدين في قائمة التجديدات

## المشكلة

العميلة **إيمان عليان** تظهر في تبويب "التجديدات" رغم أن جميع وثائقها تم تجديدها بالفعل:
- وثيقة ELZAMI: انتهت 31/01/2026 ← تم تجديدها لـ 31/01/2027
- وثيقة THIRD_FULL: انتهت 29/01/2026 ← تم تجديدها لـ 29/01/2027

عند النقر على الصف، يظهر "0 وثيقة" لأن دالة `get_client_renewal_policies` تستبعد الوثائق المُجددة بشكل صحيح، لكن الجدول الرئيسي لا يفعل ذلك.

---

## التشخيص

### السبب الجذري
الدالة `report_renewals` (7 معاملات) التي تُستخدم لعرض الجدول الرئيسي **لا تحتوي على شرط استبعاد الوثائق المُجددة**.

| الدالة | هل تستبعد المُجدَّدين؟ |
|--------|------------------------|
| `report_renewals` (7 params) - الجدول الرئيسي | ❌ لا |
| `get_client_renewal_policies` - تفاصيل العميل | ✅ نعم |
| `report_renewals_summary` (TEXT) - البطاقات | ✅ نعم |

### الدليل
```sql
-- الدالة الحالية لا تحتوي على NOT EXISTS
CREATE OR REPLACE FUNCTION public.report_renewals(...)
  ...
  FROM policies p
  JOIN clients c ON c.id = p.client_id
  WHERE p.cancelled = false
    AND p.transferred = false
    -- ❌ لا يوجد شرط استبعاد المُجددين!
```

---

## الحل

### تحديث دالة `report_renewals` لإضافة شرط الاستبعاد

سيتم إضافة شرط `NOT EXISTS` لاستبعاد الوثائق التي لها وثيقة أحدث نشطة (نفس العميل + السيارة + نوع التأمين):

```sql
WHERE p.cancelled = false
  AND p.transferred = false
  AND p.deleted_at IS NULL
  -- ✅ إضافة: استبعاد الوثائق المُجددة
  AND NOT EXISTS (
    SELECT 1 FROM policies newer
    WHERE newer.client_id = p.client_id
      AND newer.car_id IS NOT DISTINCT FROM p.car_id
      AND newer.policy_type_parent = p.policy_type_parent
      AND newer.deleted_at IS NULL
      AND newer.cancelled = false
      AND newer.transferred = false
      AND newer.start_date > p.start_date
      AND newer.end_date > CURRENT_DATE
  )
```

**ملاحظة هامة**: استخدام `IS NOT DISTINCT FROM` بدلاً من `=` للمقارنة بين car_id لضمان التعامل الصحيح مع القيم NULL.

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| قاعدة البيانات (Migration) | تحديث دالة `report_renewals` |

---

## النتيجة المتوقعة

1. ✅ "إيمان عليان" والعملاء المُجدَّدون لن يظهروا في القائمة
2. ✅ تطابق الأرقام بين الجدول والبطاقات الإحصائية
3. ✅ عند النقر على عميل، ستظهر الوثائق المُنتهية الفعلية فقط
4. ✅ الأداء سيتحسن (استعلامات أقل لبيانات لا نحتاجها)

---

## التفاصيل التقنية

### الدالة المُحدَّثة الكاملة:

```sql
CREATE OR REPLACE FUNCTION public.report_renewals(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_policy_type text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_page_size integer DEFAULT 25,
  p_page integer DEFAULT 1
)
RETURNS TABLE(
  client_id uuid,
  client_name text,
  client_file_number text,
  client_phone text,
  policies_count integer,
  earliest_end_date date,
  days_remaining integer,
  total_insurance_price numeric,
  policy_types text[],
  policy_ids uuid[],
  car_numbers text[],
  worst_renewal_status text,
  renewal_notes text,
  total_count bigint
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset integer;
BEGIN
  v_offset := (p_page - 1) * p_page_size;

  RETURN QUERY
  WITH client_policies AS (
    SELECT
      c.id as cid,
      c.full_name as cname,
      c.file_number as cfile,
      c.phone_number as cphone,
      p.id as pid,
      p.end_date,
      p.insurance_price,
      p.policy_type_parent,
      COALESCE(prt.renewal_status, 'not_contacted') as rstatus,
      prt.notes as rnotes,
      car.car_number as car_num
    FROM policies p
    JOIN clients c ON c.id = p.client_id
    LEFT JOIN cars car ON car.id = p.car_id
    LEFT JOIN policy_renewal_tracking prt ON prt.policy_id = p.id
    WHERE p.cancelled = false
      AND p.transferred = false
      AND p.deleted_at IS NULL
      AND c.deleted_at IS NULL
      AND p.end_date >= COALESCE(p_start_date, p.end_date)
      AND p.end_date <= COALESCE(p_end_date, p.end_date)
      AND (
        NULLIF(p_policy_type, '') IS NULL
        OR p.policy_type_parent::text = NULLIF(p_policy_type, '')
      )
      AND (p_created_by IS NULL OR p.created_by_admin_id = p_created_by)
      AND (
        p_search IS NULL
        OR c.full_name ILIKE '%' || p_search || '%'
        OR c.phone_number ILIKE '%' || p_search || '%'
        OR c.file_number ILIKE '%' || p_search || '%'
        OR c.id_number ILIKE '%' || p_search || '%'
        OR car.car_number ILIKE '%' || p_search || '%'
      )
      -- ✅ استبعاد الوثائق المُجددة (وجود وثيقة أحدث)
      AND NOT EXISTS (
        SELECT 1 FROM policies newer
        WHERE newer.client_id = p.client_id
          AND newer.car_id IS NOT DISTINCT FROM p.car_id
          AND newer.policy_type_parent = p.policy_type_parent
          AND newer.deleted_at IS NULL
          AND newer.cancelled = false
          AND newer.transferred = false
          AND newer.start_date > p.start_date
          AND newer.end_date > CURRENT_DATE
      )
  ),
  aggregated AS (
    SELECT
      cp.cid,
      cp.cname,
      cp.cfile,
      cp.cphone,
      COUNT(*)::integer as pcount,
      MIN(cp.end_date) as min_end,
      (MIN(cp.end_date) - CURRENT_DATE)::integer as days_rem,
      SUM(COALESCE(cp.insurance_price, 0)) as total_price,
      ARRAY_AGG(DISTINCT cp.policy_type_parent::text) 
        FILTER (WHERE cp.policy_type_parent IS NOT NULL) as ptypes,
      ARRAY_AGG(cp.pid) as pids,
      ARRAY_AGG(DISTINCT cp.car_num) 
        FILTER (WHERE cp.car_num IS NOT NULL) as car_nums,
      -- أسوأ حالة (أولوية: لم يتم التواصل > SMS > اتصال > غير مهتم > مُجدَّد)
      CASE
        WHEN bool_or(cp.rstatus = 'not_contacted') THEN 'not_contacted'
        WHEN bool_or(cp.rstatus = 'sms_sent') THEN 'sms_sent'
        WHEN bool_or(cp.rstatus = 'called') THEN 'called'
        WHEN bool_or(cp.rstatus = 'not_interested') THEN 'not_interested'
        ELSE 'renewed'
      END as worst_status,
      STRING_AGG(cp.rnotes, '; ') 
        FILTER (WHERE cp.rnotes IS NOT NULL) as notes_agg
    FROM client_policies cp
    GROUP BY cp.cid, cp.cname, cp.cfile, cp.cphone
  ),
  counted AS (
    SELECT COUNT(*) OVER() as total FROM aggregated
  )
  SELECT
    a.cid,
    a.cname,
    a.cfile,
    a.cphone,
    a.pcount,
    a.min_end,
    a.days_rem,
    a.total_price,
    a.ptypes,
    a.pids,
    a.car_nums,
    a.worst_status,
    a.notes_agg,
    (SELECT total FROM counted LIMIT 1)
  FROM aggregated a
  ORDER BY a.min_end ASC
  LIMIT p_page_size
  OFFSET v_offset;
END;
$$;
```
