
# خطة إصلاح عرض المدفوع وتوحيد الأرقام/التواريخ

## المشكلة الرئيسية

في نافذة `DebtPaymentModal`، بطاقة "المدفوع للدين" تُظهر ₪100 بينما صفحة العميل تُظهر ₪5,100.

**السبب**: `DebtPaymentModal` يجلب فقط الوثائق بدون ELZAMI، بينما `ClientDetails` يحسب جميع الدفعات.

## الحل المختار

تحويل عرض المدفوع ليطابق صفحة العميل:
- بطاقة "المدفوع" الرئيسية = إجمالي المدفوع (مع الإلزامي) = ₪5,100
- سطر صغير أسفلها يوضح "منها للدين: ₪100"

## التغييرات المطلوبة

### 1. تعديل `DebtPaymentModal.tsx`

| التغيير | التفاصيل |
|---------|----------|
| جلب دفعات الإلزامي | إضافة query ثانٍ لجلب دفعات وثائق ELZAMI للعميل |
| تعديل بطاقة المدفوع | عرض إجمالي المدفوع (مع الإلزامي) كرقم رئيسي |
| إضافة سطر توضيحي | سطر صغير "منها للدين: ₪X" |

**الكود الحالي (سطور 569-605)**:
```tsx
<div className="bg-green-500/10 rounded-lg p-3 text-center">
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center justify-center gap-1">
          <p className="text-xs text-muted-foreground">المدفوع للدين</p>
          <HelpCircle className="h-3 w-3 text-muted-foreground" />
        </div>
      </TooltipTrigger>
      ...
    </Tooltip>
  </TooltipProvider>
  <p className="text-lg font-bold text-green-600">
    ₪{(totalPaid + paidVisaTotal).toLocaleString()}
  </p>
</div>
```

**الكود الجديد**:
```tsx
<div className="bg-green-500/10 rounded-lg p-3 text-center">
  <p className="text-xs text-muted-foreground">المدفوع</p>
  <p className="text-lg font-bold text-green-600">
    ₪{(allPaymentsTotal + paidVisaTotal).toLocaleString('en-US')}
  </p>
  <p className="text-[10px] text-muted-foreground mt-1">
    منها للدين: ₪{(totalPaid + paidVisaTotal).toLocaleString('en-US')}
  </p>
</div>
```

### 2. تحديث التواريخ في كل الملفات

**التنسيق المطلوب**: DD/MM/YYYY بالأرقام الإنجليزية (0-9)، مع الوقت عند الحاجة.

| الملف | التغيير |
|-------|---------|
| `BrokerDetails.tsx` | `ar-EG` → `en-GB` |
| `PackageComponentsTable.tsx` | `ar-EG` → `en-GB` |
| `CancelPolicyModal.tsx` | `ar-EG` → `en-US` للأرقام |
| `AccidentFeePricingDrawer.tsx` | `ar-EG` → `en-US` |
| `AccidentReports.tsx` | `ar-EG` → `en-GB` |
| `CompanySettlementDetail.tsx` | إصلاح باقي الأرقام |
| `Companies.tsx` | `ar-EG` → `en-US` |

### 3. تحديث Edge Functions

| الملف | التغيير |
|-------|---------|
| `send-signature-sms/index.ts` | `ar-EG` → `en-GB` |
| `generate-settlement-report/index.ts` | تحديث formatNumber و formatDate |
| `cron-renewal-reminders/index.ts` | `ar-EG` → `en-GB` |
| `send-invoice-sms/index.ts` | `ar-EG` → `en-GB` |
| `generate-client-report/index.ts` | `ar-EG` → `en-GB` |
| `signature-page/index.ts` | `ar-EG` → `en-GB` |
| `generate-broker-report/index.ts` | `ar-EG` → `en-GB` |
| `generate-accident-pdf/index.ts` | `ar-EG` → `en-GB` |
| `send-package-invoice-sms/index.ts` | `ar-EG` → `en-GB` |

## ملخص الملفات المتأثرة

| المجموعة | الملفات |
|----------|---------|
| المكون الرئيسي | `DebtPaymentModal.tsx` |
| مكونات أخرى | 5 ملفات |
| صفحات | 3 ملفات |
| Edge Functions | 9 ملفات |

## النتائج المتوقعة

- "المدفوع" في نافذة الديون = ₪5,100 (يطابق صفحة العميل)
- سطر توضيحي صغير "منها للدين: ₪100"
- جميع الأرقام في النظام بالإنجليزية (0-9)
- جميع التواريخ بتنسيق DD/MM/YYYY
