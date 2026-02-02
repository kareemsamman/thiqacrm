
# خطة: عرض سبب فشل الدفع في iframe لـ Tranzila

## المشكلة الحالية
عندما تفشل عملية الدفع، الـ iframe يعرض فقط "فشلت عملية الدفع" بدون تفاصيل عن السبب. بينما صفحة Tranzila الخاصة تعرض رسالة واضحة مثل:
- "يش להתקשר לחברת האשראי לאישור טלפוני של העסקה" (يجب الاتصال بشركة البطاقة للموافقة الهاتفية)

## ما تُرسله Tranzila عند الفشل
عند توجيه المستخدم إلى `fail_url_address`، Tranzila تُرسل هذه المعلومات في Query Parameters:

| Parameter | الوصف |
|-----------|-------|
| `Response` | كود الخطأ (مثل "003", "004", "038") |
| `CResp` | كود شركة البطاقة |
| `reason` | نص الخطأ بالعبرية (أحياناً) |
| `ccno` | آخر 4 أرقام من البطاقة |
| `sum` | المبلغ |

## الحل المقترح

### 1. تحديث Edge Function: `payment-result`
إضافة قراءة المعلومات الإضافية + ترجمة كود الخطأ إلى رسالة مفهومة:

```typescript
// Get additional error info
const reason = url.searchParams.get('reason') || url.searchParams.get('Reason') || ''
const CResp = url.searchParams.get('CResp') || url.searchParams.get('cresp') || ''
const sum = url.searchParams.get('sum') || url.searchParams.get('Sum') || ''

// Map response codes to Hebrew messages
function getErrorMessage(code: string, cResp: string, reason: string): string {
  // If reason is provided, use it
  if (reason) return decodeURIComponent(reason)
  
  // Map common Tranzila response codes
  const errorMessages: Record<string, string> = {
    '003': 'העסקה נדחתה - יש ליצור קשר עם חברת האשראי',
    '004': 'הכרטיס נחסם או שייך לרשימה שחורה',
    '006': 'שגיאה בקוד CVV',
    '009': 'העסקה נכשלה בבדיקת 3DSecure',
    '010': 'שגיאה בתאריך תפוגה',
    '015': 'הכרטיס לא קיים',
    '017': 'העסקה נדחתה - מומלץ לנסות כרטיס אחר',
    '027': 'יש להתקשר לחברת האשראי לאישור טלפוני',
    '033': 'כרטיס אינו תקין',
    '036': 'הכרטיס פג תוקף',
    '038': 'יש להתקשר לחברת האשראי לאישור טלפוני של העסקה',
    '039': 'מספר כרטיס לא תקין',
    '057': 'העסקה נדחתה על ידי חברת האשראי',
    '058': 'העסקה אינה מאושרת לעסק',
    '059': 'העסקה נדחתה - בעיה בחברת האשראי',
    '060': 'יש לפנות לחברת האשראי',
    '062': 'סוג כרטיס מוגבל',
    '063': 'בעיית אימות 3DSecure',
    '999': 'שגיאת מערכת - יש לנסות שוב',
  }
  
  return errorMessages[code] || 'העסקה נכשלה - קוד שגיאה: ' + code
}
```

### 2. عرض الرسالة في صفحة الخطأ
تحديث HTML ليعرض سبب الفشل:

```html
<h1>עסקה בסך ₪${sum || amount} נכשלה</h1>
<p class="reason">סיבת כשלון:</p>
<p class="error-detail">${errorMessage}</p>
${cardLastFour ? `<p class="card-info">אמצעי תשלום: כרטיס אשראי המסתיים ב ${cardLastFour}</p>` : ''}
```

### 3. تحديث Edge Function: `broker-payment-result`
نفس التغييرات لمدفوعات الوسطاء.

### 4. إرسال رسالة الخطأ للـ Parent Window
لتحديث UI في Modal:

```javascript
var msg = {
  type: 'TRANZILA_PAYMENT_RESULT',
  status: 'failed',
  payment_id: '${paymentId}',
  error_code: '${responseCode}',
  error_message: '${errorMessageEncoded}',
  card_last_four: '${cardLastFour}'
};
```

### 5. تحديث React Modal
لعرض رسالة الخطأ من postMessage:

```typescript
// In TranzilaPaymentModal.tsx
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'TRANZILA_PAYMENT_RESULT') {
      if (event.data.status === 'failed') {
        setStatus('failed');
        // Set detailed error message if available
        if (event.data.error_message) {
          setErrorMessage(event.data.error_message);
        } else {
          setErrorMessage('فشلت عملية الدفع');
        }
      }
    }
  };
  // ...
}, []);
```

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `supabase/functions/payment-result/index.ts` | قراءة `reason` و `CResp` + ترجمة الأكواد + عرض الرسالة |
| `supabase/functions/broker-payment-result/index.ts` | نفس التغييرات |
| `src/components/payments/TranzilaPaymentModal.tsx` | عرض `error_message` من postMessage |
| `src/components/brokers/BrokerPaymentModal.tsx` | نفس التغييرات |

---

## أكواد الأخطاء الشائعة في Tranzila

| Code | المعنى |
|------|--------|
| 003 | رفض من شركة البطاقة |
| 004 | بطاقة محظورة |
| 006 | خطأ في CVV |
| 010 | تاريخ انتهاء خاطئ |
| 027, 038 | يتطلب موافقة هاتفية (كما في الصورة) |
| 036 | البطاقة منتهية الصلاحية |
| 057 | رفض من شركة البطاقة |

---

## النتيجة المتوقعة

**قبل:**
```
┌─────────────────────────────┐
│         ✖                   │
│   فشلت عملية الدفع         │
│                             │
│   حدث خطأ أثناء معالجة      │
└─────────────────────────────┘
```

**بعد:**
```
┌─────────────────────────────────────────────┐
│              ✖                              │
│      עסקה בסך ₪2200.00 נכשלה               │
│                                             │
│      סיבת כשלון:                           │
│  יש להתקשר לחברת האשראי לאישור             │
│        טלפוני של העסקה                     │
│                                             │
│  אמצעי תשלום: כרטיס אשראי המסתיים ב 9013   │
│                                             │
│        ← חזרה למסך החיוב                   │
└─────────────────────────────────────────────┘
```

العميل الآن يفهم السبب ويعرف أن عليه الاتصال بشركة البطاقة!
