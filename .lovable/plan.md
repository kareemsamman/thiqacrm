
# خطة إصلاح قص صور الشيكات وإضافتها للدفعات

## المشاكل المكتشفة

### 1. فشل القص - الصور سوداء
**السبب الجذري:**
- الـ AI يُرجع `bounding_box` بقيم غير دقيقة (غالباً `x=0, y=0, width=100, height=100`)
- دالة `cropImageOnClient` تستقبل الصورة الكاملة وتعيدها كما هي عندما لا يوجد قص فعلي
- عندما تكون الصور مدورة (90°/180°/270°)، الـ AI يُعطي إحداثيات خاطئة
- استخدام `gemini-2.5-flash` أقل دقة في تحديد الـ bounding box من `gemini-3-pro-preview`

### 2. الصورة لا تُضاف لقسم "صور الشيك"
**السبب الجذري:**
- في `handleScannedCheques` بأغلب الملفات (PolicyPaymentsSection, PackagePaymentModal, SinglePolicyPaymentModal, DebtPaymentModal)، لا يتم نقل `cropped_base64` أو `pendingImages`
- الدالة تنشئ الدفعات بدون صور:
```typescript
const handleScannedCheques = (cheques: any[]) => {
  const newPayments = cheques.map(cheque => ({
    id: crypto.randomUUID(),
    amount: cheque.amount,
    paymentType: 'cheque',
    paymentDate: cheque.payment_date,
    chequeNumber: cheque.cheque_number,
    // ❌ لا يوجد pendingImages!
  }));
};
```

### 3. الرفع الفوري غير مُطبَّق
- حالياً: الصورة تُحفظ في `pendingImages` للرفع عند حفظ الدفعة
- المطلوب: رفع الصورة فوراً بعد التحليل وربطها بالدفعة

---

## الحل الشامل

### الجزء 1: استخدام نموذج أذكى للقص (gemini-2.5-pro)

بما أن `gemini-2.5-flash` سريع لكن أقل دقة في تحديد الـ bounding box، سنستخدم:
- `gemini-2.5-flash` للتحليل الأساسي (سريع)
- `gemini-2.5-pro` لتحسين الـ bounding box (أدق) - يُستخدم فقط عند الحاجة

**التحسين البديل:** تحسين الـ prompt ليُجبر الـ AI على قياس الإحداثيات بدقة أكبر باستخدام تقنية "chain-of-thought".

**ملف: `supabase/functions/process-cheque-scan/index.ts`**

```typescript
// Prompt محسَّن يُجبر AI على التفكير خطوة بخطوة
const CHEQUE_DETECTION_PROMPT = `...
STEP 1: First, identify ALL cheques in the image and count them.
STEP 2: For EACH cheque, measure its PRECISE boundaries:
  - Look at the TOP-LEFT corner of each cheque rectangle
  - Look at the BOTTOM-RIGHT corner of each cheque rectangle
  - Calculate x% = (left_edge_pixels / image_width) * 100
  - Calculate y% = (top_edge_pixels / image_height) * 100
  - Calculate width% = (cheque_width_pixels / image_width) * 100
  - Calculate height% = (cheque_height_pixels / image_height) * 100
  
ROTATION: If image is rotated, mentally rotate it first, then measure.
...`;
```

### الجزء 2: تحسين القص على العميل

**ملف: `src/components/payments/ChequeScannerDialog.tsx`**

إضافة التحقق من صحة الـ bounding box قبل القص:

```typescript
const cropImageOnClient = async (
  base64Image: string,
  boundingBox: { x: number; y: number; width: number; height: number }
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { x, y, width, height } = boundingBox;
      
      // التحقق من صحة الـ bounding box
      if (x < 0 || y < 0 || width <= 0 || height <= 0) {
        console.warn('Invalid bounding box, returning full image');
        return resolve(base64Image); // إعادة الصورة الكاملة
      }
      
      // التحقق من أن القص ليس للصورة بالكامل
      const isFullImage = x <= 2 && y <= 2 && width >= 96 && height >= 96;
      if (isFullImage) {
        // لا حاجة للقص - إعادة الصورة الأصلية
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        return resolve(dataUrl.split(',')[1]);
      }
      
      // ... باقي منطق القص
    };
  });
};
```

### الجزء 3: الرفع الفوري بعد التحليل

**ملف جديد: منطق الرفع الفوري**

إضافة دالة لرفع صورة الشيك فوراً بعد التحليل:

```typescript
const uploadChequeImage = async (base64Image: string, chequeNumber: string): Promise<string | null> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return null;
    
    // تحويل base64 إلى Blob
    const blob = base64ToBlob(base64Image);
    const file = new File([blob], `cheque_${chequeNumber}_${Date.now()}.jpg`, { type: 'image/jpeg' });
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entity_type', 'cheque');
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-media`,
      { method: 'POST', headers: { 'Authorization': `Bearer ${session.access_token}` }, body: formData }
    );
    
    if (response.ok) {
      const data = await response.json();
      return data.file?.cdn_url || null;
    }
    return null;
  } catch (e) {
    console.error('Failed to upload cheque image:', e);
    return null;
  }
};
```

**تحديث دالة `processImages`:**

```typescript
// بعد التحليل والقص، رفع الصور فوراً
for (const cheque of processedCheques) {
  if (cheque.cropped_base64) {
    const uploadedUrl = await uploadChequeImage(cheque.cropped_base64, cheque.cheque_number);
    if (uploadedUrl) {
      cheque.image_url = uploadedUrl;
    }
  }
}
```

### الجزء 4: إصلاح handleScannedCheques في جميع الملفات

**الملفات المتأثرة:**
1. `src/components/policies/PolicyPaymentsSection.tsx`
2. `src/components/clients/PackagePaymentModal.tsx`
3. `src/components/clients/SinglePolicyPaymentModal.tsx`
4. `src/components/debt/DebtPaymentModal.tsx`
5. `src/pages/BrokerWallet.tsx`

**التعديل المطلوب (نفس التعديل في كل ملف):**

```typescript
const handleScannedCheques = (cheques: any[]) => {
  const newPayments: PaymentLine[] = [];
  const newPreviewUrls: { [key: string]: string[] } = {};
  
  for (const cheque of cheques) {
    const paymentId = crypto.randomUUID();
    const payment: PaymentLine = {
      id: paymentId,
      amount: cheque.amount || 0,
      paymentType: 'cheque',
      paymentDate: cheque.payment_date || new Date().toISOString().split('T')[0],
      chequeNumber: cheque.cheque_number || '',
      // ✅ إضافة رابط الصورة المرفوعة
      chequeImageUrl: cheque.image_url || undefined,
    };
    
    // ✅ إضافة صورة للـ pendingImages للعرض
    if (cheque.cropped_base64) {
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
  
  // تحديث حالة الـ preview URLs
  setPreviewUrls(prev => ({ ...prev, ...newPreviewUrls }));
  setPaymentLines(prev => [...prev, ...newPayments]);
  toast.success(`تم إضافة ${newPayments.length} دفعة شيك مع الصور`);
};
```

**دالة مساعدة (تُضاف في كل ملف):**

```typescript
const base64ToBlob = (base64: string, type = 'image/jpeg'): Blob => {
  try {
    // إزالة prefix إن وُجد
    const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
    const byteString = atob(cleanBase64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type });
  } catch (e) {
    console.error('Failed to convert base64 to blob:', e);
    return new Blob([], { type });
  }
};
```

---

## ملخص التغييرات

| الملف | التغيير |
|-------|---------|
| `supabase/functions/process-cheque-scan/index.ts` | تحسين prompt الـ AI للحصول على bounding box أدق + إضافة خطوات التفكير |
| `src/components/payments/ChequeScannerDialog.tsx` | تحسين دالة القص + إضافة الرفع الفوري بعد التحليل |
| `src/components/policies/PolicyPaymentsSection.tsx` | إصلاح `handleScannedCheques` لتضمين الصور |
| `src/components/clients/PackagePaymentModal.tsx` | إصلاح `handleScannedCheques` لتضمين الصور |
| `src/components/clients/SinglePolicyPaymentModal.tsx` | إصلاح `handleScannedCheques` لتضمين الصور |
| `src/components/debt/DebtPaymentModal.tsx` | إصلاح `handleScannedCheques` لتضمين الصور |
| `src/pages/BrokerWallet.tsx` | إصلاح `handleScannedCheques` لتضمين الصور |

---

## التدفق بعد الإصلاح

```
1. المستخدم يمسح صفحة فيها شيكات
              ↓
2. AI يكتشف الشيكات + bounding_box دقيق (prompt محسَّن)
              ↓
3. المتصفح يقص كل شيك من الصورة الأصلية
              ↓
4. [جديد] الصورة المقصوصة تُرفع فوراً لـ Bunny CDN
              ↓
5. عرض الشيكات مع الصور المقصوصة + CDN URLs
              ↓
6. النقر على "إضافة كدفعات"
              ↓
7. [جديد] الدفعات تُنشأ مع صور في pendingImages + chequeImageUrl
              ↓
8. الصور تظهر في قسم "صور الشيك" فوراً
```
