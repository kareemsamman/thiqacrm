import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export default function ThiqaCreateAgent() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    name_ar: '',
    email: '',
    phone: '',
    plan: 'basic',
    notes: '',
  });

  const handleSubmit = async () => {
    if (!form.name || !form.email) {
      toast.error('الاسم والإيميل مطلوبان');
      return;
    }

    setSaving(true);
    
    // Create agent
    const { data: agent, error } = await supabase
      .from('agents')
      .insert({
        name: form.name,
        name_ar: form.name_ar || null,
        email: form.email,
        phone: form.phone || null,
        plan: form.plan,
        monthly_price: form.plan === 'pro' ? 500 : 300,
        subscription_status: 'active',
        subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        notes: form.notes || null,
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      toast.error(`خطأ: ${error.message}`);
      return;
    }

    toast.success('تم إنشاء الوكيل بنجاح');
    navigate(`/thiqa/agents/${agent.id}`);
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-2xl" dir="rtl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/thiqa/agents')}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">وكيل تأمين جديد</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>بيانات الوكيل</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>الاسم (English) *</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Agent Name" />
              </div>
              <div>
                <Label>الاسم (عربي)</Label>
                <Input value={form.name_ar} onChange={e => setForm({...form, name_ar: e.target.value})} placeholder="اسم الوكيل" />
              </div>
              <div>
                <Label>الإيميل *</Label>
                <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="agent@example.com" />
              </div>
              <div>
                <Label>الهاتف</Label>
                <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="05X-XXXXXXX" />
              </div>
              <div>
                <Label>الخطة</Label>
                <Select value={form.plan} onValueChange={v => setForm({...form, plan: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic — ₪300/شهر</SelectItem>
                    <SelectItem value="pro">Pro — ₪500/شهر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="ملاحظات إضافية..." />
            </div>
            <Button onClick={handleSubmit} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              إنشاء الوكيل
            </Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
