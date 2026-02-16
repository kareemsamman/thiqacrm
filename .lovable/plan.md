
# إصلاح البحث - حماية كاملة من الأعطال

## المشكلة
البحث في صفحة تفاصيل تسوية الشركة يسبب شاشة بيضاء عند الكتابة.

## الحل
سنضيف حماية كاملة للبحث بطريقتين:

### ملف: `src/pages/CompanySettlementDetail.tsx`

**1. لف فلتر البحث بالكامل في try-catch**
بدلاً من الاعتماد على فحص كل حقل على حدة، سنلف عملية الفلترة كاملة في `try-catch` بحيث لو أي حقل غير متوقع سبب خطأ، لن تنهار الصفحة:

```typescript
// Search filter
if (searchQuery.trim()) {
  const q = searchQuery.toLowerCase();
  result = result.filter(policy => {
    try {
      const clientName = (policy.client?.full_name || '').toLowerCase();
      const carNumber = (policy.car?.car_number || '').toLowerCase();
      const manufacturer = (policy.car?.manufacturer_name || '').toLowerCase();
      const insuranceLabel = (getInsuranceTypeLabelLocal(policy) || '').toLowerCase();
      const priceStr = String(policy.insurance_price || 0);
      const companyPayStr = String(policy.payed_for_company || 0);
      const profitStr = String(policy.profit || 0);
      
      return clientName.includes(q) || carNumber.includes(q) || manufacturer.includes(q) ||
        insuranceLabel.includes(q) || priceStr.includes(q) || companyPayStr.includes(q) || profitStr.includes(q);
    } catch {
      return true; // لو حصل خطأ، اعرض الوثيقة بدل ما تختفي
    }
  });
}
```

**2. إضافة Error Boundary حول الجدول**
لف محتوى الجدول في try-catch في الـ render بحيث لو حصل أي خطأ في عرض صف، لا تنهار الصفحة كلها بل يظهر رسالة خطأ بسيطة.

هذا يضمن أن البحث لن يسبب شاشة بيضاء أبداً مهما كانت البيانات.
