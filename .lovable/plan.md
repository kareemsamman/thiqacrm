
# خطة إصلاح مشكلة عدم ظهور صور الشيكات

## تشخيص المشكلة

بناءً على الصورة، الشيكات تُكتشف بنجاح (3 شيكات مع البيانات الصحيحة) لكن الصور تظهر كـ "broken image". هذا يعني:

1. الـ AI يحلل الشيكات بنجاح
2. الرفع إلى Bunny CDN يُبلغ عن نجاحه
3. لكن الـ URL المُرجع لا يعمل

## السبب الجذري المحتمل

عند مراجعة `uploadToBunny()`:
- إذا نجح الرفع، يُرجع: `https://cdn.basheer-ab.com/cheques/scan_xxx.jpg`
- إذا فشل، يُرجع `null` والكود يستخدم fallback إلى data URL

المشكلة: الـ log يقول "Uploaded to: CDN" لكن الصورة لا تعمل.

**السيناريوهات المحتملة**:
1. Bunny API Key صحيح لكن الملف لا يُرفع فعلياً
2. BUNNY_CDN_URL غير مطابق للـ storage zone
3. هناك تأخير في CDN propagation

---

## الحل المقترح

### التغيير 1: إضافة logging تفصيلي لـ Bunny upload

```typescript
// في uploadToBunny function
console.log(`Attempting Bunny upload: ${uploadPath}`);
// ... بعد الرفع
console.log(`Bunny upload response status: ${response.status}`);
console.log(`CDN URL generated: ${BUNNY_CDN_URL}/${uploadPath}`);
```

### التغيير 2: إرسال الصورة الأصلية كـ fallback

بدلاً من حذف `cropped_base64`، نحتفظ بجزء منها أو نرسل الـ base64 الكامل كـ fallback:

```typescript
// في Edge Function - السطر 352-356
for (const cheque of result.cheques) {
  cheque.image_url = imageUrl;
  // إذا كان CDN URL، أضف الـ base64 كـ fallback
  if (cdnUrl) {
    cheque.fallback_base64 = result.imageBase64.substring(0, 100) + '...'; // للتحقق فقط
  }
  // لا نحتاج cropped_base64 لأننا نستخدم الصورة الكاملة
  delete cheque.cropped_base64;
  delete (cheque as any).bounding_box;
  
  allDetectedCheques.push(cheque);
}
```

### التغيير 3: استخدام Data URL مباشرة بدل CDN (حل مؤقت)

لضمان عمل الصور فوراً، نستخدم data URL بدلاً من انتظار CDN:

```typescript
// في Edge Function
const imageUrl = `data:image/jpeg;base64,${result.imageBase64}`;
// لا نحتاج upload إلى CDN الآن
```

**ملاحظة**: هذا حل مؤقت. البيانات ستكون كبيرة لكن ستعمل الصور مباشرة.

### التغيير 4: إصلاح شامل للـ CDN upload

```typescript
async function uploadToBunny(base64Data: string, fileName: string): Promise<string | null> {
  const BUNNY_API_KEY = Deno.env.get("BUNNY_API_KEY");
  const BUNNY_STORAGE_ZONE = Deno.env.get("BUNNY_STORAGE_ZONE") || "ab-insurance";
  const BUNNY_CDN_URL = Deno.env.get("BUNNY_CDN_URL") || "https://cdn.basheer-ab.com";
  
  if (!BUNNY_API_KEY) {
    console.error("BUNNY_API_KEY not configured - using data URL fallback");
    return null;
  }

  console.log(`[Bunny] Starting upload: ${fileName}`);
  console.log(`[Bunny] Storage zone: ${BUNNY_STORAGE_ZONE}`);
  console.log(`[Bunny] CDN URL: ${BUNNY_CDN_URL}`);

  try {
    const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const binaryData = Uint8Array.from(atob(cleanBase64), c => c.charCodeAt(0));
    
    console.log(`[Bunny] Binary size: ${binaryData.length} bytes`);
    
    const uploadPath = `cheques/${fileName}`;
    const response = await fetch(
      `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${uploadPath}`,
      {
        method: "PUT",
        headers: {
          "AccessKey": BUNNY_API_KEY,
          "Content-Type": "image/jpeg",
        },
        body: binaryData,
      }
    );

    console.log(`[Bunny] Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Bunny] Upload failed: ${response.status} - ${errorText}`);
      return null;
    }

    const cdnUrl = `${BUNNY_CDN_URL}/${uploadPath}`;
    console.log(`[Bunny] SUCCESS - URL: ${cdnUrl}`);
    
    return cdnUrl;
  } catch (error) {
    console.error("[Bunny] Exception:", error);
    return null;
  }
}
```

---

## ملخص التغييرات

| الملف | التغيير |
|-------|---------|
| `process-cheque-scan/index.ts` | إضافة logging تفصيلي لـ Bunny upload |
| `process-cheque-scan/index.ts` | تحسين error handling وإظهار الـ actual URL |
| Frontend (اختياري) | تحسين fallback handling |

---

## تفاصيل تقنية

### لماذا الصور لا تظهر؟

1. **Bunny Storage Zone خاطئ**: الـ URL قد يكون `cdn.basheer-ab.com/cheques/...` لكن الملف موجود في storage zone مختلف
2. **تأخير CDN**: Bunny قد يحتاج ثوانٍ لنشر الملف
3. **CORS issue**: Bunny قد يحجب الصور من domain مختلف

### الحل الموصى به

1. أولاً: إضافة logging مفصل لفهم ما يحدث فعلياً
2. ثانياً: التحقق من أن الملف يُرفع فعلياً عبر فحص Bunny dashboard
3. ثالثاً: كحل مؤقت، استخدام data URL مباشرة

---

## خطة التنفيذ

1. تحديث Edge Function بـ logging مفصل
2. Deploy وإعادة الاختبار
3. مراجعة الـ logs لفهم المشكلة الحقيقية
4. تطبيق الإصلاح المناسب بناءً على النتائج
