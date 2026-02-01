
# خطة: إضافة أداة مسح أرقام البوليصة (POL-)

## المشكلة

توجد **4,671 وثيقة** تحتوي على أرقام بوليصة خاطئة بالنمط `POL-XXXX-XXXX` مثل:
- `POL-2024-105`
- `POL-2025-5078`
- `POL-1970-2676`

هذه الأرقام تم إنشاؤها تلقائياً بشكل خاطئ ويجب مسحها (تفريغها) لأن رقم البوليصة الحقيقي يأتي من شركة التأمين.

---

## الحل المقترح

إضافة أداة صيانة جديدة في صفحة `/admin/wordpress-import` ضمن تبويب "الأدوات" تقوم بـ:

1. **جلب عدد الوثائق المتأثرة** عند تحميل الصفحة
2. **عرض العدد** في badge ملونة
3. **زر لتنفيذ المسح** بشكل دفعات (batches) لتجنب timeout
4. **شريط تقدم** أثناء العملية
5. **عرض النتائج** بعد الانتهاء

---

## التغييرات المطلوبة

### ملف واحد فقط: `src/pages/WordPressImport.tsx`

#### 1) إضافة State جديدة

```typescript
// Clear POL- policy numbers state
const [clearingPolNumbers, setClearingPolNumbers] = useState(false);
const [polNumbersCount, setPolNumbersCount] = useState<number | null>(null);
const [polNumbersClearStats, setPolNumbersClearStats] = useState<{
  found: number;
  cleared: number;
  errors: string[];
} | null>(null);
```

#### 2) دالة جلب العدد

```typescript
const fetchPolNumbersCount = async () => {
  try {
    // Count policies with POL- prefix
    const { count, error } = await supabase
      .from('policies')
      .select('id', { count: 'exact', head: true })
      .like('policy_number', 'POL-%');
    
    if (error) throw error;
    setPolNumbersCount(count || 0);
  } catch (e) {
    console.error('Error fetching POL- count:', e);
  }
};
```

#### 3) دالة المسح (بدفعات)

```typescript
const handleClearPolNumbers = async () => {
  setClearingPolNumbers(true);
  setPolNumbersClearStats(null);
  
  const stats = { found: 0, cleared: 0, errors: [] as string[] };
  
  try {
    // 1. Fetch ALL policy IDs with POL- prefix using pagination
    const allPolicyIds: string[] = [];
    let offset = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data: batch, error } = await supabase
        .from('policies')
        .select('id')
        .like('policy_number', 'POL-%')
        .range(offset, offset + pageSize - 1);
      
      if (error) throw error;
      if (!batch || batch.length === 0) break;
      
      allPolicyIds.push(...batch.map(p => p.id));
      if (batch.length < pageSize) break;
      offset += pageSize;
    }
    
    stats.found = allPolicyIds.length;
    
    if (stats.found === 0) {
      toast({ title: "لا توجد وثائق", description: "لم يتم العثور على أرقام POL-" });
      setClearingPolNumbers(false);
      return;
    }
    
    // 2. Clear policy_number in batches
    const batchSize = 100;
    for (let i = 0; i < allPolicyIds.length; i += batchSize) {
      const chunk = allPolicyIds.slice(i, i + batchSize);
      
      const { error: updateError } = await supabase
        .from('policies')
        .update({ policy_number: null })
        .in('id', chunk);
      
      if (updateError) {
        stats.errors.push(`دفعة ${i + 1}-${i + chunk.length}: ${updateError.message}`);
      } else {
        stats.cleared += chunk.length;
      }
    }
    
    toast({
      title: "تم المسح",
      description: `تم مسح ${stats.cleared} رقم بوليصة من أصل ${stats.found}`,
    });
    
    // Refresh count
    fetchPolNumbersCount();
    
  } catch (e: any) {
    stats.errors.push(e.message);
    toast({ title: "خطأ", description: e.message, variant: "destructive" });
  } finally {
    setPolNumbersClearStats(stats);
    setClearingPolNumbers(false);
  }
};
```

#### 4) استدعاء جلب العدد عند التحميل

```typescript
useEffect(() => {
  fetchUnpaidElzamiCount();
  fetchPolNumbersCount();  // إضافة هذا السطر
}, []);
```

#### 5) إضافة واجهة المستخدم (بعد بطاقة Fix ELZAMI)

```tsx
{/* Clear POL- Policy Numbers Tool */}
<Card className="border-2 border-red-500">
  <CardHeader>
    <CardTitle className="flex items-center gap-2 text-red-600">
      <Trash2 className="h-5 w-5" />
      مسح أرقام البوليصة (POL-)
    </CardTitle>
    <CardDescription>
      يقوم بمسح أرقام البوليصة التي تبدأ بـ POL- لأنها أرقام خاطئة.
      <br />
      رقم البوليصة الصحيح يأتي من شركة التأمين.
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Show count */}
    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <div className="flex items-center justify-between">
        <span className="text-sm">وثائق تحتوي أرقام POL-:</span>
        <Badge variant={polNumbersCount && polNumbersCount > 0 ? "destructive" : "secondary"}>
          {polNumbersCount !== null ? polNumbersCount.toLocaleString() : '...'}
        </Badge>
      </div>
    </div>

    <div className="flex items-center gap-2">
      <Button 
        onClick={handleClearPolNumbers} 
        disabled={clearingPolNumbers || polNumbersCount === 0}
        variant="destructive"
      >
        {clearingPolNumbers ? (
          <><Loader2 className="h-4 w-4 ml-2 animate-spin" />جاري المسح...</>
        ) : (
          <><Trash2 className="h-4 w-4 ml-2" />مسح الأرقام</>
        )}
      </Button>
      
      <Button 
        variant="outline" 
        onClick={fetchPolNumbersCount}
        disabled={clearingPolNumbers}
      >
        <RefreshCw className="h-4 w-4 ml-2" />
        تحديث العدد
      </Button>
    </div>

    {/* Results */}
    {polNumbersClearStats && (
      <div className="p-4 border rounded-lg space-y-2 bg-muted">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-sm text-muted-foreground">وثائق تم العثور عليها</p>
            <p className="text-2xl font-bold">{polNumbersClearStats.found.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">تم مسحها</p>
            <p className="text-2xl font-bold text-green-600">{polNumbersClearStats.cleared.toLocaleString()}</p>
          </div>
        </div>
        {polNumbersClearStats.errors.length > 0 && (
          <div className="text-sm text-destructive">
            <p className="font-medium">أخطاء ({polNumbersClearStats.errors.length}):</p>
            <ScrollArea className="h-24 mt-1">
              {polNumbersClearStats.errors.map((err, i) => (
                <p key={i} className="text-xs">{err}</p>
              ))}
            </ScrollArea>
          </div>
        )}
      </div>
    )}
  </CardContent>
</Card>
```

---

## ملخص التغييرات

| الملف | التغيير |
|-------|---------|
| `src/pages/WordPressImport.tsx` | إضافة state + دوال + واجهة مستخدم للأداة الجديدة |

---

## كيف تعمل الأداة

1. عند تحميل الصفحة → يجلب عدد الوثائق التي تحتوي `POL-%`
2. يعرض العدد: **4,671**
3. عند الضغط على "مسح الأرقام":
   - يجلب جميع IDs بطريقة paginated (1000 كل مرة)
   - يحدّث بدفعات 100 وثيقة
   - يضع `policy_number = null`
4. يعرض النتائج ويحدّث العدد

---

## النتيجة المتوقعة

- ✅ جميع الوثائق الـ 4,671 ستُمسح منها أرقام POL-
- ✅ حقل `policy_number` سيصبح فارغاً
- ✅ يمكن إعادة إدخال رقم البوليصة الصحيح من شركة التأمين
