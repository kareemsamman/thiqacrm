

# صفحة إعدادات العلامة التجارية (Branding Settings)

## الهدف
إنشاء صفحة إعدادات داخل النظام لتغيير الشعار، العنوان، والوصف ديناميكياً، مع إزالة أي مراجع خارجية.

## الخطوات

### 1. جدول قاعدة بيانات: `site_settings`
إنشاء جدول لحفظ إعدادات الموقع:

```text
site_settings:
  id (uuid, PK)
  site_title (text) -- عنوان الموقع
  site_description (text) -- وصف الموقع
  logo_url (text) -- رابط الشعار
  favicon_url (text) -- رابط الأيقونة
  og_image_url (text) -- صورة المشاركة الاجتماعية
  updated_at (timestamptz)
  updated_by (uuid)
```

- صف واحد فقط (singleton pattern)
- RLS: قراءة للجميع، تعديل للمسؤولين فقط

### 2. Storage Bucket: `branding`
- إنشاء bucket عام لرفع الشعار والأيقونة وصورة OG
- سياسات RLS: رفع/حذف للمستخدمين المسجلين، قراءة عامة

### 3. صفحة إعدادات العلامة التجارية
ملف جديد: `src/pages/BrandingSettings.tsx`
- حقل: عنوان الموقع
- حقل: وصف الموقع
- رفع شعار (مع معاينة)
- رفع أيقونة favicon (مع معاينة)
- رفع صورة OG للمشاركة الاجتماعية
- زر حفظ
- إضافة رابط في الـ Sidebar تحت قسم الإعدادات

### 4. Hook لجلب الإعدادات: `useSiteSettings`
ملف جديد: `src/hooks/useSiteSettings.tsx`
- جلب إعدادات الموقع مرة واحدة وتخزينها (React Query)
- يُستخدم في MainLayout لتحديث العنوان والوصف ديناميكياً

### 5. تحديث `index.html`
- إزالة روابط `gpt-engineer` من og:image و twitter:image
- وضع قيم افتراضية نظيفة (سيتم استبدالها ديناميكياً من الإعدادات)

### 6. تحديث `MainLayout.tsx`
- استخدام `react-helmet-async` لتحديث `<title>` و `<meta>` ديناميكياً من `useSiteSettings`
- عرض الشعار المخصص في الـ Sidebar بدلاً من النص الثابت

### 7. تنظيف المراجع
- إزالة نص "Lovable" من رسالة الخطأ في `Login.tsx`
- تحديث og:image في `index.html`

