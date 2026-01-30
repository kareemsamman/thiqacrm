
# خطة: إضافة زر واتساب لإرسال تذكير بالديون

## المطلوب
إضافة زر واتساب بجانب زر "تذكير" الموجود في صفحة `/debt-tracking` يقوم بفتح رابط WhatsApp API مع رسالة افتراضية للعميل المحدد.

## التغييرات المطلوبة

### 1) تعديل ملف `src/pages/DebtTracking.tsx`

**المكان:** بجانب زر "تذكير" (سطر 467-478)

**التغييرات:**
1. إضافة import لأيقونة واتساب من lucide-react (MessageCircle icon بأسلوب واتساب)
2. إنشاء function لفتح واتساب مع الرسالة الافتراضية
3. إضافة زر واتساب جديد بجانب زر التذكير

**الكود المقترح:**

```tsx
// Function جديدة
const openWhatsAppReminder = (client: ClientDebt) => {
  if (!client.phone_number) return;
  
  // تحويل الرقم لصيغة دولية (إزالة 0 وإضافة 972)
  let phone = client.phone_number.replace(/[\s\-\(\)]/g, '');
  if (phone.startsWith('0')) {
    phone = '972' + phone.slice(1);
  } else if (!phone.startsWith('972') && !phone.startsWith('+972')) {
    phone = '972' + phone;
  }
  phone = phone.replace('+', '');
  
  // رسالة افتراضية
  const message = `مرحباً ${client.client_name}، لديك مبلغ متبقي ${client.total_owed.toLocaleString()} شيكل. يرجى التواصل معنا لتسوية المبلغ.`;
  
  // فتح واتساب
  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
};
```

**الأزرار (تعديل):**
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
  <MessageCircle className="h-4 w-4 ml-2" />
</Button>
<Button
  variant="outline"
  size="sm"
  onClick={(e) => {
    e.stopPropagation();
    openSmsDialog(client);
  }}
  disabled={!client.phone_number}
>
  <Send className="h-4 w-4 ml-2" />
  تذكير
</Button>
```

---

## النتيجة المتوقعة

| الزر | الوظيفة |
|------|---------|
| 💬 (أخضر) | يفتح واتساب مباشرة مع رسالة جاهزة فيها اسم العميل والمبلغ المتبقي |
| ✈️ تذكير | يفتح نافذة SMS لإرسال رسالة عبر 019sms (كما هو الآن) |

---

## ملخص الملفات

| الملف | التغيير |
|-------|---------|
| `src/pages/DebtTracking.tsx` | إضافة زر واتساب + function لفتح الرابط |

---

## ملاحظات تقنية
- الأيقونة: `MessageCircle` من lucide-react (أقرب شكل للواتساب)
- الرابط: `https://wa.me/{phone}?text={message}`
- الرقم: يتم تحويله لصيغة دولية (972XXXXXXXXX)
- الرسالة: تحتوي على اسم العميل والمبلغ المستحق
