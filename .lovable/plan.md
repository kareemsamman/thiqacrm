
# خطة: إضافة بحث سريع للتنقل بين الصفحات (Command Palette)

## الهدف
إضافة مكون بحث سريع (Command Palette) يتيح البحث عن أسماء الصفحات بالعربية مع إكمال تلقائي، ويمكن فتحه من الـ Header.

---

## التصميم المقترح

### تجربة المستخدم:
1. زر بحث جديد في Header بجانب البحث عن الوثائق
2. اختصار لوحة مفاتيح: `Ctrl+/` أو `⌘/` لفتحه بسرعة
3. عند الكتابة → تظهر الصفحات المتطابقة مع الاسم
4. الضغط على Enter أو النقر → ينتقل للصفحة
5. يراعي صلاحيات المستخدم (Admin/Worker)

---

## التعديلات المطلوبة

### 1) مكون جديد: `NavigationSearch.tsx`
**ملف:** `src/components/layout/NavigationSearch.tsx`

**الميزات:**
- يستخدم مكون `Command` من `cmdk` الموجود
- يستورد قائمة الصفحات من `Sidebar.tsx`
- يُظهر الصفحات مجمّعة حسب المجموعات
- فلترة تلقائية أثناء الكتابة
- أيقونة لكل صفحة
- عند الاختيار → `navigate()` للصفحة

**المنطق:**
```typescript
// فلترة حسب الصلاحيات
const filteredPages = navigationGroups
  .filter(group => !group.adminOnly || isAdmin)
  .flatMap(group => group.items)
  .filter(item => {
    if (item.superAdminOnly && !isSuperAdmin) return false;
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

// البحث في الاسم
const results = filteredPages.filter(page =>
  page.name.includes(searchQuery)
);
```

### 2) تحديث Header
**ملف:** `src/components/layout/Header.tsx`

**التعديلات:**
- إضافة زر بحث الصفحات
- إضافة state لفتح/إغلاق NavigationSearch
- إضافة مستمع للاختصار `Ctrl+/`

```tsx
// زر جديد
<Button variant="ghost" size="icon" onClick={() => setNavSearchOpen(true)}>
  <FileSearch className="h-4 w-4" />
</Button>

// اختصار لوحة المفاتيح
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === '/') {
      e.preventDefault();
      setNavSearchOpen(true);
    }
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}, []);
```

### 3) تصدير قائمة الصفحات
**ملف:** `src/components/layout/Sidebar.tsx`

**التعديل:**
- تصدير `navigationGroups` ليمكن استخدامه في NavigationSearch

```typescript
// تغيير من:
const navigationGroups: NavGroup[] = [...]

// إلى:
export const navigationGroups: NavGroup[] = [...]
```

---

## هيكل المكون الجديد

```text
┌─────────────────────────────────────────────┐
│  🔍 ابحث عن صفحة...                        │
├─────────────────────────────────────────────┤
│                                             │
│  الرئيسية                                   │
│  ├── 📊 لوحة التحكم                        │
│  ├── ✅ المهام                             │
│  └── 🔔 التنبيهات                          │
│                                             │
│  إدارة العملاء                              │
│  ├── 👥 العملاء                            │
│  ├── 🚗 السيارات                           │
│  └── 📄 الوثائق                            │
│                                             │
│  ...                                        │
└─────────────────────────────────────────────┘
```

---

## الملفات المطلوبة

| الملف | النوع | الوصف |
|-------|-------|-------|
| `src/components/layout/NavigationSearch.tsx` | جديد | مكون البحث Command Palette |
| `src/components/layout/Sidebar.tsx` | تعديل | تصدير navigationGroups |
| `src/components/layout/Header.tsx` | تعديل | إضافة زر + اختصار + دمج المكون |

---

## التفاصيل التقنية

### اختصار لوحة المفاتيح:
- `⌘/` على Mac
- `Ctrl+/` على Windows/Linux

### الفلترة:
- البحث يكون في `item.name` باللغة العربية
- النتائج تُعرض مجمّعة حسب `group.name`
- يتم استبعاد الصفحات التي لا يملك المستخدم صلاحية الوصول إليها

### السلوك:
- فتح الـ Dialog عند الضغط على الزر أو الاختصار
- التنقل بين النتائج باستخدام ↑ ↓
- الانتقال بـ Enter أو النقر
- الإغلاق بـ Escape أو النقر خارج الـ Dialog
