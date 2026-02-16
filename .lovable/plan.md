

# إصلاح عرض نوع التأمين "ثالث/شامل" → "ثالث" أو "شامل"

## المشكلة
157 وثيقة في النظام نوعها `THIRD_FULL` لكن بدون تحديد النوع الفرعي (`policy_type_child` = NULL). معظمها مستوردة من WordPress بدون تحديد إذا كانت "ثالث" أو "شامل". النتيجة: يظهر "طرف ثالث / شامل" بدل "ثالث" أو "شامل".

## الحل

### 1. تصحيح البيانات (SQL Migration)
تحديث الـ 157 وثيقة تلقائياً بناءً على قيمة السيارة:
- إذا `car_value > 0` → النوع `FULL` (شامل) - 45 وثيقة
- إذا `car_value` فارغ أو 0 → النوع `THIRD` (ثالث) - 112 وثيقة

```text
UPDATE policies p
SET policy_type_child = 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM cars c 
      WHERE c.id = p.car_id AND c.car_value IS NOT NULL AND c.car_value > 0
    ) THEN 'FULL'
    ELSE 'THIRD'
  END
WHERE p.policy_type_parent = 'THIRD_FULL' 
  AND p.policy_type_child IS NULL;
```

### 2. منع المشكلة مستقبلاً (SQL Migration)
إضافة trigger يمنع إدخال وثيقة `THIRD_FULL` بدون تحديد النوع الفرعي:

```text
CREATE OR REPLACE FUNCTION enforce_third_full_child_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.policy_type_parent = 'THIRD_FULL' 
     AND (NEW.policy_type_child IS NULL OR NEW.policy_type_child = '') THEN
    NEW.policy_type_child := 'THIRD';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_third_full_child
BEFORE INSERT OR UPDATE ON policies
FOR EACH ROW EXECUTE FUNCTION enforce_third_full_child_type();
```

### 3. لا تغيير في الكود
منطق العرض في الكود صحيح: يعرض النوع الفرعي (ثالث/شامل) عندما يكون موجوداً. المشكلة فقط في البيانات الفارغة.

## النتيجة
- كل الوثائق ستعرض "ثالث" أو "شامل" بدل "طرف ثالث / شامل"
- وثائق مستقبلية بدون child type ستأخذ "THIRD" تلقائياً
