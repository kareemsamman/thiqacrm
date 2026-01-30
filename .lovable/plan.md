
# خطة: تتبع جلسات المستخدمين ومدة النشاط

## نظرة عامة
إضافة تبويب جديد في صفحة "المستخدمون" لعرض سجل جلسات الموظفين مع بيانات تفصيلية تشمل: عنوان IP، المتصفح، الموقع، ومدة الجلسة (ساعات ودقائق).

---

## الجزء الأول: إنشاء جدول جلسات المستخدمين

**جدول جديد:** `user_sessions`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المفتاح الأساسي |
| user_id | uuid | FK للمستخدم |
| started_at | timestamp | وقت بدء الجلسة |
| ended_at | timestamp | وقت انتهاء الجلسة (nullable) |
| ip_address | text | عنوان IP |
| user_agent | text | معلومات المتصفح الكاملة |
| browser_name | text | اسم المتصفح (Chrome, Firefox, Safari...) |
| browser_version | text | إصدار المتصفح |
| os_name | text | نظام التشغيل |
| device_type | text | نوع الجهاز (desktop, mobile, tablet) |
| country | text | البلد (من IP) |
| city | text | المدينة (من IP) |
| is_active | boolean | هل الجلسة نشطة حالياً |

```sql
CREATE TABLE public.user_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamp with time zone DEFAULT now() NOT NULL,
  ended_at timestamp with time zone,
  duration_minutes integer GENERATED ALWAYS AS (
    CASE WHEN ended_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (ended_at - started_at)) / 60
    ELSE NULL END
  ) STORED,
  ip_address text,
  user_agent text,
  browser_name text,
  browser_version text,
  os_name text,
  device_type text,
  country text,
  city text,
  is_active boolean DEFAULT true
);

-- Enable RLS - Admin only
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view user sessions"
  ON public.user_sessions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR auth.jwt() ->> 'email' = 'morshed500@gmail.com');

-- Indexes
CREATE INDEX idx_user_sessions_user ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_started ON public.user_sessions(started_at DESC);
```

---

## الجزء الثاني: تحديث Edge Functions لجمع البيانات

### 1) تحديث `auth-email-start` و `auth-sms-start`
إضافة جمع IP وUser-Agent من الـ request headers:

```typescript
// Get IP and User-Agent from request
const ip_address = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
  || req.headers.get("cf-connecting-ip") 
  || req.headers.get("x-real-ip")
  || null;
const user_agent = req.headers.get("user-agent") || null;

// Update login_attempts insert
supabase.from("login_attempts").insert({
  email: normalizedEmail,
  identifier: normalizedEmail,
  method: "email_otp",
  success: false,
  ip_address,
  user_agent,
});
```

### 2) تحديث `auth-email-verify` و `auth-sms-verify`
عند نجاح تسجيل الدخول، إنشاء جلسة جديدة:

```typescript
// Parse user agent for browser/OS info
function parseUserAgent(ua: string) {
  const browsers = [
    { name: 'Chrome', pattern: /Chrome\/(\d+)/ },
    { name: 'Firefox', pattern: /Firefox\/(\d+)/ },
    { name: 'Safari', pattern: /Safari\/(\d+)/ },
    { name: 'Edge', pattern: /Edg\/(\d+)/ },
  ];
  // ... parsing logic
}

// On successful login, create session
await supabase.from("user_sessions").insert({
  user_id: userId,
  ip_address,
  user_agent,
  browser_name,
  browser_version,
  os_name,
  device_type,
  // country/city can be fetched from IP geolocation API
});
```

---

## الجزء الثالث: تتبع انتهاء الجلسة (Frontend)

### 1) إنشاء Hook جديد: `src/hooks/useSessionTracker.tsx`

يستخدم `beforeunload` و `visibilitychange` لتتبع إغلاق الصفحة:

```typescript
export function useSessionTracker() {
  const { user } = useAuth();
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;

    // Start session on mount
    const startSession = async () => {
      const { data } = await supabase
        .from('user_sessions')
        .insert({
          user_id: user.id,
          ip_address: await getClientIP(),
          user_agent: navigator.userAgent,
          browser_name: getBrowserName(),
          // ... other fields
        })
        .select('id')
        .single();
      
      if (data) sessionIdRef.current = data.id;
    };

    // End session on unmount/close
    const endSession = () => {
      if (sessionIdRef.current) {
        navigator.sendBeacon(
          `${SUPABASE_URL}/rest/v1/user_sessions?id=eq.${sessionIdRef.current}`,
          JSON.stringify({ 
            ended_at: new Date().toISOString(),
            is_active: false 
          })
        );
      }
    };

    startSession();
    window.addEventListener('beforeunload', endSession);
    
    return () => {
      endSession();
      window.removeEventListener('beforeunload', endSession);
    };
  }, [user]);
}
```

### 2) إضافة الـ Hook في `App.tsx`

```tsx
function AppContent() {
  useSessionTracker(); // Track user sessions
  return <Routes>...</Routes>;
}
```

---

## الجزء الرابع: تحديث صفحة AdminUsers

### 1) إضافة تبويب "سجل الجلسات"

```tsx
<TabsList className="grid w-full max-w-lg grid-cols-4">
  <TabsTrigger value="pending">معلق</TabsTrigger>
  <TabsTrigger value="active">نشط</TabsTrigger>
  <TabsTrigger value="blocked">محظور</TabsTrigger>
  <TabsTrigger value="sessions">سجل الجلسات</TabsTrigger>
</TabsList>
```

### 2) فلاتر التاريخ

```tsx
<div className="flex gap-4 items-center">
  <Select value={filterPeriod} onValueChange={setFilterPeriod}>
    <SelectTrigger className="w-40">
      <SelectValue placeholder="الفترة" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="today">اليوم</SelectItem>
      <SelectItem value="week">هذا الأسبوع</SelectItem>
      <SelectItem value="month">هذا الشهر</SelectItem>
      <SelectItem value="year">هذه السنة</SelectItem>
      <SelectItem value="custom">تاريخ مخصص</SelectItem>
    </SelectContent>
  </Select>
  
  {filterPeriod === 'custom' && (
    <>
      <Input type="date" value={startDate} onChange={...} />
      <Input type="date" value={endDate} onChange={...} />
    </>
  )}
</div>
```

### 3) جدول سجل الجلسات

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ المستخدم      │ الوقت         │ المدة      │ المتصفح  │ IP          │ الموقع  │
├──────────────────────────────────────────────────────────────────────────────┤
│ أحمد محمد     │ 14:30 2026/01/30 │ 2س 45د   │ Chrome  │ 192.168.1.1 │ تل أبيب │
│ رغدة          │ 10:15 2026/01/30 │ 4س 10د   │ Safari  │ 10.0.0.5    │ حيفا    │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4) عرض المدة بشكل مقروء

```typescript
const formatDuration = (minutes: number | null) => {
  if (!minutes) return 'نشط حالياً';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours > 0) {
    return `${hours}س ${mins}د`;
  }
  return `${mins}د`;
};
```

---

## الجزء الخامس: تحديث login_attempts بالبيانات

### تحديث Edge Functions لجمع IP

```typescript
// في auth-email-start, auth-sms-start, auth-email-verify, auth-sms-verify
const getClientInfo = (req: Request) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("cf-connecting-ip")
    || req.headers.get("x-real-ip")
    || 'unknown';
  
  const userAgent = req.headers.get("user-agent") || '';
  
  return { ip, userAgent };
};

// استخدام في الإدخال
const { ip, userAgent } = getClientInfo(req);

supabase.from("login_attempts").insert({
  email: normalizedEmail,
  ip_address: ip,
  user_agent: userAgent,
  method: "email_otp",
  success: false,
});
```

---

## ملخص الملفات

| الملف | الإجراء |
|-------|---------|
| Database Migration | إنشاء جدول `user_sessions` |
| `supabase/functions/auth-email-start/index.ts` | إضافة جمع IP و User-Agent |
| `supabase/functions/auth-sms-start/index.ts` | إضافة جمع IP و User-Agent |
| `supabase/functions/auth-email-verify/index.ts` | إنشاء جلسة عند النجاح |
| `supabase/functions/auth-sms-verify/index.ts` | إنشاء جلسة عند النجاح |
| `src/hooks/useSessionTracker.tsx` | إنشاء جديد - تتبع الجلسات |
| `src/App.tsx` | إضافة useSessionTracker |
| `src/pages/AdminUsers.tsx` | إضافة تبويب سجل الجلسات مع الفلاتر |

---

## الميزات النهائية

1. **تسجيل IP والمتصفح** - تلقائي عند كل محاولة دخول
2. **تتبع مدة الجلسة** - من لحظة الدخول حتى إغلاق المتصفح
3. **فلترة بالتاريخ** - يوم، أسبوع، شهر، سنة، أو تاريخ مخصص
4. **عرض المتصفح والجهاز** - Chrome, Firefox, Safari + نوع الجهاز
5. **عرض الموقع** - البلد والمدينة (من IP geolocation)
6. **إحصائيات** - إجمالي ساعات العمل لكل موظف

---

## ملاحظات تقنية

### جمع IP في Edge Functions:
- `x-forwarded-for`: العنوان الأصلي خلف proxy
- `cf-connecting-ip`: من Cloudflare
- `x-real-ip`: من nginx/load balancer

### تتبع إغلاق المتصفح:
- `navigator.sendBeacon()` - يضمن إرسال الطلب حتى عند الإغلاق
- `beforeunload` event - يُطلق عند إغلاق التبويب

### Geolocation من IP:
- يمكن استخدام خدمة مجانية مثل `ip-api.com`
- أو تخزين قاعدة بيانات GeoIP محلياً
