
# خطة: Trigger لتحديث حالة التجديد تلقائياً

## الفكرة
عندما يتم إنشاء وثيقة جديدة لنفس **العميل + السيارة + نوع التأمين**، النظام يُحدّث الوثيقة القديمة تلقائياً إلى حالة **"renewed"** (تم التجديد).

## المنطق

```text
┌─────────────────────────────────────────────────────────────────┐
│  إنشاء وثيقة جديدة (INSERT on policies)                        │
│                                                                 │
│  ↓                                                              │
│                                                                 │
│  هل يوجد وثيقة قديمة بنفس:                                     │
│    - client_id (نفس العميل)                                    │
│    - car_id (نفس السيارة)                                      │
│    - policy_type_parent (نفس نوع التأمين)                      │
│    - end_date < NEW.start_date (انتهت قبل الجديدة)             │
│    - cancelled = false                                          │
│    - deleted_at IS NULL                                         │
│                                                                 │
│  ↓ نعم                                                         │
│                                                                 │
│  UPDATE policy_renewal_tracking                                 │
│    SET renewal_status = 'renewed'                               │
│    WHERE policy_id = old_policy.id                              │
│                                                                 │
│  أو INSERT إذا لم يكن هناك سجل tracking                        │
└─────────────────────────────────────────────────────────────────┘
```

## التنفيذ

### 1. إنشاء Function
```sql
CREATE OR REPLACE FUNCTION auto_mark_renewed_policies()
RETURNS TRIGGER AS $$
DECLARE
  v_old_policy_id UUID;
BEGIN
  -- Only process if this is a real policy (not cancelled, has client and car)
  IF NEW.cancelled = true OR NEW.deleted_at IS NOT NULL 
     OR NEW.client_id IS NULL OR NEW.car_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Find the most recent old policy for same client + car + type
  -- that ended before this new policy starts
  SELECT id INTO v_old_policy_id
  FROM policies
  WHERE client_id = NEW.client_id
    AND car_id = NEW.car_id
    AND policy_type_parent = NEW.policy_type_parent
    AND id != NEW.id
    AND cancelled = false
    AND deleted_at IS NULL
    AND end_date < NEW.start_date
  ORDER BY end_date DESC
  LIMIT 1;
  
  -- If found, mark the old policy as renewed
  IF v_old_policy_id IS NOT NULL THEN
    INSERT INTO policy_renewal_tracking (policy_id, renewal_status, updated_at)
    VALUES (v_old_policy_id, 'renewed', now())
    ON CONFLICT (policy_id) 
    DO UPDATE SET 
      renewal_status = 'renewed',
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. إنشاء Trigger
```sql
CREATE TRIGGER trg_auto_mark_renewed
  AFTER INSERT ON policies
  FOR EACH ROW
  EXECUTE FUNCTION auto_mark_renewed_policies();
```

### 3. تشغيل على الوثائق الموجودة (مرة واحدة)
لتحديث البيانات القديمة التي لم يتم تتبعها:
```sql
-- Mark existing policies that have been renewed
INSERT INTO policy_renewal_tracking (policy_id, renewal_status, updated_at)
SELECT DISTINCT ON (old_p.id) old_p.id, 'renewed', now()
FROM policies old_p
WHERE EXISTS (
  SELECT 1 FROM policies new_p
  WHERE new_p.client_id = old_p.client_id
    AND new_p.car_id = old_p.car_id
    AND new_p.policy_type_parent = old_p.policy_type_parent
    AND new_p.id != old_p.id
    AND new_p.cancelled = false
    AND new_p.deleted_at IS NULL
    AND new_p.start_date > old_p.end_date
)
AND old_p.cancelled = false
AND old_p.deleted_at IS NULL
ON CONFLICT (policy_id) 
DO UPDATE SET 
  renewal_status = 'renewed',
  updated_at = now()
WHERE policy_renewal_tracking.renewal_status != 'renewed';
```

---

## السيناريو

**قبل:**
| العميل | السيارة | نوع التأمين | تاريخ الانتهاء | حالة التجديد |
|--------|---------|-------------|----------------|---------------|
| أحمد | 123-45-678 | חובה | 2026-01-15 | not_contacted |

**بعد إضافة وثيقة جديدة:**
| العميل | السيارة | نوع التأمين | تاريخ البدء | تاريخ الانتهاء |
|--------|---------|-------------|-------------|----------------|
| أحمد | 123-45-678 | חובה | 2026-01-16 | 2027-01-15 |

**النتيجة التلقائية:**
| العميل | السيارة | نوع التأمين | تاريخ الانتهاء | حالة التجديد |
|--------|---------|-------------|----------------|---------------|
| أحمد | 123-45-678 | חובה | 2026-01-15 | ✅ **renewed** |

---

## ما الذي يتم التحقق منه؟

| الشرط | السبب |
|-------|-------|
| `client_id` متطابق | نفس العميل |
| `car_id` متطابق | نفس السيارة |
| `policy_type_parent` متطابق | نفس نوع التأمين (חובה, מקיף، إلخ) |
| `end_date < NEW.start_date` | الوثيقة القديمة انتهت قبل الجديدة |
| `cancelled = false` | ليست ملغاة |
| `deleted_at IS NULL` | ليست محذوفة |

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `supabase/migrations/NEW_*.sql` | إنشاء Function + Trigger + تحديث البيانات الموجودة |

---

## الاختبار بعد التنفيذ
1. افتح **تقارير الوثائق → التجديدات**
2. تأكد أن عداد "تم التجديد" يعرض الرقم الصحيح
3. أنشئ وثيقة جديدة لعميل لديه وثيقة منتهية → تأكد أن القديمة تتحول إلى "renewed"
