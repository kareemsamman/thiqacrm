import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SEED_COMPANIES = [
  { name: 'הפול', name_ar: 'هبول', category_parent: ['ELZAMI'], elzami_commission: 0 },
  { name: 'שלומו', name_ar: 'شلومو', category_parent: ['ELZAMI'], elzami_commission: 0 },
  { name: 'הראל', name_ar: 'هرئل', category_parent: ['ELZAMI'], elzami_commission: 0 },
  { name: 'מנורה', name_ar: 'منورا', category_parent: ['ELZAMI'], elzami_commission: 0 },
  { name: 'אנקור', name_ar: 'أنكور', category_parent: ['ELZAMI'], elzami_commission: 0 },
  { name: 'أهلية', name_ar: 'أهلية', category_parent: ['THIRD_FULL'], elzami_commission: 0 },
  { name: 'اراضي مقدسة', name_ar: 'اراضي مقدسة', category_parent: ['THIRD_FULL'], elzami_commission: 0 },
  { name: 'ترست', name_ar: 'ترست', category_parent: ['THIRD_FULL'], elzami_commission: 0 },
  { name: 'فلسطين', name_ar: 'فلسطين', category_parent: ['THIRD_FULL'], elzami_commission: 0 },
  { name: 'כלל', name_ar: 'כלל', category_parent: ['THIRD_FULL'], elzami_commission: 0 },
  { name: 'شركة اكس', name_ar: 'شركة اكس', category_parent: ['ROAD_SERVICE'], elzami_commission: 0 },
  { name: 'שגריר', name_ar: 'שגריר', category_parent: ['ROAD_SERVICE'], elzami_commission: 0 },
  { name: 'כובל', name_ar: 'كوبل', category_parent: ['ROAD_SERVICE'], elzami_commission: 0 },
];

const SEED_INSURANCE_CATEGORIES = [
  { name: 'Car Insurance', name_ar: 'تأمين السيارات', name_he: 'ביטוח רכב', slug: 'THIRD_FULL', mode: 'FULL', is_active: true, is_default: true, sort_order: 1 },
  { name: 'Health Insurance', name_ar: 'التأمين الصحي', name_he: 'ביטוח בריאות', slug: 'HEALTH', mode: 'LIGHT', is_active: true, is_default: false, sort_order: 10 },
  { name: 'Life Insurance', name_ar: 'التأمين على الحياة', name_he: 'ביטוח חיים', slug: 'LIFE', mode: 'LIGHT', is_active: true, is_default: false, sort_order: 11 },
  { name: 'Property Insurance', name_ar: 'تأمين الممتلكات', name_he: 'ביטוח רכוש', slug: 'PROPERTY', mode: 'LIGHT', is_active: true, is_default: false, sort_order: 12 },
  { name: 'Travel Insurance', name_ar: 'تأمين السفر', name_he: 'ביטוח נסיעות', slug: 'TRAVEL', mode: 'LIGHT', is_active: true, is_default: false, sort_order: 13 },
  { name: 'Business Insurance', name_ar: 'تأمين الشركات', name_he: 'ביטוח עסקי', slug: 'BUSINESS', mode: 'LIGHT', is_active: true, is_default: false, sort_order: 14 },
];

const SEED_ROAD_SERVICES = [
  { name: 'גרירה', name_ar: 'سحب', description: 'خدمة سحب السيارة', active: true, sort_order: 1, allowed_car_types: ['car'] },
  { name: "פנצ'ר", name_ar: 'إطار مثقوب', description: 'تبديل إطار مثقوب', active: true, sort_order: 2, allowed_car_types: ['car'] },
  { name: 'מצבר', name_ar: 'بطارية', description: 'تشغيل أو تبديل بطارية', active: true, sort_order: 3, allowed_car_types: ['car'] },
  { name: 'פתיחת רכב', name_ar: 'فتح سيارة', description: 'فتح سيارة مقفلة', active: true, sort_order: 4, allowed_car_types: ['car'] },
  { name: 'דלק', name_ar: 'وقود', description: 'توصيل وقود', active: true, sort_order: 5, allowed_car_types: ['car'] },
];

const SEED_ACCIDENT_FEE_SERVICES = [
  { name: 'إعفاء رسوم حادث - خصوصي', name_ar: 'إعفاء رسوم حادث - خصوصي', description: 'إعفاء من رسوم الحادث للسيارات الخصوصية', active: true, sort_order: 1 },
  { name: 'إعفاء رسوم حادث - تجاري', name_ar: 'إعفاء رسوم حادث - تجاري', description: 'إعفاء من رسوم الحادث للسيارات التجارية', active: true, sort_order: 2 },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Use anon client to verify the user's JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role client for data operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get agent_id
    const { data: agentUser } = await supabase
      .from('agent_users')
      .select('agent_id')
      .eq('user_id', user.id)
      .single();

    if (!agentUser?.agent_id) {
      return new Response(JSON.stringify({ error: 'No agent found' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const agentId = agentUser.agent_id;
    const results: Record<string, number> = {};

    // 1. Seed insurance companies
    const { count: companyCount } = await supabase
      .from('insurance_companies')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', agentId);

    if ((companyCount ?? 0) === 0) {
      const { data } = await supabase.from('insurance_companies').insert(
        SEED_COMPANIES.map(c => ({ ...c, agent_id: agentId }))
      ).select('id');
      results.insurance_companies = data?.length ?? 0;
    }

    // 2. Seed insurance categories
    const { count: catCount } = await supabase
      .from('insurance_categories')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', agentId);

    if ((catCount ?? 0) === 0) {
      const { data } = await supabase.from('insurance_categories').insert(
        SEED_INSURANCE_CATEGORIES.map(c => ({ ...c, agent_id: agentId }))
      ).select('id');
      results.insurance_categories = data?.length ?? 0;
    }

    // 3. Seed road services
    const { count: roadCount } = await supabase
      .from('road_services')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', agentId);

    if ((roadCount ?? 0) === 0) {
      const { data } = await supabase.from('road_services').insert(
        SEED_ROAD_SERVICES.map(s => ({ ...s, agent_id: agentId }))
      ).select('id');
      results.road_services = data?.length ?? 0;
    }

    // 4. Seed accident fee services
    const { count: feeCount } = await supabase
      .from('accident_fee_services')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', agentId);

    if ((feeCount ?? 0) === 0) {
      const { data } = await supabase.from('accident_fee_services').insert(
        SEED_ACCIDENT_FEE_SERVICES.map(s => ({ ...s, agent_id: agentId }))
      ).select('id');
      results.accident_fee_services = data?.length ?? 0;
    }

    console.log(`Seed data created for agent ${agentId}:`, results);

    return new Response(JSON.stringify({ success: true, seeded: results }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Seed error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
