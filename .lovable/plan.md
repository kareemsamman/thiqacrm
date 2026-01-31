
# خطة: إنشاء نظام استلام Leads من WhatsApp Bot

## ملخص المشروع

إنشاء نظام كامل لاستقبال بيانات العملاء المحتملين (Leads) من بوت WhatsApp، يشمل:
1. جدول قاعدة بيانات لتخزين الـ Leads
2. Edge Function كـ Webhook API لاستقبال البيانات
3. صفحة إدارية لعرض وإدارة الـ Leads

---

## المكونات المطلوبة

### 1) جدول قاعدة البيانات: `leads`

```sql
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  customer_name TEXT,
  car_number TEXT,
  car_manufacturer TEXT,
  car_model TEXT,
  car_year TEXT,
  car_color TEXT,
  insurance_types TEXT[], -- Array of strings
  driver_over_24 BOOLEAN DEFAULT true,
  has_accidents BOOLEAN DEFAULT false,
  total_price NUMERIC(10,2),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'rejected')),
  notes TEXT,
  source TEXT DEFAULT 'whatsapp',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for status filtering
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);

-- RLS Policies (Admin only access)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all leads" ON public.leads
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update leads" ON public.leads
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- No insert policy needed - webhook uses service role
```

---

### 2) Edge Function: `whatsapp-lead-webhook`

**المسار:** `supabase/functions/whatsapp-lead-webhook/index.ts`

**الوظيفة:**
- استقبال JSON من WhatsApp Bot
- حفظ البيانات في جدول `leads`
- إرجاع `{ success: true, lead_id: "..." }`

```typescript
// ملخص الكود
Deno.serve(async (req) => {
  // CORS handling
  
  // Parse JSON body
  const body = await req.json();
  
  // Validate required fields
  if (!body.phone) {
    return error response;
  }
  
  // Insert into leads table
  const { data, error } = await supabase
    .from('leads')
    .insert({
      phone: body.phone,
      customer_name: body.customer_name,
      car_number: body.car_number,
      car_manufacturer: body.car_manufacturer,
      car_model: body.car_model,
      car_year: body.car_year,
      car_color: body.car_color,
      insurance_types: body.insurance_types, // Already an array
      driver_over_24: body.driver_over_24 ?? true,
      has_accidents: body.has_accidents ?? false,
      total_price: body.total_price,
      notes: body.notes,
    })
    .select('id')
    .single();
  
  return { success: true, lead_id: data.id };
});
```

**إعدادات الـ Config:**
```toml
[functions.whatsapp-lead-webhook]
verify_jwt = false  # Public webhook
```

---

### 3) صفحة الإدارة: `/admin/leads`

**الملف:** `src/pages/Leads.tsx`

**المميزات:**
- جدول يعرض جميع الـ Leads
- فلترة حسب الحالة (جديد، تم التواصل، تم التحويل، مرفوض)
- بحث بالاسم أو رقم الهاتف
- عرض التفاصيل الكاملة عند النقر
- تغيير الحالة من القائمة المنسدلة
- شارات ملونة للحالات

**هيكل الصفحة:**
```text
┌─────────────────────────────────────────────────────────┐
│  العملاء المحتملون (Leads)                              │
│  طلبات التأمين من WhatsApp                              │
├─────────────────────────────────────────────────────────┤
│  [🔍 بحث...] [الحالة ▼] [تحديث 🔄]                      │
├─────────────────────────────────────────────────────────┤
│  إحصائيات:                                              │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                    │
│  │ جديد │ │تواصل │ │تحويل │ │مرفوض │                    │
│  │  12  │ │   5  │ │   8  │ │   3  │                    │
│  └──────┘ └──────┘ └──────┘ └──────┘                    │
├─────────────────────────────────────────────────────────┤
│ الاسم    │ الهاتف     │ السيارة  │ السعر │ الحالة │ ... │
│──────────┼────────────┼──────────┼───────┼────────┼─────│
│ كريم     │ 054490... │ فورد 2009│ ₪2600 │ جديد   │ ⋮   │
│ محمد     │ 050123... │ טויוטה..│ ₪1800 │ تواصل  │ ⋮   │
└─────────────────────────────────────────────────────────┘
```

---

### 4) Drawer للتفاصيل: `LeadDetailsDrawer.tsx`

**الملف:** `src/components/leads/LeadDetailsDrawer.tsx`

يعرض:
- بيانات العميل (الاسم، الهاتف)
- بيانات السيارة (رقم، صانع، موديل، سنة، لون)
- أنواع التأمين المطلوبة
- السائق فوق 24 / حوادث سابقة
- السعر المقترح
- الملاحظات
- زر تغيير الحالة
- زر اتصال (Click2Call)
- زر إنشاء عميل جديد من البيانات

---

### 5) تحديث الملفات الموجودة

**`src/App.tsx`** - إضافة Route جديد:
```typescript
import Leads from "./pages/Leads";
// ...
<Route path="/admin/leads" element={
  <AdminRoute>
    <Leads />
  </AdminRoute>
} />
```

**`src/components/layout/Sidebar.tsx`** - إضافة رابط في قائمة الإعدادات:
```typescript
{ name: "Leads (WhatsApp)", href: "/admin/leads", icon: MessageSquare, adminOnly: true },
```

**`supabase/config.toml`** - إضافة الـ function الجديدة:
```toml
[functions.whatsapp-lead-webhook]
verify_jwt = false
```

---

## ملخص الملفات

| الملف | النوع | الوصف |
|-------|-------|-------|
| `leads` table | Migration | جدول قاعدة البيانات + RLS |
| `supabase/functions/whatsapp-lead-webhook/index.ts` | جديد | Webhook API |
| `supabase/config.toml` | تعديل | إضافة الـ function |
| `src/pages/Leads.tsx` | جديد | صفحة الإدارة |
| `src/components/leads/LeadDetailsDrawer.tsx` | جديد | Drawer التفاصيل |
| `src/App.tsx` | تعديل | إضافة Route |
| `src/components/layout/Sidebar.tsx` | تعديل | إضافة رابط |

---

## مثال الاستخدام

**إرسال Lead من WhatsApp Bot:**
```bash
POST https://tytilcbuyphlowkolpsk.functions.supabase.co/whatsapp-lead-webhook

{
  "phone": "972544902728",
  "customer_name": "كريم",
  "car_number": "8292765",
  "car_manufacturer": "פורד",
  "car_model": "פוקוס",
  "car_year": "2009",
  "car_color": "לבן",
  "insurance_types": ["إلزامي", "طرف ثالث", "خدمات طريق"],
  "driver_over_24": true,
  "has_accidents": false,
  "total_price": 2600,
  "notes": "Customer requested via WhatsApp"
}
```

**الرد:**
```json
{
  "success": true,
  "lead_id": "abc123-..."
}
```

---

## الأمان

1. **Webhook عام** (verify_jwt = false) للسماح لـ WhatsApp Bot بالإرسال
2. **RLS على الجدول** - فقط المديرون يمكنهم القراءة والتحديث
3. **لا توجد صلاحية حذف** - للحفاظ على سجل كامل
4. **صفحة الإدارة محمية** بـ AdminRoute

---

## ميزات إضافية (اختيارية لاحقاً)

1. **إشعار عند Lead جديد** - إضافة trigger لإنشاء notification
2. **تحويل Lead إلى عميل** - زر لإنشاء client من بيانات Lead
3. **تقارير Leads** - إحصائيات شهرية ومعدلات التحويل
4. **Webhook للإشعار** - إرسال SMS للمدير عند lead جديد
