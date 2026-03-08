import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function ThiqaPayments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('agent_subscription_payments')
      .select('*, agents(name, name_ar, email)')
      .order('payment_date', { ascending: false })
      .limit(200);
    
    if (data) setPayments(data);
    setLoading(false);
  };

  return (
    <MainLayout>
      <div className="space-y-6" dir="rtl">
        <div>
          <h1 className="text-2xl font-bold">سجل المدفوعات</h1>
          <p className="text-muted-foreground">جميع مدفوعات الاشتراك من الوكلاء</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right p-3 font-medium">التاريخ</th>
                  <th className="text-right p-3 font-medium">الوكيل</th>
                  <th className="text-right p-3 font-medium">المبلغ</th>
                  <th className="text-right p-3 font-medium">الخطة</th>
                  <th className="text-right p-3 font-medium">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p: any) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-3">{format(new Date(p.payment_date), 'dd/MM/yyyy')}</td>
                    <td className="p-3 font-medium">
                      {p.agents?.name_ar || p.agents?.name || '—'}
                    </td>
                    <td className="p-3 font-medium">₪{p.amount}</td>
                    <td className="p-3">
                      <Badge variant="outline">{p.plan}</Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">{p.notes || '—'}</td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      لا توجد مدفوعات مسجلة
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
