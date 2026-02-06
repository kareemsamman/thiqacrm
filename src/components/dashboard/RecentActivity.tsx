import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Users, Car, CreditCard, Loader2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Activity {
  id: string;
  type: "policy" | "payment" | "client" | "car";
  action: string;
  created_at: string;
  createdBy?: string;
  details: {
    amount?: number;
    payment_type?: string;
    cheque_number?: string;
    policy_type?: string;
    company_name?: string;
    car_number?: string;
    client_name?: string;
    client_file_number?: string;
    insurance_price?: number;
  };
}

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  cash: "نقدًا",
  cheque: "شيك",
  visa: "فيزا",
  transfer: "حوالة",
  credit_card: "بطاقة",
};

const PAYMENT_TYPE_COLORS: Record<string, string> = {
  cash: "bg-green-500/10 text-green-600",
  cheque: "bg-amber-500/10 text-amber-600",
  visa: "bg-blue-500/10 text-blue-600",
  transfer: "bg-purple-500/10 text-purple-600",
  credit_card: "bg-indigo-500/10 text-indigo-600",
};

const POLICY_TYPE_LABELS: Record<string, string> = {
  ELZAMI: "إلزامي",
  THIRD_FULL: "شامل",
  ROAD_SERVICE: "خدمة طريق",
  ACCIDENT_FEE_EXEMPTION: "إعفاء حوادث",
  HEALTH: "صحي",
  LIFE: "حياة",
  TRAVEL: "سفر",
  PROPERTY: "ممتلكات",
  BUSINESS: "أعمال",
  OTHER: "أخرى",
};

const typeColors = {
  policy: "text-primary bg-primary/10",
  payment: "text-success bg-success/10",
  client: "text-accent bg-accent/10",
  car: "text-warning bg-warning/10",
};

const typeIcons = {
  policy: FileText,
  payment: CreditCard,
  client: Users,
  car: Car,
};

export function RecentActivity() {
  const { profile } = useAuth();
  const branchId = profile?.branch_id;

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["recent-activity", branchId],
    queryFn: async () => {
      const results: Activity[] = [];
      const branchFilter = branchId ? { branch_id: branchId } : {};

      // Fetch recent policies with full details
      const { data: policies } = await supabase
        .from("policies")
        .select(`
          id, created_at, policy_type_parent, policy_type_child, cancelled, insurance_price,
          clients(full_name, file_number, deleted_at),
          cars(car_number),
          insurance_companies(name, name_ar),
          created_by_profile:profiles!policies_created_by_admin_id_fkey(full_name)
        `)
        .order("created_at", { ascending: false })
        .match(branchFilter)
        .eq("cancelled", false)
        .limit(10);

      if (policies) {
        for (const p of policies) {
          if ((p.clients as any)?.deleted_at) continue;
          const clientName = (p.clients as any)?.full_name || "عميل";
          const fileNumber = (p.clients as any)?.file_number || "";
          const policyLabel = POLICY_TYPE_LABELS[p.policy_type_parent] || p.policy_type_parent || "وثيقة";
          const companyName = (p.insurance_companies as any)?.name_ar || (p.insurance_companies as any)?.name || "";
          const carNumber = (p.cars as any)?.car_number || "";

          results.push({
            id: `policy-${p.id}`,
            type: "policy",
            action: "وثيقة جديدة",
            created_at: p.created_at,
            createdBy: (p.created_by_profile as any)?.full_name || undefined,
            details: {
              policy_type: policyLabel,
              company_name: companyName,
              car_number: carNumber,
              client_name: clientName,
              client_file_number: fileNumber,
              insurance_price: p.insurance_price || undefined,
            },
          });
        }
      }

      // Fetch recent payments with full details
      const { data: payments } = await supabase
        .from("policy_payments")
        .select(`
          id, created_at, amount, payment_type, cheque_number,
          policies(
            cancelled, 
            policy_type_parent,
            insurance_companies(name, name_ar),
            cars(car_number),
            clients(full_name, file_number, deleted_at)
          ),
          created_by_profile:profiles!policy_payments_created_by_admin_id_fkey(full_name)
        `)
        .order("created_at", { ascending: false })
        .match(branchFilter)
        .limit(15);

      if (payments) {
        for (const pay of payments) {
          if ((pay.policies as any)?.cancelled) continue;
          if ((pay.policies as any)?.clients?.deleted_at) continue;
          if ((pay.policies as any)?.policy_type_parent === "ELZAMI") continue;

          const clientName = (pay.policies as any)?.clients?.full_name || "عميل";
          const fileNumber = (pay.policies as any)?.clients?.file_number || "";
          const policyType = POLICY_TYPE_LABELS[(pay.policies as any)?.policy_type_parent] || "";
          const companyName =
            (pay.policies as any)?.insurance_companies?.name_ar ||
            (pay.policies as any)?.insurance_companies?.name ||
            "";
          const carNumber = (pay.policies as any)?.cars?.car_number || "";

          results.push({
            id: `payment-${pay.id}`,
            type: "payment",
            action: "دفعة مستلمة",
            created_at: pay.created_at,
            createdBy: (pay.created_by_profile as any)?.full_name || undefined,
            details: {
              amount: pay.amount,
              payment_type: pay.payment_type || "cash",
              cheque_number: pay.cheque_number || undefined,
              policy_type: policyType,
              company_name: companyName,
              car_number: carNumber,
              client_name: clientName,
              client_file_number: fileNumber,
            },
          });
        }
      }

      // Fetch recent clients
      const { data: clients } = await supabase
        .from("clients")
        .select(`
          id, created_at, full_name, file_number,
          created_by_profile:profiles!clients_created_by_admin_id_fkey(full_name)
        `)
        .order("created_at", { ascending: false })
        .match(branchFilter)
        .is("deleted_at", null)
        .limit(5);

      if (clients) {
        for (const c of clients) {
          results.push({
            id: `client-${c.id}`,
            type: "client",
            action: "عميل جديد",
            created_at: c.created_at,
            createdBy: (c.created_by_profile as any)?.full_name || undefined,
            details: {
              client_name: c.full_name,
              client_file_number: c.file_number || "",
            },
          });
        }
      }

      // Fetch recent cars
      const { data: cars } = await supabase
        .from("cars")
        .select(`
          id, created_at, updated_at, car_number,
          clients(full_name, file_number),
          created_by_profile:profiles!cars_created_by_admin_id_fkey(full_name)
        `)
        .order("updated_at", { ascending: false })
        .match(branchFilter)
        .is("deleted_at", null)
        .limit(5);

      if (cars) {
        for (const car of cars) {
          const isNew = car.created_at === car.updated_at;
          results.push({
            id: `car-${car.id}`,
            type: "car",
            action: isNew ? "سيارة جديدة" : "تحديث سيارة",
            created_at: car.updated_at,
            createdBy: (car.created_by_profile as any)?.full_name || undefined,
            details: {
              car_number: car.car_number,
              client_name: (car.clients as any)?.full_name || "",
              client_file_number: (car.clients as any)?.file_number || "",
            },
          });
        }
      }

      // Sort all by created_at descending and take top 5
      results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return results.slice(0, 5);
    },
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card className="border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">النشاط الأخير</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className="border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">النشاط الأخير</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground text-sm">
          لا يوجد نشاط حديث
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-4 flex-row items-center justify-between">
        <CardTitle className="text-base">النشاط الأخير</CardTitle>
        <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-primary gap-1">
          <Link to="/activity">
            عرض الكل
            <ArrowLeft className="h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.map((activity, index) => {
          const Icon = typeIcons[activity.type];
          return (
            <div
              key={activity.id}
              className={cn("flex items-start gap-3 animate-fade-in", `stagger-${index + 1}`)}
              style={{ animationFillMode: "backwards" }}
            >
              <div className={cn("rounded-lg p-2", typeColors[activity.type])}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                {/* Header */}
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground">{activity.action}</p>
                  {activity.createdBy && (
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      بواسطة {activity.createdBy}
                    </span>
                  )}
                </div>

                {/* Details Line 1: Client */}
                <p className="text-sm text-muted-foreground truncate">
                  {activity.details.client_name}
                  {activity.details.client_file_number && (
                    <span className="text-xs mr-1">({activity.details.client_file_number})</span>
                  )}
                </p>

                {/* Details Line 2: Payment or Policy specifics */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {activity.type === "payment" && (
                    <>
                      <span className="font-semibold text-success">
                        ₪{(activity.details.amount || 0).toLocaleString()}
                      </span>
                      {activity.details.payment_type && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0",
                            PAYMENT_TYPE_COLORS[activity.details.payment_type] || PAYMENT_TYPE_COLORS.cash
                          )}
                        >
                          {PAYMENT_TYPE_LABELS[activity.details.payment_type] || activity.details.payment_type}
                        </Badge>
                      )}
                      {activity.details.policy_type && activity.details.company_name && (
                        <span className="text-muted-foreground">
                          {activity.details.policy_type} → {activity.details.company_name}
                        </span>
                      )}
                    </>
                  )}

                  {activity.type === "policy" && (
                    <>
                      {activity.details.policy_type && (
                        <span className="text-muted-foreground">
                          {activity.details.policy_type}
                          {activity.details.company_name && ` → ${activity.details.company_name}`}
                        </span>
                      )}
                      {activity.details.insurance_price && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          ₪{activity.details.insurance_price.toLocaleString()}
                        </Badge>
                      )}
                    </>
                  )}

                  {activity.type === "car" && activity.details.car_number && (
                    <span className="text-muted-foreground">{activity.details.car_number}</span>
                  )}
                </div>
              </div>

              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: ar })}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
