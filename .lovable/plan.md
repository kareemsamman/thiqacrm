
# إصلاح: النص العربي غير مقروء في عارض PDF + التحميل المباشر

## المشكلتان

### 1. النص العربي غير مقروء
pdf.js يحتاج إلى ملفات CMap (Character Maps) لعرض النصوص غير اللاتينية (العربية، العبرية). حالياً `getDocument` يُستدعى بدون تحديد `cMapUrl` و `cMapPacked`، فيفشل في عرض الحروف العربية بشكل صحيح.

### 2. زر التحميل يفتح في تبويب جديد بدلاً من التحميل المباشر
خاصية `download` في `<a>` لا تعمل مع روابط cross-origin (CDN خارجي). المتصفح يتجاهلها ويفتح الرابط في تبويب جديد.

## الحل

### ملف `src/components/policies/PdfJsViewer.tsx`
- إضافة `cMapUrl` و `cMapPacked: true` في `getDocument()` لتحميل خرائط الأحرف العربية من unpkg CDN
- التعديل في السطر 53:

```text
const loadingTask = pdfjsLib.getDocument({
  data: arrayBuffer,
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
  cMapPacked: true,
});
```

### ملف `src/components/policies/FilePreviewGallery.tsx`
- استبدال `<a target="_blank">` بزر يجلب الملف عبر proxy-cdn-file ثم يُنشئ blob URL ويُحمّل مباشرة
- إضافة دالة `handleDownload` تستخدم fetch + blob + createElement('a') + click()
- إظهار حالة تحميل أثناء جلب الملف

```text
const handleDownload = async () => {
  setDownloading(true);
  try {
    const response = await fetch(proxy-cdn-file URL, { method: 'POST', body: { url } });
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = file.original_name;
    a.click();
    URL.revokeObjectURL(blobUrl);
  } finally {
    setDownloading(false);
  }
};
```
