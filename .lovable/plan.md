
# خطة: نظام الفواتير المتكامل مع popup بعد إنشاء الوثيقة

## المشاكل الحالية

### 1. خطأ في Edge Function (الأولوية العاجلة)
```
column policy_payments.bank_reference does not exist
```
- **السبب**: `generate-payment-receipt` يحاول جلب عمود `bank_reference` غير موجود في جدول `policy_payments`
- **الحل**: إزالة `bank_reference` من الـ query

### 2. لا يوجد popup بعد إنشاء الوثيقة بنجاح
- حالياً: بعد الحفظ، يتم إغلاق النافذة مباشرة والانتقال لصفحة العميل
- **المطلوب**: عرض popup يحتوي على:
  - زر طباعة الفاتورة
  - زر إرسال SMS للعميل

### 3. سجل الدفعات يفتقد لزر "فاتورة الكل"
- **المطلوب**: زر لتوليد فاتورة شاملة لجميع الدفعات مع تفاصيل الوثيقة والسيارة

---

## التغييرات المطلوبة

### المرحلة 1: إصلاح Edge Function (عاجل)

**الملف**: `supabase/functions/generate-payment-receipt/index.ts`

| السطور | التغيير |
|--------|---------|
| 424 | إزالة `bank_reference` من الـ query |
| 99-107 | إزالة كود عرض `bank_reference` في HTML |

**الكود الحالي** (سطر 424):
```typescript
tranzila_approval_code,
bank_reference,  // ← يجب إزالته
notes,
```

**الكود الجديد**:
```typescript
tranzila_approval_code,
notes,
```

---

### المرحلة 2: إنشاء مكون PolicySuccessDialog

**ملف جديد**: `src/components/policies/PolicySuccessDialog.tsx`

هذا المكون يظهر بعد إنشاء الوثيقة بنجاح:

```text
┌─────────────────────────────────────────────────────────────┐
│                    ✅ تم إنشاء الوثيقة بنجاح                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│     [🖨️ طباعة الفاتورة]     [📱 إرسال SMS للعميل]          │
│                                                             │
│     [❌ إغلاق]                                              │
└─────────────────────────────────────────────────────────────┘
```

**المدخلات**:
- `policyId` - ID الوثيقة المنشأة
- `clientId` - ID العميل
- `clientPhone` - رقم هاتف العميل
- `isPackage` - هل هي باقة؟
- `onClose` - callback للإغلاق

**الإجراءات**:
- **طباعة الفاتورة**: فتح رابط الفاتورة في tab جديد (من `send-invoice-sms` أو `send-package-invoice-sms`)
- **إرسال SMS**: استدعاء `send-invoice-sms` أو `send-package-invoice-sms` حسب نوع الوثيقة

---

### المرحلة 3: تحديث PolicyWizard

**الملف**: `src/components/policies/PolicyWizard.tsx`

| التغيير | التفاصيل |
|---------|----------|
| إضافة state | `showSuccessDialog`, `successPolicyId` |
| تعديل handleSave | بدلاً من الإغلاق المباشر، عرض PolicySuccessDialog |
| إضافة المكون | في نهاية return، إضافة `<PolicySuccessDialog />` |

**التدفق الجديد**:
1. حفظ الوثيقة بنجاح
2. عرض `PolicySuccessDialog` بدلاً من الإغلاق المباشر
3. المستخدم يختار (طباعة / إرسال SMS / إغلاق)
4. عند الإغلاق → الانتقال لصفحة العميل كالمعتاد

---

### المرحلة 4: إضافة زر "فاتورة الكل" في سجل الدفعات

**الملف**: `src/components/clients/ClientDetails.tsx`

إضافة زر بجانب عنوان "سجل الدفعات":

```tsx
<div className="flex items-center justify-between">
  <h3 className="font-semibold text-lg">سجل الدفعات</h3>
  <Button
    variant="outline"
    size="sm"
    onClick={handleGenerateAllPaymentsInvoice}
    disabled={payments.length === 0}
  >
    <FileText className="h-4 w-4 ml-2" />
    فاتورة شاملة
  </Button>
</div>
```

**الوظيفة `handleGenerateAllPaymentsInvoice`**:
- استدعاء Edge Function جديدة `generate-client-payments-invoice`
- أو استخدام الـ function الموجودة `generate-client-report` مع تعديل

---

### المرحلة 5: إنشاء Edge Function للفاتورة الشاملة

**ملف جديد**: `supabase/functions/generate-client-payments-invoice/index.ts`

**المدخلات**: `client_id`

**المخرجات**: HTML فاتورة شاملة تحتوي على:
- بيانات العميل
- جميع الوثائق مع تفاصيلها
- جميع الدفعات مع تفاصيل كل دفعة:
  - نقدي: المبلغ والتاريخ
  - شيك: رقم الشيك وتاريخه
  - بطاقة ائتمان: آخر 4 أرقام، عدد التقسيطات، رقم التأكيد
  - تحويل: المبلغ والتاريخ
- الإجماليات (المدفوع، المتبقي)

---

## ملخص الملفات

| الملف | النوع | التغيير |
|-------|-------|---------|
| `generate-payment-receipt/index.ts` | تعديل | إزالة `bank_reference` |
| `PolicySuccessDialog.tsx` | جديد | مكون popup النجاح |
| `PolicyWizard.tsx` | تعديل | عرض PolicySuccessDialog بعد الحفظ |
| `ClientDetails.tsx` | تعديل | إضافة زر "فاتورة شاملة" |
| `generate-client-payments-invoice/index.ts` | جديد | Edge Function للفاتورة الشاملة |
| `supabase/config.toml` | تعديل | إضافة الـ function الجديدة |

---

## التفاصيل التقنية

### الفاتورة الشاملة - تفاصيل الدفعات

```html
<!-- مثال على عرض الدفعات في الفاتورة -->
<table>
  <thead>
    <tr>
      <th>التاريخ</th>
      <th>المبلغ</th>
      <th>الطريقة</th>
      <th>التفاصيل</th>
      <th>الوثيقة</th>
    </tr>
  </thead>
  <tbody>
    <!-- دفعة نقدي -->
    <tr>
      <td>29/01/2026</td>
      <td>₪1,000</td>
      <td>نقدي</td>
      <td>-</td>
      <td>إلزامي</td>
    </tr>
    
    <!-- دفعة بطاقة ائتمان -->
    <tr>
      <td>29/01/2026</td>
      <td>₪500</td>
      <td>بطاقة ائتمان</td>
      <td>
        ****5678<br>
        3 تقسيطات<br>
        رقم التأكيد: 123456
      </td>
      <td>ثالث/شامل</td>
    </tr>
    
    <!-- دفعة شيك -->
    <tr>
      <td>29/01/2026</td>
      <td>₪2,000</td>
      <td>شيك</td>
      <td>
        رقم: 12345<br>
        تاريخ: 15/02/2026
      </td>
      <td>ثالث/شامل</td>
    </tr>
  </tbody>
</table>
```

---

## النتائج المتوقعة

- ✅ إصلاح خطأ `bank_reference` في إيصال الدفع
- ✅ popup بعد إنشاء الوثيقة مع خيارات الطباعة وإرسال SMS
- ✅ زر "فاتورة شاملة" في سجل دفعات العميل
- ✅ الفاتورة تعرض جميع تفاصيل الدفعات بما فيها بيانات البطاقة والتقسيطات

