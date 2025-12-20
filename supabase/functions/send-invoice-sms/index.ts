import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.88.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendInvoiceSmsRequest {
  policy_id: string;
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

    const { policy_id }: SendInvoiceSmsRequest = await req.json();

    if (!policy_id) {
      return new Response(
        JSON.stringify({ error: "policy_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-invoice-sms] Processing policy: ${policy_id}`);

    // Get policy with client details
    const { data: policy, error: policyError } = await supabase
      .from("policies")
      .select(`
        *,
        client:clients(full_name, phone_number)
      `)
      .eq("id", policy_id)
      .single();

    if (policyError || !policy) {
      console.error("[send-invoice-sms] Policy not found:", policyError);
      return new Response(
        JSON.stringify({ error: "Policy not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already sent
    if (policy.invoices_sent_at) {
      console.log("[send-invoice-sms] Invoices already sent at:", policy.invoices_sent_at);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Invoices already sent",
          sent_at: policy.invoices_sent_at
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if policy has policy_number
    if (!policy.policy_number) {
      return new Response(
        JSON.stringify({ error: "Policy number is required before sending invoices" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if policy has insurance files
    const { data: insuranceFiles, error: filesError } = await supabase
      .from("media_files")
      .select("id")
      .eq("entity_id", policy_id)
      .in("entity_type", ["policy", "policy_insurance"])
      .is("deleted_at", null)
      .limit(1);

    if (filesError) {
      console.error("[send-invoice-sms] Error fetching files:", filesError);
    }

    if (!insuranceFiles || insuranceFiles.length === 0) {
      return new Response(
        JSON.stringify({ error: "At least one policy file must be uploaded before sending invoices" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if client has phone number
    if (!policy.client?.phone_number) {
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
      console.error("[send-invoice-sms] Error fetching SMS settings:", smsSettingsError);
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

    // Get invoices for this policy
    const { data: invoices, error: invoicesError } = await supabase
      .from("invoices")
      .select("id, language, status, metadata_json")
      .eq("policy_id", policy_id)
      .in("status", ["generated", "regenerated"]);

    if (invoicesError) {
      console.error("[send-invoice-sms] Error fetching invoices:", invoicesError);
    }

    // Build invoice URLs (using metadata_json.html_content as preview URL)
    // In production, these would be actual PDF URLs
    const baseUrl = `${supabaseUrl.replace("supabase.co", "lovableproject.com")}/invoice-preview`;
    const invoiceUrls = invoices?.map(inv => {
      return `${baseUrl}/${inv.id}`;
    }) || [];

    // Build SMS message
    let smsMessage = smsSettings.invoice_sms_template || 
      "مرحباً {{client_name}}، تم إصدار فواتير وثيقة التأمين رقم {{policy_number}}. فاتورة AB: {{ab_invoice_url}} فاتورة شركة التأمين: {{insurance_invoice_url}}";

    smsMessage = smsMessage
      .replace(/\{\{client_name\}\}/g, policy.client?.full_name || "عميل")
      .replace(/\{\{policy_number\}\}/g, policy.policy_number || "")
      .replace(/\{\{ab_invoice_url\}\}/g, invoiceUrls[0] || "")
      .replace(/\{\{insurance_invoice_url\}\}/g, invoiceUrls.slice(1).join(" ") || invoiceUrls[0] || "");

    // Clean phone number
    let cleanPhone = policy.client.phone_number.replace(/[^0-9+]/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "972" + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith("+")) {
      cleanPhone = cleanPhone.substring(1);
    }

    // Send SMS via 019sms API
    const smsParams = new URLSearchParams({
      key: smsSettings.sms_token,
      source: smsSettings.sms_source,
      destination: cleanPhone,
      message: smsMessage,
    });

    console.log(`[send-invoice-sms] Sending SMS to ${cleanPhone}`);

    const smsResponse = await fetch(`https://v1.api19.com/sms/send?${smsParams.toString()}`, {
      method: "GET",
    });

    const smsResult = await smsResponse.text();
    console.log("[send-invoice-sms] 019sms API response:", smsResult);

    let responseData: { status?: string; error?: string } = {};
    try {
      responseData = JSON.parse(smsResult);
    } catch {
      console.error(`[send-invoice-sms] Failed to parse API response`);
      return new Response(
        JSON.stringify({ error: "Invalid SMS API response" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (responseData.status !== "ok") {
      console.error(`[send-invoice-sms] SMS failed: ${responseData.error}`);
      return new Response(
        JSON.stringify({ error: responseData.error || "SMS API error" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark as sent
    const { error: updateError } = await supabase
      .from("policies")
      .update({ invoices_sent_at: new Date().toISOString() })
      .eq("id", policy_id);

    if (updateError) {
      console.error("[send-invoice-sms] Error updating policy:", updateError);
    }

    const duration = Date.now() - startTime;
    console.log(`[send-invoice-sms] Completed in ${duration}ms`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Invoices sent via SMS",
        sent_to: cleanPhone,
        duration_ms: duration
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[send-invoice-sms] Fatal error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
