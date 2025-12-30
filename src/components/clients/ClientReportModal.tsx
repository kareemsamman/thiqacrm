import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Printer, 
  MessageSquare, 
  User, 
  Car, 
  FileText, 
  Phone, 
  Hash, 
  Calendar,
  Building2,
  Wallet,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  ArrowRightLeft,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ClientReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: {
    id: string;
    full_name: string;
    id_number: string;
    file_number: string | null;
    phone_number: string | null;
    phone_number_2: string | null;
    birth_date: string | null;
    date_joined: string | null;
    branch_id: string | null;
    broker_id: string | null;
    signature_url: string | null;
  };
  cars: Array<{
    id: string;
    car_number: string;
    manufacturer_name: string | null;
    model: string | null;
    year: number | null;
    color: string | null;
    car_type: string | null;
  }>;
  policies: Array<{
    id: string;
    policy_number: string | null;
    policy_type_parent: string;
    policy_type_child: string | null;
    start_date: string;
    end_date: string;
    insurance_price: number;
    profit: number | null;
    cancelled: boolean | null;
    transferred: boolean | null;
    group_id: string | null;
    company: { name: string; name_ar: string | null } | null;
    car: { id: string; car_number: string } | null;
  }>;
  paymentSummary: {
    total_paid: number;
    total_remaining: number;
    total_profit: number;
  };
  walletBalance: {
    total_refunds: number;
    transaction_count: number;
  };
  broker: { id: string; name: string; phone: string | null } | null;
  branchName: string | null;
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

export function ClientReportModal({
  open,
  onOpenChange,
  client,
  cars,
  policies,
  paymentSummary,
  walletBalance,
  broker,
  branchName,
}: ClientReportModalProps) {
  const [sendingSms, setSendingSms] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      calendar: 'gregory',
    });
  };

  const formatDateShort = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB');
  };

  const getPolicyStatus = (policy: { cancelled: boolean | null; transferred: boolean | null; end_date: string }) => {
    if (policy.cancelled) return { label: 'ملغاة', icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' };
    if (policy.transferred) return { label: 'محولة', icon: ArrowRightLeft, color: 'text-amber-600', bg: 'bg-amber-100' };
    const endDate = new Date(policy.end_date);
    const today = new Date();
    if (endDate < today) return { label: 'منتهية', icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted' };
    return { label: 'سارية', icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' };
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('يرجى السماح بفتح النوافذ المنبثقة');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير العميل - ${client.full_name}</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Cairo', sans-serif;
            padding: 20px;
            background: white;
            color: #1a1a1a;
            direction: rtl;
          }
          .report-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #1e40af;
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          .company-name {
            font-size: 24px;
            font-weight: 700;
            color: #1e40af;
          }
          .company-name-en {
            font-size: 12px;
            color: #666;
            letter-spacing: 2px;
          }
          .report-title {
            font-size: 18px;
            color: #666;
          }
          .report-date {
            font-size: 12px;
            color: #999;
          }
          .section {
            margin-bottom: 24px;
          }
          .section-title {
            font-size: 16px;
            font-weight: 700;
            color: #1e40af;
            background: #e0e7ff;
            padding: 8px 16px;
            margin-bottom: 12px;
            border-radius: 4px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }
          .info-item {
            background: #f8fafc;
            padding: 12px;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
          }
          .info-label {
            font-size: 11px;
            color: #64748b;
            margin-bottom: 4px;
          }
          .info-value {
            font-size: 14px;
            font-weight: 600;
            color: #1e293b;
          }
          .summary-cards {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 24px;
          }
          .summary-card {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            padding: 16px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid #bae6fd;
          }
          .summary-card.success { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-color: #86efac; }
          .summary-card.warning { background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border-color: #fcd34d; }
          .summary-card.danger { background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-color: #fca5a5; }
          .summary-label {
            font-size: 11px;
            color: #64748b;
            margin-bottom: 6px;
          }
          .summary-value {
            font-size: 20px;
            font-weight: 700;
            color: #1e40af;
          }
          .summary-card.success .summary-value { color: #16a34a; }
          .summary-card.warning .summary-value { color: #d97706; }
          .summary-card.danger .summary-value { color: #dc2626; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 12px;
          }
          th {
            background: #1e40af;
            color: white;
            padding: 10px 8px;
            text-align: right;
            font-weight: 600;
          }
          td {
            padding: 10px 8px;
            border-bottom: 1px solid #e2e8f0;
            text-align: right;
          }
          tr:nth-child(even) {
            background: #f8fafc;
          }
          tr:hover {
            background: #f1f5f9;
          }
          .status-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 20px;
            font-size: 10px;
            font-weight: 600;
          }
          .status-active { background: #dcfce7; color: #16a34a; }
          .status-expired { background: #f3f4f6; color: #6b7280; }
          .status-cancelled { background: #fee2e2; color: #dc2626; }
          .status-transferred { background: #fef3c7; color: #d97706; }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .signature-area {
            text-align: center;
          }
          .signature-line {
            border-bottom: 1px solid #1e293b;
            width: 200px;
            margin: 40px auto 8px;
          }
          .signature-label {
            font-size: 12px;
            color: #64748b;
          }
          .print-date {
            font-size: 11px;
            color: #94a3b8;
          }
          .car-plate {
            display: inline-block;
            background: #fef08a;
            border: 2px solid #1e293b;
            padding: 2px 8px;
            border-radius: 3px;
            font-family: monospace;
            font-weight: 700;
            font-size: 12px;
          }
          .ltr {
            direction: ltr;
            unicode-bidi: embed;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const handleSendSms = async () => {
    if (!client.phone_number) {
      toast.error('لا يوجد رقم هاتف للعميل');
      return;
    }

    setSendingSms(true);
    try {
      // Build SMS message summary
      const activePolicies = policies.filter(p => {
        const endDate = new Date(p.end_date);
        return !p.cancelled && !p.transferred && endDate >= new Date();
      });

      const message = buildSmsMessage(client, cars, activePolicies, paymentSummary, walletBalance);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('يرجى تسجيل الدخول');
        return;
      }

      const response = await supabase.functions.invoke('send-sms', {
        body: {
          phone: client.phone_number,
          message,
        },
      });

      if (response.error) throw response.error;

      // Log the SMS
      await supabase.from('sms_logs').insert([{
        phone_number: client.phone_number,
        message,
        client_id: client.id,
        sms_type: 'manual' as const,
        status: 'sent',
        sent_at: new Date().toISOString(),
      }]);

      toast.success('تم إرسال التقرير عبر SMS بنجاح');
    } catch (error) {
      console.error('Error sending SMS:', error);
      toast.error('فشل في إرسال الرسالة');
    } finally {
      setSendingSms(false);
    }
  };

  const buildSmsMessage = (
    client: ClientReportModalProps['client'],
    cars: ClientReportModalProps['cars'],
    activePolicies: ClientReportModalProps['policies'],
    paymentSummary: ClientReportModalProps['paymentSummary'],
    walletBalance: ClientReportModalProps['walletBalance']
  ) => {
    let msg = `تقرير تأميناتك - ${client.full_name}\n`;
    msg += `━━━━━━━━━━━━━━\n`;
    
    if (activePolicies.length > 0) {
      msg += `📋 وثائقك السارية:\n`;
      activePolicies.forEach((p, i) => {
        const type = policyTypeLabels[p.policy_type_parent] || p.policy_type_parent;
        msg += `${i + 1}. ${type}`;
        if (p.car?.car_number) msg += ` - ${p.car.car_number}`;
        msg += `\n   تنتهي: ${formatDateShort(p.end_date)}\n`;
      });
    } else {
      msg += `لا توجد وثائق سارية حالياً\n`;
    }

    msg += `━━━━━━━━━━━━━━\n`;
    msg += `💰 المدفوع: ₪${paymentSummary.total_paid.toLocaleString()}\n`;
    
    if (paymentSummary.total_remaining > 0) {
      msg += `⚠️ المتبقي: ₪${paymentSummary.total_remaining.toLocaleString()}\n`;
    }
    
    if (walletBalance.total_refunds > 0) {
      msg += `🔄 رصيد لك: ₪${walletBalance.total_refunds.toLocaleString()}\n`;
    }

    msg += `━━━━━━━━━━━━━━\n`;
    msg += `بشير للتأمينات 🚗`;

    return msg;
  };

  const activePolicies = policies.filter(p => {
    const endDate = new Date(p.end_date);
    return !p.cancelled && !p.transferred && endDate >= new Date();
  });

  const totalInsurance = policies.reduce((sum, p) => sum + p.insurance_price, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              تقرير العميل الشامل
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSendSms} disabled={sendingSms || !client.phone_number}>
                {sendingSms ? (
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                ) : (
                  <MessageSquare className="h-4 w-4 ml-2" />
                )}
                إرسال SMS
              </Button>
              <Button size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 ml-2" />
                طباعة
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Printable Report Content */}
        <div ref={printRef} className="mt-4">
          {/* Header */}
          <div className="report-header flex justify-between items-center border-b-4 border-primary pb-4 mb-6">
            <div>
              <p className="company-name-en text-xs text-muted-foreground tracking-widest mb-1">BASHEER INSURANCE</p>
              <h1 className="company-name text-2xl font-bold text-primary">بشير للتأمينات</h1>
            </div>
            <div className="text-left">
              <p className="report-title text-lg text-muted-foreground">تقرير العميل</p>
              <p className="report-date text-sm text-muted-foreground/70">
                {new Date().toLocaleDateString('ar-EG', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  calendar: 'gregory'
                })}
              </p>
            </div>
          </div>

          {/* Client Info Section */}
          <div className="section mb-6">
            <h2 className="section-title flex items-center gap-2 text-base font-bold bg-primary/10 text-primary px-4 py-2 rounded-lg mb-4">
              <User className="h-4 w-4" />
              بيانات العميل
            </h2>
            <div className="info-grid grid grid-cols-3 gap-3">
              <div className="info-item bg-muted/30 p-3 rounded-lg border">
                <p className="info-label text-xs text-muted-foreground mb-1">الاسم الكامل</p>
                <p className="info-value font-semibold">{client.full_name}</p>
              </div>
              <div className="info-item bg-muted/30 p-3 rounded-lg border">
                <p className="info-label text-xs text-muted-foreground mb-1">رقم الهوية</p>
                <p className="info-value font-semibold font-mono">{client.id_number}</p>
              </div>
              <div className="info-item bg-muted/30 p-3 rounded-lg border">
                <p className="info-label text-xs text-muted-foreground mb-1">رقم الهاتف</p>
                <p className="info-value font-semibold ltr-nums">{client.phone_number || '-'}</p>
              </div>
              <div className="info-item bg-muted/30 p-3 rounded-lg border">
                <p className="info-label text-xs text-muted-foreground mb-1">رقم الملف</p>
                <p className="info-value font-semibold">{client.file_number || '-'}</p>
              </div>
              <div className="info-item bg-muted/30 p-3 rounded-lg border">
                <p className="info-label text-xs text-muted-foreground mb-1">تاريخ الانضمام</p>
                <p className="info-value font-semibold">{formatDate(client.date_joined)}</p>
              </div>
              {branchName && (
                <div className="info-item bg-muted/30 p-3 rounded-lg border">
                  <p className="info-label text-xs text-muted-foreground mb-1">الفرع</p>
                  <p className="info-value font-semibold">{branchName}</p>
                </div>
              )}
              {broker && (
                <div className="info-item bg-muted/30 p-3 rounded-lg border">
                  <p className="info-label text-xs text-muted-foreground mb-1">الوسيط</p>
                  <p className="info-value font-semibold">{broker.name}</p>
                </div>
              )}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="summary-cards grid grid-cols-4 gap-3 mb-6">
            <div className="summary-card bg-gradient-to-br from-primary/5 to-primary/10 p-4 rounded-xl border border-primary/20 text-center">
              <p className="summary-label text-xs text-muted-foreground mb-1">إجمالي التأمينات</p>
              <p className="summary-value text-xl font-bold text-primary">₪{totalInsurance.toLocaleString()}</p>
            </div>
            <div className="summary-card success bg-gradient-to-br from-success/5 to-success/10 p-4 rounded-xl border border-success/20 text-center">
              <p className="summary-label text-xs text-muted-foreground mb-1">إجمالي المدفوع</p>
              <p className="summary-value text-xl font-bold text-success">₪{paymentSummary.total_paid.toLocaleString()}</p>
            </div>
            <div className={`summary-card p-4 rounded-xl border text-center ${paymentSummary.total_remaining > 0 ? 'danger bg-gradient-to-br from-destructive/5 to-destructive/10 border-destructive/20' : 'success bg-gradient-to-br from-success/5 to-success/10 border-success/20'}`}>
              <p className="summary-label text-xs text-muted-foreground mb-1">المتبقي</p>
              <p className={`summary-value text-xl font-bold ${paymentSummary.total_remaining > 0 ? 'text-destructive' : 'text-success'}`}>
                ₪{paymentSummary.total_remaining.toLocaleString()}
              </p>
            </div>
            {walletBalance.total_refunds > 0 && (
              <div className="summary-card warning bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200 text-center">
                <p className="summary-label text-xs text-muted-foreground mb-1">رصيد للعميل</p>
                <p className="summary-value text-xl font-bold text-amber-600">₪{walletBalance.total_refunds.toLocaleString()}</p>
              </div>
            )}
          </div>

          {/* Cars Section */}
          <div className="section mb-6">
            <h2 className="section-title flex items-center gap-2 text-base font-bold bg-primary/10 text-primary px-4 py-2 rounded-lg mb-4">
              <Car className="h-4 w-4" />
              السيارات ({cars.length})
            </h2>
            {cars.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-primary text-primary-foreground">
                      <th className="px-4 py-3 text-right font-semibold">رقم السيارة</th>
                      <th className="px-4 py-3 text-right font-semibold">الشركة المصنعة</th>
                      <th className="px-4 py-3 text-right font-semibold">الموديل</th>
                      <th className="px-4 py-3 text-right font-semibold">السنة</th>
                      <th className="px-4 py-3 text-right font-semibold">اللون</th>
                      <th className="px-4 py-3 text-right font-semibold">النوع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cars.map((car, index) => (
                      <tr key={car.id} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                        <td className="px-4 py-3">
                          <span className="car-plate inline-block bg-yellow-200 border-2 border-foreground px-2 py-0.5 rounded font-mono font-bold text-xs">
                            {car.car_number}
                          </span>
                        </td>
                        <td className="px-4 py-3">{car.manufacturer_name || '-'}</td>
                        <td className="px-4 py-3">{car.model || '-'}</td>
                        <td className="px-4 py-3 font-mono">{car.year || '-'}</td>
                        <td className="px-4 py-3">{car.color || '-'}</td>
                        <td className="px-4 py-3">{carTypeLabels[car.car_type || ''] || car.car_type || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-6">لا توجد سيارات مسجلة</p>
            )}
          </div>

          {/* Policies Section */}
          <div className="section mb-6">
            <h2 className="section-title flex items-center gap-2 text-base font-bold bg-primary/10 text-primary px-4 py-2 rounded-lg mb-4">
              <FileText className="h-4 w-4" />
              وثائق التأمين ({policies.length})
            </h2>
            {policies.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-primary text-primary-foreground">
                      <th className="px-3 py-3 text-right font-semibold">نوع التأمين</th>
                      <th className="px-3 py-3 text-right font-semibold">الشركة</th>
                      <th className="px-3 py-3 text-right font-semibold">السيارة</th>
                      <th className="px-3 py-3 text-right font-semibold">من</th>
                      <th className="px-3 py-3 text-right font-semibold">إلى</th>
                      <th className="px-3 py-3 text-right font-semibold">السعر</th>
                      <th className="px-3 py-3 text-right font-semibold">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {policies.map((policy, index) => {
                      const status = getPolicyStatus(policy);
                      const StatusIcon = status.icon;
                      return (
                        <tr key={policy.id} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                          <td className="px-3 py-3 font-medium">
                            {policyTypeLabels[policy.policy_type_parent] || policy.policy_type_parent}
                          </td>
                          <td className="px-3 py-3">{policy.company?.name_ar || policy.company?.name || '-'}</td>
                          <td className="px-3 py-3">
                            {policy.car?.car_number ? (
                              <span className="car-plate inline-block bg-yellow-200 border border-foreground px-1.5 py-0.5 rounded font-mono font-bold text-xs">
                                {policy.car.car_number}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-3 py-3 font-mono text-xs">{formatDateShort(policy.start_date)}</td>
                          <td className="px-3 py-3 font-mono text-xs">{formatDateShort(policy.end_date)}</td>
                          <td className="px-3 py-3 font-semibold">₪{policy.insurance_price.toLocaleString()}</td>
                          <td className="px-3 py-3">
                            <Badge 
                              variant="outline" 
                              className={`gap-1 text-xs ${status.bg} ${status.color} border-0`}
                            >
                              <StatusIcon className="h-3 w-3" />
                              {status.label}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted font-bold">
                      <td colSpan={5} className="px-3 py-3 text-left">الإجمالي</td>
                      <td className="px-3 py-3">₪{totalInsurance.toLocaleString()}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-6">لا توجد وثائق تأمين</p>
            )}
          </div>

          {/* Footer */}
          <div className="footer flex justify-between items-end mt-10 pt-6 border-t-2">
            <div className="signature-area text-center">
              <div className="signature-line border-b border-foreground w-48 mx-auto mb-2 h-12"></div>
              <p className="signature-label text-xs text-muted-foreground">توقيع العميل</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-primary">بشير للتأمينات</p>
              <p className="text-xs text-muted-foreground">BASHEER INSURANCE</p>
            </div>
            <div className="print-date text-xs text-muted-foreground/70">
              <p>تاريخ الطباعة:</p>
              <p className="font-mono">{new Date().toLocaleString('ar-EG', { calendar: 'gregory' })}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
