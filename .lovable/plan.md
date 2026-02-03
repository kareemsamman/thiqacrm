

# خطة: إصلاح مشكلة دفعة بطاقة الائتمان لموسى هلسة

## المشكلة المكتشفة

بعد التحقيق، تم اكتشاف مشكلتين:

### 1. الدفعة موجودة ولكن غير مؤكدة

الدفعة بقيمة **₪3,000** موجودة في قاعدة البيانات:
- `id: 681c996a-fcdf-4847-9925-cc5c5bf20259`
- `amount: 3000`
- `payment_type: visa`
- `refused: NULL` ← **في حالة معلقة**
- `tranzila_approval_code: NULL` ← **لم يتم تحديثها**

### 2. السبب الجذري (Bug في الكود)

في ملف `supabase/functions/tranzila-init/index.ts`، الكود **لا يرسل `myid`** إلى Tranzila:

```typescript
// الكود الحالي (ناقص):
const formFields: Record<string, string> = {
  sum: amount.toString(),
  currency: '1',
  cred_type: '8',
  maxpay: '12',
  lang: 'il',
  tranmode: 'A',
  newprocess: '1',
  // ❌ myid مفقود!
}
```

بينما في `tranzila-broker-init/index.ts`، الكود صحيح:
```typescript
myid: tranzilaIndex, // ✅ موجود
```

---

## الحل

### الجزء 1: تحديث الدفعة الحالية يدوياً

سأقوم بتحديث الدفعة المعلقة لتصبح مؤكدة (لأن الدفع تم بالفعل في Tranzila):

```sql
UPDATE policy_payments
SET 
  refused = false,
  tranzila_response_code = '000',
  tranzila_approval_code = 'MANUAL-FIX',
  cheque_status = null
WHERE id = '681c996a-fcdf-4847-9925-cc5c5bf20259';
```

### الجزء 2: إصلاح الكود لمنع المشكلة مستقبلاً

تعديل `supabase/functions/tranzila-init/index.ts` لإضافة `myid`:

```typescript
const formFields: Record<string, string> = {
  sum: amount.toString(),
  currency: '1',
  cred_type: '8',
  maxpay: '12',
  lang: 'il',
  tranmode: 'A',
  newprocess: '1',
  myid: tranzilaIndex, // ✅ إضافة هذا السطر
}
```

---

## الملفات المتأثرة

| الملف | نوع التغيير |
|-------|-------------|
| قاعدة البيانات | تحديث الدفعة المعلقة |
| `supabase/functions/tranzila-init/index.ts` | إضافة `myid` لنموذج Tranzila |

---

## النتيجة المتوقعة

1. ✅ دفعة موسى هلسة ستظهر كمؤكدة
2. ✅ المبلغ المتبقي سينخفض من ₪3,000 إلى الصفر
3. ✅ جميع الدفعات المستقبلية عبر Visa ستتم معالجتها بشكل صحيح

