
# خطة إصلاح حساب المدفوع وإضافة نظام الملاحظات

## المشكلة 1: عدم تطابق "المدفوع" بين صفحة العميل ونافذة تسديد الديون

### تحليل المشكلة

| المكان | ما يعرضه | القيمة لـ Kareem Test |
|--------|---------|---------------------|
| صفحة العميل | مجموع كل الدفعات (شامل الإلزامي) | ₪5,100 |
| نافذة تسديد الدين | مجموع الدفعات لغير الإلزامي فقط | ₪100 |

**السبب التقني**: 
- `DebtPaymentModal.tsx` يستثني وثائق ELZAMI (سطر 216)
- `ClientDetails.tsx` يحسب كل الدفعات (سطور 362-375)

**المنطق التجاري صحيح**: دفعات الإلزامي تذهب للشركة مباشرة، لكن العرض محير للمستخدم.

### الحل المقترح

تعديل `DebtPaymentModal.tsx` لعرض المدفوع بشكل أوضح:
1. عرض "المدفوع للدين" بدلاً من "المدفوع"
2. إضافة tooltip يوضح أن دفعات الإلزامي مستثناة

---

## المشكلة 2: نظام الملاحظات مع التواريخ

### المتطلبات

الإدارة تحتاج لتتبع المتابعات مع العملاء:
- تسجيل ملاحظة (مثل: "العميل طلب الاتصال غداً")
- تاريخ إضافة الملاحظة
- من أضاف الملاحظة
- إمكانية إضافة عدة ملاحظات لكل عميل

### التغييرات المطلوبة

#### 1. إنشاء جدول جديد: `client_notes`

```sql
CREATE TABLE public.client_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  branch_id uuid REFERENCES branches(id)
);

-- Indexes
CREATE INDEX idx_client_notes_client ON client_notes(client_id);
CREATE INDEX idx_client_notes_created ON client_notes(created_at DESC);

-- RLS
ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_notes_select" ON client_notes
  FOR SELECT TO authenticated
  USING (can_access_branch(auth.uid(), branch_id));

CREATE POLICY "client_notes_insert" ON client_notes
  FOR INSERT TO authenticated
  WITH CHECK (is_active_user(auth.uid()) AND can_access_branch(auth.uid(), branch_id));

CREATE POLICY "client_notes_delete" ON client_notes
  FOR DELETE TO authenticated
  USING (is_admin(auth.uid()) OR created_by = auth.uid());
```

#### 2. تعديل `ClientDetails.tsx`

- إضافة قسم الملاحظات في تبويب "الملاحظات"
- عرض الملاحظات بشكل timeline مع:
  - التاريخ والوقت
  - اسم من أضاف الملاحظة
  - نص الملاحظة
- زر إضافة ملاحظة جديدة
- إمكانية حذف الملاحظة (للمدير أو من أضافها)

#### 3. إضافة ملاحظات في صفحة الديون

- إضافة أيقونة ملاحظة في كل صف عميل
- عند الضغط: عرض آخر ملاحظات + إمكانية إضافة ملاحظة جديدة
- عرض آخر ملاحظة في الصف (اختياري)

---

## ملخص الملفات المتأثرة

| الملف | نوع التغيير |
|-------|-------------|
| `supabase/migrations/new_migration.sql` | إنشاء جدول `client_notes` |
| `src/integrations/supabase/types.ts` | سيتحدث تلقائياً |
| `src/components/debt/DebtPaymentModal.tsx` | تحسين عرض "المدفوع" |
| `src/components/clients/ClientDetails.tsx` | إضافة قسم الملاحظات |
| `src/pages/DebtTracking.tsx` | إضافة أيقونة الملاحظات |

---

## التفاصيل التقنية

### تصميم واجهة الملاحظات في صفحة العميل

```
┌─────────────────────────────────────────────────┐
│  📝 الملاحظات                     [+ إضافة ملاحظة] │
├─────────────────────────────────────────────────┤
│  ○ 29/01/2026 10:30 - سارة                       │
│    العميل طلب الاتصال بعد يومين                   │
│                                          [🗑️]   │
├─────────────────────────────────────────────────┤
│  ○ 28/01/2026 14:15 - أحمد                       │
│    تم التواصل، قال سيدفع الأسبوع القادم          │
│                                          [🗑️]   │
├─────────────────────────────────────────────────┤
│  ○ 25/01/2026 09:00 - سارة                       │
│    أول تواصل، لم يرد                              │
│                                          [🗑️]   │
└─────────────────────────────────────────────────┘
```

### تصميم ملاحظات في صفحة الديون

- أيقونة 💬 بجانب كل عميل
- عند الضغط: popover يعرض آخر 3 ملاحظات + حقل إضافة ملاحظة سريعة

---

## النتائج المتوقعة

- ✅ توضيح أن "المدفوع" في نافذة الدين يشمل غير الإلزامي فقط
- ✅ إمكانية تسجيل ملاحظات متعددة لكل عميل
- ✅ كل ملاحظة تحفظ مع التاريخ واسم الموظف
- ✅ سهولة إضافة ملاحظة سريعة من صفحة الديون
- ✅ عرض تاريخ المتابعات في صفحة العميل
