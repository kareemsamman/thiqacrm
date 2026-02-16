

# إصلاح بيانات الأرباح - اراضي مقدسة

## المشاكل المكتشفة

### 1. خلل في دالة `recalculatePolicyProfit`
الدالة لا تمرر 3 معاملات مهمة: `broker_buy_price`, `road_service_id`, `accident_fee_service_id` - مما يعني أن إعادة الاحتساب لا تعمل بشكل صحيح للوثائق التي تعتمد على هذه القيم.

### 2. وثائق بسعر تأمين خاطئ (إدخال يدوي)
هذه وثائق فيها سعر التأمين غلط - يجب تصحيحها يدوياً:
- سيارة 5077165: سعر التأمين = 0 (يجب إدخال السعر الصحيح)
- سيارة 43126201: سعر التأمين = 300 (المعادلة لا تتطابق أصلاً)
- سيارة 2832533: سعر التأمين = 300 (المعادلة لا تتطابق)

### 3. وثائق فيها حساب خاطئ (قابلة للإصلاح تلقائياً)
- سيارة 7403786: FULL لكن car_value=48000 أقل من 60000 فالحساب أعطى 0 بدل 700
- سيارة 6767653 (3 وثائق): الحساب صحيح رياضياً (2820) لكن السعر 2500 أقل من التكلفة
- سيارة 4306931: نوعها tjeradown4 ولا يوجد قاعدة تسعير لهذا النوع

## خطة الإصلاح

### الملف: `src/lib/pricingCalculator.ts`

**إصلاح 1: تمرير المعاملات المفقودة في `recalculatePolicyProfit`**
- إضافة `brokerBuyPrice: policy.broker_buy_price` 
- إضافة `roadServiceId: policy.road_service_id`
- إضافة `accidentFeeServiceId: policy.accident_fee_service_id`
- تغيير JOIN من `cars!inner` إلى `cars` (لأن بعض الوثائق قد لا يكون لها سيارة)

**إصلاح 2: معالجة حالة FULL عندما car_value < 60000**
حالياً إذا car_value < 60000 لا يحسب fullComponent ولا يستخدم minPrice. النتيجة: companyPayment = thirdComponent فقط (700 في حالة الخصم).
- السلوك الحالي صحيح منطقياً - لكن الوثيقة 7403786 أعطت 0 بدل 700 مما يعني أن هناك خطأ آخر (ربما حُسبت قبل إضافة قاعدة DISCOUNT)

### النتيجة بعد الإصلاح
بعد إصلاح الدالة، زر "إعادة احتساب الأرباح" الذي تمت إضافته سابقاً سيعمل بشكل صحيح ويصحح الوثائق التي حسابها خاطئ تلقائياً.

الوثائق التي سعر التأمين فيها غلط (0 أو 300) تحتاج تصحيح يدوي من خلال تعديل الوثيقة في النظام.

## التفاصيل التقنية

### تعديل `recalculatePolicyProfit` في `src/lib/pricingCalculator.ts`:

```text
// السطر 253-282 الحالي:
const { data: policy } = await supabase
  .from('policies')
  .select(`*, cars!inner(...), clients!inner(...)`)
  .eq('id', policyId)
  .single();

const result = await calculatePolicyProfit({
  policyTypeParent: policy.policy_type_parent,
  policyTypeChild: policy.policy_type_child,
  companyId: policy.company_id,
  carType: policy.cars.car_type || 'car',
  ageBand,
  carValue: policy.cars.car_value,
  carYear: policy.cars.year,
  insurancePrice: policy.insurance_price,
  // ---- مفقود! ----
});

// بعد الإصلاح:
const { data: policy } = await supabase
  .from('policies')
  .select(`*, cars(...), clients!inner(...)`)  // cars بدون !inner
  .eq('id', policyId)
  .single();

const result = await calculatePolicyProfit({
  policyTypeParent: policy.policy_type_parent,
  policyTypeChild: policy.policy_type_child,
  companyId: policy.company_id,
  carType: policy.cars?.car_type || 'car',
  ageBand,
  carValue: policy.cars?.car_value ?? null,
  carYear: policy.cars?.year ?? null,
  insurancePrice: policy.insurance_price,
  brokerBuyPrice: policy.broker_buy_price,           // +++ جديد
  roadServiceId: policy.road_service_id,             // +++ جديد
  accidentFeeServiceId: policy.accident_fee_service_id, // +++ جديد
});
```
