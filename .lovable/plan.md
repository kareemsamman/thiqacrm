
# خطة: إضافة تاريخ الميلاد والهاتف للسائقين الإضافيين + نافذة إرسال/طباعة

## المطلوب

### 1. السائقين الإضافيين - حقول إضافية
- إضافة **تاريخ الميلاد** (لمعرفة إذا +24 أو أقل)
- إضافة **رقم الهاتف**
- في جميع أماكن اختيار السائقين الإضافيين

### 2. زر الإرسال (في بطاقة الوثيقة)
- عند الضغط على أيقونة الإرسال ✈️ → يفتح نافذة تختار بين:
  - **إرسال SMS للعميل**
  - **طباعة الفاتورة**
- بدلاً من الإرسال المباشر الحالي

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/policies/PackagePolicyEditModal.tsx` | إضافة حقول birth_date + phone للسائقين الجدد والموجودين |
| `src/components/policies/wizard/PolicyChildrenSelector.tsx` | إضافة حقول birth_date + phone للنموذج الجديد |
| `src/components/clients/PolicyYearTimeline.tsx` | استبدال handleSendInvoice بفتح نافذة Send/Print |
| `src/components/policies/InvoiceSendPrintDialog.tsx` | ✨ **ملف جديد** - نافذة اختيار إرسال/طباعة |

---

## التفاصيل التقنية

### 1. تحديث نموذج السائق الجديد في PackagePolicyEditModal

الحقول الحالية:
- الاسم ✓
- رقم الهوية ✓
- الصلة ✓

الحقول المطلوب إضافتها:
- تاريخ الميلاد (ArabicDatePicker مع isBirthDate)
- رقم الهاتف (Input مع validation 10 أرقام)

**تصميم الشبكة الجديد:**
```
┌─────────────────────────────────────────────────────────────┐
│ سائق جديد #1                                       [حذف]   │
├─────────────────────────────────────────────────────────────┤
│ [الاسم*]  [رقم الهوية*]  [الصلة]  [تاريخ الميلاد]  [الهاتف] │
└─────────────────────────────────────────────────────────────┘
```

Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-5`

### 2. تحديث قائمة السائقين الموجودين

عند عرض السائق الموجود، إضافة:
- عرض تاريخ الميلاد (إن وجد)
- عرض رقم الهاتف (إن وجد)
- حساب "أقل من 24" بناءً على تاريخ الميلاد

```typescript
// حساب العمر
const isUnder24 = (birthDate: string | null): boolean | null => {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  const age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    return age - 1 < 24;
  }
  return age < 24;
};
```

إضافة Badge بجانب الاسم:
```tsx
{isUnder24(child.birth_date) === true && (
  <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700">
    أقل من 24
  </Badge>
)}
```

### 3. إنشاء InvoiceSendPrintDialog (ملف جديد)

```typescript
interface InvoiceSendPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policyIds: string[];
  isPackage: boolean;
  clientPhone: string | null;
}
```

**التصميم:**
```
┌────────────────────────────────────────────────┐
│  📄 إرسال / طباعة الفاتورة                      │
├────────────────────────────────────────────────┤
│                                                │
│  ┌────────────────────────────────────────┐   │
│  │  📨  إرسال SMS للعميل                   │   │
│  │      (سيتم إرسال رابط الفاتورة)        │   │
│  └────────────────────────────────────────┘   │
│                                                │
│  ┌────────────────────────────────────────┐   │
│  │  🖨️  طباعة الفاتورة                    │   │
│  │      (فتح الفاتورة في نافذة جديدة)      │   │
│  └────────────────────────────────────────┘   │
│                                                │
│        [ إغلاق ]                               │
└────────────────────────────────────────────────┘
```

**المنطق:**
- **إرسال SMS**: استدعاء `send-invoice-sms` أو `send-package-invoice-sms`
- **طباعة**: استدعاء نفس الدالة مع `skip_sms: true` ثم فتح `ab_invoice_url`

### 4. تعديل PolicyYearTimeline

**قبل:**
```tsx
<Button onClick={onSendInvoice}>
  <Send />
</Button>
```

**بعد:**
```tsx
<Button onClick={(e) => handleOpenSendPrintDialog(e, pkg.allPolicyIds)}>
  <Send />
</Button>
```

إضافة State:
```tsx
const [sendPrintDialogOpen, setSendPrintDialogOpen] = useState(false);
const [sendPrintPolicyIds, setSendPrintPolicyIds] = useState<string[]>([]);
```

---

## تحديث PolicyChildrenSelector أيضاً

نفس التغييرات في ملف `PolicyChildrenSelector.tsx`:
- إضافة حقل تاريخ الميلاد
- إضافة حقل الهاتف
- عرض badge "أقل من 24" للموجودين

---

## ملخص التغييرات

| الملف | نوع التغيير |
|-------|-------------|
| `PackagePolicyEditModal.tsx` | تعديل - إضافة حقول birth_date + phone |
| `PolicyChildrenSelector.tsx` | تعديل - إضافة حقول birth_date + phone |
| `PolicyYearTimeline.tsx` | تعديل - استبدال إرسال مباشر بنافذة |
| `InvoiceSendPrintDialog.tsx` | إنشاء جديد |

---

## النتيجة المتوقعة

1. ✅ عند إضافة سائق جديد → يمكن إدخال تاريخ الميلاد والهاتف
2. ✅ عند عرض السائقين الموجودين → يظهر badge "أقل من 24" إذا كان العمر أقل من 24
3. ✅ عند الضغط على زر الإرسال ✈️ في بطاقة الوثيقة → تفتح نافذة بخيارين:
   - إرسال SMS للعميل
   - طباعة الفاتورة (فتح في نافذة جديدة)
