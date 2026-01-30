

# خطة: إضافة عداد الديون في الشريط الجانبي وتحسين اختيار السيارات

## المتطلبات

| # | الميزة | الوصف |
|---|--------|-------|
| 1 | عداد الديون في القائمة | إضافة badge يعرض عدد العملاء المديونين بجانب "متابعة الديون" (مثل التنبيهات) |
| 2 | اختيار سيارات متعددة | تحسين فلتر السيارات ليدعم اختيار سيارات متعددة أو كل السيارات |

---

## التغييرات التفصيلية

### 1) إنشاء Hook جديد لعداد الديون

**ملف جديد:** `src/hooks/useDebtCount.tsx`

```text
- استدعاء RPC function: report_client_debts_summary
- جلب total_clients (عدد العملاء المديونين)
- تحديث تلقائي عند تغيير البيانات
- Caching لتجنب الاستدعاءات المتكررة
```

### 2) إنشاء مكون Badge للديون

**ملف جديد:** `src/components/layout/SidebarDebtBadge.tsx`

```text
المكون:
- يستخدم useDebtCount hook
- يعرض العدد بنفس تصميم SidebarNotificationBadge
- لون مختلف (amber/warning) للتمييز عن التنبيهات
- يدعم الوضع المطوي والعادي
```

### 3) تعديل Sidebar

**ملف:** `src/components/layout/Sidebar.tsx`

```text
التغييرات:
- Import SidebarDebtBadge
- إضافة شرط لعرض Badge بجانب "متابعة الديون"
- مماثل لطريقة عرض badge التنبيهات
```

```tsx
// في loop التنقل
const isDebtTracking = item.href === '/debt-tracking';
// ...
{isDebtTracking && <SidebarDebtBadge collapsed={collapsed} />}
```

### 4) تحسين فلتر السيارات في DebtPaymentModal

**ملف:** `src/components/debt/DebtPaymentModal.tsx`

الوضع الحالي: فلتر سيارة واحدة فقط

**التحسينات:**
```text
- تحويل من Select عادي إلى Multi-select
- إضافة خيار "كل السيارات"
- Chips للسيارات المحددة
- تحديث الحسابات بناءً على السيارات المختارة
```

```tsx
// State جديد
const [selectedCars, setSelectedCars] = useState<string[]>([]);

// فلترة الوثائق
const filteredPolicies = useMemo(() => {
  if (selectedCars.length === 0) return policies; // كل السيارات
  return policies.filter(p => p.carNumber && selectedCars.includes(p.carNumber));
}, [policies, selectedCars]);
```

**واجهة Multi-select:**
```tsx
<div className="flex flex-wrap gap-2 items-center">
  <Label className="text-sm">السيارات:</Label>
  <div className="flex flex-wrap gap-1">
    <Badge 
      variant={selectedCars.length === 0 ? "default" : "outline"}
      className="cursor-pointer"
      onClick={() => setSelectedCars([])}
    >
      الكل
    </Badge>
    {uniqueCars.map(car => (
      <Badge 
        key={car}
        variant={selectedCars.includes(car) ? "default" : "outline"}
        className="cursor-pointer"
        onClick={() => toggleCar(car)}
      >
        {car}
      </Badge>
    ))}
  </div>
</div>
```

---

## ملخص الملفات

| الملف | النوع | التغيير |
|-------|-------|---------|
| `src/hooks/useDebtCount.tsx` | جديد | Hook لجلب عدد العملاء المديونين |
| `src/components/layout/SidebarDebtBadge.tsx` | جديد | مكون Badge للديون في الشريط الجانبي |
| `src/components/layout/Sidebar.tsx` | تعديل | إضافة SidebarDebtBadge بجانب "متابعة الديون" |
| `src/components/debt/DebtPaymentModal.tsx` | تعديل | تحويل فلتر السيارة إلى multi-select |

---

## التفاصيل التقنية

### عداد الديون
- يستخدم `report_client_debts_summary` RPC الموجود
- يجلب `total_clients` من النتيجة
- يُحدث كل 30 ثانية أو عند window focus
- لون Badge: `bg-amber-500` للتمييز عن التنبيهات (الحمراء)

### فلتر السيارات المتعدد
- الحالة الافتراضية: كل السيارات (array فارغ)
- النقر على سيارة يضيفها/يزيلها من القائمة
- النقر على "الكل" يُفرغ القائمة (يعرض كل الوثائق)
- المجاميع (السعر، المدفوع، المتبقي) تتحدث حسب السيارات المختارة
- التوزيع يشمل فقط وثائق السيارات المختارة

