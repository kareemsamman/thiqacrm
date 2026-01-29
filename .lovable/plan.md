

# خطة: إزالة التخزين المؤقت من صفحة العميل

## المشكلة
البيانات لا تتحدث بشكل فوري عند إجراء تغييرات على الوثائق أو الدفعات - هذا بسبب التخزين المؤقت (Cache) في النظام.

---

## آليات التخزين المؤقت الحالية

| الموقع | نوع الـ Cache | المدة | المفتاح |
|--------|---------------|-------|---------|
| PolicyDetailsDrawer | sessionStorage | 30 ثانية | `policy_cache_${policyId}` |
| FinancialReports | localStorage | 5 دقائق | `financial_reports_cache` |
| RecentClient | localStorage | دائم | `ab_recent_client` |
| PolicyWizard | sessionStorage | دائم | Draft key |

---

## الحل المقترح

### الخيار 1: إزالة التخزين المؤقت بالكامل (موصى به)
سأقوم بإزالة الـ cache من `PolicyDetailsDrawer` ليتم جلب البيانات الحية من قاعدة البيانات دائماً.

#### التغييرات:
1. **`PolicyDetailsDrawer.tsx`**:
   - إزالة قراءة الـ cache من `sessionStorage` في بداية `fetchPolicyDetails`
   - إزالة حفظ البيانات في الـ cache بعد الجلب
   - الإبقاء على عمليات مسح الـ cache للتوافق العكسي

### الخيار 2: زر تحديث يدوي
إضافة زر "تحديث" في صفحة العميل يمسح الـ cache ويجلب البيانات مجدداً.

---

## التفاصيل التقنية

### الكود الحالي (سيتم إزالته):
```typescript
// في PolicyDetailsDrawer - fetchPolicyDetails
const cacheKey = `policy_cache_${policyId}`;
const cached = sessionStorage.getItem(cacheKey);
if (cached) {
  // استخدام البيانات المخزنة مؤقتاً
  const cachedData = JSON.parse(cached);
  if (Date.now() - cachedData.timestamp < 30000) {
    setPolicy(cachedData.policy);
    // ...
    return;
  }
}
```

### الكود الجديد:
```typescript
// إزالة الـ cache والجلب مباشرة من قاعدة البيانات
// لا يوجد cache - دائماً بيانات حية
```

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/policies/PolicyDetailsDrawer.tsx` | إزالة منطق الـ cache |

---

## الفوائد

- ✅ البيانات دائماً محدثة وحية
- ✅ لا مشاكل في التزامن بين الشاشات
- ✅ حل بسيط بدون تعقيدات

## التكلفة

- ⚠️ زيادة طفيفة في عدد الطلبات لقاعدة البيانات
- ⚠️ قد يكون هناك تأخير بسيط عند فتح تفاصيل الوثيقة

---

## ملاحظة
صفحة العميل (`ClientDetails`) لا تستخدم React Query أو cache - هي تجلب البيانات مباشرة. المشكلة الوحيدة هي في `PolicyDetailsDrawer` الذي يستخدم cache لمدة 30 ثانية.

