import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is super admin
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Check super admin
    const { data: isSA } = await adminClient.rpc("is_super_admin", { _user_id: caller.id });
    if (!isSA) throw new Error("Not a super admin");

    const body = await req.json();
    const { email, password, full_name, phone, agent_id, role, branch_id } = body;

    if (!email || !password || !agent_id || !role) {
      throw new Error("Missing required fields: email, password, agent_id, role");
    }

    // 1. Create auth user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || email },
    });

    if (createError) {
      if (createError.message?.includes("already been registered")) {
        throw new Error("البريد الإلكتروني مسجل مسبقاً");
      }
      throw createError;
    }

    const userId = newUser.user.id;

    // 2. Create profile
    await adminClient.from("profiles").upsert({
      id: userId,
      email,
      full_name: full_name || null,
      phone: phone || null,
      agent_id,
      branch_id: branch_id || null,
      status: "active",
    });

    // 3. Link to agent
    await adminClient.from("agent_users").insert({
      agent_id,
      user_id: userId,
    });

    // 4. Set role
    await adminClient.from("user_roles").upsert(
      { user_id: userId, role, agent_id },
      { onConflict: "user_id,role" }
    );

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
