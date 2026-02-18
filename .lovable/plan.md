

# Fix X-Service Sync — Send Service Name for Matching

## المشكلة
نظامنا يرسل `service_id` المحلي (UUID خاص بنا) لكن X-Service عنده UUIDs مختلفة لنفس الخدمات. الأسماء متطابقة على الطرفين.

## الحل
إرسال `service_name` بالإضافة إلى `service_id` في الـ payload حتى يستطيع X-Service المطابقة بالاسم.

## التغييرات

### 1. `supabase/functions/sync-to-xservice/index.ts`
- الاستعلام عن اسم الخدمة من `road_services` أو `accident_fee_services`
- إضافة `service_name` إلى `requestPayload.policy`

### 2. `supabase/functions/bulk-sync-to-xservice/index.ts`
- نفس التعديل: جلب اسم الخدمة وإرساله في الـ payload

### 3. `supabase/functions/notify-xservice-change/index.ts`
- نفس التعديل

## التفاصيل التقنية

في كل edge function، بعد جلب بيانات البوليصة:

```
// Fetch service name
let serviceName = null;
if (policy.road_service_id) {
  const { data: svc } = await supabase
    .from("road_services")
    .select("name_ar, name")
    .eq("id", policy.road_service_id)
    .single();
  serviceName = svc?.name_ar || svc?.name || null;
}
if (!serviceName && policy.accident_fee_service_id) {
  const { data: svc } = await supabase
    .from("accident_fee_services")
    .select("name_ar, name")
    .eq("id", policy.accident_fee_service_id)
    .single();
  serviceName = svc?.name_ar || svc?.name || null;
}
```

ثم في الـ payload:
```
policy: {
  service_type: serviceType,
  service_id: policy.road_service_id || policy.accident_fee_service_id || null,
  service_name: serviceName,  // جديد
  start_date: ...
}
```

هذا يسمح لـ X-Service بمطابقة الخدمة بالاسم إذا لم يتعرف على الـ ID.

- لا تغييرات في قاعدة البيانات
- لا تغييرات في الواجهة
