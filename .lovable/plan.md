

# إصلاح عرض المبلغ الخاطئ في نافذة تذكير الدفع

## المشكلة المكتشفة

في نافذة "إرسال تذكير دفع"، السطر 707 يعرض:
```tsx
{formatCurrency(selectedClient?.total_owed || 0)}
```

لكن `total_owed` = `total_insurance` = **مجموع أسعار الوثائق** (₪34,392)

بينما المطلوب هو `total_remaining` = **الرصيد المتبقي الفعلي** (₪10,098)

---

## الحل

تغيير بسيط في ملف واحد فقط:

### ملف: `src/pages/DebtTracking.tsx`

**التغيير:**
- السطر 705-708: تغيير `total_owed` إلى `total_remaining`

```tsx
// قبل
<div>
  <p className="text-sm text-muted-foreground mb-2">المبلغ المستحق</p>
  <p className="font-bold text-lg text-destructive">
    {formatCurrency(selectedClient?.total_owed || 0)}
  </p>
</div>

// بعد
<div>
  <p className="text-sm text-muted-foreground mb-2">المبلغ المستحق</p>
  <p className="font-bold text-lg text-destructive">
    {formatCurrency(selectedClient?.total_remaining || 0)}
  </p>
</div>
```

---

## التحقق من البيانات

| الحقل | المعنى | القيمة |
|-------|--------|--------|
| `total_owed` | مجموع أسعار الوثائق (total_insurance) | ₪34,392 |
| `total_paid` | مجموع المدفوعات | (الفرق) |
| `total_remaining` | الرصيد المتبقي الموحد | ₪10,098 ✅ |

---

## ملاحظة مهمة

الـ Edge Function (`send-manual-reminder`) تستخدم بالفعل `get_client_balance` RPC وترسل المبلغ الصحيح في الـ SMS.

المشكلة فقط في **واجهة المستخدم** التي تعرض الحقل الخاطئ.

---

## النتيجة المتوقعة

بعد الإصلاح:
- نافذة التذكير تعرض: ₪10,098 ✅
- صفحة العميل تعرض: ₪10,098 ✅
- صفحة الديون تعرض: ₪10,098 ✅
- الـ SMS يُرسل: ₪10,098 ✅

**جميع الأماكن تتطابق!**

