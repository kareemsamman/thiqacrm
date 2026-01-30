

# خطة: إصلاح زر WhatsApp باستخدام Anchor Link

## المشكلة الحالية
الكود الحالي يستخدم `window.open()` مع fallbacks متعددة، لكن هذا يُحظر في بيئات iframe/webview بسبب سياسات أمان المتصفح.

## الحل
تحويل زر WhatsApp من `<Button>` إلى `<a>` tag حقيقي مع `target="_blank"` و `rel="noopener noreferrer"`.

---

## التغييرات المطلوبة

**الملف:** `src/pages/DebtTracking.tsx`

### 1) تعديل دالة getWhatsAppUrl (جديدة)
```typescript
const getWhatsAppUrl = (client: ClientDebt): string | null => {
  if (!client.phone_number) return null;
  
  let phone = client.phone_number.replace(/[\s\-\(\)]/g, '');
  if (phone.startsWith('0')) {
    phone = '972' + phone.slice(1);
  } else if (!phone.startsWith('972') && !phone.startsWith('+972')) {
    phone = '972' + phone;
  }
  phone = phone.replace('+', '');
  
  const message = `مرحباً ${client.client_name}، لديك مبلغ متبقي ${client.total_owed.toLocaleString()} شيكل. يرجى التواصل معنا لتسوية المبلغ.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};
```

### 2) تحويل الزر إلى Anchor Link

**قبل (السطور ~530-543):**
```tsx
<Button
  variant="outline"
  size="sm"
  onClick={(e) => {
    e.stopPropagation();
    openWhatsAppReminder(client);
  }}
  disabled={!client.phone_number}
  className="text-green-600 border-green-600 hover:bg-green-50"
>
  <MessageCircle className="h-4 w-4 ml-1" />
  WhatsApp
</Button>
```

**بعد:**
```tsx
{client.phone_number ? (
  <a
    href={getWhatsAppUrl(client) || '#'}
    target="_blank"
    rel="noopener noreferrer"
    onClick={(e) => e.stopPropagation()}
    className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium border bg-transparent h-9 rounded-md px-3 text-green-600 border-green-600 hover:bg-green-50 transition-all"
  >
    <MessageCircle className="h-4 w-4" />
    WhatsApp
  </a>
) : (
  <Button
    variant="outline"
    size="sm"
    disabled
    className="text-green-600 border-green-600"
  >
    <MessageCircle className="h-4 w-4 ml-1" />
    WhatsApp
  </Button>
)}
```

### 3) حذف دالة openWhatsAppReminder
لم نعد بحاجة للدالة `openWhatsAppReminder` (السطور 258-306) بعد التحويل.

---

## لماذا هذا الحل أفضل؟

| الطريقة القديمة | الطريقة الجديدة |
|----------------|-----------------|
| `window.open()` يُحظر في iframes | `<a target="_blank">` مسموح دائماً |
| يحتاج fallbacks معقدة | لا يحتاج fallbacks |
| JavaScript-dependent | Native browser behavior |
| Pop-up blockers تحظره | يعمل بدون مشاكل |

---

## ملخص الملفات

| الملف | التغيير |
|-------|---------|
| `src/pages/DebtTracking.tsx` | إضافة `getWhatsAppUrl`، تحويل Button إلى anchor، حذف `openWhatsAppReminder` |

