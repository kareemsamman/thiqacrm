import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { testEmail } = await req.json();

    if (!testEmail || !testEmail.includes("@")) {
      return new Response(
        JSON.stringify({ success: false, error: "البريد الإلكتروني غير صالح" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Read SMTP settings from thiqa_platform_settings
    const { data: rows, error: settingsError } = await supabase
      .from("thiqa_platform_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_sender_name"]);

    if (settingsError) {
      console.error("Settings error:", settingsError);
      return new Response(
        JSON.stringify({ success: false, error: "فشل في تحميل إعدادات المنصة" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const settings: Record<string, string> = {};
    (rows || []).forEach((r: { setting_key: string; setting_value: string | null }) => {
      settings[r.setting_key] = r.setting_value || "";
    });

    const smtpHost = settings.smtp_host || "smtp.hostinger.com";
    const smtpPort = Number(settings.smtp_port) || 465;
    const smtpUser = settings.smtp_user;
    const smtpPassword = settings.smtp_password;
    const senderName = settings.smtp_sender_name || "Thiqa Insurance";

    if (!smtpUser || !smtpPassword) {
      return new Response(
        JSON.stringify({ success: false, error: "إعدادات SMTP غير مكتملة. يرجى حفظ البريد وكلمة المرور أولاً." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Testing platform SMTP: ${smtpHost}:${smtpPort} user=${smtpUser}`);

    try {
      const client = new SMTPClient({
        connection: {
          hostname: smtpHost,
          port: smtpPort,
          tls: smtpPort === 465,
          auth: { username: smtpUser, password: smtpPassword },
        },
      });

      const textContent = `اختبار SMTP ناجح!\n\nتم إرسال هذه الرسالة من منصة ثقة للتأمين.\nإعدادات البريد تعمل بشكل صحيح.\n\nSMTP Host: ${smtpHost}\nSMTP Port: ${smtpPort}`;

      const htmlContent = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; padding: 20px; direction: rtl; text-align: right; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <h2 style="color: #2563eb; margin-bottom: 20px;">✅ اختبار SMTP ناجح!</h2>
    <p style="font-size: 16px; color: #374151;">تم إرسال هذه الرسالة بنجاح من منصة <strong>ثقة للتأمين</strong>.</p>
    <p style="font-size: 16px; color: #374151;">إعدادات البريد الإلكتروني تعمل بشكل صحيح! ✉️</p>
    <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
    <p style="color: #6b7280; font-size: 12px;">
      SMTP Host: ${smtpHost}<br>
      SMTP Port: ${smtpPort}
    </p>
  </div>
</body>
</html>`;

      await client.send({
        from: `${senderName} <${smtpUser}>`,
        to: testEmail,
        subject: "اختبار إعدادات SMTP - منصة ثقة",
        content: textContent,
        html: htmlContent,
      });

      await client.close();
      console.log("Platform SMTP test email sent successfully");

      return new Response(
        JSON.stringify({ success: true, message: `تم إرسال بريد اختباري بنجاح إلى ${testEmail}` }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } catch (smtpError: unknown) {
      console.error("SMTP error:", smtpError);
      const msg = smtpError instanceof Error ? smtpError.message : "خطأ غير معروف";
      return new Response(
        JSON.stringify({ success: false, error: `فشل الاتصال بـ SMTP: ${msg}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
  } catch (error) {
    console.error("Error in test-platform-smtp:", error);
    return new Response(
      JSON.stringify({ success: false, error: "حدث خطأ غير متوقع" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
