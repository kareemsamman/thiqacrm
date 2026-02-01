

# خطة: إزالة حد 1000 من أداة اكتشاف الباقات المفقودة

## المشكلة

- يوجد **1159 باقة مفقودة** في قاعدة البيانات
- لكن الأداة تعرض فقط **1000** بسبب حد Supabase الافتراضي على نتائج RPC

## الحل

### تحديث استدعاء RPC في `src/pages/WordPressImport.tsx`

**قبل:**
```typescript
const { data, error } = await supabase.rpc('find_missing_packages');
```

**بعد:**
```typescript
const { data, error } = await supabase
  .rpc('find_missing_packages')
  .range(0, 10000);  // جلب حتى 10,000 نتيجة
```

ملاحظة: يمكن استخدام `.range(0, 10000)` لتجاوز الحد الافتراضي.

---

## التغييرات التقنية

### ملف: `src/pages/WordPressImport.tsx`

```typescript
// خط ~342
const detectMissingPackages = async () => {
  setDetectingPackages(true);
  setPackageLinkStats(null);
  try {
    const { data, error } = await supabase
      .rpc('find_missing_packages')
      .range(0, 10000);  // ← إضافة هذا السطر
    
    if (error) throw error;
    // ... rest of the code
  }
};
```

---

## ملخص

| الملف | التغيير |
|-------|---------|
| `src/pages/WordPressImport.tsx` | إضافة `.range(0, 10000)` لجلب جميع النتائج |

---

## النتيجة المتوقعة

1. ✅ ستظهر جميع الـ 1159 باقة مفقودة
2. ✅ يمكن البحث والتحديد من جميع النتائج
3. ✅ لن يكون هناك حد 1000 بعد الآن

