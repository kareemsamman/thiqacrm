import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SEED_COMPANIES = [
  { name: "الأهلية", name_ar: "الأهلية", category_parent: ["THIRD_FULL"], elzami_commission: 0 },
  { name: "فلسطين", name_ar: "فلسطين", category_parent: ["THIRD_FULL"], elzami_commission: 0 },
  { name: "ترست", name_ar: "ترست", category_parent: ["THIRD_FULL"], elzami_commission: 0 },
  { name: "הפול", name_ar: "هبول", category_parent: ["ELZAMI"], elzami_commission: 0 },
  { name: "הראל", name_ar: "هرئيل", category_parent: ["ELZAMI"], elzami_commission: 0 },
  { name: "מנורה", name_ar: "منورا", category_parent: ["ELZAMI"], elzami_commission: 0 },
  { name: "שגריר", name_ar: "شاغير", category_parent: ["ROAD_SERVICE"], elzami_commission: 0 },
  { name: "כובל", name_ar: "كوبل", category_parent: ["ROAD_SERVICE"], elzami_commission: 0 },
];

const SEED_INSURANCE_CATEGORIES = [
  { name: "Car Insurance", name_ar: "تأمين المركبات", name_he: "ביטוח רכב", slug: "THIRD_FULL", mode: "FULL", is_active: true, is_default: true, sort_order: 1 },
  { name: "Health Insurance", name_ar: "التأمين الصحي", name_he: "ביטוח בריאות", slug: "HEALTH", mode: "LIGHT", is_active: true, is_default: false, sort_order: 10 },
  { name: "Life Insurance", name_ar: "التأمين على الحياة", name_he: "ביטוח חיים", slug: "LIFE", mode: "LIGHT", is_active: true, is_default: false, sort_order: 11 },
  { name: "Property Insurance", name_ar: "تأمين الممتلكات", name_he: "ביטוח רכוש", slug: "PROPERTY", mode: "LIGHT", is_active: true, is_default: false, sort_order: 12 },
  { name: "Travel Insurance", name_ar: "تأمين السفر", name_he: "ביטוח נסיעות", slug: "TRAVEL", mode: "LIGHT", is_active: true, is_default: false, sort_order: 13 },
  { name: "Business Insurance", name_ar: "تأمين الأعمال", name_he: "ביטוח עסקי", slug: "BUSINESS", mode: "LIGHT", is_active: true, is_default: false, sort_order: 14 },
];

const SEED_ROAD_SERVICES = [
  { name: "גרירה", name_ar: "سحب مركبة", description: "خدمة سحب السيارة", active: true, sort_order: 1, allowed_car_types: ["car"] },
  { name: "פנצ'ר", name_ar: "تبديل إطار", description: "تبديل إطار مثقوب", active: true, sort_order: 2, allowed_car_types: ["car"] },
  { name: "מצבר", name_ar: "تشغيل بطارية", description: "تشغيل أو تبديل بطارية", active: true, sort_order: 3, allowed_car_types: ["car"] },
  { name: "פתיחת רכב", name_ar: "فتح مركبة", description: "فتح سيارة مقفلة", active: true, sort_order: 4, allowed_car_types: ["car"] },
  { name: "דלק", name_ar: "توصيل وقود", description: "توصيل وقود للطوارئ", active: true, sort_order: 5, allowed_car_types: ["car"] },
];

const SEED_ACCIDENT_FEE_SERVICES = [
  { name: "إعفاء رسوم حادث - خصوصي", name_ar: "إعفاء رسوم حادث - خصوصي", description: "إعفاء من رسوم الحادث للسيارات الخصوصية", active: true, sort_order: 1 },
  { name: "إعفاء رسوم حادث - تجاري", name_ar: "إعفاء رسوم حادث - تجاري", description: "إعفاء من رسوم الحادث للسيارات التجارية", active: true, sort_order: 2 },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error("Missing backend environment variables");
    }

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      console.error("Auth error:", claimsError);
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: agentUser, error: agentUserError } = await supabase
      .from("agent_users")
      .select("agent_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (agentUserError) {
      console.error("Agent user lookup error:", agentUserError);
    }

    let agentId = agentUser?.agent_id ?? null;

    if (!agentId) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("agent_id")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        console.error("Profile lookup error:", profileError);
      }

      agentId = profile?.agent_id ?? null;
    }

    if (!agentId) {
      return new Response(JSON.stringify({ error: "No agent found for user" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Record<string, number> = {
      insurance_companies: 0,
      insurance_categories: 0,
      road_services: 0,
      accident_fee_services: 0,
    };

    const { data: existingCompanies, error: companiesReadError } = await supabase
      .from("insurance_companies")
      .select("name, category_parent")
      .eq("agent_id", agentId);
    if (companiesReadError) throw companiesReadError;

    const existingCompanyKeys = new Set(
      (existingCompanies ?? []).map((row: { name: string; category_parent: string[] | null }) =>
        `${row.name}::${(row.category_parent ?? []).join("|")}`,
      ),
    );

    const companiesToInsert = SEED_COMPANIES
      .filter((row) => !existingCompanyKeys.has(`${row.name}::${(row.category_parent ?? []).join("|")}`))
      .map((row) => ({ ...row, agent_id: agentId }));

    if (companiesToInsert.length > 0) {
      const { data, error } = await supabase.from("insurance_companies").insert(companiesToInsert).select("id");
      if (error) throw error;
      results.insurance_companies = data?.length ?? companiesToInsert.length;
    }

    const { data: existingCategories, error: categoriesReadError } = await supabase
      .from("insurance_categories")
      .select("slug")
      .eq("agent_id", agentId);
    if (categoriesReadError) throw categoriesReadError;

    const existingCategorySlugs = new Set((existingCategories ?? []).map((row: { slug: string }) => row.slug));

    const categoriesToInsert = SEED_INSURANCE_CATEGORIES
      .filter((row) => !existingCategorySlugs.has(row.slug))
      .map((row) => ({ ...row, agent_id: agentId }));

    if (categoriesToInsert.length > 0) {
      const { data, error } = await supabase.from("insurance_categories").insert(categoriesToInsert).select("id");
      if (error) throw error;
      results.insurance_categories = data?.length ?? categoriesToInsert.length;
    }

    const { data: existingRoadServices, error: roadReadError } = await supabase
      .from("road_services")
      .select("name")
      .eq("agent_id", agentId);
    if (roadReadError) throw roadReadError;

    const existingRoadServiceNames = new Set((existingRoadServices ?? []).map((row: { name: string }) => row.name));

    const roadServicesToInsert = SEED_ROAD_SERVICES
      .filter((row) => !existingRoadServiceNames.has(row.name))
      .map((row) => ({ ...row, agent_id: agentId }));

    if (roadServicesToInsert.length > 0) {
      const { data, error } = await supabase.from("road_services").insert(roadServicesToInsert).select("id");
      if (error) throw error;
      results.road_services = data?.length ?? roadServicesToInsert.length;
    }

    const { data: existingAccidentFees, error: feesReadError } = await supabase
      .from("accident_fee_services")
      .select("name")
      .eq("agent_id", agentId);
    if (feesReadError) throw feesReadError;

    const existingAccidentFeeNames = new Set((existingAccidentFees ?? []).map((row: { name: string }) => row.name));

    const accidentFeeToInsert = SEED_ACCIDENT_FEE_SERVICES
      .filter((row) => !existingAccidentFeeNames.has(row.name))
      .map((row) => ({ ...row, agent_id: agentId }));

    if (accidentFeeToInsert.length > 0) {
      const { data, error } = await supabase.from("accident_fee_services").insert(accidentFeeToInsert).select("id");
      if (error) throw error;
      results.accident_fee_services = data?.length ?? accidentFeeToInsert.length;
    }

    console.log(`Seed data sync completed for agent ${agentId}:`, results);

    return new Response(JSON.stringify({ success: true, seeded: results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return new Response(JSON.stringify({ error: "Internal server error", details: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
