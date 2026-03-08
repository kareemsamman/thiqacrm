import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface Agent {
  id: string;
  name: string;
  name_ar: string | null;
  email: string;
  phone: string | null;
  plan: string;
  subscription_status: string;
  subscription_expires_at: string | null;
  monthly_price: number | null;
  created_at: string;
}

export default function ThiqaAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) setAgents(data as Agent[]);
    setLoading(false);
  };

  const filteredAgents = agents.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase()) ||
    (a.name_ar && a.name_ar.includes(search))
  );

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-600">فعال</Badge>;
      case 'suspended': return <Badge variant="destructive">معلّق</Badge>;
      case 'expired': return <Badge variant="secondary">منتهي</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const planBadge = (plan: string) => {
    switch (plan) {
      case 'pro': return <Badge className="bg-primary">Pro</Badge>;
      case 'basic': return <Badge variant="outline">Basic</Badge>;
      default: return <Badge variant="outline">{plan}</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">إدارة الوكلاء</h1>
            <p className="text-muted-foreground">إدارة وكلاء التأمين المشتركين في منصة ثقة</p>
          </div>
          <Button onClick={() => navigate('/thiqa/agents/new')}>
            <Plus className="h-4 w-4 ml-2" />
            وكيل جديد
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو الإيميل..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right p-3 font-medium">الوكيل</th>
                  <th className="text-right p-3 font-medium">الإيميل</th>
                  <th className="text-right p-3 font-medium">الخطة</th>
                  <th className="text-right p-3 font-medium">الحالة</th>
                  <th className="text-right p-3 font-medium">انتهاء الاشتراك</th>
                  <th className="text-right p-3 font-medium">السعر</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgents.map(agent => (
                  <tr 
                    key={agent.id} 
                    className="border-t hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => navigate(`/thiqa/agents/${agent.id}`)}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{agent.name_ar || agent.name}</div>
                          {agent.phone && <div className="text-xs text-muted-foreground">{agent.phone}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{agent.email}</td>
                    <td className="p-3">{planBadge(agent.plan)}</td>
                    <td className="p-3">{statusBadge(agent.subscription_status)}</td>
                    <td className="p-3 text-muted-foreground">
                      {agent.subscription_expires_at 
                        ? format(new Date(agent.subscription_expires_at), 'dd/MM/yyyy')
                        : '—'}
                    </td>
                    <td className="p-3 font-medium">{agent.monthly_price ? `₪${agent.monthly_price}` : '—'}</td>
                  </tr>
                ))}
                {filteredAgents.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      لا يوجد وكلاء
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
