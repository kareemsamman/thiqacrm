

# خطة إعادة تصميم صفحة الوثائق – نظام الوضعين (Mode-First)

## فهم المتطلبات

المستخدم يريد نظام **وضعين** (Modes) وليس تخطيطين:

| الوضع | الاستخدام | المحتوى |
|-------|-----------|---------|
| **Single Policy Mode** | مسح سريع، موبايل، استخدام يومي | معلومات أساسية فقط |
| **Package Mode** | تحليل عميق، مقارنة المكونات | تفصيل كامل للباقة |

---

## الوضع الأول: Single Policy Mode (الافتراضي)

### الغرض
قراءة سريعة، حمل معرفي منخفض، مسح سهل.

### هيكل البطاقة (من الأعلى للأسفل)

#### 1. صف الرأس (Header Row)
```text
┌────────────────────────────────────────────────────────────────┐
│  [⋮]  [📤]              سارية  مدفوع  باقة ← (فقط إذا package)│
└────────────────────────────────────────────────────────────────┘
```
- **يمين**: شرائح الحالة (سارية/منتهية/ملغاة + مدفوع/غير مدفوع + باقة)
- **يسار**: الأكشنز (⋮ المزيد + 📤 إرسال)

#### 2. صف المعلومات الرئيسي (خط بصري واحد)
```text
┌────────────────────────────────────────────────────────────────┐
│  ₪2,400      02/02/2027 ← 03/02/2026      21212121      منورا  │
│  (المبلغ)    (الفترة)                    (رقم السيارة) (الشركة)│
└────────────────────────────────────────────────────────────────┘
```
- **المبلغ**: كبير، أساسي، بارز
- الحقول **أفقياً متناسقة** عبر جميع البطاقات
- على الموبايل فقط يُسمح بالتكديس

#### 3. تذييل (اختياري)
```text
┌────────────────────────────────────────────────────────────────┐
│  📝 تحويل من سيارة 21212121 - إضافة ضمن باقة                  │
└────────────────────────────────────────────────────────────────┘
```
- سطر واحد فقط للملاحظات (muted)
- إذا لا توجد ملاحظات: لا يُعرض شيء

#### ❌ ما لا يُعرض في Single Mode
- تفصيل الباقة
- صفوف المكونات الفرعية
- مبالغ متعددة
- إذا كانت باقة → يُعرض فقط **المبلغ الإجمالي** + شريحة "باقة"

---

## الوضع الثاني: Package Mode (موسّع)

### التفعيل
- **تلقائي**: عند الضغط على بطاقة باقة
- **أو**: عبر "توسيع الباقة" في القائمة

### هيكل Package Mode

#### 1. الرأس (نفس Single Mode)
```text
┌────────────────────────────────────────────────────────────────┐
│  [⋮]  [📤]              سارية  مدفوع  باقة ⚡                  │
└────────────────────────────────────────────────────────────────┘
```
للحفاظ على الاتساق.

#### 2. قسم الملخص (Summary Section)
```text
┌────────────────────────────────────────────────────────────────┐
│  ₪2,300                                                        │
│  (المبلغ الإجمالي)                                              │
│                                                                │
│  ⚠️ متبقي ₪2,300                                               │
│                                                                │
│  02/02/2027 ← 03/02/2026    21212121    منورا                  │
│                                                                │
│  [ثالث] [إلزامي] [خدمات طريق] [باقة ⚡]                         │
└────────────────────────────────────────────────────────────────┘
```
يجيب على: **"ما هذه الباقة بلمحة؟"**

#### 3. قسم تفصيل الباقة (جدول داخل البطاقة)
```text
┌────────────────────────────────────────────────────────────────┐
│  مكونات الباقة                                                 │
├────────────────────────────────────────────────────────────────┤
│  المبلغ     │ الفترة                    │ النوع  │ الشركة      │
├────────────────────────────────────────────────────────────────┤
│  ₪1,000    │ 02/02/27 ← 03/02/26       │ ثالث   │ أراضي مقدسة │
│  ₪1,000    │ 02/02/27 ← 03/02/26       │ إلزامي │ منورا       │
│  ₪300      │ 02/02/27 ← 03/02/26       │ سرفيس  │ شركة اكس    │
└────────────────────────────────────────────────────────────────┘
```
**قواعد:**
- نفس الأعمدة لكل الصفوف
- محاذاة ثابتة
- خلفية muted للفصل عن الملخص

#### 4. قسم الملاحظات (أسفل)
```text
┌────────────────────────────────────────────────────────────────┐
│  📝 تحويل من سيارة 21212121 - إضافة ضمن باقة                  │
│     ...ملاحظات كاملة قابلة للعرض                               │
└────────────────────────────────────────────────────────────────┘
```

---

## التغييرات التقنية المطلوبة

### ملف: `src/components/policies/PolicyCardsView.tsx`

#### 1. إعادة هيكلة البطاقة

**المكون الجديد: `PolicyCard`**
```tsx
interface PolicyCardProps {
  group: PolicyGroup;
  paymentStatus: PaymentStatus;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onPolicyClick: (id: string) => void;
  onSendInvoice: (id: string) => void;
  // ...
}

function PolicyCard({ group, isExpanded, ... }: PolicyCardProps) {
  const isPackage = group.addons.length > 0;
  
  return (
    <Card>
      {/* Header: Status chips + Actions */}
      <CardHeader />
      
      {/* Main Info Row - ALWAYS horizontal */}
      <MainInfoRow />
      
      {/* Package Mode Content - Only when expanded */}
      {isPackage && isExpanded && (
        <>
          <PackageSummary />
          <PackageBreakdown />
        </>
      )}
      
      {/* Notes Footer */}
      {notes && <NotesFooter />}
    </Card>
  );
}
```

#### 2. تغييرات Header Row

```tsx
// قبل: badges متناثرة + السعر على اليسار
// بعد: Status chips مجمّعة + Actions منفصلة

<div className="flex items-center justify-between">
  {/* Right: Status Chips */}
  <div className="flex flex-wrap gap-1.5">
    <Badge variant={status.variant}>{status.label}</Badge>
    {paymentStatus.isPaid ? (
      <Badge variant="success">مدفوع</Badge>
    ) : (
      <Badge variant="destructive">غير مدفوع</Badge>
    )}
    {isPackage && (
      <Badge variant="outline" className="bg-primary/5">
        <Package className="h-3 w-3 mr-1" />
        باقة
      </Badge>
    )}
  </div>
  
  {/* Left: Actions */}
  <div className="flex items-center gap-1">
    <Button variant="ghost" size="icon" onClick={handleSend}>
      <Send className="h-4 w-4" />
    </Button>
    <DropdownMenu>...</DropdownMenu>
  </div>
</div>
```

#### 3. تغييرات Main Info Row

```tsx
// قبل: grid مع أيقونات
// بعد: خط أفقي واحد، المبلغ بارز

<div className="flex items-center gap-4 mt-3">
  {/* Amount - Primary, Large */}
  <span className="text-xl font-bold shrink-0">
    ₪{totalPrice.toLocaleString()}
  </span>
  
  {/* Period */}
  <span className="text-sm text-muted-foreground">
    {formatDate(endDate)} ← {formatDate(startDate)}
  </span>
  
  {/* Car Number */}
  <span className="font-mono text-sm">{carNumber}</span>
  
  {/* Company */}
  <span className="text-sm truncate">{companyName}</span>
</div>
```

#### 4. إضافة Package Breakdown Table

```tsx
function PackageBreakdown({ policies }: { policies: PolicyRecord[] }) {
  return (
    <div className="border-t bg-muted/10">
      <div className="p-2 text-xs font-medium text-muted-foreground">
        مكونات الباقة ({policies.length})
      </div>
      
      <table className="w-full text-sm">
        <thead className="bg-muted/30">
          <tr>
            <th className="text-right p-2">المبلغ</th>
            <th className="text-right p-2">الفترة</th>
            <th className="text-right p-2">النوع</th>
            <th className="text-right p-2">الشركة</th>
          </tr>
        </thead>
        <tbody>
          {policies.map((policy, idx) => (
            <tr key={policy.id} className="border-t hover:bg-muted/20">
              <td className="p-2 font-semibold">
                ₪{policy.insurance_price.toLocaleString()}
              </td>
              <td className="p-2 text-xs">
                {formatDate(policy.end_date)} ← {formatDate(policy.start_date)}
              </td>
              <td className="p-2">
                <Badge className={policyTypeColors[policy.policy_type_parent]}>
                  {getDisplayLabel(policy)}
                </Badge>
              </td>
              <td className="p-2">
                {policy.insurance_companies?.name_ar || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

#### 5. Responsive Rules

```tsx
// Desktop: Full width, breakdown expanded
// Mobile: Cards stack, breakdown collapsible list

<div className={cn(
  "flex items-center gap-4",
  "flex-wrap sm:flex-nowrap" // Wrap on mobile only
)}>
```

---

## الملفات المتأثرة

| الملف | نوع التغيير |
|-------|-------------|
| `src/components/policies/PolicyCardsView.tsx` | إعادة هيكلة كاملة |

---

## مقارنة قبل/بعد

### Single Policy Card - قبل:
```text
┌────────────────────────────────────────────────────────────────┐
│  [باقة] [ثالث] [سارية] [متبقي ₪2,300]              ₪2,300     │
│  👤 أحمد محمد                                                  │
│  🚗 21212121 (Toyota)                                          │
│  🏢 منورا                                                      │
│  📅 02/02/2027 ← 03/02/2026                                    │
│  📝 ملاحظات...                                                 │
│                                          [📤] [👁] [⋮]         │
└────────────────────────────────────────────────────────────────┘
```

### Single Policy Card - بعد:
```text
┌────────────────────────────────────────────────────────────────┐
│  [سارية] [مدفوع] [باقة]                         [📤]  [⋮]     │
├────────────────────────────────────────────────────────────────┤
│  ₪2,300    02/02/27←03/02/26    21212121    منورا              │
├────────────────────────────────────────────────────────────────┤
│  📝 تحويل من سيارة...                                          │
└────────────────────────────────────────────────────────────────┘
```

### Package Mode - بعد:
```text
┌────────────────────────────────────────────────────────────────┐
│  [سارية] [غير مدفوع] [باقة ⚡]                    [📤]  [⋮]    │
├────────────────────────────────────────────────────────────────┤
│  ₪2,300    ⚠️ متبقي ₪2,300                                     │
│  02/02/27←03/02/26    21212121    منورا                        │
│  [ثالث] [إلزامي] [خدمات طريق]                                  │
├────────────────────────────────────────────────────────────────┤
│  مكونات الباقة                                                 │
│  ────────────────────────────────────────────────────────────  │
│  ₪1,000  │ 02/02/27←03/02/26 │ ثالث   │ أراضي مقدسة           │
│  ₪1,000  │ 02/02/27←03/02/26 │ إلزامي │ منورا                  │
│  ₪300    │ 02/02/27←03/02/26 │ سرفيس  │ شركة اكس              │
├────────────────────────────────────────────────────────────────┤
│  📝 تحويل من سيارة 21212121 - إضافة ضمن باقة                  │
└────────────────────────────────────────────────────────────────┘
```

---

## القواعد الأساسية

1. **نفس الحقول دائماً في نفس المكان**
2. **المبلغ دائماً بارز بصرياً**
3. **شرائح الحالة مجمّعة (لا تتناثر)**
4. **Single Mode لا يُظهر تفاصيل داخلية أبداً**
5. **Package Mode = نفس البطاقة، عمق أكبر**

