
# خطة: إظهار زر SMS للعاملين في صفحة تقارير الوثائق

## المشكلة الحالية

في صفحة `/reports/policies`، تبويب "التجديدات":
- زر "إرسال تذكيرات SMS" مخفي عن العاملين (مغلف بـ `isAdmin &&`)
- زر "تصدير PDF" أيضاً مخفي (لكن هذا صحيح حسب طلبك)
- دالة `handleSendReminders` تحتوي على فحص `isAdmin` وترجع خطأ للعاملين

## التغييرات المطلوبة

### الملف: `src/pages/PolicyReports.tsx`

#### 1. إزالة فحص `isAdmin` من دالة `handleSendReminders`

**السطر 633-637:**
```tsx
// قبل:
const handleSendReminders = async () => {
  if (!isAdmin) {
    toast.error('هذه الميزة للمسؤولين فقط');
    return;
  }
  ...
}

// بعد:
const handleSendReminders = async () => {
  setSendingReminders(true);
  ...
}
```

#### 2. فصل زر PDF عن زر SMS في الـ UI

**السطور 1202-1213:**
```tsx
// قبل:
{isAdmin && (
  <div className="flex gap-2 mr-auto">
    <Button variant="outline" onClick={handleGeneratePdf} ...>تصدير PDF</Button>
    <Button onClick={handleSendReminders} ...>إرسال تذكيرات SMS</Button>
  </div>
)}

// بعد:
<div className="flex gap-2 mr-auto">
  {/* PDF للمسؤولين فقط */}
  {isAdmin && (
    <Button variant="outline" onClick={handleGeneratePdf} disabled={generatingPdf}>
      {generatingPdf ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Download className="h-4 w-4 ml-2" />}
      تصدير PDF
    </Button>
  )}
  
  {/* SMS للجميع */}
  <Button onClick={handleSendReminders} disabled={sendingReminders || renewalClients.length === 0}>
    {sendingReminders ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Send className="h-4 w-4 ml-2" />}
    إرسال تذكيرات SMS {renewalClients.length > 0 && `(${renewalsTotalRows})`}
  </Button>
</div>
```

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/pages/PolicyReports.tsx` | إزالة شرط `isAdmin` من SMS + إبقائه على PDF فقط |

---

## النتيجة المتوقعة

| المستخدم | زر PDF | زر SMS |
|----------|--------|--------|
| **Admin** | ✅ يظهر | ✅ يظهر |
| **Worker** | ❌ مخفي | ✅ يظهر |

---

## اختبار بعد التنفيذ

1. سجل دخول كـ **Worker** (غير admin)
2. اذهب لصفحة `/reports/policies`
3. اختر تبويب "التجديدات"
4. تأكد أن:
   - زر "إرسال تذكيرات SMS" يظهر ويعمل
   - زر "تصدير PDF" **لا يظهر**
5. اضغط على زر SMS وتأكد من إرسال التذكيرات بنجاح
