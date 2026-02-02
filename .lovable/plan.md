
# خطة: تحسين صفحة ملخص التجديدات بإحصائيات تفصيلية

## المطلوب
إضافة بطاقات إحصائية احترافية في صفحة التجديدات تعرض:
1. **كم وثيقة تم تجديدها** (renewed)
2. **كم وثيقة بحاجة للتجديد** (pending - لم يتم التواصل)
3. **كم باقة** (packages vs single policies)
4. **كم تم الاتصال بهم** (called)
5. **إجمالي القيمة المتوقعة**

---

## الحل التقني

### 1. تحديث دالة `report_renewals_summary` لتشمل بيانات إضافية

**الملف:** `supabase/migrations/` (SQL جديد)

إضافة حقول جديدة:
- `total_packages` - عدد العملاء الذين لديهم باقات
- `total_single` - عدد العملاء الذين لديهم وثائق مفردة  
- `total_value` - القيمة الإجمالية للوثائق المنتهية

```sql
CREATE OR REPLACE FUNCTION public.report_renewals_summary(
  p_end_month date DEFAULT NULL,
  p_policy_type text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS TABLE(
  total_expiring bigint,
  not_contacted bigint,
  sms_sent bigint,
  called bigint,
  renewed bigint,
  not_interested bigint,
  -- NEW FIELDS
  total_packages bigint,
  total_single bigint,
  total_value numeric
)
...
```

---

### 2. تحديث واجهة `RenewalSummary` في React

**الملف:** `src/pages/PolicyReports.tsx`

```typescript
interface RenewalSummary {
  total_expiring: number;
  not_contacted: number;
  sms_sent: number;
  called: number;
  renewed: number;
  not_interested: number;
  // NEW
  total_packages: number;
  total_single: number;
  total_value: number;
}
```

---

### 3. تصميم بطاقات الإحصائيات الجديدة

**التصميم الحالي:** 6 بطاقات صغيرة

**التصميم الجديد:** قسمين:
- **القسم العلوي**: 3 بطاقات كبيرة (إجمالي، بحاجة للتجديد، تم تجديدها)
- **القسم السفلي**: 5 بطاقات صغيرة (SMS، اتصال، غير مهتم، باقات، القيمة)

```tsx
{/* Summary Cards - Enhanced */}
{renewalsSummary && (
  <div className="space-y-4">
    {/* Main Stats Row */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* إجمالي بحاجة للمتابعة */}
      <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">إجمالي بحاجة للتجديد</p>
            <p className="text-4xl font-bold text-primary mt-1">{renewalsSummary.total_expiring}</p>
            <p className="text-xs text-muted-foreground mt-2">
              عميل • ₪{renewalsSummary.total_value?.toLocaleString() || 0}
            </p>
          </div>
          <RefreshCw className="h-12 w-12 text-primary/30" />
        </div>
      </Card>

      {/* لم يتم التواصل - أولوية عالية */}
      <Card className="p-6 bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">لم يتم التواصل</p>
            <p className="text-4xl font-bold text-amber-600 mt-1">{renewalsSummary.not_contacted}</p>
            <p className="text-xs text-amber-600/70 mt-2">بحاجة لاتخاذ إجراء</p>
          </div>
          <AlertCircle className="h-12 w-12 text-amber-500/30" />
        </div>
      </Card>

      {/* تم التجديد */}
      <Card className="p-6 bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">تم التجديد</p>
            <p className="text-4xl font-bold text-green-600 mt-1">{renewalsSummary.renewed}</p>
            <p className="text-xs text-green-600/70 mt-2">
              {renewalsSummary.total_expiring > 0 
                ? `${Math.round((renewalsSummary.renewed / renewalsSummary.total_expiring) * 100)}% نسبة التحويل`
                : '0% نسبة التحويل'}
            </p>
          </div>
          <CheckCircle className="h-12 w-12 text-green-500/30" />
        </div>
      </Card>
    </div>

    {/* Secondary Stats Row */}
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <Card className="p-4 text-center">
        <p className="text-xs text-muted-foreground">تم إرسال SMS</p>
        <p className="text-2xl font-bold text-blue-600">{renewalsSummary.sms_sent}</p>
      </Card>
      <Card className="p-4 text-center">
        <p className="text-xs text-muted-foreground">تم الاتصال</p>
        <p className="text-2xl font-bold text-amber-600">{renewalsSummary.called}</p>
      </Card>
      <Card className="p-4 text-center">
        <p className="text-xs text-muted-foreground">غير مهتم</p>
        <p className="text-2xl font-bold text-red-600">{renewalsSummary.not_interested}</p>
      </Card>
      <Card className="p-4 text-center">
        <p className="text-xs text-muted-foreground">باقات</p>
        <p className="text-2xl font-bold text-purple-600">{renewalsSummary.total_packages || 0}</p>
      </Card>
      <Card className="p-4 text-center">
        <p className="text-xs text-muted-foreground">وثائق مفردة</p>
        <p className="text-2xl font-bold text-slate-600">{renewalsSummary.total_single || 0}</p>
      </Card>
    </div>
  </div>
)}
```

---

## ملخص الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `supabase/migrations/` | تحديث دالة `report_renewals_summary` لإضافة الحقول الجديدة |
| `src/pages/PolicyReports.tsx` | تحديث interface + تصميم البطاقات الجديدة |
| `src/hooks/useRenewalsCount.tsx` | لا تغيير (يستخدم `total_expiring` فقط) |

---

## النتيجة المتوقعة

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐      │
│  │ إجمالي بحاجة     │  │ لم يتم التواصل   │  │ تم التجديد       │      │
│  │     للتجديد      │  │                   │  │                   │      │
│  │       85         │  │       61          │  │       12          │      │
│  │  ₪289,000        │  │ بحاجة لاتخاذ إجراء │  │  14% نسبة التحويل │      │
│  └───────────────────┘  └───────────────────┘  └───────────────────┘      │
│                                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ SMS      │  │ اتصال   │  │ غير مهتم │  │ باقات   │  │ مفردة    │    │
│  │   27     │  │    4     │  │    0     │  │   15     │  │   70     │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### المميزات:
1. **نظرة سريعة**: 3 بطاقات كبيرة للمقاييس الأهم
2. **نسبة التحويل**: تظهر تلقائياً كم نسبة من جددوا
3. **تصنيف الباقات**: يميز بين الباقات والوثائق المفردة
4. **القيمة الإجمالية**: يظهر كم المبلغ المتوقع من التجديدات
5. **تصميم احترافي**: ألوان مميزة لكل حالة مع gradients
