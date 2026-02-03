
# خطة: تحسين نموذج إضافة عميل جديد

## المشاكل الحالية

1. **حقل الوسيط موجود** - يجب إزالته من نموذج إضافة العميل
2. **كل حقل في سطر منفصل** - يجب جعل حقلين في صف واحد مثل نموذج الوثائق
3. **RadioGroup يستخدم `dir="ltr"`** - يجب تغييره لـ RTL مع محاذاة للنص
4. **لا يوجد إمكانية إضافة سائقين** - يجب إظهار ClientChildrenManager عند إنشاء عميل جديد أيضاً (ليس فقط عند التعديل)

---

## التغييرات المطلوبة

### الملف: `src/components/clients/ClientDrawer.tsx`

#### 1. إزالة حقل الوسيط
- حذف FormField الخاص بـ `broker_id` (السطور 450-478)
- إزالة جلب الوسطاء من useEffect

#### 2. تنظيم الحقول في صفين
تحويل التخطيط من عمود واحد إلى شبكة:

```text
┌─────────────────────────────────────────────────────┐
│  الاسم الكامل *              │  رقم الهوية *        │
├─────────────────────────────────────────────────────┤
│  تاريخ الميلاد              │  رقم الهاتف *        │
├─────────────────────────────────────────────────────┤
│  هاتف إضافي (اختياري)       │  رقم الملف           │
├─────────────────────────────────────────────────────┤
│  الفرع (للمدير فقط)                                │
├─────────────────────────────────────────────────────┤
│  أقل من 24 سنة (Select بدل Radio)                  │
├─────────────────────────────────────────────────────┤
│  السائقين الإضافيين / التابعين                     │
│  ┌─────────────────────────────────────────────────┐│
│  │ + إضافة سائق جديد                              ││
│  └─────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────┤
│  ملاحظات                                           │
└─────────────────────────────────────────────────────┘
```

#### 3. تحويل RadioGroup إلى Select مع RTL
استبدال RadioGroup بـ Select component:

```tsx
// قبل (RadioGroup مع dir="ltr")
<RadioGroup className="flex flex-col space-y-2">
  <RadioGroupItem value="none" />
  <RadioGroupItem value="client" />
</RadioGroup>

// بعد (Select مع RTL صحيح)
<Select value={field.value} onValueChange={field.onChange}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="none">لا</SelectItem>
    <SelectItem value="client">نعم – العميل أقل من 24</SelectItem>
  </SelectContent>
</Select>
```

#### 4. إظهار ClientChildrenManager للعملاء الجدد
- إزالة الشرط `{isEditing && (...)}` من حول ClientChildrenManager
- السماح بإضافة سائقين مباشرة عند إنشاء عميل جديد

---

## التغييرات بالتفصيل

### هيكل الفورم الجديد:

```tsx
<form className="space-y-4 mt-6">
  {/* صف 1: الاسم + رقم الهوية */}
  <div className="grid gap-4 sm:grid-cols-2">
    <FormField name="full_name" ... />
    <FormField name="id_number" ... />
  </div>

  {/* صف 2: تاريخ الميلاد + رقم الهاتف */}
  <div className="grid gap-4 sm:grid-cols-2">
    <FormField name="birth_date" ... />
    <FormField name="phone_number" ... />
  </div>

  {/* صف 3: هاتف إضافي + رقم الملف */}
  <div className="grid gap-4 sm:grid-cols-2">
    <FormField name="phone_number_2" ... />
    <FormField name="file_number" ... />
  </div>

  {/* الفرع - للمدير فقط */}
  {isAdmin && branches.length > 0 && (
    <FormField name="branch_id" ... />
  )}

  {/* أقل من 24 سنة - Select */}
  <FormField name="under24_type">
    <Select ...>
      <SelectItem value="none">لا</SelectItem>
      <SelectItem value="client">نعم – العميل أقل من 24</SelectItem>
    </Select>
  </FormField>

  {/* السائقين الإضافيين - يظهر دائماً */}
  <div className="border-t pt-4">
    <ClientChildrenManager
      existingChildren={existingChildren}
      newChildren={newChildren}
      onNewChildrenChange={setNewChildren}
      ...
    />
  </div>

  {/* ملاحظات */}
  <FormField name="notes" ... />
</form>
```

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/clients/ClientDrawer.tsx` | إعادة تنظيم الفورم + إزالة الوسيط + Select بدل Radio + إظهار السائقين دائماً |

---

## النتيجة المتوقعة

1. ✅ إزالة حقل الوسيط
2. ✅ حقلين في كل صف (تصميم مضغوط)
3. ✅ Select بدل RadioGroup (RTL صحيح)
4. ✅ إمكانية إضافة سائقين عند إنشاء عميل جديد
5. ✅ تصميم متناسق مع نموذج الوثائق
