
# خطة إصلاح عرض صور الشيكات في نافذة تسديد الديون

## المشكلة

عند مسح الشيكات في نافذة "تسديد الديون"، البيانات تُضاف بشكل صحيح (المبلغ، رقم الشيك، التاريخ) لكن الصور لا تظهر في قسم "صور الشيك".

## تشخيص السبب

الـ Edge Function يُرجع الآن `image_url` (رابط CDN) بدلاً من `cropped_base64`:
- الكود الحالي في `handleScannedCheques` يبحث فقط عن `cropped_base64`
- لا يوجد حقل `cheque_image_url` في interface الدفعة
- قسم عرض الصور لا يعرض روابط CDN

---

## الحل المقترح

### التغيير 1: إضافة حقل `cheque_image_url` للـ interface

**الملف**: `src/components/debt/DebtPaymentModal.tsx`  
**السطر**: 47-56

```typescript
interface PaymentLine {
  id: string;
  amount: number;
  paymentType: 'cash' | 'cheque' | 'transfer' | 'visa';
  paymentDate: string;
  chequeNumber?: string;
  notes?: string;
  tranzilaPaid?: boolean;
  pendingImages?: File[];
  cheque_image_url?: string;  // إضافة هذا الحقل
}
```

---

### التغيير 2: تحديث `handleScannedCheques` لحفظ رابط CDN

**الملف**: `src/components/debt/DebtPaymentModal.tsx`  
**السطر**: 467-499

```typescript
const handleScannedCheques = (cheques: any[]) => {
  const newPayments: PaymentLine[] = [];
  const newPreviewUrls: PreviewUrls = {};
  
  for (const cheque of cheques) {
    const paymentId = crypto.randomUUID();
    const payment: PaymentLine = {
      id: paymentId,
      amount: cheque.amount || 0,
      paymentType: 'cheque' as const,
      paymentDate: cheque.payment_date || new Date().toISOString().split('T')[0],
      chequeNumber: cheque.cheque_number || '',
      cheque_image_url: cheque.image_url,  // حفظ رابط CDN
    };
    
    // إضافة رابط CDN إلى previewUrls إذا موجود
    if (cheque.image_url) {
      newPreviewUrls[paymentId] = [cheque.image_url];
    }
    // fallback: استخدام base64 إذا لم يوجد CDN URL
    else if (cheque.cropped_base64) {
      try {
        const blob = base64ToBlob(cheque.cropped_base64);
        const file = new File([blob], `cheque_${cheque.cheque_number || paymentId}.jpg`, { type: 'image/jpeg' });
        payment.pendingImages = [file];
        newPreviewUrls[paymentId] = [URL.createObjectURL(blob)];
      } catch (e) {
        console.error('Failed to convert cheque image:', e);
      }
    }
    
    newPayments.push(payment);
  }
  
  setPreviewUrls(prev => ({ ...prev, ...newPreviewUrls }));
  setPaymentLines(prev => [...prev, ...newPayments]);
  toast.success(`تم إضافة ${newPayments.length} دفعة شيك مع الصور`);
};
```

---

### التغيير 3: إضافة عرض صورة CDN في قسم الصور (احتياطي)

**الملف**: `src/components/debt/DebtPaymentModal.tsx`  
**السطر**: 1052

إضافة عرض صورة CDN إذا موجودة وغير معروضة في previewUrls:

```typescript
<div className="flex flex-wrap gap-2">
  {/* عرض صورة CDN من الماسح */}
  {payment.cheque_image_url && !getPreviewUrls(payment.id).includes(payment.cheque_image_url) && (
    <div className="relative group">
      <img 
        src={payment.cheque_image_url} 
        alt="صورة الشيك" 
        className="h-14 w-18 object-cover rounded border"
      />
    </div>
  )}
  {/* عرض الصور من previewUrls */}
  {getPreviewUrls(payment.id).map((url, imgIndex) => (
    // ... الكود الحالي
  ))}
</div>
```

---

## ملخص التغييرات

| الملف | السطر | التغيير |
|-------|-------|---------|
| `DebtPaymentModal.tsx` | 47-56 | إضافة `cheque_image_url` للـ interface |
| `DebtPaymentModal.tsx` | 467-499 | تحديث `handleScannedCheques` لحفظ وعرض CDN URL |
| `DebtPaymentModal.tsx` | 1052 | إضافة عرض صورة CDN احتياطية |

---

## النتيجة المتوقعة

بعد التنفيذ:
1. عند مسح الشيكات، سيتم حفظ رابط صورة CDN
2. الصورة ستظهر فوراً في قسم "صور الشيك (أمامي/خلفي)"
3. ستعمل مع كل من CDN URL و base64 fallback
