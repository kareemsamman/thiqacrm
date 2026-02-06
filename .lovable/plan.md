
# تحسين "النشاط الأخير" - تجميع البيانات + Popup احترافي

## ملخص المتطلبات من الصورة المرفقة

المشكلة الحالية واضحة في الصورة:
- نفس العميل (جمال محمد داري) يظهر 4 مرات بنفس المعلومات
- كل دفعة تظهر في كارت منفصل
- لا يوجد تجميع للمبالغ أو تفصيل لأنواع الدفع

| المطلوب | الوصف |
|---------|-------|
| **بحث أولاً** | فلتر بالاسم، رقم السيارة، نوع الوثيقة |
| **Popup بدل صفحة** | "عرض الكل" يفتح Dialog/Popup وليس صفحة جديدة |
| **تجميع بالعميل** | دفعات نفس الشخص تُجمّع في كارت واحد |
| **مجموع المبالغ** | عرض إجمالي ما دفعه العميل |
| **تفصيل الدفعات** | كم نقداً، كم شيك، كم حوالة |
| **اسم المنشئ** | من أنشأ الوثيقة |
| **Scroll 24 ساعة** | كل نشاطات آخر 24 ساعة بالتمرير |
| **كروت أجمل في Popup** | تفاصيل أكثر مع تصميم أفضل |

---

## التصميم الجديد

### الكارت المجمّع (على Dashboard)

**قبل (4 كروت منفصلة):**
```
┌─────────────────────────────────────┐
│ دفعة مستلمة     منذ 21 ساعة         │
│ جمال محمد داري (66)                 │
│ ₪1,800  [شيك]  شامل → اراضي مقدسة  │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ دفعة مستلمة     منذ 21 ساعة         │
│ جمال محمد داري (66)                 │
│ ₪1,800  [شيك]  شامل → اراضي مقدسة  │
└─────────────────────────────────────┘
...
```

**بعد (كارت واحد مجمّع):**
```
┌──────────────────────────────────────────────────────┐
│ 💰 دفعات مستلمة (4 دفعات)      منذ 21 ساعة          │
│ ═══════════════════════════════════════════════════ │
│ العميل: جمال محمد داري (66)                         │
│                                                      │
│ الإجمالي: ₪5,500                                    │
│ ─────────────────────────────────────────────────── │
│ التفاصيل:                                           │
│   • نقدًا: ₪100  (إعفاء حوادث → شركة اكس)          │
│   • شيك: ₪5,400  (شامل → اراضي مقدسة) - 3 دفعات    │
│                                                      │
│ بواسطة: أحمد                                        │
└──────────────────────────────────────────────────────┘
```

---

## هيكل البيانات الجديد

### Interface للتجميع

```typescript
interface GroupedClientActivity {
  clientId: string;
  clientName: string;
  clientFileNumber: string;
  
  // Policies
  policies: {
    id: string;
    type: string;
    companyName: string;
    carNumber: string;
    price: number;
    createdBy: string;
    createdAt: string;
  }[];
  
  // Aggregated Payments
  payments: {
    total: number;
    count: number;
    byType: {
      cash: number;
      cheque: number;
      visa: number;
      transfer: number;
    };
    items: {
      id: string;
      amount: number;
      paymentType: string;
      policyType: string;
      companyName: string;
      chequeNumber?: string;
      createdBy: string;
      createdAt: string;
    }[];
  };
  
  latestActivityAt: string;
}
```

---

## المكونات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/dashboard/RecentActivity.tsx` | إعادة كتابة كاملة |

### التغييرات الرئيسية:

1. **إضافة شريط بحث** في أعلى الكارت
2. **تجميع النشاطات** حسب العميل
3. **Popup "عرض الكل"** بدلاً من Link لصفحة
4. **ScrollArea** لعرض كل نشاطات 24 ساعة
5. **كروت محسّنة** في الـ Popup

---

## واجهة المستخدم الجديدة

### Dashboard Card

```text
┌────────────────────────────────────────────────────────┐
│ النشاط الأخير                         [عرض الكل ←]    │
│ ══════════════════════════════════════════════════════ │
│                                                        │
│ ┌────────────────────────────────────────────────────┐ │
│ │ 🔍 بحث بالاسم، رقم السيارة، نوع التأمين...        │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ ┌────────────────────────────────────────────────────┐ │
│ │ 💰 جمال محمد داري (66)         منذ 21 ساعة        │ │
│ │ ─────────────────────────────────────────────────  │ │
│ │ 4 دفعات | المجموع: ₪5,500                         │ │
│ │ شيك: ₪5,400 | نقدًا: ₪100                          │ │
│ │ شامل → اراضي | بواسطة: أحمد                        │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ ┌────────────────────────────────────────────────────┐ │
│ │ 📄 اشرف زياد ناصر (5)           منذ 21 ساعة       │ │
│ │ ─────────────────────────────────────────────────  │ │
│ │ 1 دفعة | ₪1,400                                    │ │
│ │ شيك: ₪1,400 | شامل → اراضي                        │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│                 ↓ التمرير لمزيد من النشاطات ↓          │
└────────────────────────────────────────────────────────┘
```

### Popup "عرض الكل"

```text
┌──────────────────────────────────────────────────────────────┐
│                                              ✕               │
│                    سجل النشاط الكامل                         │
│ ════════════════════════════════════════════════════════════ │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ 🔍 بحث...        │ من تاريخ │ إلى تاريخ │ [النوع ▼]     │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ عرض 15 نتيجة | مجموع الدفعات: ₪45,000                       │
│                                                              │
│ ═══════════════════════════════════════════════════════════ │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ 💰 جمال محمد داري (66)                    21 ساعة        │ │
│ │ ══════════════════════════════════════════════════════  │ │
│ │                                                          │ │
│ │ ┌─ الوثائق ─────────────────────────────────────────┐   │ │
│ │ │ • شامل → اراضي مقدسة | سيارة: 12-345-67          │   │ │
│ │ │ • إعفاء حوادث → شركة اكس | بواسطة: أحمد          │   │ │
│ │ └───────────────────────────────────────────────────┘   │ │
│ │                                                          │ │
│ │ ┌─ الدفعات (4 دفعات) ───────────────────────────────┐   │ │
│ │ │ الإجمالي: ₪5,500                                   │   │ │
│ │ │ ─────────────────────────────────────────────────  │   │ │
│ │ │ • شيك #1234: ₪1,800 (شامل)                        │   │ │
│ │ │ • شيك #1235: ₪1,800 (شامل)                        │   │ │
│ │ │ • شيك #1236: ₪1,800 (شامل)                        │   │ │
│ │ │ • نقدًا: ₪100 (إعفاء حوادث)                       │   │ │
│ │ └───────────────────────────────────────────────────┘   │ │
│ │                                                          │ │
│ │ أنشأها: أحمد                                            │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ 📄 سارة أحمد (F1022)                       3 ساعات       │ │
│ │ ...                                                      │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│                        [تحميل المزيد]                        │
└──────────────────────────────────────────────────────────────┘
```

---

## التفاصيل التقنية

### 1. دالة تجميع النشاطات

```typescript
const groupActivitiesByClient = (activities: Activity[]): GroupedClientActivity[] => {
  const groups = new Map<string, GroupedClientActivity>();
  
  for (const activity of activities) {
    const clientKey = activity.details.client_id || activity.details.client_name;
    
    if (!groups.has(clientKey)) {
      groups.set(clientKey, {
        clientId: activity.details.client_id,
        clientName: activity.details.client_name,
        clientFileNumber: activity.details.client_file_number,
        policies: [],
        payments: {
          total: 0,
          count: 0,
          byType: { cash: 0, cheque: 0, visa: 0, transfer: 0 },
          items: [],
        },
        latestActivityAt: activity.created_at,
      });
    }
    
    const group = groups.get(clientKey)!;
    
    if (activity.type === "payment") {
      group.payments.total += activity.details.amount || 0;
      group.payments.count += 1;
      group.payments.byType[activity.details.payment_type] += activity.details.amount || 0;
      group.payments.items.push({ ... });
    }
    
    if (activity.type === "policy") {
      group.policies.push({ ... });
    }
    
    // Update latest activity timestamp
    if (new Date(activity.created_at) > new Date(group.latestActivityAt)) {
      group.latestActivityAt = activity.created_at;
    }
  }
  
  return Array.from(groups.values())
    .sort((a, b) => new Date(b.latestActivityAt).getTime() - new Date(a.latestActivityAt).getTime());
};
```

### 2. Query محسّن لآخر 24 ساعة

```typescript
const twentyFourHoursAgo = new Date();
twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

const { data: payments } = await supabase
  .from("policy_payments")
  .select(`...`)
  .gte("created_at", twentyFourHoursAgo.toISOString())
  .order("created_at", { ascending: false });
```

### 3. مكون الـ Popup

```typescript
<Dialog open={showAllDialog} onOpenChange={setShowAllDialog}>
  <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
    <DialogHeader>
      <DialogTitle>سجل النشاط الكامل</DialogTitle>
    </DialogHeader>
    
    {/* Filters */}
    <div className="flex gap-3 flex-wrap">
      <Input placeholder="بحث..." />
      <ArabicDatePicker />
      <Select>...</Select>
    </div>
    
    {/* Scrollable Content */}
    <ScrollArea className="h-[60vh]">
      {groupedActivities.map((group) => (
        <DetailedActivityCard key={group.clientId} group={group} />
      ))}
    </ScrollArea>
  </DialogContent>
</Dialog>
```

---

## خطوات التنفيذ

1. **تحديث `RecentActivity.tsx`**:
   - إضافة state للـ Dialog (`showAllDialog`)
   - إضافة state للبحث (`search`)
   - إضافة دالة `groupActivitiesByClient()`
   - تعديل Query لجلب آخر 24 ساعة
   - إضافة شريط بحث في أعلى الكارت
   - استبدال `<Link>` بـ `<Dialog>`
   - إنشاء مكون `GroupedActivityCard` للعرض المجمّع
   - إنشاء مكون `DetailedActivityCard` للـ Popup
   - إضافة `<ScrollArea>` للتمرير

2. **تحديث الـ Styling**:
   - كروت أكثر احترافية
   - ألوان مميزة لكل نوع دفعة
   - تنظيم أفضل للمعلومات

