
# خطة: إصلاح عدم ظهور رقم الهاتف في صفحة متابعة الديون

## المشكلة

رقم الهاتف لا يظهر ("لا يوجد رقم") لجميع العملاء بسبب **اختلاف اسم العمود** بين الدالة والواجهة:

| الدالة ترجع | الواجهة تتوقع |
|------------|--------------|
| `client_phone` | `phone_number` |

في ملف `report_client_debts` (السطر 101 و 247-248):
```sql
RETURNS TABLE (
  client_phone text,  -- ← الدالة ترجع client_phone
  ...
)
```

في ملف `DebtTracking.tsx` (السطر 137):
```typescript
phone_number: r.phone_number,  // ← يتوقع phone_number
```

---

## الحل

تغيير بسيط في الواجهة لقراءة العمود الصحيح `client_phone` بدلاً من `phone_number`.

---

## التغييرات التقنية

### ملف: `src/pages/DebtTracking.tsx`

**السطر 137** - تغيير:
```typescript
// قبل
phone_number: r.phone_number,

// بعد  
phone_number: r.client_phone,
```

---

## النتيجة المتوقعة

- ستظهر أرقام الهواتف لجميع العملاء المدينين
- سيعمل زر WhatsApp بشكل صحيح
- لن تظهر "لا يوجد رقم" للعملاء الذين لديهم أرقام مسجلة
