
# خطة: إصلاح حساب المتبقي في شاشة عرض الوثائق

## المشكلة

عند عرض الباقة في Timeline، يظهر "متبقي ₪1,200" رغم أن المبلغ مدفوع بالكامل:

**تفاصيل الباقة:**
- إلزامي: سعر ₪1,000
- ثالث: سعر ₪1,200
- المجموع: ₪2,200

**الدفعات:**
- ₪1,000 + ₪1,200 = ₪2,200 (كلها مسجلة على وثيقة الإلزامي)

**المشكلة في الكود الحالي:**
```typescript
// خطأ: يحسب المتبقي لكل وثيقة على حدة ثم يجمع
pkg.allPolicyIds.forEach(id => {
  const policyRemaining = paymentInfo[id]?.remaining || 0;
  totalRemaining += Math.max(0, policyRemaining); // ← المشكلة هنا!
});
```

**الحساب الخاطئ:**
- إلزامي: مدفوع ₪2,200، سعر ₪1,000 → متبقي = -₪1,200 → يتحول إلى **0** بسبب Math.max
- ثالث: مدفوع ₪0، سعر ₪1,200 → متبقي = **₪1,200**
- المجموع: 0 + 1,200 = **₪1,200** ❌

**الحساب الصحيح (كما يفعل الـ Drawer):**
- إجمالي السعر: ₪2,200
- إجمالي المدفوع: ₪2,200
- المتبقي: ₪2,200 - ₪2,200 = **₪0** ✅

---

## الحل

### تعديل `getPackagePaymentStatus` في `PolicyYearTimeline.tsx`

```typescript
const getPackagePaymentStatus = (pkg: PolicyPackage) => {
  // Sum total paid across all package policies
  let totalPaid = 0;
  
  pkg.allPolicyIds.forEach(id => {
    totalPaid += paymentInfo[id]?.paid || 0;
  });
  
  // Calculate remaining as package total - all payments
  // This is the correct way for packages (same as drawer)
  const remaining = Math.max(0, pkg.totalPrice - totalPaid);
  const isPaid = remaining <= 0 && pkg.totalPrice > 0;
  
  return { totalPaid, remaining, isPaid };
};
```

---

## ملخص التغيير

| الملف | التغيير |
|-------|---------|
| `src/components/clients/PolicyYearTimeline.tsx` | تصحيح حساب المتبقي ليكون إجمالي الباقة - إجمالي المدفوع |

---

## النتيجة المتوقعة

1. ✅ عند دفع كامل مبلغ الباقة، يظهر "مسدد" بدلاً من "متبقي"
2. ✅ المتبقي يحسب على مستوى الباقة ككل وليس لكل وثيقة منفردة
3. ✅ تطابق الحساب بين Timeline و Drawer
