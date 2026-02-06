

# خطة تحسين رسالة SMS للديون

## المشكلة الحالية
رسالة SMS الحالية للديون تعرض:
```
مرحباً Kareem Test، لديك مبلغ متبقي 5600 شيكل على وثيقة التأمين رقم {{policy_number}}. يرجى التواصل معنا لتسوية المبلغ.
```

**المشاكل:**
1. `{{policy_number}}` لا يتم استبداله (لأن البيانات لا تحتوي على رقم الوثيقة في bulk SMS)
2. لا يوجد نوع الوثيقة (شامل/ثالث/سرفيس)
3. لا يوجد footer الشركة مع بيانات التواصل

---

## الحل المقترح

### 1. تحديث `send-bulk-debt-sms` Edge Function

بدلاً من استخدام template بسيط، سنجعله يبني رسالة مفصلة تشبه `send-manual-reminder`:

**الرسالة الجديدة:**
```
مرحباً {اسم العميل}،

لديك مبالغ متبقية:
• شامل - سيارة 1234567: ₪2,000
• سرفيس: ₪600

━━━━━━━━━━━━
💰 المجموع المتبقي: ₪2,600

AB للتأمين
📍 بيت حنينا
📞 026307377 | 0544494440
```

### 2. التغييرات المطلوبة

#### ملف: `supabase/functions/send-bulk-debt-sms/index.ts`

**التغييرات:**
1. **إضافة دالة لأنواع الوثائق** - نفس الموجودة في `send-manual-reminder`:
```typescript
const POLICY_TYPE_LABELS: Record<string, string> = {
  'THIRD_FULL': 'ثالث/شامل',
  'ROAD_SERVICE': 'سرفيس',
  'ACCIDENT_FEE_EXEMPTION': 'إعفاء رسوم الحادث',
};

function getPolicyTypeLabel(parent: string | null, child: string | null): string {
  if (!parent) return '';
  if (child && parent === 'THIRD_FULL') {
    return child === 'FULL' ? 'شامل' : child === 'THIRD' ? 'ثالث' : child;
  }
  return POLICY_TYPE_LABELS[parent] || parent;
}
```

2. **جلب تفاصيل الوثائق لكل عميل** - بدلاً من إرسال الرسالة مباشرة، نجلب وثائق كل عميل:
```typescript
// Get unpaid policies for this client
const { data: policies } = await supabase
  .from('policies')
  .select(`
    policy_type_parent,
    policy_type_child,
    insurance_price,
    car:cars(car_number),
    policy_payments(amount, refused)
  `)
  .eq('client_id', client.client_id)
  .neq('policy_type_parent', 'ELZAMI')
  .eq('cancelled', false)
  .is('deleted_at', null);
```

3. **بناء رسالة مفصلة مع footer الشركة**:
```typescript
// Get company footer info
const companyLocation = smsSettings.company_location || '';
const phoneLinks = smsSettings.company_phone_links || [];
const phones = phoneLinks.map(p => p.phone).join(' | ');

// Build policy lines
const policyLines = unpaidPolicies.map(p => 
  `• ${p.policyType}${p.carNumber ? ` - ${p.carNumber}` : ''}: ₪${p.remaining}`
);

// Build final message
const message = `مرحباً ${clientName}،

لديك مبالغ متبقية:
${policyLines.join('\n')}

━━━━━━━━━━━━
💰 المجموع: ₪${totalRemaining}

AB للتأمين
📍 ${companyLocation}
📞 ${phones}`;
```

---

## الملفات المتأثرة

| الملف | نوع التغيير |
|-------|-------------|
| `supabase/functions/send-bulk-debt-sms/index.ts` | تحديث - بناء رسالة مفصلة مع footer |

---

## شكل الرسالة النهائية

```
مرحباً أحمد محمد،

لديك مبالغ متبقية:
• شامل - 1234567: ₪3,000
• سرفيس: ₪600
• ثالث - 7654321: ₪2,000

━━━━━━━━━━━━
💰 المجموع: ₪5,600

AB للتأمين
📍 بيت حنينا
📞 026307377 | 0544494440 | 0546060886
```

---

## النتيجة المتوقعة

1. **لا رقم وثيقة** - يُعرض نوع التأمين فقط (شامل/ثالث/سرفيس)
2. **تفصيل لكل وثيقة** - العميل يعرف بالضبط ما عليه
3. **Footer احترافي** - اسم الشركة + الموقع + أرقام التواصل
4. **سطور منفصلة** - رسالة واضحة ومقروءة

