
# إصلاح مشكلة تسديد ديون العميل - عدم توافق العرض مع المنطق

## المشكلة المكتشفة

عند فتح نافذة "تسديد ديون" للعميل Kareem Test:
- **العرض يُظهر:** 300₪ متبقي للدفع
- **لكن عند إدخال 600₪:** النظام يقول "باقي 300" بدلاً من الاعتراف بالدفعة

### سبب المشكلة (تحليل البيانات)

**باقة مثال:** `4af2980e-f019-4a02-9024-a52e328340ec`

| الوثيقة | السعر | المدفوع | الحالة |
|---------|-------|---------|--------|
| ROAD_SERVICE | 300 | 1200 | ✅ مسدد + زيادة 900 |
| ELZAMI | 1200 | 0 | ❌ غير مسدد |

**ما يحدث في الكود:**

1. **حساب العرض:**
   - `fullPrice = 300 + 1200 = 1500`
   - `paidTotal = 1200 + 0 = 1200`
   - `remainingTotal = 1500 - 1200 = 300` ← **يُعرض 300₪**

2. **حساب الوثائق القابلة للدفع:**
   ```tsx
   // سطر 357-358
   const payablePolicies = componentsWithInternalRemaining.filter(
     p => p.policyType !== 'ELZAMI' && p.remaining > 0
   );
   ```
   - ROAD_SERVICE مسددة تماماً → **لا remaining**
   - ELZAMI مستبعد من المنطق → **لا يمكن الدفع له**
   - **النتيجة: payablePolicies = [] (فارغة!)**

3. **عند محاولة الدفع 600₪:**
   - `calculateSplitPayments(600)` تُرجع `[]` (لا وثائق تستقبل)
   - لا تُسجل أي دفعة
   - العرض يبقى "300 متبقي"

---

## الحل المقترح

### 1. تعديل حساب "المتبقي للعرض" ليستبعد ELZAMI

**الفكرة:** عرض فقط الدين القابل للدفع (non-ELZAMI) بدلاً من كامل الباقة

**الملف:** `src/components/debt/DebtPaymentModal.tsx`

#### سطر 329-331 (حساب remainingTotal)

**قبل:**
```tsx
const fullPrice = policyComponents.reduce((sum, p) => sum + p.price, 0);
const paidTotal = policyComponents.reduce((sum, p) => sum + p.paid, 0);
const remainingTotal = Math.max(0, fullPrice - paidTotal);
```

**بعد:**
```tsx
const fullPrice = policyComponents.reduce((sum, p) => sum + p.price, 0);
const paidTotal = policyComponents.reduce((sum, p) => sum + p.paid, 0);
const fullPackageRemaining = Math.max(0, fullPrice - paidTotal);

// For debt display: only show non-ELZAMI portion that's actually payable
// This follows the business rule: ELZAMI is excluded from wallet/debt
const nonElzamiPrice = policyComponents
  .filter(p => p.policyType !== 'ELZAMI')
  .reduce((sum, p) => sum + p.price, 0);

// Remaining debt = min(non-ELZAMI prices, total package remaining)
// This ensures we don't show ELZAMI debt as client debt
const remainingTotal = Math.max(0, Math.min(nonElzamiPrice, fullPackageRemaining));
```

### 2. تحديث فلتر الباقات بدون دين

**سطر 362-374**

تغيير الشرط من `remainingTotal > 0` إلى `payablePolicies.length > 0`:

```tsx
// Only include items that have payable policies (with actual debt to collect)
if (payablePolicies.length > 0) {
  items.push({
    // ... existing code
  });
}
```

---

## النتيجة المتوقعة

### قبل الإصلاح:
| الباقة | العرض | القابل للدفع | المشكلة |
|--------|-------|-------------|---------|
| ELZAMI+ROAD | 300₪ | 0₪ | ❌ العميل يحاول دفع 300 لكن لا يوجد وثيقة تستقبل |

### بعد الإصلاح:
| الباقة | العرض | القابل للدفع | الحالة |
|--------|-------|-------------|--------|
| ELZAMI+ROAD | 0₪ | 0₪ | ✅ الباقة لا تظهر (مسددة فعلياً) |

---

## ملخص التغييرات

| الملف | السطور | التغيير |
|-------|--------|---------|
| `DebtPaymentModal.tsx` | 329-331 | حساب `remainingTotal` بناءً على non-ELZAMI فقط |
| `DebtPaymentModal.tsx` | 362 | تغيير شرط العرض من `remainingTotal > 0` إلى `payablePolicies.length > 0` |

---

## التوافق مع قواعد العمل

هذا الإصلاح يتوافق مع:
- **ELZAMI-wallet-exclusion-rule:** ELZAMI لا يدخل في الدين
- **debt-tracking-management-v6:** Agency Debt = non-ELZAMI portion only
- **customer-wallet-model:** المدفوعات تُسجل فقط للوثائق غير ELZAMI

