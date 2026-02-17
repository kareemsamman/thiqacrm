

# إصلاح: النص العربي غير مقروء في عارض PDF

## المشكلة
رغم إضافة CMap، النص العربي لا يزال غير مقروء. السبب هو أن pdf.js عند الرسم على canvas لا يدعم بشكل كامل تشكيل الحروف العربية (الربط بين الحروف، الاتجاه RTL). هذه مشكلة معروفة في pdf.js canvas rendering.

## الحل
استبدال عارض pdf.js (canvas) بعارض المتصفح الأصلي (native PDF viewer) عبر `<iframe>` مع blob URL. المتصفح يعرض العربية بشكل مثالي.

### كيف يعمل:
1. جلب ملف PDF عبر proxy-cdn-file (كما هو الآن)
2. تحويله إلى blob URL
3. عرضه في `<iframe>` بدلاً من canvas

### ملف `src/components/policies/PdfJsViewer.tsx`
- إزالة كل كود pdf.js (import، canvas، page navigation، zoom)
- استبداله بـ:
  - fetch PDF via proxy -> blob -> `URL.createObjectURL`
  - عرض في `<iframe src={blobUrl} />` بملء الحاوية
- المتصفح الأصلي يوفر تلقائياً: تكبير/تصغير، تنقل بين الصفحات، بحث في النص
- النتيجة: كود أبسط بكثير + عرض عربي مثالي

```text
// الشكل الجديد المبسط:
fetch(proxy-cdn-file) -> blob -> blobUrl
<iframe src={blobUrl} className="w-full h-full" />
```

- يبقى: حالة التحميل (loading spinner) وحالة الخطأ
- يُحذف: canvas، pdf.js import، أزرار zoom/navigation (المتصفح يوفرها)
