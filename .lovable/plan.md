

# خطة تحسين مسح الشيكات - Gemini 3 Pro + مؤشر التقدم

## المشاكل المكتشفة

### 1. النموذج الحالي بطيء
- النموذج الحالي: `google/gemini-2.5-pro`
- المطلوب: `google/gemini-3-pro-preview` (أسرع وأدق)

### 2. لا يوجد مؤشر تقدم
- المستخدم يرى فقط "جاري تحليل الشيكات..." بدون معلومات
- لا يعرف كم من الوقت سيستغرق
- لا يعرف في أي مرحلة هي العملية

---

## التغييرات المطلوبة

### 1. ترقية النموذج إلى Gemini 3 Pro

**ملف:** `supabase/functions/process-cheque-scan/index.ts`

```typescript
// قبل
model: "google/gemini-2.5-pro"

// بعد  
model: "google/gemini-3-pro-preview"
```

**لماذا Gemini 3 Pro؟**
- أسرع في المعالجة
- أدق في OCR والتحليل البصري
- تعامل أفضل مع الصور المدورة

---

### 2. إضافة مؤشر تقدم مع تقدير الوقت

**ملف:** `src/components/payments/ChequeScannerDialog.tsx`

#### التغييرات:

**أ) إضافة states للتقدم:**
```typescript
const [processingProgress, setProcessingProgress] = useState({
  currentImage: 0,
  totalImages: 0,
  estimatedSeconds: 0,
  elapsedSeconds: 0,
});
```

**ب) مؤقت لعد الثواني:**
```typescript
// عند بدء المعالجة
const estimatedSecondsPerImage = 15; // ~15 ثانية لكل صورة مع Gemini 3
const totalEstimated = scannedImages.length * estimatedSecondsPerImage;

// تشغيل مؤقت لعد الثواني المنقضية
const timerRef = useRef<NodeJS.Timeout>();
timerRef.current = setInterval(() => {
  setProcessingProgress(prev => ({
    ...prev,
    elapsedSeconds: prev.elapsedSeconds + 1
  }));
}, 1000);
```

**ج) شاشة التقدم المحسّنة:**
```tsx
{stage === 'processing' && (
  <div className="py-8 text-center space-y-4">
    <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
    
    <div>
      <p className="text-lg font-medium">جاري تحليل الشيكات...</p>
      <p className="text-sm text-muted-foreground mt-1">
        يتم استخدام الذكاء الاصطناعي للكشف عن الشيكات
      </p>
    </div>
    
    {/* شريط التقدم */}
    <div className="max-w-xs mx-auto">
      <Progress 
        value={(elapsedSeconds / estimatedSeconds) * 100} 
        className="h-2"
      />
    </div>
    
    {/* معلومات الوقت */}
    <div className="text-sm text-muted-foreground">
      <p>
        الوقت المقدر: ~{Math.ceil(estimatedSeconds / 60)} دقيقة
        {totalImages > 1 && ` (${totalImages} صور)`}
      </p>
      <p className="text-xs mt-1">
        انقضى: {formatTime(elapsedSeconds)}
      </p>
    </div>
    
    {/* نصيحة */}
    <p className="text-xs text-muted-foreground/70">
      💡 كلما كانت الصورة أوضح، كان التحليل أسرع وأدق
    </p>
  </div>
)}
```

---

## تقدير الوقت

| عدد الصور | الوقت المتوقع (Gemini 3 Pro) |
|-----------|------------------------------|
| 1 صورة | ~10-15 ثانية |
| 3 صور | ~30-45 ثانية |
| 5 صور | ~50-75 ثانية |
| 10 صور | ~1.5-2.5 دقيقة |

**ملاحظة:** Gemini 3 Pro أسرع بنسبة ~20-30% من Gemini 2.5 Pro

---

## الملفات المتأثرة

| الملف | نوع التغيير |
|-------|-------------|
| `supabase/functions/process-cheque-scan/index.ts` | تغيير النموذج |
| `src/components/payments/ChequeScannerDialog.tsx` | إضافة مؤشر التقدم والوقت |

---

## النتائج المتوقعة

1. **سرعة أفضل**: Gemini 3 Pro أسرع من 2.5 Pro
2. **تجربة أفضل**: المستخدم يعرف الوقت المتوقع
3. **شفافية**: عداد الوقت المنقضي يُظهر التقدم
4. **دقة أعلى**: Gemini 3 Pro أدق في OCR

---

## واجهة المستخدم المحسّنة

```text
┌─────────────────────────────────────────────┐
│                    🔄                       │
│           جاري تحليل الشيكات...            │
│   يتم استخدام الذكاء الاصطناعي للكشف      │
│                                            │
│   ══════════════════════════▒▒▒▒▒ 70%     │
│                                            │
│     الوقت المقدر: ~1 دقيقة (3 صور)        │
│           انقضى: 0:42                      │
│                                            │
│ 💡 كلما كانت الصورة أوضح، كان التحليل أسرع │
└─────────────────────────────────────────────┘
```

