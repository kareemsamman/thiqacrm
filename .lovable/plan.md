

# نقل شريط البحث إلى داخل جدول الوثائق

## المشكلة
شريط البحث موجود حاليا خارج بطاقة جدول الوثائق (منفصل عنها)، والمستخدم يبحث لكنه لا يرى أنه مرتبط بالجدول. يجب نقله إلى داخل header الجدول بجانب عنوان "الوثائق".

## التغييرات

### ملف: `src/pages/CompanySettlementDetail.tsx`

**1. حذف شريط البحث المنفصل (سطور 623-634)**
إزالة كامل الـ `div` الذي يحتوي على البحث الحالي الموجود بين زر العودة والفلاتر.

**2. إضافة البحث داخل CardHeader للجدول (سطر ~826-838)**
نقل حقل البحث إلى داخل header بطاقة الوثائق، بجانب العنوان وزر الترتيب:

```
<CardHeader>
  <div className="flex items-center justify-between flex-wrap gap-3">
    <CardTitle>الوثائق ({filteredPolicies.length})</CardTitle>
    <div className="flex items-center gap-2 flex-1 max-w-md">
      <div className="relative flex-1">
        <Search icon />
        <Input placeholder="بحث..." />
      </div>
      <Button>ترتيب</Button>
    </div>
  </div>
</CardHeader>
```

هذا يضع البحث مباشرة فوق الجدول ومرتبط بصريا به، مما يجعل واضحا أن البحث يفلتر هذا الجدول تحديدا.

لا تغيير على منطق البحث (useMemo) - هو يعمل بشكل صحيح، فقط نقل موقع الـ Input.
