

# خطة: تحسين تصميم فلتر السيارات

## المشكلة الحالية

1. لوحات السيارة تبدو مزدحمة وغير واضحة
2. الشارات (badges) متداخلة وصعبة القراءة
3. التصميم غير متناسق مع باقي الواجهة

---

## التصميم الجديد المقترح

### الشكل المحسّن:

```text
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│  ┌─────────────────┐    ┌──────────────────────────────┐                  │
│  │  🚗 كل السيارات  │    │  55-722-52                   │                  │
│  │  5 سارية من 8   │    │  Audi • 2018                 │                  │
│  │                 │    │  ● 3 سارية  ○ 5 إجمالي      │                  │
│  └─────────────────┘    └──────────────────────────────┘                  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## التغييرات التصميمية

### 1. إزالة شكل لوحة السيارة المعقد
- استبداله ببطاقات أنيقة موحدة مع باقي النظام
- خلفية بيضاء مع حدود ناعمة

### 2. عرض المعلومات بشكل منظم
- **السطر الأول**: رقم السيارة بخط واضح
- **السطر الثاني**: الشركة المصنعة + السنة
- **السطر الثالث**: عدد الوثائق (سارية / إجمالي)

### 3. مؤشرات بصرية واضحة
- نقطة خضراء للوثائق السارية
- نقطة رمادية للإجمالي
- حدود ملونة عند التحديد

---

## الكود المحدث

### الهيكل الجديد لكل بطاقة سيارة:

```tsx
<button className="group relative flex flex-col gap-1.5 p-3 rounded-xl 
  border-2 bg-card/80 backdrop-blur-sm transition-all duration-200
  hover:shadow-md hover:border-primary/30
  [selected]: border-primary bg-primary/5 shadow-lg">
  
  {/* رقم السيارة */}
  <div className="flex items-center gap-2">
    <span className="text-base font-bold ltr-nums">55-722-52</span>
    {selectedCarId === car.id && <Check className="h-4 w-4 text-primary" />}
  </div>
  
  {/* الشركة المصنعة + السنة */}
  <div className="flex items-center gap-2 text-xs text-muted-foreground">
    <span>Audi</span>
    <span className="ltr-nums">2018</span>
  </div>
  
  {/* عداد الوثائق */}
  <div className="flex items-center gap-3 text-xs">
    <div className="flex items-center gap-1">
      <div className="h-2 w-2 rounded-full bg-success" />
      <span className="font-medium ltr-nums">{activePolicyCount}</span>
      <span className="text-muted-foreground">سارية</span>
    </div>
    {policyCount > activePolicyCount && (
      <div className="flex items-center gap-1 text-muted-foreground">
        <div className="h-2 w-2 rounded-full bg-muted" />
        <span className="ltr-nums">{policyCount}</span>
        <span>إجمالي</span>
      </div>
    )}
  </div>
</button>
```

---

## مميزات التصميم الجديد

| الميزة | التصميم القديم | التصميم الجديد |
|--------|---------------|----------------|
| الوضوح | شارات متداخلة | معلومات مرتبة |
| التناسق | شكل لوحة مختلف | بطاقات موحدة |
| سهولة القراءة | صعب | سهل جداً |
| المساحة | مضغوطة | مريحة |
| المؤشرات | أرقام فقط | نقاط ملونة + أرقام |

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/clients/CarFilterChips.tsx` | إعادة تصميم البطاقات بالكامل |

---

## النتيجة المتوقعة

1. ✅ تصميم نظيف ومتناسق مع باقي النظام
2. ✅ معلومات واضحة وسهلة القراءة
3. ✅ مؤشرات بصرية للوثائق السارية والإجمالية
4. ✅ تجربة مستخدم محسّنة

