
# ربط AB Insurance CRM مع X-Service — مزامنة تلقائية

## الهدف
عند إنشاء وثيقة من نوع **خدمات الطريق** (ROAD_SERVICE) أو **إعفاء رسوم حوادث** (ACCIDENT_FEE_EXEMPTION) في AB، يتم إرسال البيانات تلقائياً إلى X-Service لإنشاء العميل والسيارة والبوليصة هناك.

---

## التغييرات في مشروع AB (هذا المشروع)

### 1. جدول `xservice_settings` (singleton)
يحفظ إعدادات الاتصال مع X-Service:

| العمود | النوع | الوصف |
|--------|-------|-------|
| id | uuid PK | |
| api_url | text | رابط API لنظام X-Service (قابل للتعديل) |
| api_key | text | مفتاح المصادقة |
| agent_name | text | اسم الوكيل في X-Service |
| xservice_agent_id | uuid nullable | معرّف الوكيل بعد التسجيل |
| is_enabled | boolean | تفعيل/إيقاف المزامنة |
| sync_road_service | boolean | مزامنة خدمات الطريق |
| sync_accident_fee | boolean | مزامنة إعفاء حوادث |
| updated_at | timestamptz | |

- RLS: قراءة للمسجلين، تعديل للمسؤولين فقط

### 2. جدول `xservice_sync_log`
سجل كل عملية مزامنة:

| العمود | النوع | الوصف |
|--------|-------|-------|
| id | uuid PK | |
| policy_id | uuid FK -> policies | |
| status | text | pending / success / failed |
| xservice_policy_id | text nullable | معرف البوليصة في X-Service |
| error_message | text nullable | |
| request_payload | jsonb | |
| response_payload | jsonb nullable | |
| created_at | timestamptz | |

### 3. Edge Function: `sync-to-xservice`
- يستقبل `policy_id`
- يجلب بيانات الوثيقة + العميل + السيارة من AB
- يجلب إعدادات X-Service من `xservice_settings`
- يتحقق من التفعيل ونوع الوثيقة
- يرسل POST إلى `{api_url}/functions/v1/ab-sync-receive`
- يسجل النتيجة في `xservice_sync_log`

البيانات المرسلة:

```text
{
  api_key: "...",
  customer: { full_name, id_number, phone1, phone2, birth_date },
  car: { car_number, car_type, manufacturer, model, year, color },
  policy: {
    service_type: "road_service" | "accident_fee",
    start_date, end_date,
    sell_price,
    notes
  }
}
```

### 4. صفحة إعدادات X-Service
ملف جديد: `src/pages/XServiceSettings.tsx`
- حقل رابط API (قابل للتعديل)
- حقل مفتاح API
- حقل اسم الوكيل
- تبديل تفعيل/إيقاف المزامنة
- اختيار أنواع الوثائق للمزامنة (خدمات طريق / إعفاء حوادث)
- زر اختبار الاتصال
- جدول سجل آخر عمليات المزامنة مع حالاتها
- زر إعادة المحاولة للفاشلة
- زر مسح بيانات X-Service (مع تأكيد مزدوج)
- رابط جديد في Sidebar تحت الإعدادات + Route جديد في App.tsx

### 5. تعديل PolicyWizard.tsx
بعد نجاح الحفظ (قبل `setShowSuccessDialog`) وبعد السطر ~1408:
- التحقق من نوع الوثيقة (ROAD_SERVICE أو ACCIDENT_FEE_EXEMPTION) -- سواء الرئيسية أو addons
- Fire-and-forget: استدعاء `sync-to-xservice` بدون حجب المستخدم
- تشمل أيضاً الـ package addons إذا كان أحدها road_service أو accident_fee

---

## التغييرات المطلوبة في مشروع X-Service (للتنفيذ هناك)

سأوفر لك النص الكامل لنسخه إلى المشروع الآخر:

### 1. Edge Function: `ab-sync-receive`
- يستقبل POST مع البيانات
- يتحقق من `api_key` مقابل جدول `agents`
- Upsert العميل (بناءً على `id_number` + `agent_id`)
- Upsert السيارة (بناءً على `car_number` + `customer_id`)
- إنشاء البوليصة مع ربط الخدمة المناسبة
- يعيد المعرّفات الجديدة

### 2. Edge Function: `ab-sync-clear`
- يستقبل `api_key`
- يحذف جميع policies -> cars -> customers للوكيل المرتبط
- يحتفظ بالوكلاء والخدمات والإعدادات

### 3. جدول `agent_api_keys`
يضاف لـ X-Service لتخزين مفتاح API لكل وكيل:

```text
agent_api_keys:
  id (uuid PK)
  agent_id (uuid FK -> agents, UNIQUE)
  api_key (text, UNIQUE)
  created_at (timestamptz)
```

### 4. التعليمات لنسخها إلى X-Service

```text
أنشئ نظام استقبال بيانات من وكيل خارجي (AB Insurance CRM):

1. أنشئ جدول agent_api_keys يربط مفتاح API بكل وكيل
2. أنشئ Edge Function اسمه ab-sync-receive:
   - يستقبل POST مع api_key + customer + car + policy
   - يبحث عن الوكيل بالـ api_key
   - Upsert العميل بناءً على id_number + agent_id
   - Upsert السيارة بناءً على car_number + customer_id
   - يبحث عن الـ service بناءً على service_type (road_service أو accident_fee)
   - ينشئ بوليصة جديدة
   - يعيد { customer_id, car_id, policy_id, policy_number }
3. أنشئ Edge Function اسمه ab-sync-clear:
   - يستقبل POST مع api_key فقط
   - يحذف كل policies ثم cars ثم customers لهذا الوكيل
   - لا يحذف الوكيل نفسه أو الخدمات أو الإعدادات
4. أضف صفحة في إعدادات الوكيل لعرض/إنشاء مفتاح API
```

---

## ترتيب التنفيذ

1. إنشاء جداول `xservice_settings` و `xservice_sync_log` (migration)
2. إنشاء Edge Function `sync-to-xservice`
3. إنشاء صفحة `XServiceSettings.tsx` + Route + رابط Sidebar
4. تعديل `PolicyWizard.tsx` لاستدعاء المزامنة بعد الحفظ

---

## القسم التقني -- تدفق المزامنة

```text
PolicyWizard.handleSave() completes
  |-- Check: is ROAD_SERVICE or ACCIDENT_FEE_EXEMPTION (main or addon)?
  |-- Check: xservice_settings.is_enabled?
  |-- Fire-and-forget for each matching policy:
      supabase.functions.invoke('sync-to-xservice', { body: { policy_id } })
  
sync-to-xservice:
  |-- Fetch xservice_settings (api_url, api_key, is_enabled)
  |-- Fetch policy + client + car from AB DB
  |-- Map policy_type_parent to X-Service service_type
  |-- POST {api_url}/functions/v1/ab-sync-receive
  |-- Log result to xservice_sync_log
```
