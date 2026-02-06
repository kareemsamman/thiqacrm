

# تحويل نظام تسديد الديون إلى نموذج المحفظة الموحد

## الفكرة

بدلاً من توزيع الدفعات على كل وثيقة (policy_payments)، سيتم:
- تسجيل الدفعة مباشرة على **العميل** (client_payments)
- الرصيد = إجمالي أسعار الوثائق - إجمالي دفعات العميل - المرتجعات

### الفرق بين النظامين

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                     النظام الحالي (Policy-Centric)                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   وثيقة #1 (₪3,000)      وثيقة #2 (₪5,000)     وثيقة #3 (₪2,000)        │
│        │                      │                      │                  │
│        ▼                      ▼                      ▼                  │
│   دفعة ₪3,000            دفعة ₪4,000            دفعة ₪1,000             │
│   (policy_payments)      (policy_payments)      (policy_payments)       │
│                                                                         │
│   المتبقي = ₪0           المتبقي = ₪1,000       المتبقي = ₪1,000        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                   النظام المقترح (Wallet-Centric)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                        ┌─────────────────┐                              │
│                        │   العميل        │                              │
│                        │  إجمالي الوثائق │                              │
│                        │    ₪10,000      │                              │
│                        └────────┬────────┘                              │
│                                 │                                       │
│                                 ▼                                       │
│                   ┌─────────────────────────┐                           │
│                   │    محفظة العميل         │                           │
│                   │  إجمالي الدفعات ₪8,000  │                           │
│                   │ (client_payments table) │                           │
│                   └─────────────────────────┘                           │
│                                 │                                       │
│                                 ▼                                       │
│                   إجمالي المتبقي = ₪2,000                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## خطوات التنفيذ

### 1. إنشاء جدول جديد `client_payments`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `client_id` | UUID | FK → clients |
| `amount` | NUMERIC | مبلغ الدفعة |
| `payment_type` | TEXT | cash/cheque/visa/transfer |
| `payment_date` | DATE | تاريخ الدفع |
| `cheque_number` | TEXT | رقم الشيك (إن وُجد) |
| `cheque_image_url` | TEXT | صورة الشيك |
| `notes` | TEXT | ملاحظات |
| `refused` | BOOLEAN | مرفوض؟ |
| `branch_id` | UUID | FK → branches |
| `created_by_admin_id` | UUID | من أنشأها |
| `created_at` | TIMESTAMPTZ | وقت الإنشاء |

### 2. تحديث RPC `get_client_balance`

```sql
CREATE OR REPLACE FUNCTION get_client_balance(p_client_id UUID)
RETURNS TABLE(
  total_insurance NUMERIC,
  total_paid NUMERIC,
  total_refunds NUMERIC,
  total_remaining NUMERIC
)
AS $$
BEGIN
  RETURN QUERY
  WITH policy_totals AS (
    SELECT COALESCE(SUM(insurance_price), 0) as total_ins
    FROM policies
    WHERE client_id = p_client_id
      AND cancelled = false
      AND transferred = false
      AND deleted_at IS NULL
      AND broker_id IS NULL
  ),
  payment_totals AS (
    SELECT COALESCE(SUM(amount), 0) as total_pay
    FROM client_payments          -- ← الجدول الجديد
    WHERE client_id = p_client_id
      AND refused = false
  ),
  refund_totals AS (
    SELECT COALESCE(SUM(amount), 0) as total_ref
    FROM customer_wallet_transactions
    WHERE client_id = p_client_id
      AND transaction_type IN ('refund', 'transfer_refund_owed', 'manual_refund')
  )
  SELECT 
    pt.total_ins,
    pay.total_pay,
    ref.total_ref,
    GREATEST(0, pt.total_ins - pay.total_pay - ref.total_ref)
  FROM policy_totals pt, payment_totals pay, refund_totals ref;
END;
$$ LANGUAGE plpgsql STABLE;
```

### 3. تعديل نافذة تسديد الديون

- **إزالة** منطق توزيع الدفعات على الوثائق
- **تبسيط** الواجهة: فقط أدخل المبلغ + نوع الدفع + التاريخ
- **إضافة** الدفعة مباشرة لجدول `client_payments`

### 4. تحديث واجهات العرض

- **صفحة العميل**: إظهار "سجل الدفعات" من جدول `client_payments`
- **متابعة الديون**: استخدام RPC الموحد `get_client_balance`

---

## المميزات

| الميزة | النظام الحالي | النظام الجديد |
|--------|---------------|---------------|
| سهولة الإدخال | ❌ معقد (توزيع) | ✅ بسيط (مبلغ واحد) |
| دقة الحسابات | ⚠️ قد تتضارب | ✅ مصدر واحد |
| سرعة الأداء | ⚠️ JOINs متعددة | ✅ أسرع |
| التقارير | ❌ صعب التجميع | ✅ سهل |

---

## التأثير على البيانات الحالية

**ملاحظة هامة:** البيانات الحالية في `policy_payments` ستبقى كما هي للتاريخ. سيتم:
1. ترحيل الدفعات القديمة بحساب المجموع لكل عميل
2. أو الاحتفاظ بالجدولين معاً (hybrid approach) لفترة انتقالية

---

## ملخص التغييرات التقنية

| الملف/المكون | التغيير |
|--------------|---------|
| **Database Migration** | إنشاء `client_payments` + تحديث `get_client_balance` |
| `DebtPaymentModal.tsx` | تبسيط ليكتب على `client_payments` مباشرة |
| `ClientDetails.tsx` | تحديث `fetchPayments` لقراءة من الجدول الجديد |
| `DebtTracking.tsx` | بدون تغيير (يستخدم RPC) |
| `useDebtCount.tsx` | بدون تغيير (يستخدم RPC) |

