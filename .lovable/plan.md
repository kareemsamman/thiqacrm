
# خطة إصلاح عرض المدفوع للدين وتوحيد الأرقام بالإنجليزية

## المشكلة 1: "المدفوع للدين" يظهر ₪100 بينما صفحة العميل تظهر ₪5,100

### تحليل البيانات

| الوثيقة | النوع | المدفوع |
|---------|-------|---------|
| ELZAMI × 5 | إلزامي | ₪5,000 |
| THIRD_FULL (3d626df1) | ثالث/شامل | ₪100 |
| **المجموع الكلي** | | **₪5,100** |
| **المدفوع للدين (بدون إلزامي)** | | **₪100** |

**المنطق التجاري صحيح**: الإلزامي يُدفع مباشرة للشركة ولا يُعتبر ديناً على العميل.

### الحل

رغم وجود tooltip توضيحي، العرض لا يزال محيراً. نحتاج لتحسين التوضيح:

1. إضافة صف منفصل يوضح "دفعات الإلزامي" (مستثناة)
2. عرض التفصيل بشكل أوضح في الواجهة

**تغييرات على `DebtPaymentModal.tsx`**:
- إضافة عرض منفصل لـ "دفعات الإلزامي: ₪5,000 (تذهب للشركة مباشرة)"
- تحسين النص التوضيحي

---

## المشكلة 2: الأرقام تظهر بالعربية (٠١٢٣...) بدلاً من الإنجليزية (0123...)

### السبب

استخدام `toLocaleString('ar-EG')` يحوّل الأرقام للنظام العربي-المصري.

### الحل

تغيير **كل** استخدامات `'ar-EG'` إلى `'en-US'` في:

| الفئة | عدد الملفات |
|-------|-------------|
| صفحات (pages) | ~15 ملف |
| مكونات (components) | ~27 ملف |
| Edge Functions | ~2 ملف |

### الملفات المتأثرة

**الصفحات:**
- `DebtTracking.tsx`
- `Clients.tsx`
- `Cars.tsx`
- `Companies.tsx`
- `CompanySettlement.tsx`
- `CompanySettlementDetail.tsx`
- `CompanyWallet.tsx`
- `BrokerWallet.tsx`
- `Brokers.tsx`
- `Cheques.tsx`
- `Expenses.tsx`
- `FinancialReports.tsx`
- `PolicyReports.tsx`
- `ElzamiCostsReport.tsx`
- `Notifications.tsx`

**المكونات:**
- `debt/DebtPaymentModal.tsx`
- `clients/ClientDetails.tsx`
- `clients/ClientReportModal.tsx`
- `clients/PaymentEditDialog.tsx`
- `clients/PackagePaymentModal.tsx`
- `clients/SinglePolicyPaymentModal.tsx`
- `brokers/BrokerDetails.tsx`
- `brokers/BrokerPaymentModal.tsx`
- `policies/PolicyDetailsDrawer.tsx`
- `policies/PolicyPaymentsSection.tsx`
- `policies/PolicyWizard.tsx`
- `policies/CancelPolicyModal.tsx`
- `policies/TransferPolicyModal.tsx`
- `companies/RoadServicePricingDrawer.tsx`
- `companies/AccidentFeePricingDrawer.tsx`
- `companies/PricingRulesDrawer.tsx`
- `payments/TranzilaPaymentModal.tsx`
- `shared/CustomerChequeSelector.tsx`
- `shared/DebtIndicator.tsx`
- `dashboard/StatCard.tsx`
- `dashboard/ExpiringPolicies.tsx`
- `notifications/PaymentDetailsPanel.tsx`

**Edge Functions:**
- `send-invoice-sms/index.ts`
- `send-signature-sms/index.ts`
- `generate-invoice-pdf/index.ts`
- `generate-client-report/index.ts`

---

## تفاصيل التنفيذ

### الخطوة 1: إنشاء دالة مساعدة موحدة

إضافة دالتين في `src/lib/utils.ts`:

```typescript
/**
 * Format currency with Western numerals
 */
export function formatCurrency(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  return `${sign}₪${Math.abs(amount).toLocaleString('en-US', { 
    maximumFractionDigits: 0 
  })}`;
}

/**
 * Format date with Western numerals (Arabic month names)
 */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}
```

### الخطوة 2: تحديث جميع الملفات

استبدال كل استخدامات:
- `toLocaleString('ar-EG')` → `toLocaleString('en-US')`
- `toLocaleDateString('ar-EG')` → `toLocaleDateString('en-GB')` أو استخدام `formatDate`

### الخطوة 3: تحسين عرض الدين في DebtPaymentModal

إضافة معلومة توضيحية عن دفعات الإلزامي المستثناة.

---

## النتائج المتوقعة

- ✅ جميع الأرقام في النظام بالأرقام الإنجليزية (0-9)
- ✅ التواريخ بالأرقام الإنجليزية
- ✅ توضيح أفضل لسبب اختلاف "المدفوع" بين صفحة العميل ونافذة الدين
- ✅ تناسق في العرض عبر كافة أجزاء النظام
