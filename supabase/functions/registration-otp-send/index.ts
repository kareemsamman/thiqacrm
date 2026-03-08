import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generate4DigitOTP(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 10000).padStart(4, "0");
}

async function hashOTP(otp: string): Promise<string> {
  const data = new TextEncoder().encode(otp);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function getSmtpSettings(adminClient: any) {
  const { data, error } = await adminClient
    .from("thiqa_platform_settings")
    .select("setting_key, setting_value")
    .in("setting_key", ["smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_sender_name"]);

  if (error) throw new Error("فشل في تحميل إعدادات SMTP");

  const map: Record<string, string> = {};
  (data || []).forEach((r: any) => { map[r.setting_key] = r.setting_value || ""; });

  // Fallback to env vars if DB values are empty
  return {
    host: map.smtp_host || Deno.env.get("THIQA_SMTP_HOST") || "smtp.hostinger.com",
    port: parseInt(map.smtp_port || Deno.env.get("THIQA_SMTP_PORT") || "465"),
    user: map.smtp_user || Deno.env.get("THIQA_SMTP_USER") || "",
    password: map.smtp_password || Deno.env.get("THIQA_SMTP_PASSWORD") || "",
    senderName: map.smtp_sender_name || "Thiqa Insurance",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const smtp = await getSmtpSettings(adminClient);

    if (!smtp.user || !smtp.password) {
      throw new Error("SMTP غير مُعد. يرجى إعداد إعدادات البريد من لوحة الإدارة.");
    }

    const { email } = await req.json();
    if (!email || !email.includes("@")) throw new Error("بريد إلكتروني غير صالح");

    const normalizedEmail = String(email).trim().toLowerCase();

    // Rate limit: max 3 OTPs per 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recentOtps } = await adminClient
      .from("otp_codes")
      .select("id")
      .eq("identifier", normalizedEmail)
      .eq("channel", "registration")
      .gte("created_at", tenMinutesAgo);

    if (recentOtps && recentOtps.length >= 3) {
      throw new Error("تم تجاوز الحد الأقصى للمحاولات. حاول لاحقاً.");
    }

    const otp = generate4DigitOTP();
    const otpHash = await hashOTP(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Store OTP
    const { error: insertError } = await adminClient.from("otp_codes").insert({
      identifier: normalizedEmail,
      channel: "registration",
      otp_hash: otpHash,
      expires_at: expiresAt,
    });

    if (insertError) throw new Error("فشل في إنشاء رمز التحقق");

    // Send email
    const htmlContent = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;padding:20px;direction:rtl;text-align:center;background:#f3f4f6;"><div style="max-width:500px;margin:0 auto;background:#fff;padding:30px;border-radius:12px;"><h1 style="color:#1a1a2e;margin:0 0 8px 0;">Thiqa</h1><p style="color:#6b7280;margin:0 0 20px 0;">نظام إدارة التأمين</p><p style="color:#374151;margin:0 0 20px 0;">رمز تأكيد البريد الإلكتروني:</p><div style="background:#1a1a2e;color:#fff;font-size:40px;font-weight:bold;padding:20px;border-radius:10px;letter-spacing:12px;margin:0 0 20px 0;">${otp}</div><p style="color:#6b7280;margin:0 0 20px 0;">هذا الرمز صالح لمدة 5 دقائق فقط.</p><hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;"><p style="color:#9ca3af;font-size:12px;margin:0;">إذا لم تسجّل في ثقة للتأمين، يرجى تجاهل هذه الرسالة.</p></div></body></html>`;

    const client = new SMTPClient({
      connection: {
        hostname: smtp.host,
        port: smtp.port,
        tls: true,
        auth: { username: smtp.user, password: smtp.password },
      },
    });

    await client.send({
      from: `${smtp.senderName} <${smtp.user}>`,
      to: normalizedEmail,
      subject: "رمز تأكيد التسجيل - Thiqa",
      content: `رمز التحقق الخاص بك هو: ${otp}\nهذا الرمز صالح لمدة 5 دقائق.`,
      html: htmlContent,
    });

    await client.close();

    return new Response(
      JSON.stringify({ success: true, message: "تم إرسال رمز التحقق إلى بريدك الإلكتروني" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Registration OTP error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "حدث خطأ غير متوقع" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
