
# خطة: إصلاح تتبع الجلسات + تحسين القائمة الجانبية

## نظرة عامة
هناك مشكلتان رئيسيتان:
1. **الجلسات لا تظهر** - الاستعلام يستخدم foreign key خاطئ
2. **القائمة الجانبية غير منظمة** - تحتاج إعادة ترتيب مع مجموعات واضحة

---

## الجزء الأول: إصلاح تتبع الجلسات

### المشكلة الحالية:
البيانات **موجودة** في قاعدة البيانات (3 جلسات مسجلة)، لكن الاستعلام فاشل لأنه يستخدم:
```typescript
profile:profiles!user_sessions_user_id_fkey(full_name, email)
```
هذا خاطئ لأن `user_sessions.user_id` يشير إلى `auth.users(id)` وليس `profiles(id)`.

### الإصلاحات المطلوبة:

**1) تعديل `UserSessionsTab.tsx`:**
تغيير الاستعلام ليستخدم العلاقة الصحيحة:
```typescript
const { data, error } = await supabase
  .from('user_sessions')
  .select(`
    *,
    profile:profiles(full_name, email)
  `)
  .gte('started_at', start.toISOString())
  .lte('started_at', end.toISOString())
  .order('started_at', { ascending: false })
  .limit(100);
```

**2) إضافة foreign key في قاعدة البيانات (اختياري):**
```sql
-- Create FK from user_sessions to profiles
ALTER TABLE public.user_sessions 
ADD CONSTRAINT user_sessions_user_id_profiles_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id);
```

**3) ملء IP Address:**
حالياً IP فارغ لأن الـ frontend لا يمكنه الحصول على IP الحقيقي. الحل: استخدام خدمة API:
```typescript
// في useSessionTracker.tsx
const getClientIP = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return null;
  }
};
```

---

## الجزء الثاني: تحسين القائمة الجانبية

### الهيكل الجديد المقترح:

```text
┌─────────────────────────────────────┐
│  AB تأمين                           │
├─────────────────────────────────────┤
│ ▼ الرئيسية                          │
│    • لوحة التحكم                    │
│    • المهام                         │
│    • التنبيهات                      │
├─────────────────────────────────────┤
│ ▼ إدارة العملاء                     │
│    • العملاء                        │
│    • السيارات                       │
│    • الوثائق                        │
│    • جهات الاتصال                   │
├─────────────────────────────────────┤
│ ▼ المالية                     (أدمن)│
│    • الشيكات                        │
│    • متابعة الديون                  │
│    • شركات التأمين            (أدمن)│
│    • الوسطاء                  (أدمن)│
│    • المصاريف                 (أدمن)│
├─────────────────────────────────────┤
│ ▼ التقارير                          │
│    • تقارير الوثائق                 │
│    • تقرير الشركات            (أدمن)│
│    • التقارير المالية         (أدمن)│
├─────────────────────────────────────┤
│ ▼ بلاغات وحوادث                     │
│    • بلاغات الحوادث                 │
│    • المطالبات               (أدمن)│
├─────────────────────────────────────┤
│ ▼ أخرى                              │
│    • الوسائط                        │
├─────────────────────────────────────┤
│ ▼ الإعدادات                   (أدمن)│
│    • المستخدمون                     │
│    • SMS تسويقية                    │
│    • أنواع التأمين                  │
│    • خدمات الطريق                   │
│    • إعفاء رسوم الحادث              │
│    • قوالب الفواتير                 │
│    • توقيعات العملاء                │
│    • إعدادات الدفع                  │
│    • إعدادات SMS                    │
│    • إعدادات المصادقة               │
│    • سجل الرسائل                    │
│    • استيراد WordPress              │
│    • إعلانات النظام     (سوبر أدمن)│
└─────────────────────────────────────┘
```

### التنفيذ:

**1) تعديل `Sidebar.tsx`:**

إنشاء هيكل مجموعات قابل للطي:

```typescript
interface NavGroup {
  name: string;
  items: NavItem[];
  adminOnly?: boolean;
  defaultOpen?: boolean;
}

const navigationGroups: NavGroup[] = [
  {
    name: "الرئيسية",
    defaultOpen: true,
    items: [
      { name: "لوحة التحكم", href: "/", icon: LayoutDashboard },
      { name: "المهام", href: "/tasks", icon: ListTodo },
      { name: "التنبيهات", href: "/notifications", icon: Bell },
    ]
  },
  {
    name: "إدارة العملاء",
    items: [
      { name: "العملاء", href: "/clients", icon: Users },
      { name: "السيارات", href: "/cars", icon: Car },
      { name: "الوثائق", href: "/policies", icon: FileText },
      { name: "جهات الاتصال", href: "/contacts", icon: Contact },
    ]
  },
  {
    name: "المالية",
    items: [
      { name: "الشيكات", href: "/cheques", icon: CreditCard },
      { name: "متابعة الديون", href: "/debt-tracking", icon: DollarSign },
      { name: "شركات التأمين", href: "/companies", icon: Building2, adminOnly: true },
      { name: "الوسطاء", href: "/brokers", icon: Wallet, adminOnly: true },
      { name: "المصاريف", href: "/expenses", icon: DollarSign, adminOnly: true },
    ]
  },
  {
    name: "التقارير",
    items: [
      { name: "تقارير الوثائق", href: "/reports/policies", icon: BarChart3 },
      { name: "تقرير الشركات", href: "/reports/company-settlement", icon: BarChart3, adminOnly: true },
      { name: "التقارير المالية", href: "/reports/financial", icon: Wallet, adminOnly: true },
    ]
  },
  {
    name: "بلاغات وحوادث",
    items: [
      { name: "بلاغات الحوادث", href: "/accidents", icon: AlertTriangle },
      { name: "المطالبات", href: "/admin/claims", icon: FileWarning, adminOnly: true },
    ]
  },
  {
    name: "أخرى",
    items: [
      { name: "الوسائط", href: "/media", icon: Image },
    ]
  },
  {
    name: "الإعدادات",
    adminOnly: true,
    items: [
      { name: "المستخدمون", href: "/admin/users", icon: UserCog },
      { name: "SMS تسويقية", href: "/admin/marketing-sms", icon: Megaphone },
      { name: "أنواع التأمين", href: "/admin/insurance-categories", icon: FileText },
      { name: "خدمات الطريق", href: "/admin/road-services", icon: Truck },
      { name: "إعفاء رسوم الحادث", href: "/admin/accident-fee-services", icon: Shield },
      { name: "قوالب الفواتير", href: "/admin/invoice-templates", icon: FileText },
      { name: "توقيعات العملاء", href: "/admin/customer-signatures", icon: FileSignature },
      { name: "إعدادات الدفع", href: "/admin/payment-settings", icon: CreditCard },
      { name: "إعدادات SMS", href: "/admin/sms-settings", icon: MessageSquare },
      { name: "إعدادات المصادقة", href: "/admin/auth-settings", icon: Settings },
      { name: "سجل الرسائل", href: "/sms-history", icon: History },
      { name: "استيراد WordPress", href: "/admin/wordpress-import", icon: Upload },
    ]
  },
];
```

**2) استخدام Collapsible للمجموعات:**

```tsx
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

// لكل مجموعة
<Collapsible defaultOpen={group.defaultOpen || isGroupActive}>
  <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 rounded-lg">
    <span>{group.name}</span>
    <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
  </CollapsibleTrigger>
  <CollapsibleContent>
    {group.items.map(item => (
      // روابط التنقل
    ))}
  </CollapsibleContent>
</Collapsible>
```

**3) إخفاء العناصر حسب الصلاحيات:**

```tsx
// فلترة المجموعات والعناصر
const filteredGroups = navigationGroups
  .filter(group => !group.adminOnly || isAdmin)
  .map(group => ({
    ...group,
    items: group.items.filter(item => !item.adminOnly || isAdmin)
  }))
  .filter(group => group.items.length > 0);
```

---

## ملخص الملفات المطلوب تعديلها

| الملف | التعديل |
|-------|---------|
| `src/components/admin/UserSessionsTab.tsx` | إصلاح استعلام الـ profiles |
| `src/hooks/useSessionTracker.tsx` | إضافة جلب IP من API |
| `src/components/layout/Sidebar.tsx` | إعادة هيكلة مع مجموعات قابلة للطي |
| Database Migration | إضافة FK من user_sessions إلى profiles |

---

## النتيجة المتوقعة

1. **الجلسات ستظهر** - مع اسم المستخدم والبيانات الكاملة
2. **IP سيُملأ** - من خدمة خارجية
3. **قائمة منظمة** - مجموعات واضحة مع إمكانية الطي
4. **صلاحيات محترمة** - العامل يرى فقط ما يحتاجه

