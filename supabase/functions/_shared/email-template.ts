/**
 * Shared Thiqa email template with gradient background + white card.
 * All emails sent from the platform should use this wrapper.
 */

const EMAIL_BG_URL = "https://thiqacrm.lovable.app/images/email-bg.png";
const EMAIL_LOGO_URL = "https://thiqacrm.lovable.app/images/thiqa-logo-email.png";

export interface EmailTemplateOptions {
  /** Main content HTML (goes inside the white card) */
  body: string;
  /** Optional footer text below the card */
  footerText?: string;
  /** Year for copyright - defaults to current year */
  year?: number;
}

/**
 * Wraps content in the Thiqa branded email template.
 * - Gradient background image
 * - Centered white card with rounded corners
 * - Thiqa logo header
 * - RTL Arabic layout
 */
export function buildEmailHtml(options: EmailTemplateOptions): string {
  const { body, footerText, year = new Date().getFullYear() } = options;

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;width:100%;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;background-color:#1e1b3a;">
  <!-- Outer wrapper with gradient bg -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#1e1b3a;background-image:url('${EMAIL_BG_URL}');background-size:cover;background-position:center center;background-repeat:no-repeat;">
    <tr>
      <td align="center" style="padding:48px 16px 36px;">

        <!-- Logo -->
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <img src="${EMAIL_LOGO_URL}" alt="Thiqa" width="140" height="140" style="display:block;margin:0 auto;height:auto;max-width:140px;" />
            </td>
          </tr>
        </table>

        <!-- White Card -->
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.25);">
          <tr>
            <td style="padding:36px 32px 40px;font-family:'Segoe UI','Cairo',Arial,sans-serif;direction:rtl;text-align:center;">
              ${body}
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
          <tr>
            <td align="center" style="padding:20px 16px 0;">
              ${footerText ? `<p style="margin:0 0 8px;font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:rgba(255,255,255,0.5);line-height:1.6;">${footerText}</p>` : ''}
              <p style="margin:0;font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:rgba(255,255,255,0.35);">&copy; ${year} Thiqa Insurance Platform</p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** OTP code email body */
export function otpEmailBody(otp: string): string {
  return `
    <table role="presentation" width="56" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 20px;">
      <tr><td align="center" style="width:56px;height:56px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:50%;font-size:26px;line-height:56px;">&#x1F511;</td></tr>
    </table>
    <h2 style="margin:0 0 8px;color:#171717;font-size:22px;font-weight:700;">رمز التحقق</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.7;">أدخل الرمز التالي لإتمام عملية تسجيل الدخول:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
      <tr><td style="background:linear-gradient(135deg,#171717,#2d2d3a);color:#ffffff;border-radius:14px;padding:16px 32px;font-size:36px;font-weight:800;letter-spacing:12px;">${otp}</td></tr>
    </table>
    <p style="margin:20px 0 0;color:#9ca3af;font-size:13px;line-height:1.6;">هذا الرمز صالح لمدة 5 دقائق فقط.</p>
  `;
}

/** Registration OTP email body */
export function registrationOtpEmailBody(otp: string): string {
  return `
    <table role="presentation" width="56" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 20px;">
      <tr><td align="center" style="width:56px;height:56px;background:linear-gradient(135deg,#10b981,#059669);border-radius:50%;font-size:26px;line-height:56px;">&#x2709;&#xFE0F;</td></tr>
    </table>
    <h2 style="margin:0 0 8px;color:#171717;font-size:22px;font-weight:700;">تأكيد البريد الإلكتروني</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.7;">أدخل الرمز التالي لتأكيد بريدك الإلكتروني:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
      <tr><td style="background:linear-gradient(135deg,#171717,#2d2d3a);color:#ffffff;border-radius:14px;padding:16px 32px;font-size:36px;font-weight:800;letter-spacing:12px;">${otp}</td></tr>
    </table>
    <p style="margin:20px 0 0;color:#9ca3af;font-size:13px;line-height:1.6;">هذا الرمز صالح لمدة 5 دقائق فقط.</p>
  `;
}

/** Password reset email body */
export function passwordResetEmailBody(recoveryLink: string): string {
  return `
    <table role="presentation" width="56" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 20px;">
      <tr><td align="center" style="width:56px;height:56px;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:50%;font-size:26px;line-height:56px;">&#x1F511;</td></tr>
    </table>
    <h2 style="margin:0 0 10px;color:#171717;font-size:22px;font-weight:700;">إعادة تعيين كلمة المرور</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.7;">
      لقد طلبت إعادة تعيين كلمة المرور الخاصة بك.<br/>
      اضغط على الزر أدناه لاختيار كلمة مرور جديدة:
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
      <tr><td>
        <a href="${recoveryLink}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#171717,#2d2d3a);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:12px;font-size:16px;font-weight:600;letter-spacing:0.5px;">
          إعادة تعيين كلمة المرور
        </a>
      </td></tr>
    </table>
    <p style="margin:24px 0 0;color:#9ca3af;font-size:13px;line-height:1.6;">
      هذا الرابط صالح لمدة ساعة واحدة فقط.
    </p>
  `;
}

/** SMTP test email body */
export function smtpTestEmailBody(smtpHost: string, smtpPort: number): string {
  return `
    <table role="presentation" width="56" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 20px;">
      <tr><td align="center" style="width:56px;height:56px;background:linear-gradient(135deg,#22c55e,#16a34a);border-radius:50%;font-size:26px;line-height:56px;">&#x2705;</td></tr>
    </table>
    <h2 style="margin:0 0 10px;color:#171717;font-size:22px;font-weight:700;">اختبار SMTP ناجح!</h2>
    <p style="margin:0 0 8px;color:#374151;font-size:16px;line-height:1.7;">تم إرسال هذه الرسالة بنجاح من منصة <strong>ثقة للتأمين</strong>.</p>
    <p style="margin:0 0 20px;color:#374151;font-size:16px;">إعدادات البريد الإلكتروني تعمل بشكل صحيح! &#x2709;&#xFE0F;</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="border-top:1px solid #e5e7eb;padding-top:16px;margin-top:8px;">
        <p style="margin:0;color:#9ca3af;font-size:12px;direction:ltr;text-align:center;">SMTP Host: ${smtpHost}<br/>SMTP Port: ${smtpPort}</p>
      </td></tr>
    </table>
  `;
}
