
# خطة: تحسين صفحة Leads مع دعم العمال وإضافة الإجراءات المباشرة

## ملخص التغييرات المطلوبة

بناءً على طلبك، سأقوم بـ:
1. **إضافة إمكانية الحذف** مباشرة من الجدول
2. **إضافة ملاحظات** على كل Lead
3. **تغيير الحالة** مباشرة من الجدول (بدون فتح الـ Drawer)
4. **السماح للعمال (Workers)** بالوصول للصفحة

---

## التعديلات على قاعدة البيانات

### 1) إضافة RLS Policies للعمال

حالياً الـ RLS تسمح فقط للـ Admin:
```sql
-- القديم
CREATE POLICY "Admins can view all leads" ON public.leads
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
```

سأضيف policies للعمال:
```sql
-- السماح للعمال أيضاً بالعرض والتحديث
CREATE POLICY "Workers can view all leads" ON public.leads
  FOR SELECT USING (public.has_role(auth.uid(), 'worker'));

CREATE POLICY "Workers can update leads" ON public.leads
  FOR UPDATE USING (public.has_role(auth.uid(), 'worker'));

-- السماح بالحذف للمستخدمين المصرح لهم
CREATE POLICY "Admins can delete leads" ON public.leads
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Workers can delete leads" ON public.leads
  FOR DELETE USING (public.has_role(auth.uid(), 'worker'));
```

---

## التعديلات على الكود

### 2) تعديل `src/App.tsx`

تغيير من `AdminRoute` إلى `ProtectedRoute`:
```typescript
// قبل
<Route path="/admin/leads" element={
  <AdminRoute>
    <Leads />
  </AdminRoute>
} />

// بعد
<Route path="/leads" element={
  <ProtectedRoute>
    <Leads />
  </ProtectedRoute>
} />
```

### 3) تعديل `src/components/layout/Sidebar.tsx`

نقل الرابط لقسم متاح للجميع:
```typescript
{ name: "العملاء المحتملون", href: "/leads", icon: MessageSquare }
```

### 4) تعديل `src/pages/Leads.tsx`

**إضافات على الجدول:**
- عمود جديد للإجراءات (Actions)
- Select لتغيير الحالة مباشرة في كل صف
- زر ملاحظات Popover
- قائمة إجراءات (⋮) تحتوي على: عرض، حذف

```text
هيكل الجدول المحدث:
┌────────┬──────────┬─────────┬────────┬────────┬──────────────┬────────┬──────────┐
│ الاسم  │ الهاتف   │ السيارة │ التأمين│ السعر  │ الحالة [▼]   │ التاريخ│ إجراءات │
├────────┼──────────┼─────────┼────────┼────────┼──────────────┼────────┼──────────┤
│ كريم   │ 054...   │ פורד    │ إلزامي│ ₪2600  │ [جديد ▼]     │ 31/01  │ 💬 ⋮    │
└────────┴──────────┴─────────┴────────┴────────┴──────────────┴────────┴──────────┘
```

**المكونات الجديدة:**
1. `StatusDropdown` - Select لتغيير الحالة بالضغط مباشرة
2. `LeadNotesPopover` - زر ملاحظات مع popover (مشابه لـ ClientNotesPopover)
3. `RowActionsMenu` - قائمة بـ عرض التفاصيل وحذف

### 5) إنشاء `src/components/leads/LeadNotesPopover.tsx`

مكون جديد لإضافة ملاحظات على Lead:
```typescript
// يشبه ClientNotesPopover لكن يعمل على leads.notes
// عند إضافة ملاحظة يتم تحديث حقل notes في جدول leads
// مع إمكانية إضافة سجل ملاحظات متعددة (اختياري)
```

---

## ملخص الملفات

| الملف | النوع | الوصف |
|-------|-------|-------|
| Migration جديدة | SQL | إضافة RLS للعمال + صلاحية الحذف |
| `src/App.tsx` | تعديل | تغيير Route من Admin إلى Protected + تغيير المسار |
| `src/components/layout/Sidebar.tsx` | تعديل | نقل الرابط لقسم عام |
| `src/pages/Leads.tsx` | تعديل | إضافة عمود الإجراءات + Status dropdown + Notes + Delete |
| `src/components/leads/LeadNotesPopover.tsx` | جديد | مكون ملاحظات مشابه لـ ClientNotesPopover |
| `src/components/leads/LeadDetailsDrawer.tsx` | تعديل | إضافة قسم الملاحظات + زر الحذف |

---

## تفاصيل تقنية

### Status Dropdown في الجدول

```typescript
// في صف الجدول
<TableCell onClick={(e) => e.stopPropagation()}>
  <Select
    value={lead.status}
    onValueChange={(value) => handleStatusChange(lead.id, value)}
  >
    <SelectTrigger className="w-32 h-8">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="new">جديد</SelectItem>
      <SelectItem value="contacted">تم التواصل</SelectItem>
      <SelectItem value="converted">تم التحويل</SelectItem>
      <SelectItem value="rejected">مرفوض</SelectItem>
    </SelectContent>
  </Select>
</TableCell>
```

### زر الحذف

```typescript
const deleteMutation = useMutation({
  mutationFn: async (leadId: string) => {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    toast({ title: 'تم حذف العميل المحتمل' });
  }
});
```

### Popover الملاحظات

سيكون مشابهاً لـ `ClientNotesPopover` لكن مبسط:
- عرض الملاحظات الحالية من حقل `notes`
- إضافة ملاحظة جديدة (يتم إلحاقها بالملاحظات السابقة مع التاريخ والمستخدم)

---

## النتيجة

بعد التنفيذ:
1. **العمال والمديرون** يمكنهم الوصول لصفحة `/leads`
2. **تغيير الحالة** مباشرة من الجدول بدون فتح drawer
3. **إضافة ملاحظات** عبر popover في كل صف
4. **حذف Lead** عبر قائمة الإجراءات (⋮)
5. **عرض التفاصيل** بالنقر على الصف أو من قائمة الإجراءات
