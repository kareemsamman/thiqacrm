
## الهدف
حل مشكلتين داخل نافذة **تعديل الباقة (PackagePolicyEditModal)**:
1) التمرير داخل الـ popup لا يعمل (لا يمكن الصعود/النزول).
2) زر **إضافة جديد** للسائقين الإضافيين يبدو “لا يفعل شيء” (غالبًا يتم الإضافة لكن لا تظهر بسبب عدم التمرير).
3) تقليل ارتفاع/حجم البطاقات أكثر (UI أكثر compact).

---

## التشخيص (سبب عدم عمل التمرير)
`DialogContent` في مشروعنا يأتي افتراضيًا بـ `display: grid` (موجود في `src/components/ui/dialog.tsx` ضمن الكلاسات الأساسية).
داخل `PackagePolicyEditModal` نحن نضيف `flex flex-col`، لكن في Tailwind قد لا تتغلب دائمًا على `grid` بسبب ترتيب توليد الـ utilities، فتظل الـ Dialog **Grid** فعليًا.

عندما تكون Dialog Grid:
- `flex-1` و `min-h-0` على `ScrollArea` لا تعمل كما نتوقع
- محتوى الـ modal يتم قصّه بسبب `max-h` + `overflow-hidden`
- النتيجة: **لا Scroll** حتى لو المحتوى أطول من 90vh

هذا يفسّر أيضًا “زر إضافة جديد لا يعمل” لأن النموذج يُضاف لكن لا يمكن الوصول له/رؤيته عند تمدد المحتوى.

---

## التغييرات المقترحة (على الكود)

### 1) فرض أن الـ Dialog فعليًا Flex وليس Grid (حل جذري للتمرير)
**الملف:** `src/components/policies/PackagePolicyEditModal.tsx`

- تعديل `DialogContent` ليستخدم `!flex !flex-col` (important) لضمان التغلب على `grid`:
  - مثال:
    - `className="... overflow-hidden !flex !flex-col ..."`

- إضافة Wrapper داخلي يضمن وجود “منطقة قابلة للتمدد” للتمرير:
  - إنشاء `<div className="flex-1 min-h-0 flex flex-col">`
  - وضع `ScrollArea` + (Total Summary) داخله بحيث:
    - `ScrollArea` يأخذ `flex-1 min-h-0`
    - Total Summary يبقى `shrink-0` تحت منطقة التمرير
    - Footer يبقى خارج هذا الـ wrapper (كما هو) أو `shrink-0`

- إضافة `dir="rtl"` إلى `ScrollArea` في هذه النافذة تحديدًا لتوحيد السلوك RTL:
  - `<ScrollArea dir="rtl" ...>`

**النتيجة المتوقعة:** المحتوى إذا زاد عن ارتفاع النافذة، سيصبح قابلًا للتمرير فعليًا.

---

### 2) جعل زر “إضافة جديد” واضح أنه اشتغل (Auto-scroll + Auto-focus)
**الملف:** `src/components/policies/PackagePolicyEditModal.tsx`

حتى بعد إصلاح التمرير، أفضل UX: عند الضغط على “إضافة جديد” نريد:
- النزول تلقائيًا إلى “سائق جديد #N”
- وضع المؤشر تلقائيًا في حقل الاسم

**التغييرات:**
- تعديل `handleAddNewChild` لاستخدام functional update لتجنب أي مشاكل state:
  - `setNewChildren((prev) => [...prev, createEmptyChildForm()])`
- إضافة `ref` (مثل `newChildBottomRef`) في آخر قسم السائقين الجدد:
  - `<div ref={newChildBottomRef} />`
- إضافة `useEffect` عندما `newChildren.length` يزيد:
  - `newChildBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })`
- إضافة `autoFocus` على Input الاسم للسائق الجديد الأخير فقط:
  - إذا `index === newChildren.length - 1` → `autoFocus`

**النتيجة المتوقعة:** المستخدم يضغط “إضافة جديد” ويرى فورًا النموذج الجديد بدون الحاجة للتمرير يدويًا.

---

### 3) تقليل ارتفاع البطاقات أكثر (Compact UI)
**الملف:** `src/components/policies/PackagePolicyEditModal.tsx`

سنقلل المسافات بدون كسر القراءة:
- بطاقات الوثائق:
  - `p-3` → `p-2`
  - `space-y-2` → `space-y-1.5`
  - تصغير الأيقونة:
    - `w-8 h-8` → `w-7 h-7`
    - `h-4 w-4` → `h-3.5 w-3.5`
- Grid الحقول:
  - `gap-3` → `gap-2`
  - وإضافة responsive لمنع ضيق شديد على الموبايل:
    - `grid-cols-1 sm:grid-cols-3`
- قسم السائقين الإضافيين:
  - `p-3` → `p-2`
  - صفوف الاختيار:
    - `p-2` → `p-1.5`
    - `rounded-md` تبقى
- قسم “إجمالي الباقة”:
  - `px-4 py-3` → `px-3 py-2`
  - `text-2xl` → `text-xl` (اختياري حسب رغبتك)

**ملاحظة أداء/UX:** هذه تغييرات CSS فقط، لا تؤثر على الأداء أو الداتا.

---

## خطوات التحقق (Manual QA)
1) افتح أي وثيقة باقة واضغط “تعديل”.
2) جرّب scroll بالماوس/التراكباد داخل النافذة:
   - لازم يشتغل صعود/نزول عندما المحتوى أطول من النافذة.
3) اضغط “إضافة جديد” عدة مرات:
   - يجب أن يضيف فورًا نموذج جديد
   - يجب أن ينزل تلقائيًا للنموذج الجديد + يركز على حقل الاسم
4) اختبر على شاشة صغيرة (Mobile ≤ 640px):
   - لا يوجد horizontal scrolling للصفحة
   - الحقول تتحول لصف واحد/Stack بشكل منطقي
   - التمرير داخل النافذة يظل يعمل

---

## الملفات التي سنعدلها
- `src/components/policies/PackagePolicyEditModal.tsx`

(لا تغييرات في قاعدة البيانات مطلوبة)

---

## ملاحظات تقنية مختصرة
- أصل المشكلة غالبًا تعارض `grid` الافتراضي في `DialogContent` مع layout المطلوب (flex) للتمرير.
- استخدام `!flex` هو الحل الأقل مخاطرة لأنه محصور في هذا الـ modal فقط ولا يغير سلوك كل الـ dialogs في النظام.
