import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClientReportRequest {
  client_id: string;
}

interface PolicyData {
  id: string;
  policy_number: string | null;
  policy_type_parent: string;
  policy_type_child: string | null;
  start_date: string;
  end_date: string;
  insurance_price: number;
  cancelled: boolean | null;
  transferred: boolean | null;
  company: { name: string; name_ar: string | null } | null;
  car: { car_number: string } | null;
}

interface CarData {
  id: string;
  car_number: string;
  manufacturer_name: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  car_type: string | null;
}

const policyTypeLabels: Record<string, string> = {
  ELZAMI: 'إلزامي',
  THIRD_FULL: 'ثالث/شامل',
  ROAD_SERVICE: 'خدمات الطريق',
  ACCIDENT_FEE_EXEMPTION: 'إعفاء رسوم حادث',
  HEALTH: 'تأمين صحي',
  LIFE: 'تأمين حياة',
  PROPERTY: 'تأمين ممتلكات',
  TRAVEL: 'تأمين سفر',
  BUSINESS: 'تأمين أعمال',
  OTHER: 'أخرى',
};

const carTypeLabels: Record<string, string> = {
  car: 'خصوصي',
  cargo: 'شحن',
  small: 'صغير',
  taxi: 'تاكسي',
  tjeradown4: 'تجاري (<4 طن)',
  tjeraup4: 'تجاري (>4 طن)',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const bunnyApiKey = Deno.env.get("BUNNY_API_KEY")!;
    const bunnyStorageZone = Deno.env.get("BUNNY_STORAGE_ZONE")!;
    const bunnyCdnUrl = Deno.env.get("BUNNY_CDN_URL") || "https://basheer-ab.b-cdn.net";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { client_id }: ClientReportRequest = await req.json();

    if (!client_id) {
      return new Response(JSON.stringify({ error: "client_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Generating report for client: ${client_id}`);

    // Fetch client data
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", client_id)
      .single();

    if (clientError || !client) {
      console.error("Client fetch error:", clientError);
      return new Response(JSON.stringify({ error: "Client not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch cars
    const { data: cars } = await supabase
      .from("cars")
      .select("id, car_number, manufacturer_name, model, year, color, car_type")
      .eq("client_id", client_id)
      .is("deleted_at", null);

    // Fetch policies
    const { data: policies } = await supabase
      .from("policies")
      .select(`
        id, policy_number, policy_type_parent, policy_type_child, start_date, end_date, 
        insurance_price, cancelled, transferred,
        company:insurance_companies(name, name_ar),
        car:cars(car_number)
      `)
      .eq("client_id", client_id)
      .is("deleted_at", null)
      .order("start_date", { ascending: false });

    // Calculate payment summary
    const policyIds = (policies || []).map((p: any) => p.id);
    let totalPaid = 0;
    let totalInsurance = (policies || []).reduce((sum: number, p: any) => sum + (p.insurance_price || 0), 0);

    if (policyIds.length > 0) {
      const { data: payments } = await supabase
        .from("policy_payments")
        .select("amount, refused")
        .in("policy_id", policyIds);

      totalPaid = (payments || [])
        .filter((p: any) => !p.refused)
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    }

    const totalRemaining = Number(totalInsurance) - totalPaid;

    // Fetch wallet balance
    const { data: walletData } = await supabase
      .from("customer_wallet_transactions")
      .select("amount, transaction_type")
      .eq("client_id", client_id);

    const weOweCustomer = (walletData || [])
      .filter((t: any) => t.transaction_type === 'refund' || t.transaction_type === 'transfer_refund_owed')
      .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

    const customerOwesUs = (walletData || [])
      .filter((t: any) => t.transaction_type === 'transfer_adjustment_due')
      .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

    const walletBalance = weOweCustomer - customerOwesUs;

    // Fetch branch name
    let branchName = null;
    if (client.branch_id) {
      const { data: branch } = await supabase
        .from("branches")
        .select("name_ar, name")
        .eq("id", client.branch_id)
        .single();
      branchName = branch?.name_ar || branch?.name || null;
    }

    // Generate HTML
    const html = generateReportHtml(
      client,
      cars || [],
      policies || [],
      { totalPaid, totalRemaining, totalInsurance },
      walletBalance,
      branchName
    );

    // Upload to Bunny CDN
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const timestamp = now.getTime();
    const fileName = `client_report_${client.id_number}_${timestamp}.html`;
    const storagePath = `uploads/${year}/${month}/${fileName}`;

    const uploadUrl = `https://storage.bunnycdn.com/${bunnyStorageZone}/${storagePath}`;

    console.log(`Uploading report to: ${uploadUrl}`);

    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "AccessKey": bunnyApiKey,
        "Content-Type": "text/html; charset=utf-8",
      },
      body: html,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("Bunny upload error:", errorText);
      throw new Error(`Failed to upload to CDN: ${errorText}`);
    }

    const cdnUrl = `${bunnyCdnUrl}/${storagePath}`;
    console.log(`Report uploaded successfully: ${cdnUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        url: cdnUrl,
        client_name: client.full_name,
        phone_number: client.phone_number,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error generating report:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Failed to generate report" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    calendar: "gregory",
  });
}

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-GB");
}

function getPolicyStatus(policy: PolicyData): { label: string; class: string } {
  if (policy.cancelled) return { label: "ملغاة", class: "status-cancelled" };
  if (policy.transferred) return { label: "محولة", class: "status-transferred" };
  const endDate = new Date(policy.end_date);
  const today = new Date();
  if (endDate < today) return { label: "منتهية", class: "status-expired" };
  return { label: "سارية", class: "status-active" };
}

function generateReportHtml(
  client: any,
  cars: any[],
  policies: any[],
  paymentSummary: { totalPaid: number; totalRemaining: number; totalInsurance: number },
  walletBalance: number,
  branchName: string | null
): string {
  const activePolicies = policies.filter(p => {
    const endDate = new Date(p.end_date);
    return !p.cancelled && !p.transferred && endDate >= new Date();
  });

  const carsHtml = cars.length > 0 ? cars.map((car, i) => `
    <tr class="${i % 2 === 0 ? '' : 'alt'}">
      <td><span class="car-plate">${car.car_number}</span></td>
      <td>${car.manufacturer_name || '-'}</td>
      <td>${car.model || '-'}</td>
      <td class="ltr">${car.year || '-'}</td>
      <td>${car.color || '-'}</td>
      <td>${carTypeLabels[car.car_type || ''] || car.car_type || '-'}</td>
    </tr>
  `).join('') : '<tr><td colspan="6" class="empty">لا توجد سيارات مسجلة</td></tr>';

  const policiesHtml = policies.length > 0 ? policies.map((policy, i) => {
    const status = getPolicyStatus(policy);
    return `
    <tr class="${i % 2 === 0 ? '' : 'alt'}">
      <td class="type-cell">${policyTypeLabels[policy.policy_type_parent] || policy.policy_type_parent}</td>
      <td>${policy.company?.name_ar || policy.company?.name || '-'}</td>
      <td>${policy.car?.car_number ? `<span class="car-plate-sm">${policy.car.car_number}</span>` : '-'}</td>
      <td class="ltr">${formatDateShort(policy.start_date)}</td>
      <td class="ltr">${formatDateShort(policy.end_date)}</td>
      <td class="price">₪${policy.insurance_price.toLocaleString()}</td>
      <td><span class="status ${status.class}">${status.label}</span></td>
    </tr>
  `}).join('') : '<tr><td colspan="7" class="empty">لا توجد وثائق تأمين</td></tr>';

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تقرير التأمينات - ${client.full_name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Cairo', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 24px;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%);
      color: white;
      padding: 40px;
      text-align: center;
      position: relative;
    }
    .header::after {
      content: '';
      position: absolute;
      bottom: -20px;
      left: 50%;
      transform: translateX(-50%);
      width: 100px;
      height: 40px;
      background: white;
      border-radius: 50%;
    }
    .logo-en { font-size: 12px; letter-spacing: 4px; opacity: 0.8; margin-bottom: 8px; }
    .logo-ar { font-size: 32px; font-weight: 800; }
    .report-title { font-size: 18px; margin-top: 16px; opacity: 0.9; }
    .report-date { font-size: 14px; margin-top: 8px; opacity: 0.7; }
    
    .content { padding: 50px 40px 40px; }
    
    .client-card {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border-radius: 20px;
      padding: 30px;
      margin-bottom: 30px;
      border: 1px solid #bae6fd;
    }
    .client-name {
      font-size: 28px;
      font-weight: 800;
      color: #1e3a8a;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .client-name::before {
      content: '👤';
      font-size: 32px;
    }
    .client-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    .info-item {
      background: white;
      padding: 16px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    .info-label { font-size: 12px; color: #64748b; margin-bottom: 4px; }
    .info-value { font-size: 16px; font-weight: 600; color: #1e293b; }
    
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 30px;
    }
    .summary-card {
      padding: 24px;
      border-radius: 16px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .summary-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
    }
    .summary-card.primary { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); }
    .summary-card.primary::before { background: #3b82f6; }
    .summary-card.success { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); }
    .summary-card.success::before { background: #22c55e; }
    .summary-card.danger { background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); }
    .summary-card.danger::before { background: #ef4444; }
    .summary-card.warning { background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); }
    .summary-card.warning::before { background: #f59e0b; }
    .summary-icon { font-size: 32px; margin-bottom: 8px; }
    .summary-label { font-size: 13px; color: #64748b; margin-bottom: 4px; }
    .summary-value { font-size: 26px; font-weight: 800; }
    .summary-card.primary .summary-value { color: #1e40af; }
    .summary-card.success .summary-value { color: #16a34a; }
    .summary-card.danger .summary-value { color: #dc2626; }
    .summary-card.warning .summary-value { color: #d97706; }
    
    .section { margin-bottom: 30px; }
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #1e3a8a;
      padding: 12px 20px;
      background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
      border-radius: 12px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0,0,0,0.08);
    }
    th {
      background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%);
      color: white;
      padding: 16px 12px;
      font-size: 13px;
      font-weight: 600;
      text-align: right;
    }
    td {
      padding: 14px 12px;
      font-size: 13px;
      border-bottom: 1px solid #e2e8f0;
      background: white;
    }
    tr.alt td { background: #f8fafc; }
    tr:last-child td { border-bottom: none; }
    
    .car-plate, .car-plate-sm {
      display: inline-block;
      background: linear-gradient(135deg, #fef08a 0%, #fde047 100%);
      border: 2px solid #1e293b;
      padding: 4px 10px;
      border-radius: 4px;
      font-family: monospace;
      font-weight: 700;
      font-size: 13px;
    }
    .car-plate-sm { padding: 2px 6px; font-size: 11px; }
    
    .status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
    }
    .status-active { background: #dcfce7; color: #16a34a; }
    .status-expired { background: #f3f4f6; color: #6b7280; }
    .status-cancelled { background: #fee2e2; color: #dc2626; }
    .status-transferred { background: #fef3c7; color: #d97706; }
    
    .price { font-weight: 700; color: #1e3a8a; }
    .type-cell { font-weight: 600; }
    .empty { text-align: center; color: #94a3b8; padding: 30px !important; }
    .ltr { direction: ltr; text-align: center; }
    
    .footer {
      margin-top: 40px;
      padding-top: 30px;
      border-top: 2px dashed #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .footer-brand { text-align: center; }
    .footer-brand-ar { font-size: 18px; font-weight: 700; color: #1e3a8a; }
    .footer-brand-en { font-size: 11px; color: #64748b; letter-spacing: 2px; }
    .footer-date { font-size: 12px; color: #94a3b8; }
    
    .active-summary {
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
      border: 2px solid #10b981;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 30px;
      text-align: center;
    }
    .active-count {
      font-size: 48px;
      font-weight: 800;
      color: #059669;
    }
    .active-label { font-size: 16px; color: #047857; margin-top: 4px; }

    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; border-radius: 0; }
    }
    @media (max-width: 600px) {
      .content { padding: 30px 20px; }
      .client-info { grid-template-columns: 1fr 1fr; }
      .summary-grid { grid-template-columns: 1fr 1fr; }
      table { font-size: 11px; }
      th, td { padding: 10px 8px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-en">BASHEER INSURANCE</div>
      <div class="logo-ar">بشير للتأمينات</div>
      <div class="report-title">تقرير تأميناتك الشامل</div>
      <div class="report-date">${formatDate(new Date().toISOString())}</div>
    </div>
    
    <div class="content">
      <div class="client-card">
        <div class="client-name">${client.full_name}</div>
        <div class="client-info">
          <div class="info-item">
            <div class="info-label">رقم الهوية</div>
            <div class="info-value ltr">${client.id_number}</div>
          </div>
          <div class="info-item">
            <div class="info-label">رقم الهاتف</div>
            <div class="info-value ltr">${client.phone_number || '-'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">رقم الملف</div>
            <div class="info-value">${client.file_number || '-'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">تاريخ الانضمام</div>
            <div class="info-value">${formatDate(client.date_joined)}</div>
          </div>
          ${branchName ? `
          <div class="info-item">
            <div class="info-label">الفرع</div>
            <div class="info-value">${branchName}</div>
          </div>
          ` : ''}
        </div>
      </div>

      <div class="active-summary">
        <div class="active-count">${activePolicies.length}</div>
        <div class="active-label">وثائق تأمين سارية</div>
      </div>

      <div class="summary-grid">
        <div class="summary-card primary">
          <div class="summary-icon">📋</div>
          <div class="summary-label">إجمالي التأمينات</div>
          <div class="summary-value">₪${paymentSummary.totalInsurance.toLocaleString()}</div>
        </div>
        <div class="summary-card success">
          <div class="summary-icon">✅</div>
          <div class="summary-label">المدفوع</div>
          <div class="summary-value">₪${paymentSummary.totalPaid.toLocaleString()}</div>
        </div>
        <div class="summary-card ${paymentSummary.totalRemaining > 0 ? 'danger' : 'success'}">
          <div class="summary-icon">${paymentSummary.totalRemaining > 0 ? '⚠️' : '✅'}</div>
          <div class="summary-label">المتبقي</div>
          <div class="summary-value">₪${paymentSummary.totalRemaining.toLocaleString()}</div>
        </div>
        ${walletBalance > 0 ? `
        <div class="summary-card warning">
          <div class="summary-icon">💰</div>
          <div class="summary-label">رصيد لك</div>
          <div class="summary-value">₪${walletBalance.toLocaleString()}</div>
        </div>
        ` : ''}
      </div>

      <div class="section">
        <div class="section-title">🚗 السيارات (${cars.length})</div>
        <table>
          <thead>
            <tr>
              <th>رقم السيارة</th>
              <th>الشركة المصنعة</th>
              <th>الموديل</th>
              <th>السنة</th>
              <th>اللون</th>
              <th>النوع</th>
            </tr>
          </thead>
          <tbody>
            ${carsHtml}
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">📄 وثائق التأمين (${policies.length})</div>
        <table>
          <thead>
            <tr>
              <th>نوع التأمين</th>
              <th>الشركة</th>
              <th>السيارة</th>
              <th>من</th>
              <th>إلى</th>
              <th>السعر</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            ${policiesHtml}
          </tbody>
        </table>
      </div>

      <div class="footer">
        <div class="footer-date">
          تاريخ التقرير<br>
          <span class="ltr">${new Date().toLocaleString('ar-EG', { calendar: 'gregory' })}</span>
        </div>
        <div class="footer-brand">
          <div class="footer-brand-ar">بشير للتأمينات</div>
          <div class="footer-brand-en">BASHEER INSURANCE</div>
        </div>
        <div></div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
