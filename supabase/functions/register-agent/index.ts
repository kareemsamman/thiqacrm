import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceKey);

    const { first_name, last_name, email, password, phone, birth_date } = await req.json();

    if (!first_name || !last_name || !email || !password) {
      throw new Error("جميع الحقول مطلوبة");
    }

    if (password.length < 6) {
      throw new Error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const fullName = `${first_name.trim()} ${last_name.trim()}`;

    // Create auth user with email confirmation required
    const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: false, // Requires email confirmation
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      if (/already been registered|email_exists/i.test(createError.message || "")) {
        throw new Error("هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.");
      }
      throw createError;
    }

    const userId = createdUser.user.id;

    // Create agent
    const { data: agentData, error: agentError } = await adminClient
      .from("agents")
      .insert({
        name: fullName,
        name_ar: fullName,
        email: normalizedEmail,
        phone: phone?.trim() || null,
        plan: "trial",
        subscription_status: "active",
      })
      .select("id")
      .single();

    if (agentError) throw agentError;

    // Create profile
    const { error: profileError } = await adminClient
      .from("profiles")
      .upsert({
        id: userId,
        email: normalizedEmail,
        full_name: fullName,
        phone: phone?.trim() || null,
        status: "active",
        agent_id: agentData.id,
      }, { onConflict: "id" });

    if (profileError) throw profileError;

    // Create agent_user link
    const { error: linkError } = await adminClient
      .from("agent_users")
      .insert({
        agent_id: agentData.id,
        user_id: userId,
      });

    if (linkError) throw linkError;

    // Grant admin role
    const { error: roleError } = await adminClient
      .from("user_roles")
      .insert({
        user_id: userId,
        role: "admin",
      });

    if (roleError) console.error("Role assignment error:", roleError);

    // Send OTP to email for verification
    const { error: otpError } = await adminClient.auth.admin.generateLink({
      type: "signup",
      email: normalizedEmail,
      password,
    });

    if (otpError) console.error("OTP send error:", otpError);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "تم إنشاء الحساب. يرجى تأكيد بريدك الإلكتروني.",
        agent_id: agentData.id,
        user_id: userId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Registration error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "حدث خطأ غير متوقع" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
