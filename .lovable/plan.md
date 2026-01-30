
# خطة: تحسين UX اختيار السيارات وإصلاح مشكلة WhatsApp

## المشاكل المحددة

| # | المشكلة | الوصف |
|---|---------|-------|
| 1 | UX السيارات ضعيف | الـ Badges الحالية صغيرة وغير واضحة، تحتاج لتصميم أكبر مع Checkboxes |
| 2 | WhatsApp محظور | لا يزال الرابط يُحظر في بعض الحالات |

---

## التغييرات المطلوبة

### 1) تحسين واجهة اختيار السيارات

**الملف:** `src/components/debt/DebtPaymentModal.tsx`

**الوضع الحالي (السطور 668-691):**
```tsx
{uniqueCars.length > 1 && (
  <div className="flex flex-wrap items-center gap-2">
    <Label className="text-sm whitespace-nowrap">السيارات:</Label>
    <div className="flex flex-wrap gap-1">
      <Badge ...>الكل</Badge>
      {uniqueCars.map(car => (
        <Badge ...>{car}</Badge>
      ))}
    </div>
  </div>
)}
```

**التصميم الجديد:**
- صندوق منفصل واضح بخلفية مميزة
- استخدام Checkbox بدلاً من Badge chips
- حجم أكبر وأوضح
- عرض رقم السيارة بخط أكبر
- إضافة إجمالي المبلغ لكل سيارة

```tsx
{uniqueCars.length > 0 && (
  <Card className="border-2 border-dashed">
    <CardHeader className="p-3 pb-0">
      <Label className="text-base font-semibold flex items-center gap-2">
        <Car className="h-4 w-4" />
        اختر السيارة للدفع
      </Label>
    </CardHeader>
    <CardContent className="p-3 pt-2">
      <div className="space-y-2">
        {/* خيار كل السيارات */}
        <div 
          onClick={() => setSelectedCars([])}
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
            selectedCars.length === 0 
              ? "border-primary bg-primary/5" 
              : "border-muted hover:border-primary/50"
          )}
        >
          <Checkbox checked={selectedCars.length === 0} />
          <div className="flex-1">
            <p className="font-medium">كل السيارات</p>
            <p className="text-sm text-muted-foreground">
              {uniqueCars.length} سيارات - إجمالي ₪{totalRemaining}
            </p>
          </div>
        </div>
        
        {/* قائمة السيارات */}
        {uniqueCars.map(car => {
          const carPolicies = policies.filter(p => p.carNumber === car);
          const carTotal = carPolicies.reduce((sum, p) => sum + p.remaining, 0);
          const isSelected = selectedCars.includes(car);
          
          return (
            <div 
              key={car}
              onClick={() => toggleCar(car)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                isSelected 
                  ? "border-primary bg-primary/5" 
                  : "border-muted hover:border-primary/50"
              )}
            >
              <Checkbox checked={isSelected} />
              <div className="flex-1">
                <p className="font-bold text-lg font-mono">{car}</p>
                <p className="text-sm text-muted-foreground">
                  {carPolicies.length} وثائق - ₪{carTotal.toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </CardContent>
  </Card>
)}
```

### 2) إصلاح مشكلة WhatsApp

**التحليل:**
- الكود الحالي يستخدم `document.createElement('a')` وهو صحيح
- لكن المشكلة قد تكون بسبب:
  1. تشغيل داخل iframe في Lovable preview
  2. حماية sandbox في بعض المتصفحات
  3. الرابط يُحظر على مستوى iframe permissions

**الحل:** إضافة fallback مع `window.top.location` أو عرض الرابط للنسخ

**الملف:** `src/pages/DebtTracking.tsx`

```tsx
const openWhatsAppReminder = (client: ClientDebt) => {
  if (!client.phone_number) return;
  
  // تحويل الرقم لصيغة دولية
  let phone = client.phone_number.replace(/[\s\-\(\)]/g, '');
  if (phone.startsWith('0')) {
    phone = '972' + phone.slice(1);
  } else if (!phone.startsWith('972') && !phone.startsWith('+972')) {
    phone = '972' + phone;
  }
  phone = phone.replace('+', '');
  
  const message = `مرحباً ${client.client_name}، لديك مبلغ متبقي ${client.total_owed.toLocaleString()} شيكل. يرجى التواصل معنا لتسوية المبلغ.`;
  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  
  // محاولة أولى: استخدام window.open مباشرة
  const newWindow = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  
  // محاولة ثانية: إذا فشل window.open
  if (!newWindow || newWindow.closed) {
    // محاولة باستخدام top window (للخروج من iframe)
    try {
      if (window.top && window.top !== window) {
        window.top.location.href = whatsappUrl;
        return;
      }
    } catch (e) {
      // تجاهل خطأ cross-origin
    }
    
    // Fallback: نسخ الرابط للحافظة
    navigator.clipboard.writeText(whatsappUrl).then(() => {
      toast({
        title: "تم نسخ الرابط",
        description: "تعذر فتح WhatsApp تلقائياً. تم نسخ الرابط للحافظة.",
      });
    }).catch(() => {
      // آخر محاولة: عرض الرابط في نافذة
      toast({
        title: "افتح WhatsApp يدوياً",
        description: "انسخ الرابط: " + whatsappUrl.substring(0, 50) + "...",
      });
    });
  }
};
```

---

## ملخص الملفات المعدلة

| الملف | التغيير |
|-------|---------|
| `src/components/debt/DebtPaymentModal.tsx` | تحسين UX اختيار السيارات بـ Checkboxes وتصميم أكبر |
| `src/pages/DebtTracking.tsx` | إضافة fallback logic لـ WhatsApp مع نسخ الرابط |

---

## النتيجة المتوقعة

### السيارات
- صناديق كبيرة واضحة لكل سيارة
- Checkbox لاختيار متعدد
- عرض عدد الوثائق والمبلغ لكل سيارة
- خيار "كل السيارات" واضح في الأعلى
- تأثيرات hover وانتقالات سلسة

### WhatsApp
- محاولة فتح نافذة جديدة أولاً
- fallback للخروج من iframe
- نسخ الرابط للحافظة كحل أخير
- رسالة toast توضيحية عند الفشل
