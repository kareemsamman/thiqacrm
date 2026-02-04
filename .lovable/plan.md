
# خطة: إظهار إدارة السائقين الإضافيين عند إنشاء عميل جديد في الخطوة 1

## المشكلة

عند اختيار **"إنشاء عميل جديد"** في معالج الوثائق (الخطوة 1):
- لا يظهر قسم "السائقين الإضافيين / التابعين"
- المستخدم لا يستطيع إضافة سائقين إضافيين للعميل الجديد

**السبب**: المكون `PolicyChildrenSelector` يتحقق من `clientId`:
```typescript
if (!clientId) {
  return null;  // ← يختفي عند إنشاء عميل جديد!
}
```

---

## الحل المطلوب

تعديل `PolicyChildrenSelector` ليعمل في وضعين:
1. **عميل موجود**: يعرض التابعين الموجودين + إمكانية إضافة جدد
2. **عميل جديد**: يعرض فقط إمكانية إضافة تابعين جدد (بدون fetch)

---

## التغييرات المطلوبة

### الملف: `src/components/policies/wizard/PolicyChildrenSelector.tsx`

### 1. تعديل الـ Props لدعم الوضعين:

```typescript
interface PolicyChildrenSelectorProps {
  clientId: string | null;
  selectedChildIds: string[];
  onSelectedChange: (ids: string[]) => void;
  newChildren: NewChildForm[];
  onNewChildrenChange: (children: NewChildForm[]) => void;
  showForNewClient?: boolean;  // إضافة جديدة
}
```

### 2. تعديل منطق الإخفاء:

```typescript
// قبل
if (!clientId) {
  return null;
}

// بعد
if (!clientId && !showForNewClient) {
  return null;
}
```

### 3. تحديث useEffect لتجنب fetch عند عدم وجود clientId:

```typescript
useEffect(() => {
  if (!clientId) {
    setExistingChildren([]);
    return;
  }
  // ... fetch logic
}, [clientId]);
```

(هذا موجود بالفعل ✅)

### 4. تعديل العنوان حسب الوضع:

```typescript
<h4 className="font-semibold text-sm flex items-center gap-2">
  <User className="h-4 w-4" />
  السائقين الإضافيين / التابعين
  {!clientId && (
    <span className="text-xs text-muted-foreground">(للعميل الجديد)</span>
  )}
</h4>
```

---

### الملف: `src/components/policies/wizard/Step1BranchTypeClient.tsx`

### تمرير `showForNewClient` عند إنشاء عميل جديد:

```typescript
{/* Children / Additional Drivers Section */}
{(selectedClient || createNewClient) && (
  <PolicyChildrenSelector
    clientId={selectedClient?.id || null}
    selectedChildIds={selectedChildIds}
    onSelectedChange={setSelectedChildIds}
    newChildren={newChildren}
    onNewChildrenChange={setNewChildren}
    showForNewClient={createNewClient}  // إضافة جديدة
  />
)}
```

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/policies/wizard/PolicyChildrenSelector.tsx` | إضافة prop جديد + تعديل منطق الإخفاء |
| `src/components/policies/wizard/Step1BranchTypeClient.tsx` | تمرير `showForNewClient={createNewClient}` |

---

## النتيجة المتوقعة

| السيناريو | قبل | بعد |
|-----------|-----|-----|
| اختيار عميل موجود | التابعين يظهرون ✅ | التابعين يظهرون ✅ |
| إنشاء عميل جديد | التابعين لا يظهرون ❌ | يمكن إضافة تابعين جدد ✅ |
| عميل جديد + تابع جديد | غير ممكن | يتم حفظهما معاً ✅ |

---

## واجهة المستخدم بعد التعديل

```text
┌─────────────────────────────────────────────────────────┐
│ إنشاء عميل جديد                                         │
├─────────────────────────────────────────────────────────┤
│ الاسم الكامل *     │ رقم الهوية *                       │
│ [إيمان حموده    ]  │ [023237456  ]                      │
│ تاريخ الميلاد      │ رقم الهاتف *                       │
│ [DD/MM/YYYY     ]  │ [0523550223 ]                      │
│ هاتف إضافي         │ أقل من 24 سنة                      │
│ [              ]   │ [لا ▼      ]                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 👤 السائقين الإضافيين / التابعين (للعميل الجديد)      │
│                                         [+ إضافة جديد] │
├─────────────────────────────────────────────────────────┤
│ لا يوجد تابعين. اضغط "إضافة جديد" لإضافة سائق إضافي.  │
└─────────────────────────────────────────────────────────┘
```

عند النقر على "إضافة جديد":

```text
┌─────────────────────────────────────────────────────────┐
│ سائق جديد #1                                    [حذف]  │
├─────────────────────────────────────────────────────────┤
│ الاسم *  │ رقم الهوية * │ الصلة    │ تاريخ الميلاد │ الهاتف │
│ [      ] │ [          ] │ [سائق ▼] │ [          ] │ [    ] │
└─────────────────────────────────────────────────────────┘
```
