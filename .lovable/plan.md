
# خطة: إظهار اسم الموظف/المدير في النشاط الأخير

## المشكلة
حالياً "النشاط الأخير" يعرض الأحداث بدون إظهار من قام بها. المطلوب إضافة اسم الموظف (Worker) أو المدير (Admin) الذي أنشأ كل نشاط.

---

## التحليل

### الجداول المتاحة
جميع الجداول المستخدمة تحتوي على `created_by_admin_id` الذي يرتبط بجدول `profiles`:

| الجدول | الحقل |
|--------|-------|
| policies | `created_by_admin_id` |
| policy_payments | `created_by_admin_id` |
| clients | `created_by_admin_id` |
| cars | `created_by_admin_id` |

جدول `profiles` يحتوي على:
- `full_name`: اسم المستخدم الكامل
- `status`: حالة المستخدم (admin/worker/pending/blocked)

---

## التعديلات المطلوبة

### 1) تحديث Interface

```typescript
interface Activity {
  id: string;
  type: "policy" | "payment" | "client" | "car";
  action: string;
  detail: string;
  time: string;
  created_at: string;
  createdBy?: string;  // ← إضافة جديدة
}
```

### 2) تحديث استعلامات البيانات

**استعلام الوثائق (policies):**
```typescript
const { data: policies } = await supabase
  .from("policies")
  .select(`
    id, created_at, policy_type_parent, cancelled,
    clients(full_name, deleted_at),
    created_by_profile:profiles!policies_created_by_admin_id_fkey(full_name)
  `)
  .order("created_at", { ascending: false })
  .match(branchFilter)
  .eq("cancelled", false)
  .limit(10);
```

**استعلام الدفعات (policy_payments):**
```typescript
const { data: payments } = await supabase
  .from("policy_payments")
  .select(`
    id, created_at, amount,
    policies(cancelled, policy_type_parent, clients(full_name, deleted_at)),
    created_by_profile:profiles!policy_payments_created_by_admin_id_fkey(full_name)
  `)
  .order("created_at", { ascending: false })
  .match(branchFilter)
  .limit(15);
```

**استعلام العملاء (clients):**
```typescript
const { data: clients } = await supabase
  .from("clients")
  .select(`
    id, created_at, full_name, file_number,
    created_by_profile:profiles!clients_created_by_admin_id_fkey(full_name)
  `)
  .order("created_at", { ascending: false })
  .match(branchFilter)
  .is("deleted_at", null)
  .limit(5);
```

**استعلام السيارات (cars):**
```typescript
const { data: cars } = await supabase
  .from("cars")
  .select(`
    id, created_at, updated_at, car_number,
    clients(full_name),
    created_by_profile:profiles!cars_created_by_admin_id_fkey(full_name)
  `)
  .order("updated_at", { ascending: false })
  .match(branchFilter)
  .is("deleted_at", null)
  .limit(5);
```

### 3) تحديث بناء كائنات Activity

```typescript
// مثال للوثائق
results.push({
  id: `policy-${p.id}`,
  type: "policy",
  action: "وثيقة جديدة",
  detail: `${policyLabel} - ${clientName}`,
  time: formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: ar }),
  created_at: p.created_at,
  createdBy: (p.created_by_profile as any)?.full_name || undefined,
});
```

### 4) تحديث واجهة العرض

```tsx
{activities.map((activity, index) => {
  const Icon = typeIcons[activity.type];
  return (
    <div
      key={activity.id}
      className={cn("flex items-start gap-3 animate-fade-in", `stagger-${index + 1}`)}
      style={{ animationFillMode: "backwards" }}
    >
      <div className={cn("rounded-lg p-2", typeColors[activity.type])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">{activity.action}</p>
          {activity.createdBy && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              بواسطة {activity.createdBy}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">{activity.detail}</p>
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
    </div>
  );
})}
```

---

## النتيجة المتوقعة

قبل:
```
وثيقة جديدة
شامل طرف ثالث - Kareem Test
منذ 16 ساعة تقريباً
```

بعد:
```
وثيقة جديدة                    بواسطة أحمد
شامل طرف ثالث - Kareem Test
منذ 16 ساعة تقريباً
```

---

## الملف المطلوب تعديله

| الملف | التعديل |
|-------|---------|
| `src/components/dashboard/RecentActivity.tsx` | إضافة جلب `created_by_profile` وعرض اسم المُنشئ |

---

## ملاحظات

- إذا كان `created_by_admin_id` فارغاً (null)، لن يظهر "بواسطة..."
- الأنشطة القديمة المهاجرة من WordPress قد لا يكون لها `created_by_admin_id`
- يستخدم نفس الـ cache time (1 دقيقة)
