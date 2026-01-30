

# خطة: البقاء في صفحة الديون بعد الدفع

## المشكلة
عند تسديد دفعة من صفحة `/debt-tracking`، يتم تحويل المستخدم إلى صفحة العميل بدلاً من البقاء في صفحة تتبع الديون.

## السبب
في ملف `src/components/debt/DebtPaymentModal.tsx` السطر 605:
```typescript
window.location.href = `/clients?open=${clientId}`;
```

---

## الحل

**الملف:** `src/components/debt/DebtPaymentModal.tsx`

### التغيير المطلوب (السطور 604-607):

**قبل:**
```typescript
// Navigate to client profile to show last transaction
window.location.href = `/clients?open=${clientId}`;
onOpenChange(false);
onSuccess();
```

**بعد:**
```typescript
// Close modal and refresh data
onOpenChange(false);
onSuccess();
```

حذف السطر الذي يقوم بالتحويل (`window.location.href = ...`) والإبقاء على:
- `onOpenChange(false)` - لإغلاق الـ Modal
- `onSuccess()` - لتحديث بيانات الديون في الصفحة

---

## النتيجة المتوقعة
- بعد الدفع الناجح، يبقى المستخدم في صفحة `/debt-tracking`
- يتم إغلاق نافذة الدفع تلقائياً
- يتم تحديث قائمة الديون لتعكس الدفعة الجديدة
- إذا تم تسديد كامل الدين، يختفي العميل من القائمة

