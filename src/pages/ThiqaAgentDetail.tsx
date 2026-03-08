import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Save, CreditCard, Settings, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

const ALL_FEATURES = [
  { key: 'sms', label: 'إرسال SMS', description: 'إرسال رسائل نصية للعملاء' },
  { key: 'financial_reports', label: 'التقارير المالية', description: 'عرض التقارير المالية' },
  { key: 'broker_wallet', label: 'محفظة الوسطاء', description: 'إدارة محفظة الوسطاء' },
  { key: 'company_settlement', label: 'تسويات الشركات', description: 'تقارير تسويات شركات التأمين' },
  { key: 'expenses', label: 'السندات والمصروفات', description: 'إدارة سندات القبض والصرف' },
  { key: 'cheques', label: 'الشيكات', description: 'إدارة الشيكات' },
  { key: 'leads', label: 'Whatsapp Leads', description: 'عملاء الواتساب المحتملين' },
  { key: 'accident_reports', label: 'بلاغات الحوادث', description: 'إدارة بلاغات الحوادث' },
  { key: 'repair_claims', label: 'المطالبات', description: 'إدارة مطالبات التصليح' },
  { key: 'marketing_sms', label: 'SMS تسويقية', description: 'حملات SMS تسويقية' },
];

interface AgentDetail {
  id: string;
  name: string;
  name_ar: string | null;
  email: string;
  phone: string | null;
  logo_url: string | null;
  plan: string;
  subscription_status: string;
  subscription_expires_at: string | null;
  monthly_price: number | null;
  notes: string | null;
}

export default function ThiqaAgentDetail() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  useEffect(() => {
    if (agentId) fetchAll();
  }, [agentId]);

  const fetchAll = async () => {
    setLoading(true);
    const [agentRes, flagsRes, paymentsRes] = await Promise.all([
      supabase.from('agents').select('*').eq('id', agentId!).single(),
      supabase.from('agent_feature_flags').select('feature_key, enabled').eq('agent_id', agentId!),
      supabase.from('agent_subscription_payments').select('*').eq('agent_id', agentId!).order('payment_date', { ascending: false }),
    ]);
    
    if (agentRes.data) setAgent(agentRes.data as AgentDetail);
    
    const featureMap: Record<string, boolean> = {};
    if (flagsRes.data) {
      flagsRes.data.forEach((f: any) => { featureMap[f.feature_key] = f.enabled; });
    }
    setFeatures(featureMap);
    
    if (paymentsRes.data) setPayments(paymentsRes.data);
    setLoading(false);
  };

  const saveAgent = async () => {
    if (!agent) return;
    setSaving(true);
    const { error } = await supabase
      .from('agents')
      .update({
        name: agent.name,
        name_ar: agent.name_ar,
        email: agent.email,
        phone: agent.phone,
        plan: agent.plan,
        subscription_status: agent.subscription_status,
        monthly_price: agent.monthly_price,
        notes: agent.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agent.id);
    
    setSaving(false);
    if (error) {
      toast.error('خطأ في الحفظ');
    } else {
      toast.success('تم الحفظ بنجاح');
    }
  };

  const toggleFeature = async (key: string, enabled: boolean) => {
    setFeatures(prev => ({ ...prev, [key]: enabled }));
    
    // Upsert feature flag
    const { error } = await supabase
      .from('agent_feature_flags')
      .upsert({
        agent_id: agentId!,
        feature_key: key,
        enabled,
      }, { onConflict: 'agent_id,feature_key' });
    
    if (error) toast.error('خطأ في تحديث الميزة');
  };

  const extendSubscription = async () => {
    if (!agent) return;
    const currentExpiry = agent.subscription_expires_at 
      ? new Date(agent.subscription_expires_at)
      : new Date();
    
    // Add 1 month
    const newExpiry = new Date(currentExpiry);
    newExpiry.setMonth(newExpiry.getMonth() + 1);
    
    const { error } = await supabase
      .from('agents')
      .update({
        subscription_expires_at: newExpiry.toISOString(),
        subscription_status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', agent.id);
    
    if (error) {
      toast.error('خطأ في التمديد');
    } else {
      toast.success('تم تمديد الاشتراك شهر واحد');
      setAgent(prev => prev ? { ...prev, subscription_expires_at: newExpiry.toISOString(), subscription_status: 'active' } : null);
    }
  };

  const recordPayment = async () => {
    if (!agent || !paymentAmount) return;
    
    const { error } = await supabase
      .from('agent_subscription_payments')
      .insert({
        agent_id: agent.id,
        amount: parseFloat(paymentAmount),
        plan: agent.plan,
        payment_date: new Date().toISOString().split('T')[0],
        received_by: user?.id,
        notes: paymentNotes || null,
      });
    
    if (error) {
      toast.error('خطأ في تسجيل الدفعة');
    } else {
      toast.success('تم تسجيل الدفعة');
      setPaymentAmount("");
      setPaymentNotes("");
      fetchAll();
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-4 p-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!agent) {
    return (
      <MainLayout>
        <div className="p-8 text-center text-muted-foreground">الوكيل غير موجود</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 max-w-4xl" dir="rtl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/thiqa/agents')}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{agent.name_ar || agent.name}</h1>
            <p className="text-muted-foreground">{agent.email}</p>
          </div>
        </div>

        <Tabs defaultValue="info" className="space-y-4">
          <TabsList>
            <TabsTrigger value="info">معلومات الوكيل</TabsTrigger>
            <TabsTrigger value="features">الميزات</TabsTrigger>
            <TabsTrigger value="payments">المدفوعات</TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  بيانات الوكيل
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>الاسم (English)</Label>
                    <Input value={agent.name} onChange={e => setAgent({...agent, name: e.target.value})} />
                  </div>
                  <div>
                    <Label>الاسم (عربي)</Label>
                    <Input value={agent.name_ar || ''} onChange={e => setAgent({...agent, name_ar: e.target.value})} />
                  </div>
                  <div>
                    <Label>الإيميل</Label>
                    <Input value={agent.email} onChange={e => setAgent({...agent, email: e.target.value})} />
                  </div>
                  <div>
                    <Label>الهاتف</Label>
                    <Input value={agent.phone || ''} onChange={e => setAgent({...agent, phone: e.target.value})} />
                  </div>
                  <div>
                    <Label>الخطة</Label>
                    <Select value={agent.plan} onValueChange={v => setAgent({...agent, plan: v, monthly_price: v === 'pro' ? 500 : 300})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic — ₪300/شهر</SelectItem>
                        <SelectItem value="pro">Pro — ₪500/شهر</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>حالة الاشتراك</Label>
                    <Select value={agent.subscription_status} onValueChange={v => setAgent({...agent, subscription_status: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">فعال</SelectItem>
                        <SelectItem value="suspended">معلّق</SelectItem>
                        <SelectItem value="expired">منتهي</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <Button onClick={saveAgent} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Save className="h-4 w-4 ml-2" />}
                    حفظ التغييرات
                  </Button>
                  <Button variant="outline" onClick={extendSubscription}>
                    تمديد شهر واحد
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features">
            <Card>
              <CardHeader>
                <CardTitle>ميزات الوكيل</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {ALL_FEATURES.map(feature => {
                    const isEnabled = features[feature.key] ?? (agent.plan === 'pro');
                    return (
                      <div key={feature.key} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{feature.label}</div>
                          <div className="text-xs text-muted-foreground">{feature.description}</div>
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={v => toggleFeature(feature.key, v)}
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  تسجيل دفعة جديدة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Label>المبلغ (₪)</Label>
                    <Input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder={`${agent.monthly_price || 300}`} />
                  </div>
                  <div className="flex-1">
                    <Label>ملاحظات</Label>
                    <Input value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} placeholder="اختياري" />
                  </div>
                  <Button onClick={recordPayment} disabled={!paymentAmount}>
                    تسجيل الدفعة
                  </Button>
                </div>

                <div className="mt-6 border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-right p-3">التاريخ</th>
                        <th className="text-right p-3">المبلغ</th>
                        <th className="text-right p-3">الخطة</th>
                        <th className="text-right p-3">ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p: any) => (
                        <tr key={p.id} className="border-t">
                          <td className="p-3">{format(new Date(p.payment_date), 'dd/MM/yyyy')}</td>
                          <td className="p-3 font-medium">₪{p.amount}</td>
                          <td className="p-3">
                            <Badge variant="outline">{p.plan}</Badge>
                          </td>
                          <td className="p-3 text-muted-foreground">{p.notes || '—'}</td>
                        </tr>
                      ))}
                      {payments.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-muted-foreground">لا توجد مدفوعات</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
