

# خطة: صفحة جهات الاتصال (دليل الهاتف)

## نظرة عامة
إنشاء صفحة جديدة لإدارة جهات الاتصال المهنية (مخمنين، شركات تأمين، كراجات، وغيرها) مع إمكانية البحث، الاتصال، النسخ، التعديل والحذف.

---

## 1) إنشاء جدول قاعدة البيانات

**جدول جديد:** `business_contacts`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المفتاح الأساسي |
| name | text | اسم جهة الاتصال (مطلوب) |
| phone | text | رقم الهاتف |
| email | text | البريد الإلكتروني |
| category | text | النوع: appraiser, insurance_company, garage, other |
| notes | text | ملاحظات إضافية |
| created_at | timestamp | تاريخ الإنشاء |
| updated_at | timestamp | تاريخ التحديث |
| created_by | uuid | المستخدم المنشئ |

```sql
CREATE TABLE public.business_contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  phone text,
  email text,
  category text DEFAULT 'other' CHECK (category IN ('appraiser', 'insurance_company', 'garage', 'other')),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.business_contacts ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "Authenticated users can read contacts"
  ON public.business_contacts FOR SELECT
  TO authenticated
  USING (true);

-- All authenticated users can insert
CREATE POLICY "Authenticated users can insert contacts"
  ON public.business_contacts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- All authenticated users can update
CREATE POLICY "Authenticated users can update contacts"
  ON public.business_contacts FOR UPDATE
  TO authenticated
  USING (true);

-- All authenticated users can delete
CREATE POLICY "Authenticated users can delete contacts"
  ON public.business_contacts FOR DELETE
  TO authenticated
  USING (true);

-- Index for search
CREATE INDEX idx_business_contacts_search ON public.business_contacts (name, phone, category);
```

---

## 2) إنشاء صفحة جهات الاتصال

**ملف جديد:** `src/pages/BusinessContacts.tsx`

### المميزات:
- **تصميم بطاقات أنيق** مستوحى من تطبيقات الهاتف
- **بحث فوري** بالاسم أو رقم الهاتف
- **فلترة حسب النوع** (مخمن، شركة تأمين، كراج، أخرى)
- **Server-side pagination** للأداء مع البيانات الكبيرة

### هيكل الصفحة:
```tsx
export default function BusinessContacts() {
  return (
    <MainLayout>
      <Header 
        title="جهات الاتصال" 
        subtitle="دليل الهاتف للمخمنين والكراجات"
        action={{ label: "إضافة جهة", onClick: () => setDrawerOpen(true) }}
      />
      
      {/* شريط البحث والفلترة */}
      <div className="p-6 space-y-4">
        <div className="flex gap-4">
          <SearchInput />
          <CategoryFilter />
        </div>
        
        {/* شبكة البطاقات */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {contacts.map(contact => (
            <ContactCard key={contact.id} contact={contact} />
          ))}
        </div>
        
        {/* Pagination */}
        <Pagination />
      </div>
      
      <ContactDrawer />
    </MainLayout>
  );
}
```

---

## 3) بطاقة جهة الاتصال

**تصميم البطاقة:**
```
┌─────────────────────────────────┐
│  🔵  [مخمن]                     │
│                                 │
│  أحمد محمد                      │
│  📞 0521234567                  │
│  ✉️  ahmed@email.com             │
│                                 │
│  [اتصال] [نسخ] [⋮ المزيد]       │
└─────────────────────────────────┘
```

### الإجراءات المتاحة:
- **اتصال** - يفتح Click2CallDialog الموجود
- **نسخ** - نسخ رقم الهاتف للحافظة
- **تعديل** - فتح Drawer للتعديل
- **حذف** - تأكيد ثم حذف

---

## 4) Drawer إضافة/تعديل جهة الاتصال

**ملف جديد:** `src/components/contacts/ContactDrawer.tsx`

### الحقول:
| الحقل | النوع | مطلوب |
|-------|------|-------|
| الاسم | Input | ✅ |
| رقم الهاتف | Input (LTR) | ❌ |
| البريد الإلكتروني | Input | ❌ |
| النوع | Select | ✅ |
| ملاحظات | Textarea | ❌ |

### خيارات النوع:
```tsx
const CATEGORY_OPTIONS = [
  { value: 'appraiser', label: 'مخمن', icon: ClipboardCheck },
  { value: 'insurance_company', label: 'شركة تأمين', icon: Building2 },
  { value: 'garage', label: 'كراج', icon: Wrench },
  { value: 'other', label: 'أخرى', icon: Users },
];
```

---

## 5) تحديث App.tsx

إضافة المسار الجديد:
```tsx
import BusinessContacts from "./pages/BusinessContacts";

// في Routes
<Route path="/contacts" element={
  <ProtectedRoute>
    <BusinessContacts />
  </ProtectedRoute>
} />
```

---

## 6) تحديث Sidebar.tsx

إضافة الرابط في القائمة الجانبية:
```tsx
import { Contact } from "lucide-react";

// في getNavigation
{ name: "جهات الاتصال", href: "/contacts", icon: Contact },
```

---

## 7) ملخص الملفات

| الملف | الإجراء |
|-------|---------|
| `src/pages/BusinessContacts.tsx` | إنشاء جديد |
| `src/components/contacts/ContactDrawer.tsx` | إنشاء جديد |
| `src/App.tsx` | إضافة Route |
| `src/components/layout/Sidebar.tsx` | إضافة رابط |
| Database Migration | إنشاء جدول `business_contacts` |

---

## 8) التفاصيل التقنية

### نسخ رقم الهاتف:
```tsx
const handleCopy = async (phone: string) => {
  await navigator.clipboard.writeText(phone);
  toast.success('تم نسخ الرقم');
};
```

### أيقونات الأنواع والألوان:
```tsx
const getCategoryInfo = (category: string) => {
  switch (category) {
    case 'appraiser':
      return { label: 'مخمن', color: 'bg-blue-100 text-blue-700', icon: ClipboardCheck };
    case 'insurance_company':
      return { label: 'شركة تأمين', color: 'bg-green-100 text-green-700', icon: Building2 };
    case 'garage':
      return { label: 'كراج', color: 'bg-orange-100 text-orange-700', icon: Wrench };
    default:
      return { label: 'أخرى', color: 'bg-gray-100 text-gray-700', icon: Users };
  }
};
```

### البحث مع Debounce:
```tsx
const [searchQuery, setSearchQuery] = useState("");
const debouncedSearch = useMemo(
  () => debounce((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, 300),
  []
);
```

---

## النتيجة المتوقعة

- صفحة جديدة `/contacts` لإدارة جهات الاتصال
- تصميم بطاقات أنيق ومتجاوب
- بحث سريع وفلترة حسب النوع
- اتصال مباشر باستخدام نظام Click2Call الموجود
- نسخ أرقام الهاتف بضغطة واحدة
- إضافة، تعديل، وحذف جهات الاتصال

