
# خطة إصلاح مشكلتين في عرض صور الشيكات والدفعات

## المشكلة 1: صور إيصال الدفع لا تظهر بعد مسح الشيكات

### السبب الجذري
عند إضافة شيكات من الماسح الضوئي، الكود يحفظ `cheque_image_url` (رابط CDN) في كائن الدفعة، لكن لا يُضيفه إلى حالة `previewUrls` التي تُستخدم لعرض الصور.

### الكود الحالي (Step4Payments.tsx - سطر 579):
```typescript
cheque_image_url: cheque.image_url,
```

### الحل
إضافة عرض صورة الشيك من `cheque_image_url` في قسم عرض الصور:

```typescript
// في قسم Preview existing images (سطر 473-489)
// عرض صورة الشيك المحفوظة من المسح (CDN URL)
{payment.cheque_image_url && (
  <div className="relative group">
    <img 
      src={payment.cheque_image_url} 
      alt="" 
      className="h-14 w-18 object-cover rounded border"
    />
  </div>
)}
```

---

## المشكلة 2: صور الشيكات مقطوعة (ارتفاع غير كافٍ)

### السبب الجذري
في `ChequeScannerDialog.tsx` سطر 863:
```tsx
<div className="w-20 h-14 rounded overflow-hidden bg-muted shrink-0">
```
الارتفاع `h-14` (56px) صغير جداً، والـ `object-cover` يقص الصورة.

### الحل
1. زيادة الارتفاع من `h-14` إلى `h-20` أو `h-24`
2. تغيير `object-cover` إلى `object-contain` للحفاظ على نسبة العرض للارتفاع

```typescript
// قبل
<div className="w-20 h-14 rounded overflow-hidden bg-muted shrink-0">
  <img className="w-full h-full object-cover" />
</div>

// بعد
<div className="w-24 h-20 rounded overflow-hidden bg-muted shrink-0">
  <img className="w-full h-full object-contain" />
</div>
```

---

## ملخص التغييرات

| الملف | السطر | التغيير |
|-------|-------|---------|
| `Step4Payments.tsx` | 473-489 | إضافة عرض `cheque_image_url` من CDN |
| `ChequeScannerDialog.tsx` | 863 | تغيير `w-20 h-14` → `w-24 h-20` |
| `ChequeScannerDialog.tsx` | 865-867 | تغيير `object-cover` → `object-contain` |

---

## تفاصيل تقنية

### لماذا الصور لا تظهر في قسم "صور إيصال الدفع"؟

```
┌─────────────────────────────────────────────────────┐
│  مسار الصورة عند المسح:                              │
│                                                       │
│  1. ChequeScannerDialog → يكتشف الشيك               │
│  2. يحصل على image_url من CDN                       │
│  3. يرسل إلى Step4Payments                          │
│  4. Step4Payments يحفظ في cheque_image_url ✓        │
│  5. لكن لا يُضيف إلى previewUrls[] ✗                │
│  6. قسم العرض يقرأ فقط من previewUrls[]             │
│  7. النتيجة: الصورة لا تظهر                         │
└─────────────────────────────────────────────────────┘
```

### لماذا `object-contain` أفضل للشيكات؟

- **object-cover**: يملأ الحاوية ويقص الأجزاء الزائدة (يخفي أجزاء من الشيك)
- **object-contain**: يحافظ على نسبة العرض للارتفاع كاملة (يظهر الشيك بالكامل)

---

## النتيجة المتوقعة

بعد التنفيذ:
1. صور الشيكات ستظهر في قسم "صور إيصال الدفع" بعد المسح
2. صور الشيكات في نتائج المسح ستكون أكبر ولن تُقطع
