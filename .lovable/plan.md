
# إزالة عمولة إلزامي لشركة + تقييد الوصول لصفحة المصاريف

## 1. إزالة "عمولة إلزامي لشركة" من صفحة المصاريف

سيتم إزالة سطور "عمولة إلزامي لشركة" (elzami_company_commission) بالكامل من صفحة المصاريف. هذا يشمل:

- حذف `elzami_company_commission: 'عمولة إلزامي لشركة'` من قاموس `paymentCategories` (سطر 67)
- حذف الكود الذي ينشئ سندات صرف للعمولة الإلزامية للشركة (سطور 302-321) - فقط الجزء الخاص بـ `ec_` (payment voucher)، مع الإبقاء على عمولة المكتب (receipt voucher `oc_`)
- تحديث حساب إجمالي سندات الصرف ليستثني عمولة الإلزامي للشركة (سطور 385-388) - فقط إضافة receipts من الإلزامي وليس payments
- تحديث حساب صافي الشهر (Net Balance) بعد إزالة هذا المكون

## 2. تقييد الوصول لصفحة المصاريف

حاليا الصفحة محمية بـ `AdminRoute` (للأدمن فقط). المطلوب إضافة وصول لـ `raghda@basheer-ab.com` حتى لو لم تكن أدمن.

- تعديل ملف `src/App.tsx`: تغيير الحماية من `AdminRoute` إلى `ProtectedRoute` مع إضافة فحص داخلي
- إضافة فحص في `src/pages/Expenses.tsx`: إذا المستخدم ليس أدمن وليس `raghda@basheer-ab.com` يتم إعادة توجيهه إلى الصفحة الرئيسية

## التفاصيل التقنية

### ملف: `src/pages/Expenses.tsx`

**إزالة عمولة إلزامي لشركة:**
- سطر 67: حذف `elzami_company_commission: 'عمولة إلزامي لشركة'`
- سطور 302-321: حذف كود إنشاء `ec_` vouchers (company elzami commission payment)
- سطور 385-388: تعديل حلقة `elzamiVouchers.forEach` لإضافة receipts فقط وليس payments

**تقييد الوصول:**
- إضافة فحص في بداية الصفحة:
```typescript
const EXPENSES_ALLOWED_EMAIL = 'raghda@basheer-ab.com';
const canAccessExpenses = isAdmin || user?.email === EXPENSES_ALLOWED_EMAIL;
if (!canAccessExpenses) return <Navigate to="/" replace />;
```

### ملف: `src/App.tsx`
- تغيير route `/expenses` من `AdminRoute` إلى `ProtectedRoute` (لأن الفحص التفصيلي سيكون داخل الصفحة نفسها)

### الملفات المتأثرة

| ملف | تغيير |
|------|--------|
| `src/pages/Expenses.tsx` | إزالة عمولة إلزامي لشركة + فحص صلاحية الوصول |
| `src/App.tsx` | تغيير من AdminRoute إلى ProtectedRoute |
