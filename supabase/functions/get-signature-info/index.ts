import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.88.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[get-signature-info] Looking up token: ${token.substring(0, 8)}...`);

    // Find signature record by token
    const { data: signatureRecord, error: signatureError } = await supabase
      .from("customer_signatures")
      .select(`
        id,
        token_expires_at,
        signature_image_url,
        signed_at,
        client_id
      `)
      .eq("token", token)
      .maybeSingle();

    // Get client name separately
    let clientName = "عميل";
    if (signatureRecord?.client_id) {
      const { data: clientData } = await supabase
        .from("clients")
        .select("full_name")
        .eq("id", signatureRecord.client_id)
        .single();
      if (clientData) {
        clientName = clientData.full_name;
      }
    }

    if (signatureError || !signatureRecord) {
      console.error("[get-signature-info] Token not found:", signatureError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired signature link" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if token is expired
    if (signatureRecord.token_expires_at && new Date(signatureRecord.token_expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Signature link has expired", expired: true }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already signed
    if (signatureRecord.signature_image_url && signatureRecord.signature_image_url !== "") {
      return new Response(
        JSON.stringify({ 
          valid: false,
          already_signed: true, 
          signed_at: signatureRecord.signed_at,
          message: "Signature already submitted"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get signature template if configured
    const { data: smsSettings } = await supabase
      .from("sms_settings")
      .select("default_signature_template_id")
      .limit(1)
      .maybeSingle();

    let templateContent = null;
    if (smsSettings?.default_signature_template_id) {
      const { data: template } = await supabase
        .from("invoice_templates")
        .select("header_html, body_html, footer_html, logo_url, direction")
        .eq("id", smsSettings.default_signature_template_id)
        .maybeSingle();
      
      templateContent = template;
    }

    return new Response(
      JSON.stringify({ 
        valid: true,
        client_name: clientName,
        expires_at: signatureRecord.token_expires_at,
        template: templateContent
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[get-signature-info] Fatal error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
