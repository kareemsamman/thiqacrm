

# خطة: إضافة تاريخ الميلاد لتحرير السائقين الإضافيين

## المشكلة الحالية

في `ClientChildrenManager.tsx`:
- عند **إضافة** سائق جديد: حقل تاريخ الميلاد موجود ✅
- عند **تعديل** سائق موجود: حقل تاريخ الميلاد **غير موجود** ❌
- الجدول لا يعرض تاريخ الميلاد في وضع العرض

## التغييرات المطلوبة

### الملف: `src/components/clients/ClientChildrenManager.tsx`

#### 1. إضافة عمود تاريخ الميلاد في Table Header
```tsx
<TableHeader>
  <TableRow>
    <TableHead className="w-[180px]">الاسم</TableHead>
    <TableHead className="w-[120px]">رقم الهوية</TableHead>
    <TableHead className="w-[100px]">الصلة</TableHead>
    {!compact && <TableHead className="w-[120px]">تاريخ الميلاد</TableHead>}  // ✨ جديد
    {!compact && <TableHead className="w-[100px]">الهاتف</TableHead>}
    <TableHead className="w-[80px]"></TableHead>
  </TableRow>
</TableHeader>
```

#### 2. إضافة حقل تاريخ الميلاد في وضع التعديل (Edit Mode)
بعد حقل الصلة وقبل حقل الهاتف:
```tsx
{!compact && (
  <TableCell>
    <ArabicDatePicker
      value={editingData.birth_date}
      onChange={(date) => setEditingData({ ...editingData, birth_date: date })}
      isBirthDate
      compact
    />
  </TableCell>
)}
```

#### 3. إضافة عرض تاريخ الميلاد في وضع العرض (View Mode)
```tsx
{!compact && (
  <TableCell className="font-mono text-sm ltr-nums">
    {child.birth_date ? new Date(child.birth_date).toLocaleDateString("en-GB") : "-"}
  </TableCell>
)}
```

## ملخص التغييرات

| الموقع | التغيير |
|--------|---------|
| Table Header | إضافة عمود "تاريخ الميلاد" |
| Edit Mode | إضافة `ArabicDatePicker` مع `compact` و `isBirthDate` |
| View Mode | عرض التاريخ بصيغة DD/MM/YYYY |

## النتيجة المتوقعة

- عند الضغط على زر التعديل ✏️ للسائق الموجود → يظهر حقل تاريخ الميلاد مع date picker
- في الجدول → يُعرض تاريخ الميلاد للسائقين الموجودين

