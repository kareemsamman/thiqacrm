
# خطة: إعادة هيكلة نظام بلاغات الحوادث

## ملخص المتطلبات

### 1) تدفق إنشاء بلاغ جديد
- من صفحة الحوادث، يمكن إنشاء بلاغ جديد
- اختيار العميل من القائمة أو إدخال يدوي
- عرض الوثائق بشكل dropdown مع badges (كما في الصورة المرفقة)
- عند اختيار الباقة، الكشف عن أنواع التغطية (طرف ثالث، شامل، خدمات طريق) - باستثناء الإلزامي
- اختيار نوع التغطية المطلوب استخدامها
- جلب رقم البوليصة تلقائياً أو إدخال يدوي
- جلب رقم السيارة تلقائياً أو إدخال يدوي
- رفع ملفات متعددة + مسح ضوئي (Scanner)
- حقل اختياري لفتحة التأمين (الخصم)

### 2) متابعة البلاغ
- إضافة ملاحظات
- تذكيرات
- badge يظهر رقم البلاغ حتى يُغلق

### 3) صفحة العميل
- عرض بلاغات الحوادث للعميل
- إمكانية إضافة بلاغ جديد من صفحة العميل
- نقطة حمراء على اسم العميل الذي لديه بلاغات مفتوحة
- مكان لكتابة ملاحظات عامة عن الحوادث (مثلاً: "هذا المؤمن لديه 5 حوادث، لا نرغب بتأمين هذه المركبة له")

### 4) تكامل قالب البلاغ
- عند إدخال رقم السيارة، الكشف عن الشركة المؤمنة وعرض القالب المناسب

---

## التعديلات على قاعدة البيانات

### جدول جديد: `accident_report_notes`
```sql
CREATE TABLE accident_report_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accident_report_id uuid REFERENCES accident_reports(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);
```

### جدول جديد: `accident_report_files`
```sql
CREATE TABLE accident_report_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accident_report_id uuid REFERENCES accident_reports(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text,
  file_type text,
  created_at timestamptz DEFAULT now()
);
```

### جدول جديد: `accident_report_reminders`
```sql
CREATE TABLE accident_report_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accident_report_id uuid REFERENCES accident_reports(id) ON DELETE CASCADE,
  reminder_date date NOT NULL,
  reminder_text text,
  is_done boolean DEFAULT false,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);
```

### إضافة أعمدة لجدول `accident_reports`
```sql
ALTER TABLE accident_reports ADD COLUMN IF NOT EXISTS 
  report_number serial, -- رقم البلاغ التسلسلي
  deductible_amount numeric, -- فتحة التأمين
  coverage_type text, -- نوع التغطية المختار (THIRD, FULL, ROAD_SERVICE)
  selected_policy_group_id uuid; -- الباقة المختارة
```

### إضافة عمود لجدول `clients`
```sql
ALTER TABLE clients ADD COLUMN IF NOT EXISTS 
  accident_notes text; -- ملاحظات عامة عن الحوادث
```

---

## الملفات الجديدة

### 1) `src/components/accident-reports/AccidentReportDrawer.tsx`
درج إنشاء بلاغ جديد يحتوي على:
- **الخطوة 1**: اختيار/إنشاء العميل
  - بحث عن عميل موجود (مثل Step1BranchTypeClient)
  - أو إدخال بيانات يدوية (الاسم، الهوية، الهاتف)
  
- **الخطوة 2**: اختيار الوثيقة
  - عرض dropdown للباقات مع badges (سارية، مدفوع، ثالث/شامل، إلزامي، خدمات طريق)
  - عند الاختيار، عرض dropdown ثاني لنوع التغطية:
    - THIRD_FULL → يظهر
    - ROAD_SERVICE → يظهر
    - ELZAMI → لا يظهر
  - جلب رقم البوليصة تلقائياً من الوثيقة (THIRD_FULL فقط)
  - جلب رقم السيارة تلقائياً

- **الخطوة 3**: بيانات البلاغ
  - رقم البوليصة (مع إمكانية التعديل)
  - رقم السيارة (مع إمكانية التعديل)
  - تاريخ الحادث
  - فتحة التأمين (اختياري)
  - منطقة رفع الملفات (drag & drop + multi-upload)
  - زر مسح ضوئي (Scanner)

### 2) `src/components/accident-reports/AccidentReportDetail.tsx`
صفحة تفاصيل البلاغ تحتوي على:
- معلومات البلاغ الأساسية
- قائمة الملفات المرفقة
- تايم لاين الملاحظات
- التذكيرات
- زر إغلاق البلاغ
- badge رقم البلاغ

### 3) `src/components/accident-reports/AccidentFilesUploader.tsx`
مكون رفع ملفات مخصص:
- drag & drop متعدد
- زر رفع ملفات
- زر مسح ضوئي (Scanner integration)
- معاينة الملفات المرفوعة

### 4) `src/components/accident-reports/AccidentNotesTimeline.tsx`
تايم لاين الملاحظات:
- عرض الملاحظات بترتيب زمني
- إضافة ملاحظة جديدة
- اسم المستخدم الذي أضاف الملاحظة

### 5) `src/components/accident-reports/AccidentReminders.tsx`
إدارة التذكيرات:
- إضافة تذكير جديد
- تحديد التاريخ والنص
- علامة "تم"

### 6) `src/components/clients/ClientAccidentsTab.tsx`
تبويب بلاغات الحوادث في صفحة العميل:
- جدول البلاغات
- زر إضافة بلاغ جديد
- حقل ملاحظات الحوادث العامة

---

## تعديل الملفات الموجودة

### 1) `src/pages/AccidentReports.tsx`
- إضافة زر "بلاغ جديد" في الهيدر
- فتح `AccidentReportDrawer` عند النقر
- تعديل الجدول ليعرض:
  - رقم البلاغ (badge)
  - الحالة
  - عدد الملاحظات
  - التذكير القادم

### 2) `src/components/clients/ClientDetails.tsx`
- إضافة تبويب "البلاغات" في TabsList
- استخدام `ClientAccidentsTab`
- عرض نقطة حمراء على اسم العميل إذا كان لديه بلاغات مفتوحة
- إضافة حقل "ملاحظات الحوادث" في تبويب "نظرة عامة"

### 3) `src/components/clients/ClientsTable.tsx`
- إضافة نقطة حمراء بجانب اسم العميل إذا كان لديه بلاغات مفتوحة

### 4) `src/components/layout/SidebarNotificationBadge.tsx` (أو إنشاء جديد)
- badge لعدد البلاغات المفتوحة في الـ Sidebar

---

## تفاصيل التنفيذ التقنية

### استعلام اختيار الوثائق (Dropdown)
```typescript
const { data: clientPackages } = await supabase
  .from('policies')
  .select(`
    id, 
    policy_number, 
    policy_type_parent, 
    policy_type_child,
    group_id,
    start_date,
    end_date,
    cancelled,
    insurance_price,
    company:insurance_companies(name, name_ar),
    car:cars(car_number)
  `)
  .eq('client_id', clientId)
  .eq('cancelled', false)
  .is('deleted_at', null)
  .order('created_at', { ascending: false });

// تجميع حسب group_id للباقات
const packages = groupBy(clientPackages, 'group_id');
```

### منطق الكشف عن التغطيات المتاحة
```typescript
const getAvailableCoverages = (packagePolicies) => {
  const coverages = [];
  for (const policy of packagePolicies) {
    if (policy.policy_type_parent === 'THIRD_FULL') {
      coverages.push({
        type: policy.policy_type_child, // 'THIRD' or 'FULL'
        label: policy.policy_type_child === 'THIRD' ? 'طرف ثالث' : 'شامل',
        policy_number: policy.policy_number
      });
    } else if (policy.policy_type_parent === 'ROAD_SERVICE') {
      coverages.push({
        type: 'ROAD_SERVICE',
        label: 'خدمات طريق',
        policy_number: null
      });
    }
    // ELZAMI is excluded
  }
  return coverages;
};
```

### استعلام العملاء مع نقطة الحوادث
```typescript
const { data: clients } = await supabase
  .from('clients')
  .select(`
    *,
    accident_count:accident_reports(count).filter(status.neq.closed)
  `);
```

---

## واجهة المستخدم

### عرض الباقات في Dropdown
```
┌─────────────────────────────────────────────────────┐
│ اختر الوثيقة                                    ▼ │
├─────────────────────────────────────────────────────┤
│ 🏢 اراضي مقدسة  🚗 12345678                        │
│ [سارية ✓] [ثالث/شامل] [إلزامي] [خدمات طريق]        │
│ [إعفاء رسوم] [باقة ⚡] [مدفوع ✓]                   │
│ 📅 30/01/2026 ← 28/01/2027  💰 ₪2,800              │
├─────────────────────────────────────────────────────┤
│ 🏢 كلال  🚗 87654321                               │
│ [سارية ✓] [إلزامي]                                 │
│ 📅 30/01/2026 ← 28/01/2027  💰 ₪1,000              │
└─────────────────────────────────────────────────────┘
```

### اختيار نوع التغطية (بعد اختيار الباقة)
```
┌────────────────────────────────────┐
│ اختر نوع التغطية للبلاغ        ▼ │
├────────────────────────────────────┤
│ ○ طرف ثالث (رقم البوليصة: 123456) │
│ ○ خدمات طريق                      │
└────────────────────────────────────┘
```

### نقطة حمراء على العميل
```
┌─────────────────────────────────┐
│ 🔴 أحمد محمد  |  0501234567    │
│    ملف: 1234                   │
└─────────────────────────────────┘
```

---

## الملفات المتأثرة

| الملف | نوع التغيير |
|-------|-------------|
| `src/pages/AccidentReports.tsx` | تعديل - إضافة زر ودرج الإنشاء |
| `src/components/clients/ClientDetails.tsx` | تعديل - إضافة تبويب البلاغات |
| `src/components/clients/ClientsTable.tsx` | تعديل - إضافة نقطة حمراء |
| `src/components/accident-reports/AccidentReportDrawer.tsx` | جديد |
| `src/components/accident-reports/AccidentReportDetail.tsx` | جديد |
| `src/components/accident-reports/AccidentFilesUploader.tsx` | جديد |
| `src/components/accident-reports/AccidentNotesTimeline.tsx` | جديد |
| `src/components/accident-reports/AccidentReminders.tsx` | جديد |
| `src/components/clients/ClientAccidentsTab.tsx` | جديد |
| Migration SQL | جديد - 4 جداول جديدة + تعديلات |

---

## ملاحظات هامة

1. **الاحتفاظ بقالب البلاغ**: نظام قوالب الحوادث (AccidentTemplateTab, AccidentTemplateMapper) يبقى كما هو ويُستخدم لاحقاً عند طباعة البلاغ الرسمي

2. **الكشف التلقائي عن الشركة**: عند إدخال رقم السيارة يدوياً، يتم البحث عن السيارة في النظام وجلب الوثيقة النشطة والشركة المؤمنة

3. **رفع الملفات**: يستخدم نفس نظام Bunny CDN المستخدم في النظام (upload-media Edge Function)

4. **المسح الضوئي**: يستخدم مكون `ScannerDialog` الموجود

5. **التذكيرات**: تظهر في الـ Sidebar كـ badge مع البلاغات المفتوحة
