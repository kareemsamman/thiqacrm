
# خطة: إصلاح فاتورة تسديد الديون لتُظهر الإجمالي المدفوع للباقة

## المشكلة الحالية

عندما يتم دفع 1800₪ للباقة:
1. النظام يوزّع المبلغ داخلياً على policies متعددة: (ثالث: 1500₪، إلزامي: 1000₪، خدمات طريق: 300₪)
2. عند الإرسال، يأخذ `payment_id` واحد (آخر دفعة)
3. الفاتورة تُظهر فقط مبلغ تلك الدفعة: 300₪

**النتيجة**: العميل يتلقى فاتورة بـ 300₪ بينما دفع 1800₪

## الحل المقترح

### التغييرات في الكود

#### 1. تعديل `DebtPaymentModal.tsx`
بدلاً من إرسال `payment_id` واحد، سنُنشئ Edge Function جديد `generate-bulk-payment-receipt` يستقبل:
- قائمة الـ `payment_ids` جميعها التي أُنشئت
- أو يُجمّع الدفعات حسب التاريخ/العميل

**التغيير في handleSubmit:**
```typescript
// بدلاً من:
const { data: recentPayment } = await supabase.from('policy_payments').select('id')...limit(1)

// سنجمع جميع payment_ids التي أُنشئت في هذه العملية:
const allCreatedPaymentIds = [];
// أثناء الإدراج نحفظ الـ IDs
```

#### 2. إنشاء Edge Function جديد: `generate-bulk-payment-receipt`

**الملف**: `supabase/functions/generate-bulk-payment-receipt/index.ts`

**الوظيفة**:
- يستقبل `payment_ids: string[]` (قائمة بجميع الدفعات)
- يجمع المبالغ الإجمالية
- يُنشئ فاتورة موحدة تُظهر:
  - **إجمالي المبلغ المدفوع** (1800₪)
  - تاريخ الدفع
  - طريقة الدفع
  - معلومات العميل والسيارة

**بنية الفاتورة الجديدة:**
```text
┌─────────────────────────────────────────┐
│          إيصال دفع - باقة تأمين         │
├─────────────────────────────────────────┤
│                                         │
│       المبلغ المدفوع: ₪1,800            │
│                                         │
├─────────────────────────────────────────┤
│ 📋 تفاصيل الدفع:                        │
│   • تاريخ: 03/02/2026                   │
│   • طريقة: نقدي                         │
│                                         │
│ 👤 العميل: Kareem Test                  │
│ 🚗 السيارة: 21212121                    │
│                                         │
│ 📦 الباقة تشمل:                         │
│   • ثالث + إلزامي + خدمات الطريق        │
│                                         │
└─────────────────────────────────────────┘
```

#### 3. تعديل `sendPaymentConfirmationSms` في `DebtPaymentModal.tsx`

```typescript
const sendPaymentConfirmationSms = async (paidAmount: number, paymentIds: string[]) => {
  if (!clientPhone) return;
  
  try {
    // استدعاء الـ Edge Function الجديد
    const { data: receiptData, error: receiptError } = await supabase.functions.invoke(
      'generate-bulk-payment-receipt', 
      { body: { payment_ids: paymentIds, total_amount: paidAmount } }
    );
    
    if (receiptError) {
      console.error('Error generating bulk receipt:', receiptError);
      return;
    }
    
    const receiptUrl = receiptData?.receipt_url;
    
    const message = `مرحباً ${clientName}، تم استلام دفعة بمبلغ ₪${paidAmount.toLocaleString()}. شكراً لك!\n\nلعرض وصل الدفع:\n${receiptUrl || 'غير متوفر'}`;
    
    await supabase.functions.invoke('send-sms', {
      body: { phone: clientPhone, message, sms_type: 'payment_confirmation' }
    });
    
    toast.success('تم إرسال رسالة التأكيد للعميل');
  } catch (error) {
    console.error('Error sending payment confirmation SMS:', error);
  }
};
```

---

## الملفات المتأثرة

| الملف | نوع التغيير |
|-------|-------------|
| `supabase/functions/generate-bulk-payment-receipt/index.ts` | ✨ إنشاء جديد |
| `src/components/debt/DebtPaymentModal.tsx` | تعديل - جمع payment_ids وإرسالها |

---

## Edge Function: `generate-bulk-payment-receipt`

### المدخلات (Request Body)
```typescript
interface BulkReceiptRequest {
  payment_ids: string[];
  total_amount?: number; // اختياري - للتحقق
}
```

### المخرجات
```typescript
{
  success: true,
  receipt_url: "https://cdn.basheer-ab.com/receipts/..."
}
```

### المنطق الداخلي
1. جلب جميع الدفعات حسب `payment_ids`
2. التحقق أنها لنفس العميل
3. حساب الإجمالي
4. جلب معلومات السيارة والباقة من أول policy
5. إنشاء HTML موحد يُظهر الإجمالي فقط
6. رفع HTML إلى Bunny CDN
7. إرجاع الرابط

---

## ملخص

- **المشكلة**: الفاتورة تُرسل فقط لدفعة واحدة بدلاً من الإجمالي
- **الحل**: إنشاء Edge Function جديد يُجمّع الدفعات ويُنشئ فاتورة موحدة
- **النتيجة**: العميل يتلقى فاتورة بـ 1800₪ (المبلغ الكامل المدفوع)
