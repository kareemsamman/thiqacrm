import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestSMTPRequest {
  testEmail: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { testEmail }: TestSMTPRequest = await req.json();

    if (!testEmail || !testEmail.includes("@")) {
      return new Response(
        JSON.stringify({ success: false, error: "البريد الإلكتروني غير صالح" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: authSettings, error: settingsError } = await supabase
      .from("auth_settings")
      .select("*")
      .limit(1)
      .single();

    if (settingsError || !authSettings) {
      console.error("Auth settings error:", settingsError);
      return new Response(
        JSON.stringify({ success: false, error: "خطأ في تحميل إعدادات المصادقة" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const smtpHost = authSettings.smtp_host || "smtp.hostinger.com";
    const smtpPort = authSettings.smtp_port || 465;
    const smtpSecure = authSettings.smtp_secure !== false;
    const smtpUser = authSettings.smtp_user;
    const smtpPassword = authSettings.smtp_password;

    if (!smtpUser || !smtpPassword) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "إعدادات SMTP غير مكتملة. يرجى إدخال اسم المستخدم وكلمة المرور.",
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Testing SMTP connection to ${smtpHost}:${smtpPort}`);
    console.log(`SMTP User: ${smtpUser}, Secure: ${smtpSecure}`);

    const textContent = `اختبار SMTP ناجح!\n\nتم إرسال هذه الرسالة بنجاح من نظام ثقة للتأمين.\nإعدادات SMTP تعمل بشكل صحيح!\n\n---\nSMTP Host: ${smtpHost}\nSMTP Port: ${smtpPort}\nSecure: ${smtpSecure ? "Yes (TLS)" : "No"}`;

    const htmlContent = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; padding: 20px; direction: rtl; text-align: right; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <h2 style="color: #2563eb; margin-bottom: 20px;">&#x2705; اختبار SMTP ناجح!</h2>
    <p style="font-size: 16px; color: #374151;">تم إرسال هذه الرسالة بنجاح من نظام <strong>ثقة للتأمين</strong>.</p>
    <p style="font-size: 16px; color: #374151;">إعدادات SMTP تعمل بشكل صحيح!</p>
    <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
    <p style="color: #6b7280; font-size: 12px;">
      SMTP Host: ${smtpHost}<br>
      SMTP Port: ${smtpPort}<br>
      Secure: ${smtpSecure ? "Yes (TLS)" : "No"}
    </p>
  </div>
</body>
</html>`;

    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      });

      await transporter.sendMail({
        from: `"Thiqa Insurance" <${smtpUser}>`,
        to: testEmail,
        subject: "اختبار إعدادات SMTP - ثقة للتأمين",
        text: textContent,
        html: htmlContent,
      });

      console.log("Test email sent successfully");

      return new Response(
        JSON.stringify({
          success: true,
          message: `تم إرسال بريد اختباري بنجاح إلى ${testEmail}`,
        }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } catch (smtpError: unknown) {
      console.error("SMTP connection/send error:", smtpError);
      const errorMessage = smtpError instanceof Error ? smtpError.message : "Unknown SMTP error";

      return new Response(
        JSON.stringify({
          success: false,
          error: `فشل الاتصال بـ SMTP: ${errorMessage}`,
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
  } catch (error) {
    console.error("Error in test-smtp:", error);
    return new Response(
      JSON.stringify({ success: false, error: "حدث خطأ غير متوقع" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
