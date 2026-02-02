
# خطة: استيراد تفاضلي من WordPress (الجديد فقط بدون حذف)

## ✅ الأخبار الجيدة

**النظام الحالي يدعم هذا بالفعل!** الكود موجود لكن يحتاج تعديلات بسيطة لتفعيله.

### كيف يعمل الاستيراد الحالي:

1. **الشركات**: تفحص بالاسم → إذا موجودة → تحديث، وإلا → إضافة
2. **الوسطاء**: تفحص بالاسم → إذا موجود → تحديث، وإلا → إضافة
3. **العملاء**: تفحص بـ `id_number` → إذا موجود → تحديث، وإلا → إضافة
4. **السيارات**: تفحص بـ `car_number` → إذا موجودة → تحديث، وإلا → إضافة
5. **الوثائق**: تفحص بـ `legacy_wp_id` → إذا موجودة → تحديث، وإلا → إضافة
6. **المدفوعات**: تفحص بـ (policy_id + date + amount) → إذا موجودة → تحديث، وإلا → إضافة

### المشكلة الحالية:

خيار **"مسح البيانات قبل الاستيراد"** مفعّل افتراضياً (`clearBeforeImport: true`)، مما يحذف كل شيء قبل الاستيراد!

---

## الحل المقترح

### التغييرات المطلوبة:

#### 1. إضافة وضع "استيراد تفاضلي" (Incremental Import)

**في الواجهة** (`src/pages/WordPressImport.tsx`):

```tsx
// إضافة خيار جديد بدلاً من خيار "مسح البيانات"
const [incrementalMode, setIncrementalMode] = useState(true); // افتراضي: تفاضلي

// UI جديد واضح:
<Card className="border-green-200 bg-green-50">
  <CardHeader>
    <CardTitle className="flex items-center gap-2 text-green-700">
      <RefreshCw className="h-5 w-5" />
      استيراد تفاضلي (آمن)
    </CardTitle>
    <CardDescription>
      سيتم استيراد السجلات الجديدة فقط التي غير موجودة في النظام.
      <br />
      <strong>لن يتم حذف أي بيانات موجودة.</strong>
    </CardDescription>
  </CardHeader>
</Card>
```

#### 2. تحديث منطق الاستيراد

**إزالة خطوة "clear" عند الاستيراد التفاضلي:**

```tsx
// في handleImport:
const stepsConfig = incrementalMode
  ? STEP_KEYS.filter(key => key !== 'clear' && key !== 'preserveRules' && key !== 'restoreRules')
  : STEP_KEYS;
```

#### 3. تحسين عرض الإحصائيات

```tsx
// عرض واضح للسجلات الجديدة vs المحدّثة
<div className="grid grid-cols-2 gap-4">
  <Card className="border-green-300">
    <CardHeader className="pb-2">
      <CardTitle className="text-green-600 text-lg">جديد</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold text-green-700">{stats.inserted}</div>
    </CardContent>
  </Card>
  <Card className="border-blue-300">
    <CardHeader className="pb-2">
      <CardTitle className="text-blue-600 text-lg">تم تحديثه</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold text-blue-700">{stats.updated}</div>
    </CardContent>
  </Card>
</div>
```

#### 4. معاينة ذكية قبل الاستيراد

```tsx
// إضافة خطوة معاينة تُظهر:
// - كم سجل جديد سيُضاف
// - كم سجل موجود سيُحدّث
// - لا شيء سيُحذف

const analyzeJsonForIncrementalImport = async (jsonData) => {
  // جلب البيانات الموجودة
  const { data: existingClients } = await supabase
    .from('clients')
    .select('id_number')
    .is('deleted_at', null);
  
  const existingIdNumbers = new Set(existingClients.map(c => c.id_number));
  
  // تحليل JSON
  const newClients = jsonData.clients.filter(c => !existingIdNumbers.has(c.id_number));
  const existingToUpdate = jsonData.clients.filter(c => existingIdNumbers.has(c.id_number));
  
  return {
    clients: { new: newClients.length, update: existingToUpdate.length },
    // ... نفس الشيء للسيارات والوثائق
  };
};
```

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/pages/WordPressImport.tsx` | إضافة وضع الاستيراد التفاضلي + معاينة ذكية |

---

## كيف سيعمل؟

### السيناريو المطلوب:

1. **رفع JSON جديد من WordPress**
2. **المعاينة تُظهر**:
   - ✅ 50 عميل جديد سيُضاف
   - 🔄 200 عميل موجود (سيُحدّث إذا تغيّر شيء)
   - 🚗 30 سيارة جديدة
   - 📋 75 وثيقة جديدة
3. **الاستيراد**:
   - يُضيف الجديد فقط
   - يُحدّث الموجود (لو تغيّر)
   - **لا يحذف أي شيء أبداً** ✅

---

## آلية منع التكرار (موجودة بالفعل):

| الكيان | مفتاح التميز | السلوك |
|--------|--------------|--------|
| العملاء | `id_number` | موجود → تحديث، جديد → إضافة |
| السيارات | `car_number` | موجود → تحديث، جديد → إضافة |
| الوثائق | `legacy_wp_id` | موجود → تحديث، جديد → إضافة |
| المدفوعات | policy_id + date + amount | موجود → تخطي/تحديث |
| الوسائط | entity_id + original_name | موجود → تخطي |

---

## UI المقترح

```text
┌──────────────────────────────────────────────────────────────────┐
│                    📥 استيراد WordPress                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 🔄 وضع الاستيراد التفاضلي (آمن)                   ✅ مفعّل  │  │
│  │    • استيراد السجلات الجديدة فقط                           │  │
│  │    • لن يتم حذف أي بيانات موجودة                           │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  📄 exported-data.json                        [تحليل الملف]      │
│                                                                  │
│  ┌─────────────┬─────────────┬─────────────┬─────────────────┐  │
│  │   العملاء   │  السيارات   │   الوثائق   │   المدفوعات     │  │
│  ├─────────────┼─────────────┼─────────────┼─────────────────┤  │
│  │ 🆕 50 جديد │ 🆕 30 جديد │ 🆕 75 جديد │ 🆕 150 جديد    │  │
│  │ 🔄 200 موجود│ 🔄 180 موجود│ 🔄 400 موجود│ 🔄 800 موجود   │  │
│  └─────────────┴─────────────┴─────────────┴─────────────────┘  │
│                                                                  │
│              [🚀 بدء الاستيراد التفاضلي]                         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## اختبار بعد التنفيذ

1. اذهب لصفحة `/wordpress-import`
2. ارفع ملف JSON من WordPress
3. تأكد أن "الاستيراد التفاضلي" مفعّل افتراضياً
4. اضغط "تحليل الملف" وتأكد من عرض:
   - عدد السجلات الجديدة
   - عدد السجلات الموجودة
5. اضغط "بدء الاستيراد"
6. تأكد أن:
   - السجلات الجديدة أُضيفت
   - السجلات القديمة لم تُحذف
   - الإحصائيات تُظهر "inserted" و "updated" بشكل منفصل
