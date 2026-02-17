

# إصلاح: العميل لا يُحدد تلقائياً عند فتح معالج الوثيقة من صفحة العميل

## المشكلة
عند فتح معالج إنشاء وثيقة جديدة من صفحة العميل (`/clients/:id`)، لا يتم تحديد العميل تلقائياً رغم تمرير `preselectedClientId` بشكل صحيح.

## السبب المحتمل
دالة `useEffect` المسؤولة عن التحديد المسبق للعميل في `usePolicyWizardState.ts` تحتوي على شرط `selectedClient?.id === preselectedClientId` الذي قد يُرجع `true` في حالات معينة (مثل فتح/إغلاق المعالج عدة مرات لنفس العميل بدون `resetForm`). أيضاً، لا يوجد نمط `cancelled` flag لمنع تعارض العمليات المتزامنة.

## الحل

### ملف `src/components/policies/wizard/usePolicyWizardState.ts`

**التعديل 1: تحسين useEffect للتحديد المسبق**
- إعادة كتابة effect التحديد المسبق للعميل (سطر 79-100)
- إضافة `cancelled` flag لمنع تعارض الطلبات المتزامنة
- إزالة guard `selectedClient?.id === preselectedClientId` لأنه يمنع إعادة التحديد بعد إغلاق/فتح المعالج
- إضافة cleanup function تلغي الطلب إذا تغيرت المعطيات

**التعديل 2: إعادة تعيين العميل عند إغلاق المعالج**
- إضافة useEffect جديد يُعيد تعيين `selectedClient` عند `!open` (لضمان حالة نظيفة عند إعادة الفتح)
- هذا يعمل مع effect التحديد المسبق: عند إغلاق يُمسح، عند فتح يُعاد التحديد

### التفاصيل التقنية

```text
// سطر 79-100 - تعديل effect التحديد المسبق
useEffect(() => {
  if (!preselectedClientId || !open) return;
  let cancelled = false;

  const fetchPreselectedClient = async () => {
    setLoadingClients(true);
    const { data, error } = await supabase
      .from('clients')
      .select('...')
      .eq('id', preselectedClientId)
      .single();

    if (cancelled) return; // لا نُحدّث الحالة إذا تم الإلغاء
    setLoadingClients(false);
    if (!error && data) {
      setSelectedClient(data as Client);
      setCreateNewClient(false);
    }
  };

  // فقط نجلب إذا لم يكن العميل محدداً بالفعل
  if (selectedClient?.id !== preselectedClientId) {
    fetchPreselectedClient();
  }

  return () => { cancelled = true; };
}, [preselectedClientId, open]);

// إضافة effect لتنظيف الحالة عند الإغلاق
useEffect(() => {
  if (!open) {
    setSelectedClient(null);
    setCreateNewClient(false);
    setClientSearch("");
    setClients([]);
  }
}, [open]);
```

هذا يضمن:
1. عند إغلاق المعالج: يُمسح العميل المحدد
2. عند فتح المعالج: إذا كان `preselectedClientId` موجوداً، يُجلب ويُحدد تلقائياً
3. نمط `cancelled` يمنع تعارض الطلبات المتزامنة (مثلاً إذا اختار المستخدم عميلاً يدوياً أثناء التحميل)

