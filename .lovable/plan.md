
# خطة توحيد حساب الرصيد المتبقي (إجمالي المتبقي)

## المشكلة

ثلاثة أماكن مختلفة تحسب "إجمالي المتبقي" بطرق متباينة:

| المكان | المنطق الحالي | النتيجة |
|--------|--------------|---------|
| صفحة العميل | كل الوثائق - كل المدفوعات - المرتجعات | ₪10,098 |
| صفحة الديون | غير الإلزامي فقط - المدفوعات (منطق معقد للباقات) | ₪5,600 |
| SMS | حساب لكل وثيقة منفردة (تكرار في الباقات) | ₪18,198 |

---

## الحل: RPC موحدة كمصدر وحيد للحقيقة

### 1. إنشاء RPC جديدة: `get_client_balance`

```sql
CREATE OR REPLACE FUNCTION get_client_balance(p_client_id uuid)
RETURNS TABLE(
  total_insurance numeric,
  total_paid numeric,
  total_refunds numeric,
  total_remaining numeric,
  policy_count integer
)
```

**المنطق:**
```
total_insurance = SUM(ALL active policies insurance_price)
                  -- INCLUDING ELZAMI
                  -- EXCLUDING cancelled, deleted, transferred

total_paid = SUM(ALL non-refused payments)
             -- For ALL policies including ELZAMI

total_refunds = SUM(wallet transactions)
                -- refund + transfer_refund_owed + manual_refund
                -- MINUS transfer_adjustment_due

total_remaining = MAX(0, total_insurance - total_paid - total_refunds)
```

### 2. تعديل `report_client_debts` لاستخدام نفس المنطق

تحويل المنطق الحالي من "دين الوكالة" إلى "رصيد العميل الصافي":

**التغييرات:**
- إلغاء استثناء ELZAMI من الحسابات
- إلغاء استثناء broker policies (اختياري - حسب متطلبات العمل)
- إضافة خصم المرتجعات (wallet_transactions)
- إزالة منطق GREATEST/LEAST المعقد

### 3. تحديث Edge Functions

#### `send-manual-reminder/index.ts`:
- استبدال حساب كل policy على حدة
- استخدام إجمالي موحد من الـ RPC الجديدة

#### `send-bulk-debt-sms/index.ts`:
- نفس التغيير - استخدام الـ RPC الجديدة

---

## التغييرات التفصيلية

### Migration SQL الجديدة

```sql
-- 1. RPC لحساب رصيد عميل واحد
CREATE OR REPLACE FUNCTION get_client_balance(p_client_id uuid)
RETURNS TABLE(
  total_insurance numeric,
  total_paid numeric,
  total_refunds numeric,
  total_remaining numeric
)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH 
  -- All active policies (including ELZAMI)
  active_policies AS (
    SELECT p.id, p.insurance_price
    FROM policies p
    WHERE p.client_id = p_client_id
      AND p.cancelled = FALSE
      AND p.transferred = FALSE
      AND p.deleted_at IS NULL
      AND p.broker_id IS NULL  -- Exclude broker deals
  ),
  -- Sum of all prices
  policy_totals AS (
    SELECT 
      COALESCE(SUM(insurance_price), 0) AS total_insurance,
      COUNT(*) AS policy_count
    FROM active_policies
  ),
  -- All payments for these policies
  payment_totals AS (
    SELECT COALESCE(SUM(pp.amount), 0) AS total_paid
    FROM policy_payments pp
    JOIN active_policies ap ON ap.id = pp.policy_id
    WHERE COALESCE(pp.refused, FALSE) = FALSE
  ),
  -- Wallet transactions
  wallet_totals AS (
    SELECT COALESCE(SUM(
      CASE 
        WHEN transaction_type IN ('refund', 'transfer_refund_owed', 'manual_refund') 
        THEN amount
        WHEN transaction_type = 'transfer_adjustment_due' 
        THEN -amount
        ELSE 0 
      END
    ), 0) AS total_refunds
    FROM customer_wallet_transactions
    WHERE client_id = p_client_id
  )
  SELECT
    pt.total_insurance,
    pay.total_paid,
    wt.total_refunds,
    GREATEST(0, pt.total_insurance - pay.total_paid - wt.total_refunds)
  FROM policy_totals pt
  CROSS JOIN payment_totals pay
  CROSS JOIN wallet_totals wt;
END;
$$;

-- 2. تحديث report_client_debts لاستخدام نفس المنطق
DROP FUNCTION IF EXISTS report_client_debts(text, integer, integer, integer);

CREATE OR REPLACE FUNCTION report_client_debts(
  p_search text DEFAULT NULL,
  p_filter_days integer DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  client_id uuid,
  client_name text,
  client_phone text,
  total_insurance numeric,
  total_paid numeric,
  total_refunds numeric,
  total_remaining numeric,
  oldest_end_date date,
  days_until_oldest integer,
  policies_count integer,
  total_rows bigint
)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
-- [Implementation using same logic as get_client_balance]
-- Returns clients with total_remaining > 0
$$;
```

---

## الملفات المتأثرة

| الملف | نوع التغيير |
|-------|-------------|
| `supabase/migrations/XXXXXX_unified_balance.sql` | إنشاء - RPC جديدة + تحديث RPC الديون |
| `src/pages/DebtTracking.tsx` | تعديل - تحديث أسماء الحقول |
| `src/components/clients/ClientDetails.tsx` | تعديل - استخدام RPC بدلاً من الحساب المحلي |
| `supabase/functions/send-manual-reminder/index.ts` | تعديل - استخدام RPC للمجموع |
| `supabase/functions/send-bulk-debt-sms/index.ts` | تعديل - استخدام RPC للمجموع |
| `src/hooks/useDebtCount.tsx` | تعديل - تحديث أسماء الحقول |

---

## قواعد العمل الجديدة

1. **مصدر واحد للحقيقة**: الـ RPC `get_client_balance` هي المرجع الوحيد
2. **شمول الإلزامي**: كل الوثائق تُحسب (العميل دفع ثمن الإلزامي)
3. **خصم المرتجعات**: المرتجعات تُخصم دائماً من المتبقي
4. **لا تكرار**: الباقات تُحسب مرة واحدة كمجموع
5. **استثناء الوسطاء**: صفقات الوسطاء لا تدخل في دين العميل

---

## معايير القبول

- صفحة العميل وصفحة الديون والـ SMS تُظهر نفس "إجمالي المتبقي" ✅
- المجموع لا يتجاوز رصيد صفحة العميل ✅
- إضافة وثيقة للباقة لا تزيد المتبقي بشكل خاطئ ✅
- حذف دفعة ينقص المتبقي مرة واحدة فقط ✅

---

## ملاحظة هامة

إذا كان "دين الوكالة" (غير الإلزامي) مطلوباً للتقارير الداخلية:
- سيُحتفظ به كـ RPC منفصلة: `get_agency_debt`
- لن يُسمى أبداً "إجمالي المتبقي"
- سيُعرض بتسمية واضحة: "دين الوكالة (غير الإلزامي)"
