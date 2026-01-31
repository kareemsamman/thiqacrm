
# خطة: إصلاح نظام التوريسات (المعاينة والطباعة والصور)

## المشاكل المكتشفة

### 1) فشل إنشاء الملف (Print Failed)
**السبب:** الـ Edge Function تبحث عن `BUNNY_STORAGE_KEY` لكن السر المخزن اسمه `BUNNY_API_KEY`

```
2026-01-31T13:37:45Z ERROR BUNNY_STORAGE_KEY not configured
```

**الحل:** تغيير اسم المتغير في Edge Functions من `BUNNY_STORAGE_KEY` إلى `BUNNY_API_KEY`

---

### 2) التذييل لا يظهر أرقام الهواتف
**السبب:** الكود يبحث عن جدول `company_info` غير موجود!

**البيانات الفعلية موجودة في:**
- `sms_settings.company_phone_links` ← أرقام الهواتف
- `sms_settings.company_email` ← البريد الإلكتروني
- `sms_settings.company_location` ← العنوان

**الحل:** تعديل `LetterPreview.tsx` و Edge Functions للقراءة من `sms_settings` بدلاً من `company_info`

---

### 3) الشعار لا يظهر
**السبب:** لا يوجد `company_logo_url` في قاعدة البيانات

**مكان الشعار الفعلي:**
- `invoice_templates.logo_url` (مرتبط عبر `sms_settings.default_signature_template_id`)

**الحل:** جلب الشعار من `invoice_templates` عبر `sms_settings`

---

## التعديلات المطلوبة

### 1) ملف `src/components/correspondence/LetterPreview.tsx`

**التغييرات:**
- تغيير القراءة من `company_info` إلى `sms_settings` مع join على `invoice_templates`
- جلب `company_phone_links` من `sms_settings`
- جلب `logo_url` من `invoice_templates`

```typescript
// قبل (خطأ):
const { data } = await supabase
  .from('company_info')
  .select('company_name, company_logo_url, company_phone_links')
  .single();

// بعد (صحيح):
const { data } = await supabase
  .from('sms_settings')
  .select(`
    company_phone_links,
    company_location,
    invoice_templates:default_signature_template_id (logo_url)
  `)
  .limit(1)
  .single();
```

---

### 2) ملف `supabase/functions/generate-correspondence-html/index.ts`

**التغييرات:**
- تغيير `BUNNY_STORAGE_KEY` إلى `BUNNY_API_KEY`
- القراءة من `sms_settings` بدلاً من `company_info`
- جلب الشعار من `invoice_templates`

```typescript
// قبل:
const bunnyStorageKey = Deno.env.get('BUNNY_STORAGE_KEY');

const { data: companyInfo } = await supabase
  .from('company_info')
  .select('*')
  .single();

// بعد:
const bunnyStorageKey = Deno.env.get('BUNNY_API_KEY');

const { data: smsSettings } = await supabase
  .from('sms_settings')
  .select(`
    company_phone_links,
    company_location,
    invoice_templates:default_signature_template_id (logo_url)
  `)
  .limit(1)
  .single();

const logoUrl = smsSettings?.invoice_templates?.logo_url || '';
```

---

### 3) ملف `supabase/functions/send-correspondence-sms/index.ts`

**التغييرات:**
- نفس التعديلات: تغيير مصدر البيانات من `company_info` إلى `sms_settings`
- تغيير `BUNNY_STORAGE_KEY` إلى `BUNNY_API_KEY` (إن وجد)

---

## ملخص الملفات

| الملف | النوع | الوصف |
|-------|-------|-------|
| `src/components/correspondence/LetterPreview.tsx` | تعديل | قراءة من sms_settings + invoice_templates |
| `supabase/functions/generate-correspondence-html/index.ts` | تعديل | إصلاح اسم السر + مصدر البيانات |
| `supabase/functions/send-correspondence-sms/index.ts` | تعديل | إصلاح مصدر البيانات |

---

## النتيجة المتوقعة

1. **زر الطباعة يعمل:**
   - يُنشئ ملف HTML على CDN بنجاح
   - يفتح صفحة الطباعة

2. **المعاينة تعرض:**
   - شعار الشركة (من صفحة التوقيع)
   - أرقام الهواتف المحفوظة
   - اسم الشركة الافتراضي "مكتب بشير للتأمين"

3. **رفع الصور:**
   - يعمل (كما يظهر في صورتك مع المستلزمات الطبية ✓)

---

## ملاحظة: إضافة اسم الشركة

حالياً لا يوجد حقل `company_name` في قاعدة البيانات. سنستخدم:
- قيمة افتراضية: "مكتب بشير للتأمين"
- أو يمكن إضافة عمود `company_name` إلى جدول `sms_settings` لاحقاً

---

## التدفق بعد الإصلاح

```text
1. المستخدم يفتح "التوريسات"
2. ينشئ رسالة جديدة + يرفع صورة ✓
3. يضغط "معاينة":
   - يظهر الشعار من invoice_templates
   - يظهر التذييل مع الهواتف من sms_settings
4. يضغط "طباعة":
   - يُنشأ الملف على CDN (باستخدام BUNNY_API_KEY)
   - يُفتح للطباعة
```
