

# تحسين فلتر التاريخ في تقرير الوثائق المنشأة

## الوضع الحالي

في صفحة `/reports/policies` تحت تاب "الوثائق المنشأة":
- يوجد dropdown للاختيار بين: اليوم، هذا الشهر، الشهر الماضي، مخصص
- عند اختيار "مخصص" يظهر حقلين للتاريخ (من، إلى)

## التحسين المقترح

### 1. إضافة خيارات جديدة للفترات الشائعة

توسيع قائمة الفترات المحددة مسبقاً:

| الخيار الحالي | الخيارات الجديدة |
|--------------|------------------|
| اليوم | اليوم |
| هذا الشهر | أمس |
| الشهر الماضي | آخر 7 أيام |
| مخصص | آخر 30 يوم |
| | هذا الأسبوع |
| | الأسبوع الماضي |
| | هذا الشهر |
| | الشهر الماضي |
| | **نطاق مخصص** |
| | **تاريخ محدد** |

### 2. تحسين عرض حقول التاريخ المخصص

عند اختيار "نطاق مخصص":
```
┌─────────────────────────────────────────────────────┐
│  [من التاريخ 📅]    →    [إلى التاريخ 📅]         │
└─────────────────────────────────────────────────────┘
```

عند اختيار "تاريخ محدد":
```
┌─────────────────────────────────────────────────────┐
│  [اختر التاريخ 📅]                                  │
└─────────────────────────────────────────────────────┘
```

### 3. عرض التاريخ المختار بوضوح

إضافة Badge تعرض نطاق التاريخ المحدد حالياً:

```
[اليوم ▼] [06/02/2026] [نوع ▼] [الشركة ▼] [بحث...]
```

---

## التغييرات التقنية

### الملف: `src/pages/PolicyReports.tsx`

#### 1. توسيع خيارات الفترات

```tsx
// السطر 234 تقريباً - تحديث state
const [createdDatePreset, setCreatedDatePreset] = useState('today');

// إضافة خيارات جديدة في الـ Select (سطر 817-827)
<SelectContent>
  <SelectItem value="today">اليوم</SelectItem>
  <SelectItem value="yesterday">أمس</SelectItem>
  <SelectItem value="last_7_days">آخر 7 أيام</SelectItem>
  <SelectItem value="last_30_days">آخر 30 يوم</SelectItem>
  <SelectItem value="this_week">هذا الأسبوع</SelectItem>
  <SelectItem value="last_week">الأسبوع الماضي</SelectItem>
  <SelectItem value="this_month">هذا الشهر</SelectItem>
  <SelectItem value="last_month">الشهر الماضي</SelectItem>
  <SelectItem value="specific_date">تاريخ محدد</SelectItem>
  <SelectItem value="custom">نطاق مخصص</SelectItem>
</SelectContent>
```

#### 2. تحديث دالة حساب النطاق

```tsx
// تحديث getDateRange() (سطر 308-335)
const getDateRange = () => {
  const today = new Date();
  let fromDate: string | null = null;
  let toDate: string | null = null;
  
  switch (createdDatePreset) {
    case 'today':
      fromDate = toDate = today.toISOString().split('T')[0];
      break;
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      fromDate = toDate = yesterday.toISOString().split('T')[0];
      break;
    case 'last_7_days':
      const d7 = new Date(today);
      d7.setDate(today.getDate() - 6);
      fromDate = d7.toISOString().split('T')[0];
      toDate = today.toISOString().split('T')[0];
      break;
    case 'last_30_days':
      const d30 = new Date(today);
      d30.setDate(today.getDate() - 29);
      fromDate = d30.toISOString().split('T')[0];
      toDate = today.toISOString().split('T')[0];
      break;
    case 'this_week':
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      fromDate = weekStart.toISOString().split('T')[0];
      toDate = today.toISOString().split('T')[0];
      break;
    case 'last_week':
      const lastWeekEnd = new Date(today);
      lastWeekEnd.setDate(today.getDate() - today.getDay() - 1);
      const lastWeekStart = new Date(lastWeekEnd);
      lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
      fromDate = lastWeekStart.toISOString().split('T')[0];
      toDate = lastWeekEnd.toISOString().split('T')[0];
      break;
    case 'this_month':
      fromDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      toDate = today.toISOString().split('T')[0];
      break;
    case 'last_month':
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      fromDate = lastMonth.toISOString().split('T')[0];
      toDate = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
      break;
    case 'specific_date':
      fromDate = toDate = createdFromDate || null;
      break;
    case 'custom':
      fromDate = createdFromDate || null;
      toDate = createdToDate || null;
      break;
  }
  
  return { fromDate, toDate };
};
```

#### 3. تحديث واجهة حقول التاريخ

```tsx
{/* حقل تاريخ واحد للتاريخ المحدد */}
{createdDatePreset === 'specific_date' && (
  <div className="flex items-center gap-2">
    <span className="text-sm text-muted-foreground">التاريخ:</span>
    <ArabicDatePicker
      value={createdFromDate}
      onChange={(date) => {
        setCreatedFromDate(date);
        setCreatedToDate(date); // نفس التاريخ
      }}
    />
  </div>
)}

{/* حقلين للنطاق المخصص */}
{createdDatePreset === 'custom' && (
  <div className="flex items-center gap-2">
    <span className="text-sm text-muted-foreground">من:</span>
    <ArabicDatePicker
      value={createdFromDate}
      onChange={(date) => setCreatedFromDate(date)}
      max={createdToDate}
    />
    <span className="text-sm text-muted-foreground">إلى:</span>
    <ArabicDatePicker
      value={createdToDate}
      onChange={(date) => setCreatedToDate(date)}
      min={createdFromDate}
    />
  </div>
)}
```

#### 4. عرض النطاق المحدد كـ Badge

```tsx
{/* Badge لعرض التاريخ المحدد */}
{(createdDatePreset !== 'custom' && createdDatePreset !== 'specific_date') && (
  <Badge variant="outline" className="px-2 py-1 font-mono text-xs">
    {formatDateRangeDisplay()}
  </Badge>
)}
```

---

## ملخص التغييرات

| الملف | التغيير |
|-------|---------|
| `PolicyReports.tsx` | إضافة خيارات فترات جديدة (أمس، آخر 7 أيام، الخ) |
| `PolicyReports.tsx` | تحديث `getDateRange()` لدعم الخيارات الجديدة |
| `PolicyReports.tsx` | تحسين عرض حقول التاريخ (تاريخ محدد vs نطاق) |
| `PolicyReports.tsx` | إضافة Badge لعرض التاريخ المحدد |

---

## النتيجة المتوقعة

### قبل:
- 4 خيارات فقط
- حقلين يظهران معاً عند اختيار "مخصص"

### بعد:
- 10 خيارات للفترات الشائعة
- خيار "تاريخ محدد" يظهر حقل واحد فقط
- خيار "نطاق مخصص" يظهر حقلين مع labels واضحة
- Badge تعرض النطاق المحدد حالياً

