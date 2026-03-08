import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: isSA } = await adminClient.rpc("is_super_admin", { _user_id: caller.id });
    if (!isSA) throw new Error("Not a super admin");

    const body = await req.json();
    const { email, password, full_name, phone, agent_id, role, branch_id } = body;

    if (!email || !password || !agent_id || !role) {
      throw new Error("Missing required fields: email, password, agent_id, role");
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    let userId: string;
    let reusedExistingUser = false;

    const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || normalizedEmail },
    });

    if (createError) {
      const alreadyExists = /already been registered|email_exists/i.test(createError.message || "");
      if (!alreadyExists) throw createError;

      const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (usersError) throw usersError;

      const existingUser = usersData.users.find(
        (u) => u.email?.toLowerCase() === normalizedEmail
      );

      if (!existingUser) throw new Error("البريد الإلكتروني مسجل مسبقاً");

      userId = existingUser.id;
      reusedExistingUser = true;
    } else {
      userId = createdUser.user.id;
    }

    const { data: existingAgentUser, error: existingAgentUserError } = await adminClient
      .from("agent_users")
      .select("agent_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingAgentUserError) throw existingAgentUserError;

    if (existingAgentUser && existingAgentUser.agent_id !== agent_id) {
      throw new Error("هذا المستخدم مرتبط بوكيل آخر");
    }

    if (!existingAgentUser) {
      const { error: linkError } = await adminClient.from("agent_users").insert({
        agent_id,
        user_id: userId,
      });
      if (linkError) throw linkError;
    }

    const { error: profileError } = await adminClient.from("profiles").upsert({
      id: userId,
      email: normalizedEmail,
      full_name: full_name || null,
      phone: phone || null,
      agent_id,
      branch_id: branch_id || null,
      status: "active",
    });
    if (profileError) throw profileError;

    const { error: roleError } = await adminClient.from("user_roles").upsert(
      { user_id: userId, role, agent_id },
      { onConflict: "user_id,role" }
    );
    if (roleError) throw roleError;

    return new Response(
      JSON.stringify({ success: true, user_id: userId, reused_existing_user: reusedExistingUser }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
