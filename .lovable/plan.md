
# إزالة شارة "منتهي منذ" من صفحة متابعة الديون

## المشكلة

في صفحة `/debt-tracking`، يظهر badge "منتهي منذ X يوم" بجانب كل عميل. هذه المعلومة غير ضرورية في سياق هذه الصفحة التي تركز على **الديون** وليس على **انتهاء الوثائق**.

## الحل

إزالة استدعاء `getExpiryBadge(client.days_until_expiry)` من صف العميل الرئيسي.

---

## التغييرات

### الملف: `src/pages/DebtTracking.tsx`

**السطر 558**: إزالة هذا السطر:
```tsx
// قبل
<div className="flex items-center gap-3">
  <ClientNotesPopover ... />
  {getExpiryBadge(client.days_until_expiry)}  // ← حذف هذا السطر
  <Badge variant="outline">{client.policies_count} وثيقة</Badge>
  ...
</div>

// بعد
<div className="flex items-center gap-3">
  <ClientNotesPopover ... />
  <Badge variant="outline">{client.policies_count} وثيقة</Badge>
  ...
</div>
```

---

## ملاحظة

الـ badge سيبقى يظهر داخل **جدول الوثائق الموسع** (عند الضغط على صف العميل) في عمود "الحالة" لكل وثيقة على حدة (سطر 657). هذا منطقي لأنه يعرض حالة كل وثيقة بشكل منفصل.

---

## النتيجة

| قبل | بعد |
|-----|-----|
| جمال محمد داري • [منتهي منذ 382 يوم] • 10 وثيقة | جمال محمد داري • 10 وثيقة |
