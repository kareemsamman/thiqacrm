
## ملخص سريع (ليش ما تغير شيء؟)
سبب “فشل في تحميل البيانات” في تبويب **التجديدات** داخل `/reports/policies` واضح من سجلات قاعدة البيانات:

- الصفحة تستدعي الدالة:  
  `public.report_renewals(date, date, text, uuid, text, integer, integer)`
- داخلها يوجد شرط:
  `p.policy_type_parent = p_policy_type`
- لكن `policy_type_parent` هو **ENUM** و `p_policy_type` هو **TEXT**  
  فينتج الخطأ:
  `operator does not exist: policy_type_parent = text`

المهم: سبق أن تم تعديل **نسخة ثانية مختلفة** من `report_renewals` (توقيع مختلف)، لذلك التجديدات لم تتحسن لأنها تستعمل Overload آخر.

---

## ما الذي سنفعله الآن (إصلاح دقيق لنفس الدوال المستخدمة في صفحة التجديدات)
سنقوم بعمل Migration واحدة فقط لتحديث **الدالتين الصحيحين** (المستعملة في التبويب + التصدير):

1) **إصلاح الدالة المستخدمة في تبويب التجديدات**
- الدالة المستهدفة بالضبط:
  `report_renewals(p_start_date date, p_end_date date, p_policy_type text, p_created_by uuid, p_search text, p_page_size int, p_page int)`
- التعديل:
  - تحويل `p_policy_type` إلى ENUM مرة واحدة داخل الدالة:
    - `v_policy_type public.policy_type_parent := NULLIF(p_policy_type,'')::public.policy_type_parent;`
  - استبدال الشرط:
    - من: `p.policy_type_parent = p_policy_type`
    - إلى: `p.policy_type_parent = v_policy_type`
  - (تحسين ثبات النوع) جعل التجميع يرجع `text[]` صراحة:
    - `ARRAY_AGG(DISTINCT cp.policy_type_parent::text) ...`

2) **إصلاح الدالة المستخدمة في PDF (التصدير)**
- الدالة المستهدفة بالضبط:
  `report_renewals_service(p_end_month date, p_days_remaining int, p_policy_type text, p_limit int, p_offset int)`
- نفس الإصلاح:
  - `v_policy_type` كـ ENUM
  - مقارنة ENUM مع ENUM
  - `ARRAY_AGG(DISTINCT cp.policy_type_parent::text)` لضمان `text[]`

---

## (اختياري لكن أنصح به) منع الوصول العام لهذه التقارير
حاليًا صلاحية EXECUTE لهذه الدوال على **PUBLIC** (أي قد تكون متاحة لغير المسجلين حسب الإعدادات).
وبما أن التقارير تحتوي بيانات حساسة (أسماء/هواتف)، سنشددها:

- `REVOKE ALL ON FUNCTION ... FROM PUBLIC;`
- `REVOKE EXECUTE ON FUNCTION ... FROM anon;`
- `GRANT EXECUTE ON FUNCTION ... TO authenticated;`

هذا لن يغير تجربة المستخدم داخل النظام (لأنه أصلًا يحتاج تسجيل دخول)، لكنه يحمي البيانات.

---

## طريقة التحقق بعد التطبيق (Zero guessing)
بعد الـ Migration سنجري تحققين واضحين:

1) تحقق مباشر من قاعدة البيانات:
- تشغيل استدعاء للدالة (بنفس توقيع الصفحة) للتأكد أن الخطأ اختفى:
  - `select * from public.report_renewals(...) limit 1;`

2) تحقق UI:
- تسجيل الدخول (Google)
- الذهاب إلى `/reports/policies` → تبويب **التجديدات**
- تأكيد:
  - الجدول يظهر البيانات
  - تغيير فلتر النوع لا يكسر الصفحة
  - البحث برقم السيارة يعمل

---

## نطاق التغيير
- لا حذف بيانات
- لا تعديل واجهة
- Migration واحدة لتعديل دالتين محددتين (Overloads الصحيحة) + تشديد صلاحيات (اختياري)

---

## لماذا هذا سينهي المشكلة فعلاً
لأننا استخرجنا الخطأ من السجلات بدقة وهو يحدث داخل:
`PL/pgSQL function report_renewals(date,date,text,uuid,text,integer,integer)`

وسنعدل نفس هذا التوقيع بالضبط (وليس توقيعًا آخر).
