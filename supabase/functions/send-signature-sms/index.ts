import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.88.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendSignatureSmsRequest {
  client_id: string;
  policy_id?: string;
}

function generateToken(length = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { client_id, policy_id }: SendSignatureSmsRequest = await req.json();

    if (!client_id) {
      return new Response(
        JSON.stringify({ error: "client_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-signature-sms] Processing client: ${client_id}`);

    // Get client details
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", client_id)
      .single();

    if (clientError || !client) {
      console.error("[send-signature-sms] Client not found:", clientError);
      return new Response(
        JSON.stringify({ error: "Client not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if client already has signature
    if (client.signature_url) {
      console.log("[send-signature-sms] Client already has signature");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Client already has a signature",
          signature_url: client.signature_url
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if client has phone number
    if (!client.phone_number) {
      return new Response(
        JSON.stringify({ error: "Client phone number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get SMS settings
    const { data: smsSettings, error: smsSettingsError } = await supabase
      .from("sms_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (smsSettingsError) {
      console.error("[send-signature-sms] Error fetching SMS settings:", smsSettingsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch SMS settings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!smsSettings || !smsSettings.is_enabled) {
      return new Response(
        JSON.stringify({ error: "SMS service is not enabled" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate secure token
    const signatureToken = generateToken(32);
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    // Create signature record with token
    const { data: signatureRecord, error: signatureError } = await supabase
      .from("customer_signatures")
      .insert({
        client_id: client_id,
        policy_id: policy_id || null,
        token: signatureToken,
        token_expires_at: tokenExpiresAt,
        branch_id: client.branch_id,
        signature_image_url: "", // Will be updated when signed
      })
      .select()
      .single();

    if (signatureError) {
      console.error("[send-signature-sms] Error creating signature record:", signatureError);
      return new Response(
        JSON.stringify({ error: "Failed to create signature request" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build signature URL
    const projectId = Deno.env.get("SUPABASE_URL")?.match(/https:\/\/([^.]+)/)?.[1] || "";
    const signatureUrl = `https://${projectId}.lovableproject.com/sign/${signatureToken}`;

    // Build SMS message
    let smsMessage = smsSettings.signature_sms_template || 
      "مرحباً {{client_name}}، يرجى التوقيع على الرابط التالي: {{signature_url}}";

    smsMessage = smsMessage
      .replace(/\{\{client_name\}\}/g, client.full_name || "عميل")
      .replace(/\{\{signature_url\}\}/g, signatureUrl);

    // Clean phone number
    let cleanPhone = client.phone_number.replace(/[^0-9+]/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "972" + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith("+")) {
      cleanPhone = cleanPhone.substring(1);
    }

    // Send SMS via 019sms API
    const smsParams = new URLSearchParams({
      user: smsSettings.sms_user,
      password: smsSettings.sms_token,
      from: smsSettings.sms_source,
      recipient: cleanPhone,
      message: smsMessage,
    });

    console.log(`[send-signature-sms] Sending SMS to ${cleanPhone}`);

    const smsResponse = await fetch(`https://019sms.co.il/api?${smsParams.toString()}`, {
      method: "GET",
    });

    const smsResult = await smsResponse.text();
    console.log("[send-signature-sms] 019sms API response:", smsResult);

    const responseCode = parseInt(smsResult.trim(), 10);

    if (responseCode !== 1) {
      const errorMessages: Record<number, string> = {
        2: "Invalid username or password",
        3: "Invalid sender name",
        4: "Invalid recipient number",
        5: "Message is empty",
        6: "Message too long",
        7: "Insufficient credits",
      };

      console.error(`[send-signature-sms] SMS failed with code: ${responseCode}`);
      
      // Delete the signature record since SMS failed
      await supabase.from("customer_signatures").delete().eq("id", signatureRecord.id);
      
      return new Response(
        JSON.stringify({ error: errorMessages[responseCode] || `SMS API error: ${smsResult}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const duration = Date.now() - startTime;
    console.log(`[send-signature-sms] Completed in ${duration}ms`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Signature request sent via SMS",
        sent_to: cleanPhone,
        expires_at: tokenExpiresAt,
        duration_ms: duration
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[send-signature-sms] Fatal error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
