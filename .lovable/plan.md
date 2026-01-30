
# خطة: إضافة السائقين الإضافيين للفاتورة + إنشاء إيصال دفع

## المشكلة 1: السائقين الإضافيين غير موجودين في الفاتورة

### السبب
في `send-package-invoice-sms/index.ts`، لا يتم جلب `policy_children` من قاعدة البيانات، لذلك لا يظهر السائقين الإضافيين في الفاتورة.

### الحل
إضافة query لجلب السائقين الإضافيين لكل وثائق الباقة وعرضهم في HTML الفاتورة.

**التغييرات:**
1. إضافة جلب `policy_children` لكل الوثائق
2. تمرير البيانات لدالة `buildPackageInvoiceHtml`
3. إضافة قسم "السائقين الإضافيين" في HTML

---

## الميزة 2: إيصال دفع للعميل (Payment Receipt)

### المفهوم
إيصال يُظهر للعميل:
- ماذا دفع (المبلغ)
- كيف دفع (نقدي/بطاقة/شيك/تحويل)
- لأي وثيقة
- تفاصيل البطاقة (آخر 4 أرقام) إذا كان الدفع بالفيزا

### التصميم

```text
┌─────────────────────────────────────────────────────────┐
│                    إيصال دفع                            │
│                  AB Insurance                           │
├─────────────────────────────────────────────────────────┤
│  رقم الإيصال: PAY-2026-00123                            │
│  التاريخ: 30/01/2026                                    │
├─────────────────────────────────────────────────────────┤
│  العميل: محمد أحمد                                      │
│  رقم الهوية: 123456789                                  │
│  رقم السيارة: 12-345-67                                 │
├─────────────────────────────────────────────────────────┤
│  المبلغ: ₪500                                           │
│  طريقة الدفع: بطاقة ائتمان                              │
│  آخر 4 أرقام: ****5678                                  │
│  تقسيطات: 3                                             │
│  رقم التأكيد: 123456                                    │
├─────────────────────────────────────────────────────────┤
│  الوثيقة: ثالث/شامل                                     │
│  رقم الوثيقة: THIRD_FULL-2026-12345                     │
│  الفترة: 01/01/2026 - 01/01/2027                        │
├─────────────────────────────────────────────────────────┤
│              شكراً لتعاملكم معنا                        │
└─────────────────────────────────────────────────────────┘
```

### مكونات الحل

| المكون | الوصف |
|--------|-------|
| Edge Function جديدة | `generate-payment-receipt` - تولّد HTML الإيصال |
| زر في الواجهة | أيقونة طباعة/تحميل بجانب كل دفعة |
| عرض الإيصال | نافذة منبثقة أو صفحة جديدة للطباعة |

### البيانات المتاحة للإيصال

من جدول `policy_payments`:
- `amount` - المبلغ
- `payment_type` - نوع الدفع
- `payment_date` - تاريخ الدفع
- `card_last_four` - آخر 4 أرقام البطاقة ✓
- `card_expiry` - تاريخ انتهاء البطاقة ✓
- `installments_count` - عدد التقسيطات ✓
- `tranzila_approval_code` - رقم التأكيد ✓
- `cheque_number` - رقم الشيك (للشيكات)

### أماكن ظهور زر الإيصال

| المكان | الملف |
|--------|-------|
| Policy Wizard (Step 4) | `Step4Payments.tsx` |
| Policy Details Drawer | `PolicyPaymentsSection.tsx` |
| Payment Edit Dialog | `PaymentEditDialog.tsx` |
| Debt Payment Modal | `DebtPaymentModal.tsx` |

---

## التنفيذ

### المرحلة 1: إصلاح السائقين الإضافيين في الفاتورة

**الملف:** `supabase/functions/send-package-invoice-sms/index.ts`

```typescript
// إضافة بعد جلب الوثائق (سطر ~100)
const { data: policyChildren } = await supabase
  .from('policy_children')
  .select(`
    policy_id,
    child:client_children(full_name, id_number, relation, phone)
  `)
  .in('policy_id', policy_ids);

// تمرير للدالة
const packageInvoiceHtml = buildPackageInvoiceHtml(
  policies, 
  paymentsByPolicy, 
  totalPrice, 
  totalPaid, 
  totalRemaining, 
  insuranceFiles || [],
  policyChildren || []  // ← جديد
);
```

**في دالة `buildPackageInvoiceHtml`:**

```html
<!-- إضافة قسم السائقين الإضافيين بعد بيانات العميل -->
${policyChildren?.length > 0 ? `
  <div class="section">
    <div class="section-title">👥 السائقين الإضافيين / التابعين</div>
    <div class="section-content">
      ${policyChildren.map(pc => `
        <div class="info-item">
          <span class="info-label">${pc.child?.full_name}</span>
          <span class="info-value">${pc.child?.id_number} - ${pc.child?.relation || ''}</span>
        </div>
      `).join('')}
    </div>
  </div>
` : ''}
```

### المرحلة 2: إنشاء Edge Function للإيصال

**ملف جديد:** `supabase/functions/generate-payment-receipt/index.ts`

| المدخلات | `payment_id` |
|----------|--------------|
| المخرجات | HTML إيصال جاهز للطباعة |
| التخزين | رفع لـ Bunny CDN (اختياري) |

### المرحلة 3: إضافة زر الإيصال في الواجهة

**الملفات:**
- `PolicyPaymentsSection.tsx` - إضافة أيقونة `Receipt` بجانب كل دفعة
- `PolicyDetailsDrawer.tsx` - نفس الزر
- `Step4Payments.tsx` - للدفعات الجديدة

---

## ملخص الملفات

| الملف | التغيير |
|-------|---------|
| `send-package-invoice-sms/index.ts` | إضافة جلب وعرض السائقين الإضافيين |
| `send-invoice-sms/index.ts` | نفس التغيير للوثائق المفردة |
| `generate-payment-receipt/index.ts` | **ملف جديد** - Edge Function |
| `PolicyPaymentsSection.tsx` | زر إيصال + modal |
| `PolicyDetailsDrawer.tsx` | زر إيصال للدفعات |
| `Step4Payments.tsx` | زر إيصال للدفعات الجديدة (اختياري) |

---

## النتائج المتوقعة

- ✅ السائقين الإضافيين يظهرون في فاتورة الباقة
- ✅ السائقين الإضافيين يظهرون في فاتورة الوثيقة المفردة
- ✅ إيصال دفع قابل للطباعة لكل دفعة
- ✅ تفاصيل البطاقة (آخر 4 أرقام، تقسيطات) في الإيصال
- ✅ تصميم متناسق مع باقي النظام

