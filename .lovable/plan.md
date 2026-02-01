

# خطة: إصلاح دالة report_client_debts لحساب ديون الباقات بشكل صحيح

## المشكلة المكتشفة

### 1. تعارض في إصدارات الدوال
توجد نسختان من كل دالة في قاعدة البيانات:

| الدالة | النسخة المستخدمة (قديمة) | النسخة الجديدة (غير مستخدمة) |
|--------|--------------------------|------------------------------|
| `report_client_debts` | `(p_search, p_filter_days, p_limit, p_offset)` | `(p_branch_id, p_page, p_page_size, p_filter_days)` |
| `report_client_debts_summary` | `(p_search, p_filter_days)` | `(p_branch_id, p_filter_days)` |

التطبيق يستخدم النسخة القديمة، لكن الإصلاح طُبق على نسخة جديدة بتوقيع مختلف.

### 2. خلل في منطق الحساب (الدالة القديمة)
```sql
-- المشكلة: LEFT JOIN تكرر السعر لكل دفعة
SELECT SUM(p.insurance_price), SUM(pp.amount)
FROM policies p
LEFT JOIN policy_payments pp ON pp.policy_id = p.id
GROUP BY p.group_id
```

**مثال كريم Test:**
- الإلزامي: ₪5,555 مع دفعتين (5555 + 1000)
- LEFT JOIN تنتج صفين للإلزامي
- SUM(price) = 5555 + 5555 + 1000 + 500 = **₪12,610** ❌
- الصحيح: 5555 + 1000 + 500 = **₪7,055** ✓

---

## الحل

### Migration: تحديث الدالة القديمة بالتوقيع الصحيح

```sql
-- حذف النسخة القديمة بالتوقيع الصحيح
DROP FUNCTION IF EXISTS report_client_debts(text, integer, integer, integer);

-- إعادة إنشاء الدالة مع:
-- 1. فصل حساب الأسعار عن المدفوعات (CTEs منفصلة)
-- 2. استثناء أسعار الإلزامي من الديون
-- 3. تضمين كل المدفوعات على الباقة
CREATE OR REPLACE FUNCTION report_client_debts(
  p_search text DEFAULT NULL,
  p_filter_days integer DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
```

### المنطق الجديد:
```text
┌─────────────────────────────────────────────────────┐
│  CTE 1: group_prices                                │
│  حساب أسعار الباقة (بدون الإلزامي)                    │
│  SELECT group_id, SUM(price)                        │
│  WHERE policy_type_parent <> 'ELZAMI'               │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│  CTE 2: group_payments                              │
│  حساب المدفوعات على كل الباقة (بما فيها الإلزامي)    │
│  SELECT group_id, SUM(amount)                       │
│  -- يشمل كل policy_id في الباقة                      │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│  النتيجة: group_prices - group_payments             │
│  Remaining = MAX(0, 1500 - 7055) = ₪0 ✓            │
└─────────────────────────────────────────────────────┘
```

---

## الملفات المطلوب تعديلها

| الملف | التغيير |
|-------|---------|
| Migration SQL جديد | إعادة تعريف `report_client_debts` و `report_client_debts_summary` بالتوقيع الأصلي |
| حذف النسخ المكررة | إزالة النسخ الإضافية بالتوقيع الخاطئ |

---

## النتيجة المتوقعة

| العميل | قبل | بعد |
|--------|-----|-----|
| Kareem Test | ₪5,555 | ₪0 (لن يظهر) ✓ |
| إجمالي العملاء | 26 | أقل (بدون المسددين) |
| إجمالي الديون | ₪58,486 | رقم صحيح |

