
# خطة: حفظ تعديلات بلاغ الحادث (Save Accident Report Edits)

## المشكلة
حالياً زر "حفظ" في صفحة البلاغ (HTML) يُبدّل فقط وضع التحرير on/off ولكن **لا يحفظ التغييرات فعلياً**. عندما يقوم المستخدم بـ:
1. تعديل مواقع الحقول (drag)
2. إضافة نصوص جديدة
3. تعديل محتوى النصوص
4. الضغط على "حفظ"

التغييرات تُفقد عند إعادة تحميل الصفحة.

---

## الحل المقترح

### نظرة عامة:
1. إضافة عمود جديد `edited_fields_json` لجدول `accident_reports` لتخزين حالة التعديلات
2. إنشاء Edge Function جديد `save-accident-edits` لحفظ التعديلات
3. تعديل HTML المُنشأ ليشمل:
   - استدعاء API عند الضغط على "حفظ"
   - تحميل التعديلات المحفوظة عند فتح الصفحة
4. تحديث `generate-accident-pdf` لدمج التعديلات المحفوظة مع البيانات الأصلية

---

## التعديلات المطلوبة

### 1) تحديث قاعدة البيانات
**إضافة عمود جديد:**
```sql
ALTER TABLE accident_reports 
ADD COLUMN edited_fields_json JSONB DEFAULT NULL;
```

**الهيكل المتوقع للـ JSON:**
```json
{
  "fields": [
    {
      "id": "driver_name",
      "page": 0,
      "x": 150,
      "y": 280,
      "text": "أحمد محمد",
      "fontSize": 18
    },
    {
      "id": "custom-1",
      "page": 0,
      "x": 200,
      "y": 350,
      "text": "نص مخصص جديد",
      "fontSize": 16
    }
  ],
  "deletedFields": ["accident_location"],
  "lastSavedAt": "2026-01-31T10:30:00Z"
}
```

### 2) Edge Function جديد: `save-accident-edits`
**ملف:** `supabase/functions/save-accident-edits/index.ts`

**الوظيفة:**
- استقبال معرف البلاغ + بيانات الحقول المعدّلة
- تحديث عمود `edited_fields_json`
- إعادة إنشاء ملف HTML محدّث على Bunny CDN

**المنطق:**
```typescript
// 1. استخراج جميع الحقول من الـ DOM (مواقع + نصوص)
// 2. إرسال للـ API
// 3. حفظ في قاعدة البيانات
// 4. إعادة رفع HTML محدّث لـ Bunny CDN
```

### 3) تعديل HTML المُنشأ في `generate-accident-pdf`
**تعديلات الـ JavaScript:**

**إضافة دالة جمع الحقول:**
```javascript
function collectAllFields() {
  const fields = [];
  document.querySelectorAll('.overlay-container').forEach((container, pageIndex) => {
    container.querySelectorAll('.text-overlay').forEach(el => {
      fields.push({
        id: el.getAttribute('data-field'),
        page: pageIndex,
        x: parseInt(el.style.left) || 0,
        y: parseInt(el.style.top) || 0,
        text: el.textContent.replace(/×$/, '').trim(),
        fontSize: parseInt(el.style.fontSize) || 18
      });
    });
  });
  return fields;
}
```

**تعديل دالة toggleEditMode:**
```javascript
async function toggleEditMode() {
  if (isEditMode) {
    // Exiting edit mode - SAVE changes
    const fields = collectAllFields();
    const btn = document.getElementById('editBtn');
    btn.disabled = true;
    btn.innerHTML = '⏳ جاري الحفظ...';
    
    try {
      const response = await fetch(SUPABASE_URL + '/functions/v1/save-accident-edits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          accident_report_id: REPORT_ID,
          fields: fields
        })
      });
      
      if (!response.ok) throw new Error('Failed to save');
      
      alert('تم الحفظ بنجاح ✓');
    } catch (error) {
      alert('فشل في الحفظ: ' + error.message);
    }
    
    btn.disabled = false;
  }
  
  isEditMode = !isEditMode;
  // ... rest of toggle logic
}
```

**تحميل التعديلات المحفوظة:**
- عند إنشاء HTML، إذا كان `edited_fields_json` موجود → استخدامه بدلاً من البيانات الأصلية
- يضمن عرض التعديلات السابقة عند إعادة فتح الصفحة

### 4) تعديل `generate-accident-pdf` لدمج التعديلات
**المنطق:**
```typescript
// بعد جلب البلاغ
if (report.edited_fields_json) {
  // استخدام المواقع والنصوص من edited_fields_json
  // بدلاً من mapping_json الأصلي
}
```

---

## مخطط سير العمل

```text
┌─────────────────────────────────────────────────────────────┐
│                    فتح بلاغ الحادث HTML                     │
│                                                             │
│  1. تحميل PDF الخلفية                                       │
│  2. تحميل الحقول من:                                        │
│     ├── edited_fields_json (إذا موجود) ← التعديلات السابقة │
│     └── mapping_json (افتراضي) ← البيانات الأصلية           │
│                                                             │
│  [تعديل] ← الدخول لوضع التحرير                              │
│     ├── سحب الحقول                                         │
│     ├── تعديل النصوص                                       │
│     └── إضافة/حذف حقول                                     │
│                                                             │
│  [حفظ] ← عند الضغط:                                         │
│     1. جمع جميع الحقول + مواقعها                            │
│     2. إرسال لـ save-accident-edits                         │
│     3. حفظ في edited_fields_json                            │
│     4. تحديث ملف HTML على CDN                               │
│                                                             │
│  النتيجة: التعديلات محفوظة ومعروضة عند إعادة الفتح ✓       │
└─────────────────────────────────────────────────────────────┘
```

---

## الملفات المطلوبة

| الملف | النوع | الوصف |
|-------|-------|-------|
| Migration | جديد | إضافة عمود `edited_fields_json` |
| `supabase/functions/save-accident-edits/index.ts` | جديد | حفظ التعديلات وتحديث HTML |
| `supabase/functions/generate-accident-pdf/index.ts` | تعديل | دمج التعديلات المحفوظة + تمرير متغيرات للـ JavaScript |

---

## التفاصيل التقنية

### متغيرات JavaScript في HTML:
```javascript
const SUPABASE_URL = '${supabaseUrl}';
const SUPABASE_ANON_KEY = '${supabaseAnonKey}';
const REPORT_ID = '${report.id}';
```

### هيكل الـ API:
```typescript
// POST /functions/v1/save-accident-edits
{
  accident_report_id: string;
  fields: Array<{
    id: string;
    page: number;
    x: number;
    y: number;
    text: string;
    fontSize: number;
  }>;
}
```

### الأمان:
- التحقق من صلاحية المستخدم قبل الحفظ
- استخدام Service Role Key للتحديث في قاعدة البيانات
- التحقق من ملكية البلاغ قبل السماح بالتعديل

---

## النتيجة

عند تنفيذ هذه الخطة:
1. المستخدم يفتح بلاغ الحادث
2. يضغط "تعديل" ويحرك الحقول أو يضيف نصوص
3. يضغط "حفظ" ← التعديلات تُرسل للخادم وتُحفظ
4. عند إعادة فتح البلاغ ← التعديلات تظهر كما حفظها
5. الطباعة تعكس التعديلات المحفوظة
