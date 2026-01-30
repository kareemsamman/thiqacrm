

# خطة: نظام المهام اليومية الاحترافي

## نظرة عامة

نظام مهام متكامل يتيح للعاملين والمديرين إنشاء مهام لأنفسهم ولغيرهم مع تنبيهات فورية عند حلول موعد المهمة.

---

## المتطلبات الوظيفية

| الميزة | الوصف |
|--------|-------|
| إنشاء مهام | المدير يمكنه إنشاء مهام لنفسه وللموظفين، الموظف يمكنه إنشاء مهام لنفسه ولغيره |
| تحديد الموعد | تاريخ + وقت محدد للمهمة |
| عرض المهام | عرض مهام اليوم، الأمس، الغد، أي تاريخ |
| التنبيهات | popup تلقائي عند حلول موعد المهمة |
| الإنجاز | تعليم المهام كمنجزة |
| التنقل | إضافة الصفحة في القائمة الجانبية |

---

## هيكل قاعدة البيانات

### جدول: `tasks`

```sql
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  
  -- الأشخاص
  created_by uuid NOT NULL REFERENCES profiles(id),
  assigned_to uuid NOT NULL REFERENCES profiles(id),
  
  -- التوقيت
  due_date date NOT NULL,
  due_time time NOT NULL,
  
  -- الحالة
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  completed_at timestamp with time zone,
  completed_by uuid REFERENCES profiles(id),
  
  -- التنبيه
  reminder_shown boolean DEFAULT false,
  
  -- الفرع
  branch_id uuid REFERENCES branches(id),
  
  -- التتبع
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- سياسات الوصول: المستخدم يرى المهام المسندة إليه أو التي أنشأها
CREATE POLICY "Users can view their tasks"
  ON public.tasks FOR SELECT
  USING (
    is_active_user(auth.uid()) AND 
    (assigned_to = auth.uid() OR created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Users can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (is_active_user(auth.uid()));

CREATE POLICY "Users can update their assigned tasks"
  ON public.tasks FOR UPDATE
  USING (
    is_active_user(auth.uid()) AND 
    (assigned_to = auth.uid() OR created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Task creators can delete"
  ON public.tasks FOR DELETE
  USING (
    is_active_user(auth.uid()) AND 
    (created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
  );

-- Index للأداء
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_status ON public.tasks(status);

-- تفعيل Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
```

---

## هيكل الملفات الجديدة

```text
src/
├── pages/
│   └── Tasks.tsx                    # صفحة المهام الرئيسية
├── components/tasks/
│   ├── TaskDrawer.tsx               # إنشاء/تعديل مهمة
│   ├── TaskCard.tsx                 # بطاقة عرض المهمة
│   ├── TaskPopupReminder.tsx        # popup التنبيه الفوري
│   ├── TaskFilters.tsx              # فلاتر التاريخ
│   └── UserSelect.tsx               # اختيار المستخدم المسند إليه
├── hooks/
│   └── useTasks.tsx                 # Hook لإدارة المهام
└── components/layout/
    └── SidebarTaskBadge.tsx         # Badge عدد المهام المعلقة
```

---

## التفاصيل التقنية

### 1) Hook المهام (`src/hooks/useTasks.tsx`)

```typescript
interface Task {
  id: string;
  title: string;
  description: string | null;
  created_by: string;
  assigned_to: string;
  due_date: string;
  due_time: string;
  status: 'pending' | 'completed' | 'cancelled';
  reminder_shown: boolean;
  created_at: string;
  // Joined data
  creator_name?: string;
  assignee_name?: string;
}

// الوظائف:
- fetchTasks(date?: Date) - جلب المهام لتاريخ معين
- createTask(task) - إنشاء مهمة جديدة
- updateTask(id, updates) - تحديث مهمة
- completeTask(id) - إنجاز مهمة
- deleteTask(id) - حذف مهمة
- markReminderShown(id) - تعليم التنبيه كمعروض
```

### 2) صفحة المهام (`src/pages/Tasks.tsx`)

**الميزات:**
- تبويبات: مهامي | أنشأتها | الكل (للمدير)
- تنقل بين التواريخ (أمس، اليوم، غداً، اختيار تاريخ)
- عرض المهام في بطاقات أو جدول
- إحصائيات: معلقة، منجزة، متأخرة
- فلتر حسب الحالة

**التصميم:**
```text
┌─────────────────────────────────────────────────────────┐
│  المهام اليومية                        [+ مهمة جديدة] │
├─────────────────────────────────────────────────────────┤
│  [مهامي] [أنشأتها] [الكل]                              │
├─────────────────────────────────────────────────────────┤
│  [◀ أمس] [📅 اليوم: 30/01/2026] [غداً ▶]              │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ 🕐 معلقة   │ │ ✅ منجزة  │ │ ⚠️ متأخرة │       │
│  │    5       │ │    12      │ │    2        │       │
│  └─────────────┘ └─────────────┘ └─────────────┘       │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🔔 09:00  مراجعة وثيقة العميل أحمد            │   │
│  │          من: أدمن  →  إلى: موظف 1              │   │
│  │                              [✓ إنجاز] [⋮]    │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🔔 11:30  الاتصال بشركة التأمين               │   │
│  │          أنشأتها لنفسك                          │   │
│  │                              [✓ إنجاز] [⋮]    │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 3) Drawer إنشاء المهمة (`src/components/tasks/TaskDrawer.tsx`)

**الحقول:**
- عنوان المهمة (مطلوب)
- الوصف/التفاصيل (اختياري)
- مسندة إلى: Select من قائمة المستخدمين النشطين
- التاريخ: DatePicker
- الوقت: Select أو Input للوقت

### 4) Popup التنبيه (`src/components/tasks/TaskPopupReminder.tsx`)

**آلية العمل:**
- Hook يفحص كل 30 ثانية إذا هناك مهام حان وقتها
- إذا وجد مهمة `due_date + due_time <= now` و `status = pending` و `reminder_shown = false`
- يعرض Dialog مع:
  - عنوان المهمة
  - الوصف
  - من أنشأها
  - أزرار: [إنجاز الآن] [تذكيري لاحقاً] [فتح المهام]
- صوت تنبيه
- يحدث `reminder_shown = true` لتجنب التكرار

**الكود:**
```typescript
// في MainLayout.tsx أو App.tsx
<TaskPopupReminder />

// المكون يستخدم interval للفحص الدوري
useEffect(() => {
  const interval = setInterval(checkDueTasks, 30000);
  return () => clearInterval(interval);
}, []);
```

### 5) Badge في الشريط الجانبي (`src/components/layout/SidebarTaskBadge.tsx`)

- يعرض عدد المهام المعلقة لليوم
- لون مختلف (بنفسجي/cyan) للتمييز

### 6) تعديل Sidebar

```tsx
// إضافة في getNavigation:
{ name: "المهام", href: "/tasks", icon: ListTodo },

// مع Badge:
{isTasks && <SidebarTaskBadge collapsed={collapsed} />}
```

### 7) تعديل App.tsx

```tsx
<Route path="/tasks" element={
  <ProtectedRoute>
    <Tasks />
  </ProtectedRoute>
} />
```

---

## Realtime Updates

```typescript
// في useTasks.tsx
useEffect(() => {
  const channel = supabase
    .channel('tasks-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tasks',
      filter: `assigned_to=eq.${user.id}`,
    }, () => {
      refetch();
    })
    .subscribe();
  
  return () => supabase.removeChannel(channel);
}, [user]);
```

---

## ملخص الملفات

| الملف | النوع | الوصف |
|-------|-------|-------|
| Migration SQL | جديد | إنشاء جدول tasks مع RLS |
| `src/pages/Tasks.tsx` | جديد | صفحة المهام الرئيسية |
| `src/hooks/useTasks.tsx` | جديد | Hook لإدارة المهام |
| `src/components/tasks/TaskDrawer.tsx` | جديد | Drawer إنشاء/تعديل مهمة |
| `src/components/tasks/TaskCard.tsx` | جديد | بطاقة عرض المهمة |
| `src/components/tasks/TaskPopupReminder.tsx` | جديد | Popup التنبيه الفوري |
| `src/components/layout/SidebarTaskBadge.tsx` | جديد | Badge عدد المهام |
| `src/components/layout/Sidebar.tsx` | تعديل | إضافة رابط المهام |
| `src/App.tsx` | تعديل | إضافة Route |
| `src/components/layout/MainLayout.tsx` | تعديل | إضافة TaskPopupReminder |

---

## ميزات إضافية مستقبلية

- تكرار المهام (يومي/أسبوعي)
- أولوية المهمة (عاجل/عادي/منخفض)
- ربط المهمة بعميل أو وثيقة
- تعليقات على المهام
- إرسال SMS للموظف عند إسناد مهمة

