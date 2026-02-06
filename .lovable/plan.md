
# خطة تحويل النظام إلى محفظة العميل (Customer Wallet)

## ملخص التغيير

تحويل النظام من **الدفع على الوثائق** إلى **الدفع على محفظة العميل**، حيث تصبح المحفظة المصدر الوحيد للحسابات المالية.

---

## القاعدة المحاسبية الجديدة

```text
رصيد المحفظة = مجموع (أسعار غير الإلزامي) - مجموع (الدفعات)

┌─────────────────────────────────────────────────────────────┐
│  ELZAMI (إلزامي)          →  لا يدخل المحفظة نهائياً       │
│  THIRD/FULL/ROAD/ADDON    →  يُضاف كدين على المحفظة        │
│  كل الدفعات              →  تُخصم من المحفظة مباشرة        │
└─────────────────────────────────────────────────────────────┘
```

---

## المرحلة 1: قاعدة البيانات

### 1.1 جدول جديد: `client_payments`

```sql
CREATE TABLE client_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payment_type TEXT NOT NULL, -- cash, cheque, transfer, visa
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  cheque_number TEXT,
  cheque_image_url TEXT,
  notes TEXT,
  refused BOOLEAN DEFAULT FALSE,
  tranzila_transaction_id TEXT,
  branch_id UUID REFERENCES branches(id),
  created_by_admin_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.2 جدول جديد: `client_debits`

```sql
CREATE TABLE client_debits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  policy_id UUID REFERENCES policies(id),
  amount NUMERIC NOT NULL,
  description TEXT,
  branch_id UUID REFERENCES branches(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.3 RPC جديدة: `get_client_wallet_balance`

```sql
CREATE FUNCTION get_client_wallet_balance(p_client_id UUID)
RETURNS TABLE (
  total_debits NUMERIC,    -- مجموع الديون (non-ELZAMI)
  total_credits NUMERIC,   -- مجموع الدفعات
  total_refunds NUMERIC,   -- المرتجعات
  wallet_balance NUMERIC   -- الرصيد النهائي
) AS $$
  SELECT 
    COALESCE(SUM(d.amount), 0) AS total_debits,
    COALESCE((SELECT SUM(amount) FROM client_payments 
              WHERE client_id = p_client_id AND refused IS NOT TRUE), 0) AS total_credits,
    COALESCE((SELECT SUM(amount) FROM customer_wallet_transactions 
              WHERE client_id = p_client_id), 0) AS total_refunds,
    (debits - credits - refunds) AS wallet_balance
  FROM client_debits d
  WHERE d.client_id = p_client_id;
$$;
```

### 1.4 Trigger: إضافة دين عند إنشاء وثيقة

```sql
CREATE FUNCTION add_policy_debit() RETURNS TRIGGER AS $$
BEGIN
  -- فقط إذا كانت الوثيقة ليست ELZAMI وليست broker deal
  IF NEW.policy_type_parent != 'ELZAMI' AND NEW.broker_id IS NULL THEN
    INSERT INTO client_debits (client_id, policy_id, amount, description, branch_id)
    VALUES (NEW.client_id, NEW.id, NEW.insurance_price, 
            'وثيقة: ' || NEW.policy_type_parent, NEW.branch_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## المرحلة 2: Frontend - إلغاء Step 4 من الـ Wizard

### 2.1 الملف: `src/components/policies/wizard/usePolicyWizardState.ts`

**التغييرات:**
- إزالة state الخاصة بـ `payments`
- إزالة `totalPaidPayments`, `remainingToPay`, `paymentsExceedPrice`
- تبسيط الـ pricing ليعرض فقط المعلومات

### 2.2 الملف: `src/components/policies/PolicyWizard.tsx`

**التغييرات:**
- إزالة Step 4 بالكامل
- تغيير عدد الخطوات من 4 إلى 3
- إزالة منطق إنشاء الدفعات عند الحفظ
- الحفظ ينشئ الوثيقة فقط + يضيف الدين للمحفظة تلقائياً

### 2.3 الملف: `src/components/policies/wizard/WizardStepper.tsx`

**التغييرات:**
- إزالة Step 4 من الـ steps array
- تحديث الـ UI ليعرض 3 خطوات فقط

### 2.4 حذف الملف: `src/components/policies/wizard/Step4Payments.tsx`

---

## المرحلة 3: Frontend - Customer Profile

### 3.1 الملف: `src/components/clients/ClientDetails.tsx`

**التغييرات:**
- إزالة `PackagePaymentModal` و `SinglePolicyPaymentModal`
- إزالة زر "دفع" من كل باقة/وثيقة
- تحديث `fetchPaymentSummary` ليستخدم `get_client_wallet_balance`
- إضافة قسم جديد لعرض رصيد المحفظة
- زر واحد فقط: "تسديد ديون" → يفتح `DebtPaymentModal`

### 3.2 الملف: `src/components/clients/PolicyTreeView.tsx`

**التغييرات:**
- إزالة أزرار الدفع من الباقات والوثائق
- إبقاء عرض المعلومات فقط (السعر، الشركة، التواريخ)
- إزالة استدعاء `PackagePaymentModal` و `SinglePolicyPaymentModal`

### 3.3 حذف الملفات:
- `src/components/clients/PackagePaymentModal.tsx`
- `src/components/clients/SinglePolicyPaymentModal.tsx`

---

## المرحلة 4: Frontend - تسديد الديون (Wallet-Only)

### 4.1 الملف: `src/components/debt/DebtPaymentModal.tsx`

**إعادة كتابة كاملة:**

```tsx
// الفكرة الجديدة:
// - لا يوجد عرض للوثائق/الباقات
// - فقط: رصيد المحفظة + إدخال مبلغ + حفظ

interface WalletPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  walletBalance: number;  // الرصيد المتبقي
  onSuccess: () => void;
}

// عند الحفظ:
// 1. إدخال record في client_payments
// 2. لا توزيع على وثائق
// 3. الرصيد يتحدث تلقائياً من get_client_wallet_balance
```

**الواجهة الجديدة:**
```text
┌─────────────────────────────────────────┐
│  تسديد ديون: أحمد محمد                 │
├─────────────────────────────────────────┤
│                                         │
│  إجمالي المتبقي: ₪2,500                │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ المبلغ: [___________] ₪        │   │
│  │ الطريقة: [نقدي ▼]              │   │
│  │ التاريخ: [اليوم ▼]             │   │
│  │ رقم الشيك: [_________] (اختياري)│  │
│  └─────────────────────────────────┘   │
│                                         │
│  [+ إضافة دفعة أخرى]                   │
│                                         │
│  [إلغاء]              [تسديد ₪X]       │
└─────────────────────────────────────────┘
```

---

## المرحلة 5: سجل الدفعات

### 5.1 الملف: `src/components/clients/ClientDetails.tsx` - قسم الدفعات

**التغييرات:**
- تغيير مصدر البيانات من `policy_payments` إلى `client_payments`
- إزالة عمود "الوثيقة" من الجدول
- عرض: التاريخ، المبلغ، الطريقة، الحالة

### 5.2 الملف: `src/components/clients/PaymentEditDialog.tsx`

**التغييرات:**
- تحديث ليعمل مع `client_payments` بدلاً من `policy_payments`

---

## المرحلة 6: تتبع الديون والتقارير

### 6.1 الملف: `src/pages/DebtTracking.tsx`

**التغييرات:**
- تحديث RPC call ليستخدم `get_client_wallet_balance`
- إزالة عرض تفاصيل الوثائق
- عرض: العميل، رصيد المحفظة، آخر دفعة

### 6.2 الملف: `src/hooks/useDebtCount.tsx`

**التغييرات:**
- تحديث ليحسب عدد العملاء برصيد محفظة > 0

### 6.3 RPC: `report_client_debts`

**تحديث:**
```sql
-- الحساب الجديد:
wallet_balance = SUM(client_debits.amount) 
               - SUM(client_payments.amount WHERE refused IS NOT TRUE)
               - SUM(customer_wallet_transactions.amount)
```

---

## المرحلة 7: Migration للبيانات الحالية

### 7.1 نقل الدفعات الحالية

```sql
-- 1. إنشاء client_debits من الوثائق الحالية
INSERT INTO client_debits (client_id, policy_id, amount, description, branch_id, created_at)
SELECT 
  p.client_id,
  p.id,
  p.insurance_price,
  'وثيقة قديمة: ' || p.policy_type_parent::text,
  p.branch_id,
  p.created_at
FROM policies p
WHERE p.policy_type_parent != 'ELZAMI'
  AND p.broker_id IS NULL
  AND p.deleted_at IS NULL
  AND p.cancelled = false;

-- 2. نقل الدفعات الحالية إلى client_payments
INSERT INTO client_payments (
  client_id, amount, payment_type, payment_date, 
  cheque_number, cheque_image_url, notes, refused,
  branch_id, created_by_admin_id, created_at
)
SELECT 
  pol.client_id,
  pp.amount,
  pp.payment_type,
  pp.payment_date,
  pp.cheque_number,
  pp.cheque_image_url,
  pp.notes,
  pp.refused,
  pp.branch_id,
  pp.created_by_admin_id,
  pp.created_at
FROM policy_payments pp
JOIN policies pol ON pp.policy_id = pol.id
WHERE pol.deleted_at IS NULL;
```

---

## ملخص الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `PolicyWizard.tsx` | إزالة Step 4، تبسيط الحفظ |
| `usePolicyWizardState.ts` | إزالة state الدفعات |
| `Step4Payments.tsx` | **حذف** |
| `ClientDetails.tsx` | تحديث لعرض المحفظة، إزالة دفع الباقات |
| `PolicyTreeView.tsx` | إزالة أزرار الدفع |
| `PackagePaymentModal.tsx` | **حذف** |
| `SinglePolicyPaymentModal.tsx` | **حذف** |
| `DebtPaymentModal.tsx` | إعادة كتابة (Wallet-only) |
| `PaymentEditDialog.tsx` | تحديث للعمل مع client_payments |
| `DebtTracking.tsx` | تحديث الحسابات |
| `useDebtCount.tsx` | تحديث الـ RPC |

---

## التسلسل المقترح للتنفيذ

1. **المرحلة 1**: إنشاء جداول DB الجديدة + RPCs
2. **المرحلة 2**: Migration للبيانات الحالية
3. **المرحلة 3**: تحديث DebtPaymentModal (Wallet-only)
4. **المرحلة 4**: تحديث ClientDetails (إزالة دفع الباقات)
5. **المرحلة 5**: تحديث PolicyWizard (إزالة Step 4)
6. **المرحلة 6**: تحديث التقارير والـ RPCs

---

## ملاحظات مهمة

- **لا نحذف** جدول `policy_payments` - نبقيه للتاريخ
- **الـ Ledger** (`ab_ledger`) يبقى كما هو لتتبع حسابات الشركات
- **Tranzila** يحتاج تحديث ليسجل في `client_payments` بدلاً من `policy_payments`
- **RLS policies** يجب تحديثها للجداول الجديدة

وما بدي اي اشي يتغير هلئ بالملفات والوثائق يعني بدنا ما نعمل اي مشكله للنظام ونخرب كلشي موجود بس بدنا نغير كيف طريقة الدفع والتعامل مع المدفوع بصير هلئ كلشي يتعامل مع المحفزه وليس مع جمع البوالص
