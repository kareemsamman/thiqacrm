import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getSmtpSettings(adminClient: any) {
  const { data, error } = await adminClient
    .from("thiqa_platform_settings")
    .select("setting_key, setting_value")
    .in("setting_key", ["smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_sender_name"]);

  if (error) throw new Error("فشل في تحميل إعدادات SMTP");

  const map: Record<string, string> = {};
  (data || []).forEach((r: any) => { map[r.setting_key] = r.setting_value || ""; });

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

    const { email, redirectTo } = await req.json();
    if (!email || !email.includes("@")) throw new Error("بريد إلكتروني غير صالح");

    const normalizedEmail = String(email).trim().toLowerCase();

    // Generate recovery link via Supabase Admin API
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
      options: {
        redirectTo: redirectTo || `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/reset-password`,
      },
    });

    if (linkError) {
      console.error("Generate link error:", linkError);
      return new Response(
        JSON.stringify({ success: true, message: "إذا كان البريد مسجلاً، سيتم إرسال رابط إعادة التعيين" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const recoveryLink = linkData?.properties?.action_link;
    if (!recoveryLink) throw new Error("فشل في إنشاء رابط إعادة التعيين");

    // Build branded Arabic email
    const htmlContent = `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0;padding:20px;background:#f4f5f7;font-family:'Cairo','Segoe UI',Arial,sans-serif;direction:rtl;text-align:center;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;padding:0;box-shadow:0 8px 30px rgba(0,0,0,0.06);overflow:hidden;">
      
      <!-- Header -->
      <div style="background:#171717;padding:28px 24px 22px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:32px;font-weight:700;letter-spacing:1px;">Thiqa</h1>
        <p style="margin:6px 0 0;color:rgba(255,255,255,0.6);font-size:13px;">نظام إدارة التأمين</p>
      </div>
      
      <!-- Body -->
      <div style="padding:32px 28px 36px;">
        <div style="width:56px;height:56px;background:#f0f0f0;border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;">
          <span style="font-size:28px;">&#x1F511;</span>
        </div>
        
        <h2 style="margin:0 0 10px;color:#171717;font-size:22px;font-weight:700;">إعادة تعيين كلمة المرور</h2>
        <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.7;">
          لقد طلبت إعادة تعيين كلمة المرور الخاصة بك.<br/>
          اضغط على الزر أدناه لاختيار كلمة مرور جديدة:
        </p>
        
        <a href="${recoveryLink}" target="_blank" style="display:inline-block;background:#171717;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:12px;font-size:16px;font-weight:600;letter-spacing:0.5px;box-shadow:0 4px 14px rgba(0,0,0,0.15);">
          إعادة تعيين كلمة المرور
        </a>
        
        <p style="margin:24px 0 0;color:#9ca3af;font-size:13px;line-height:1.6;">
          هذا الرابط صالح لمدة ساعة واحدة فقط.
        </p>
      </div>
      
      <!-- Footer -->
      <div style="border-top:1px solid #f0f0f0;padding:18px 28px;background:#fafafa;">
        <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.6;">
          إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذه الرسالة.
          <br/>حسابك آمن ولن يتم إجراء أي تغيير.
        </p>
      </div>
    </div>
    
    <p style="margin:20px 0 0;color:#b0b0b0;font-size:10px;">&#xA9; ${new Date().getFullYear()} Thiqa Insurance Platform</p>
  </body>
</html>`;

    const subjectB64 = btoa(unescape(encodeURIComponent("إعادة تعيين كلمة المرور - Thiqa")));

    const client = new SMTPClient({
      connection: {
        hostname: smtp.host,
        port: smtp.port,
        tls: true,
        auth: { username: smtp.user, password: smtp.password },
      },
    });

    await client.send({
      from: `"${smtp.senderName}" <${smtp.user}>`,
      to: normalizedEmail,
      subject: `=?UTF-8?B?${subjectB64}?=`,
      content: "auto",
      html: htmlContent,
    });

    await client.close();

    return new Response(
      JSON.stringify({ success: true, message: "تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Password reset error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "حدث خطأ غير متوقع" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
