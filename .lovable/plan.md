
# خطة: نظام إدارة بلاغات الحوادث الشامل

## الهدف
إنشاء نظام متكامل لإدارة بلاغات الحوادث يشمل:
1. تبويب جديد "بلاغات الحوادث" في ملف العميل
2. شارة عدد البلاغات النشطة في القائمة الجانبية
3. نقطة تحذير حمراء على اسم العميل الذي لديه حوادث
4. تحذير عند إنشاء وثيقة جديدة لعميل لديه حوادث سابقة
5. إضافة ملاحظات ومتابعة وتذكيرات لكل بلاغ

---

## التعديلات المطلوبة

### 1) قاعدة البيانات - عمود جديد للملاحظات

إضافة عمود لملاحظات الحوادث على جدول `clients`:
```sql
ALTER TABLE clients 
ADD COLUMN accident_notes TEXT DEFAULT NULL;
```

هذا العمود سيحفظ ملاحظات خاصة بالحوادث (مثل: "هذا المؤمن لديه 5 حوادث، لا نرغب بتأمين هذه المركبة له")

### 2) Hook جديد: `useAccidentReportsCount`

**ملف:** `src/hooks/useAccidentReportsCount.tsx`

حساب عدد البلاغات النشطة (غير المغلقة) للشارة في القائمة الجانبية:
```typescript
export function useAccidentReportsCount() {
  // Query: status != 'closed'
  // Returns: { count, isLoading }
}
```

### 3) Hook جديد: `useClientAccidentInfo`

**ملف:** `src/hooks/useClientAccidentInfo.tsx`

جلب معلومات الحوادث لعميل معين (للاستخدام في ملف العميل ومعالج الوثائق):
```typescript
export function useClientAccidentInfo(clientId: string | null) {
  // Query: accident_reports where client_id = clientId
  // Returns: { reports, count, hasActiveReports, isLoading }
}
```

### 4) شارة جديدة: `SidebarAccidentsBadge`

**ملف:** `src/components/layout/SidebarAccidentsBadge.tsx`

مماثلة لـ `SidebarClaimsBadge` - تعرض عدد البلاغات النشطة

### 5) تحديث Sidebar للشارة

**ملف:** `src/components/layout/Sidebar.tsx`

- إضافة `badge: 'accidents'` لعنصر "بلاغات الحوادث"
- إضافة شرط عرض الشارة في `renderBadge()`

### 6) مكون جديد: `ClientAccidentsTab`

**ملف:** `src/components/clients/ClientAccidentsTab.tsx`

تبويب كامل في ملف العميل يعرض:
- جدول بلاغات الحوادث للعميل
- تغيير حالة البلاغ (مسودة/مُقدَّم/مُغلق)
- إضافة ملاحظات لكل بلاغ
- تعيين تذكير (reminder)
- رابط لفتح البلاغ التفصيلي
- قسم "ملاحظات الحوادث العامة" للعميل

**الهيكل:**
```text
┌───────────────────────────────────────────────────┐
│  ⚠️ ملاحظات الحوادث العامة                        │
│  ┌─────────────────────────────────────────────┐  │
│  │ هذا المؤمن لديه 5 حوادث، لا نرغب بتأمينه    │  │
│  └─────────────────────────────────────────────┘  │
├───────────────────────────────────────────────────┤
│  بلاغات الحوادث (3)                              │
├───────────────────────────────────────────────────┤
│ تاريخ     | السيارة | الحالة | ملاحظات | تذكير   │
│ 15/01/26  | 123-45  | مُقدَّم | ...     | 📅      │
│ 10/12/25  | 123-45  | مُغلق  | ...     | -       │
└───────────────────────────────────────────────────┘
```

### 7) تحديث ClientDetails - إضافة التبويب

**ملف:** `src/components/clients/ClientDetails.tsx`

- استيراد `ClientAccidentsTab`
- إضافة تبويب جديد "بلاغات الحوادث"
- عرض شارة تحذير إذا كان لديه بلاغات نشطة

```tsx
<TabsTrigger value="accidents" className="gap-1.5">
  <AlertTriangle className="h-4 w-4" />
  بلاغات الحوادث ({accidentCount})
  {hasActiveAccidents && (
    <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
  )}
</TabsTrigger>
```

### 8) مؤشر النقطة الحمراء على العملاء

**ملف:** `src/pages/Clients.tsx`

عند جلب العملاء، نضيف استعلام فرعي لعدد الحوادث:
```typescript
// Fetch clients with accident counts
const { data } = await supabase
  .from('clients')
  .select(`
    *,
    accident_reports(count)
  `)
```

ثم نعرض نقطة حمراء بجانب اسم العميل:
```tsx
<span className="font-medium">
  {client.full_name}
  {client.accident_reports?.[0]?.count > 0 && (
    <span className="h-2 w-2 rounded-full bg-destructive inline-block mr-1" />
  )}
</span>
```

### 9) تحذير في معالج الوثائق

**ملف:** `src/components/policies/wizard/Step1BranchTypeClient.tsx`

عند اختيار عميل، نتحقق من وجود حوادث سابقة:
```tsx
{selectedClient && clientAccidentInfo.count > 0 && (
  <Card className="border-amber-500 bg-amber-50">
    <AlertTriangle className="text-amber-600" />
    <p>تحذير: هذا العميل لديه {clientAccidentInfo.count} بلاغ حادث</p>
    {selectedClient.accident_notes && (
      <p className="text-sm">{selectedClient.accident_notes}</p>
    )}
  </Card>
)}
```

---

## ملخص الملفات

| الملف | النوع | الوصف |
|-------|-------|-------|
| Migration | جديد | إضافة عمود `accident_notes` لجدول `clients` |
| `src/hooks/useAccidentReportsCount.tsx` | جديد | Hook لعدد البلاغات النشطة (للشارة) |
| `src/hooks/useClientAccidentInfo.tsx` | جديد | Hook لمعلومات حوادث عميل معين |
| `src/components/layout/SidebarAccidentsBadge.tsx` | جديد | شارة عدد البلاغات في القائمة الجانبية |
| `src/components/clients/ClientAccidentsTab.tsx` | جديد | تبويب بلاغات الحوادث في ملف العميل |
| `src/components/layout/Sidebar.tsx` | تعديل | إضافة badge للحوادث |
| `src/components/clients/ClientDetails.tsx` | تعديل | إضافة تبويب الحوادث + مؤشر |
| `src/pages/Clients.tsx` | تعديل | إضافة النقطة الحمراء للعملاء |
| `src/components/policies/wizard/Step1BranchTypeClient.tsx` | تعديل | تحذير عند اختيار عميل لديه حوادث |

---

## تفاصيل تبويب الحوادث في ملف العميل

### الميزات:
1. **جدول البلاغات:**
   - تاريخ الحادث
   - رقم السيارة
   - شركة التأمين
   - الحالة (مع إمكانية تغييرها)
   - ملاحظات (inline editing)
   - زر التذكير

2. **ملاحظات الحوادث العامة:**
   - حقل نص لكتابة ملاحظات دائمة عن العميل
   - تظهر هذه الملاحظات عند إنشاء وثيقة جديدة
   - مثال: "هذا العميل خطر، 5 حوادث في السنة الماضية"

3. **إجراءات سريعة:**
   - تغيير الحالة مباشرة من الجدول
   - إضافة ملاحظة (مع modal صغير)
   - تعيين تذكير (تاريخ + ملاحظة)

### تغيير الحالة:
```tsx
<Select value={report.status} onValueChange={(status) => updateStatus(report.id, status)}>
  <SelectItem value="draft">مسودة</SelectItem>
  <SelectItem value="submitted">مُقدَّم</SelectItem>
  <SelectItem value="closed">مُغلق</SelectItem>
</Select>
```

---

## النتيجة النهائية

1. **القائمة الجانبية:** شارة حمراء بعدد البلاغات النشطة
2. **صفحة العملاء:** نقطة حمراء بجانب اسم كل عميل لديه حوادث
3. **ملف العميل:** تبويب جديد "بلاغات الحوادث" مع:
   - عرض كل البلاغات
   - تغيير الحالة
   - إضافة ملاحظات
   - تعيين تذكيرات
4. **معالج الوثائق:** تحذير واضح عند اختيار عميل لديه حوادث + عرض الملاحظات
