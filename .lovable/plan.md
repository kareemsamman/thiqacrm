

# خطة تحسين مسح الشيكات

## المشاكل المكتشفة

### 1. ترتيب الشيكات
الشيكات تظهر بترتيب الاكتشاف وليس بترتيب التاريخ. المطلوب ترتيبها تصاعدياً حسب تاريخ الاستحقاق.

### 2. مشكلة روابط الصور
- الرابط يُبنى بـ `cdn.basheer-ab.com` ✅
- لكن الصورة لا تُرفع بنجاح أو لا يتم انتظار الرفع قبل الإرجاع
- يجب التحقق من نجاح الرفع وإضافة fallback للـ base64

### 3. خطأ في قراءة المبلغ
- AI يقرأ `18,007` بدلاً من `1,800`
- السبب: الفاصلة الألفية والصورة المدورة
- الحل: تحسين الـ prompt + استخدام نموذج أقوى

### 4. الصور المدورة
- الشيكات قد تكون مدورة مما يؤثر على OCR
- الحل: إضافة تعليمات للـ AI للتعامل مع الصور المدورة

---

## التغييرات المطلوبة

### ملف: `supabase/functions/process-cheque-scan/index.ts`

#### 1. استخدام نموذج Gemini Pro
```typescript
// قبل
model: "google/gemini-2.5-flash"

// بعد
model: "google/gemini-2.5-pro"
```

#### 2. تحسين الـ Prompt للتعامل مع:
- الصور المدورة (rotated images)
- الفواصل في الأرقام
- دقة أفضل في قراءة المبالغ

```typescript
const CHEQUE_DETECTION_PROMPT = `You are an expert OCR system analyzing scanned Israeli bank cheques.

CRITICAL INSTRUCTIONS:
1. Images may be ROTATED (90°, 180°, 270°) - rotate mentally to read correctly
2. Amounts are in NIS - typical values range from 500-50,000
3. NEVER confuse comma separators with decimal points
   - "1,800" = one thousand eight hundred (1800)
   - "18,007" would be unusual - verify carefully
4. Cheque numbers are usually 6-8 digits without commas

For each cheque extract:
- CHEQUE NUMBER (מספר שיק / رقم الشيك): 6-8 digit number
- DATE (תאריך / التاريخ): payment due date
- AMOUNT (סכום / المبلغ): monetary value in NIS (be careful with thousands separator)
- BANK NAME (if visible)
- ACCOUNT NUMBER (if visible)
- BRANCH NUMBER (if visible)

DATE HANDLING:
- Convert to YYYY-MM-DD format
- Israeli dates: DD/MM/YY or DD/MM/YYYY
- If year is 2 digits (e.g., 26), assume 2026

AMOUNT HANDLING - CRITICAL:
- Amounts use comma as THOUSANDS separator (e.g., 1,800 = 1800)
- Common amounts: 500, 800, 1000, 1200, 1400, 1500, 1800, 2000, 2500, 3000
- If you see something like 18,007 - double check, it's likely 1,800.7 or 1,800

Output JSON only, no markdown:
{
  "cheques": [
    {
      "cheque_number": "80001254",
      "payment_date": "2026-03-25",
      "amount": 1800,
      "bank_name": "דיסקונט",
      "account_number": "",
      "branch_number": "",
      "bounding_box": {"x": 0, "y": 0, "width": 100, "height": 100},
      "confidence": 95
    }
  ]
}`;
```

#### 3. ترتيب الشيكات حسب التاريخ
```typescript
// بعد جمع كل الشيكات، قبل الإرجاع:
allDetectedCheques.sort((a, b) => {
  const dateA = new Date(a.payment_date);
  const dateB = new Date(b.payment_date);
  return dateA.getTime() - dateB.getTime();
});
```

#### 4. إصلاح رفع الصور + Fallback
```typescript
// في الحلقة، تأكد من الرفع ثم أضف fallback
const cdnUrl = await uploadToBunny(imageBase64, fileName);

if (cdnUrl) {
  cheque.image_url = cdnUrl;
} else {
  // Fallback: استخدم base64 مباشرة كـ data URL
  cheque.image_url = `data:image/jpeg;base64,${imageBase64}`;
}

// لا نحتاج cropped_base64 إذا الـ CDN يعمل
// لكن نحتفظ به كـ fallback
cheque.cropped_base64 = imageBase64;
```

---

### ملف: `src/components/payments/ChequeScannerDialog.tsx`

#### 1. إصلاح عرض الصورة مع Fallback
```tsx
// في عرض صورة الشيك
{(cheque.image_url || cheque.cropped_base64) && (
  <div className="w-20 h-14 rounded overflow-hidden bg-muted shrink-0">
    <img
      src={cheque.image_url || `data:image/jpeg;base64,${cheque.cropped_base64}`}
      alt={`شيك ${cheque.cheque_number}`}
      className="w-full h-full object-cover"
      onError={(e) => {
        // Fallback to base64 if CDN fails
        if (cheque.cropped_base64 && e.currentTarget.src !== `data:image/jpeg;base64,${cheque.cropped_base64}`) {
          e.currentTarget.src = `data:image/jpeg;base64,${cheque.cropped_base64}`;
        }
      }}
    />
  </div>
)}
```

---

## الملفات المتأثرة

| الملف | نوع التغيير |
|-------|-------------|
| `supabase/functions/process-cheque-scan/index.ts` | تحسين الـ prompt + النموذج + الترتيب + الرفع |
| `src/components/payments/ChequeScannerDialog.tsx` | Fallback للصور |

---

## النتائج المتوقعة

1. **ترتيب صحيح**: الشيكات مرتبة حسب التاريخ تصاعدياً
   - 25/02/26 → 25/03/26 → 25/04/26 → ...

2. **صور ظاهرة**: إما من CDN أو base64 كـ fallback

3. **دقة أفضل في المبالغ**: 
   - Gemini Pro أدق من Flash
   - Prompt محسّن للتعامل مع الفواصل والدوران

4. **تعامل مع الصور المدورة**: تعليمات واضحة للـ AI

---

## التفاصيل التقنية

### لماذا Gemini Pro بدلاً من Flash؟
- Pro أفضل في OCR والتحليل البصري المعقد
- أدق في قراءة الأرقام والتواريخ
- يتعامل بشكل أفضل مع الصور ذات الجودة المنخفضة

### لماذا الـ Fallback للصور؟
- Bunny CDN قد يفشل أحياناً
- الـ base64 موجود بالفعل، لذا نستخدمه كـ backup
- يضمن ظهور الصورة دائماً

