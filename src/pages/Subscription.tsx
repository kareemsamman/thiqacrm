import { useState, useEffect, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAgentContext } from "@/hooks/useAgentContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  CreditCard,
  Crown,
  Calendar,
  Clock,
  AlertTriangle,
  Check,
  MessageCircle,
  Sparkles,
  ShieldCheck,
  Pause,
  Info,
} from "lucide-react";
import { format } from "date-fns";

interface PlanData {
  id: string;
  plan_key: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  monthly_price: number;
  yearly_price: number;
  badge: string | null;
  features: { text: string; info?: boolean }[];
  sort_order: number;
  is_active: boolean;
}

interface PaymentRecord {
  id: string;
  agent_id: string;
  amount: number;
  plan: string;
  payment_date: string;
  notes: string | null;
  created_at: string;
}

export default function Subscription() {
  const { agent, agentId } = useAgentContext();
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);

  // Fetch subscription plans
  useEffect(() => {
    (async () => {
      setLoadingPlans(true);
      try {
        const { data, error } = await supabase
          .from("subscription_plans")
          .select("id, plan_key, name, name_ar, description, monthly_price, yearly_price, badge, features, sort_order, is_active")
          .eq("is_active", true)
          .order("sort_order");
        if (!error && data && data.length > 0) {
          setPlans(
            data.map((p: any) => ({
              ...p,
              features:
                (typeof p.features === "string"
                  ? JSON.parse(p.features)
                  : p.features) || [],
            }))
          );
        }
      } catch {
        // silent
      } finally {
        setLoadingPlans(false);
      }
    })();
  }, []);

  // Fetch payment history
  useEffect(() => {
    if (!agentId) return;
    (async () => {
      setLoadingPayments(true);
      try {
        const { data, error } = await supabase
          .from("agent_subscription_payments")
          .select("id, agent_id, amount, plan, payment_date, notes, created_at")
          .eq("agent_id", agentId)
          .order("payment_date", { ascending: false })
          .limit(100);
        if (!error && data) {
          setPayments(data);
        }
      } catch {
        // silent
      } finally {
        setLoadingPayments(false);
      }
    })();
  }, [agentId]);

  // Compute subscription details
  const subscriptionInfo = useMemo(() => {
    if (!agent) return null;

    const isTrial = agent.monthly_price === 0 || agent.monthly_price === null;
    const status = agent.subscription_status;
    const expiresAt = agent.subscription_expires_at
      ? new Date(agent.subscription_expires_at)
      : null;
    const now = new Date();
    const daysRemaining = expiresAt
      ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : null;
    const isExpired = expiresAt ? expiresAt < now : false;
    const isActive = status === "active" && !isExpired;
    const isPaused = status === "paused" || status === "suspended";

    return {
      isTrial,
      status,
      expiresAt,
      daysRemaining,
      isExpired,
      isActive,
      isPaused,
    };
  }, [agent]);

  const getStatusBadge = () => {
    if (!subscriptionInfo) return null;

    if (subscriptionInfo.isPaused) {
      return (
        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-300 gap-1.5">
          <Pause className="h-3 w-3" />
          معلّق
        </Badge>
      );
    }
    if (subscriptionInfo.isExpired) {
      return (
        <Badge variant="destructive" className="gap-1.5">
          <AlertTriangle className="h-3 w-3" />
          منتهي
        </Badge>
      );
    }
    if (subscriptionInfo.isTrial) {
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-300 gap-1.5">
          <Sparkles className="h-3 w-3" />
          تجربة مجانية
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-600 hover:bg-green-700 gap-1.5">
        <ShieldCheck className="h-3 w-3" />
        فعال
      </Badge>
    );
  };

  const getPlanDisplayName = () => {
    if (!agent) return "";
    if (subscriptionInfo?.isTrial) return "تجربة مجانية";
    const planMap: Record<string, string> = {
      starter: "Starter",
      basic: "Basic",
      pro: "Pro",
    };
    return planMap[agent.plan] || agent.plan;
  };

  return (
    <MainLayout>
      <div className="space-y-6" dir="rtl">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="h-6 w-6 text-primary" />
            إدارة الاشتراك
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            عرض تفاصيل اشتراكك الحالي والخطط المتاحة
          </p>
        </div>

        {/* ════════════════════════════════════════════════════
            Section 1: Current Plan Card
        ════════════════════════════════════════════════════ */}
        {!agent ? (
          <Skeleton className="h-48 w-full rounded-xl" />
        ) : (
          <Card className={cn(
            "border-0 shadow-sm overflow-hidden",
            subscriptionInfo?.isPaused && "border-2 border-yellow-400/30",
            subscriptionInfo?.isExpired && "border-2 border-destructive/30",
          )}>
            {/* Accent bar */}
            <div className={cn(
              "h-1.5 w-full",
              subscriptionInfo?.isPaused
                ? "bg-yellow-500"
                : subscriptionInfo?.isExpired
                  ? "bg-destructive"
                  : subscriptionInfo?.isTrial
                    ? "bg-blue-500"
                    : "bg-green-600",
            )} />

            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                {/* Right side - Plan info */}
                <div className="space-y-4 flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold">{getPlanDisplayName()}</h2>
                    {getStatusBadge()}
                  </div>

                  {/* Warning messages */}
                  {subscriptionInfo?.isPaused && (
                    <div className="flex items-start gap-2 text-sm text-yellow-700 bg-yellow-50 dark:bg-yellow-500/10 dark:text-yellow-400 rounded-lg p-3">
                      <Pause className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>
                        حسابك معلّق مؤقتاً. يرجى التواصل مع إدارة ثقة لإعادة التفعيل.
                      </span>
                    </div>
                  )}
                  {subscriptionInfo?.isExpired && (
                    <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/5 rounded-lg p-3">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>
                        انتهى اشتراكك. يرجى التواصل مع إدارة ثقة لتجديد الاشتراك.
                      </span>
                    </div>
                  )}

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {/* Monthly Price */}
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <CreditCard className="h-3.5 w-3.5" />
                        السعر الشهري
                      </p>
                      <p className="text-lg font-bold">
                        {subscriptionInfo?.isTrial
                          ? "مجاناً"
                          : `₪${agent.monthly_price?.toLocaleString() ?? 0}`}
                      </p>
                    </div>

                    {/* Expiry Date */}
                    {subscriptionInfo?.expiresAt && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          تاريخ الانتهاء
                        </p>
                        <p className="text-lg font-bold">
                          {format(subscriptionInfo.expiresAt, "dd/MM/yyyy")}
                        </p>
                      </div>
                    )}

                    {/* Days Remaining */}
                    {subscriptionInfo?.daysRemaining !== null && subscriptionInfo?.daysRemaining !== undefined && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          الأيام المتبقية
                        </p>
                        <p className={cn(
                          "text-lg font-bold",
                          subscriptionInfo.daysRemaining <= 7 && "text-destructive",
                          subscriptionInfo.daysRemaining > 7 && subscriptionInfo.daysRemaining <= 14 && "text-yellow-600",
                        )}>
                          {subscriptionInfo.isExpired
                            ? "0 يوم"
                            : `${subscriptionInfo.daysRemaining} يوم`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Left side - Contact CTA */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <a
                    href="https://wa.me/972525143581"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button className="bg-green-600 hover:bg-green-700 text-white gap-2">
                      <MessageCircle className="h-4 w-4" />
                      تواصل مع إدارة ثقة
                    </Button>
                  </a>
                  <p className="text-xs text-muted-foreground">لتجديد أو ترقية الاشتراك</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ════════════════════════════════════════════════════
            Section 2: Available Plans
        ════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold">الخطط المتاحة</h2>
            <p className="text-sm text-muted-foreground">
              قارن بين الخطط واختر ما يناسب احتياجاتك
            </p>
          </div>

          {loadingPlans ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-80 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((plan) => {
                const isCurrentPlan = agent?.plan === plan.plan_key;
                return (
                  <Card
                    key={plan.id}
                    className={cn(
                      "border shadow-sm relative overflow-hidden transition-all",
                      isCurrentPlan
                        ? "border-primary ring-2 ring-primary/20 shadow-md"
                        : "border-border hover:border-primary/30",
                    )}
                  >
                    {/* Current plan indicator */}
                    {isCurrentPlan && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
                    )}

                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          {plan.name_ar || plan.name}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {plan.badge && (
                            <Badge variant="secondary" className="text-xs">
                              {plan.badge}
                            </Badge>
                          )}
                          {isCurrentPlan && (
                            <Badge className="bg-primary text-xs gap-1">
                              <Check className="h-3 w-3" />
                              خطتك الحالية
                            </Badge>
                          )}
                        </div>
                      </div>
                      {plan.description && (
                        <CardDescription className="text-sm">
                          {plan.description}
                        </CardDescription>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Price */}
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-extrabold">
                          ₪{plan.monthly_price}
                        </span>
                        <span className="text-sm text-muted-foreground">/ شهرياً</span>
                      </div>

                      {/* Features */}
                      <ul className="space-y-2.5 pt-2">
                        {plan.features.map((f, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-muted-foreground"
                          >
                            <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                            <span>{f.text}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Action */}
                      <div className="pt-3">
                        {isCurrentPlan ? (
                          <Button variant="outline" className="w-full" disabled>
                            الخطة الحالية
                          </Button>
                        ) : (
                          <a
                            href="https://wa.me/972525143581"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <Button
                              variant="outline"
                              className="w-full gap-2 hover:bg-green-50 hover:text-green-700 hover:border-green-300 dark:hover:bg-green-500/10 dark:hover:text-green-400"
                            >
                              <MessageCircle className="h-4 w-4" />
                              طلب ترقية
                            </Button>
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Info note */}
          <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              لترقية أو تغيير خطتك، يرجى التواصل مع فريق ثقة عبر واتساب. سيتم ترتيب التحويل بما يناسب
              فترة اشتراكك الحالية.
            </span>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════
            Section 3: Payment History
        ════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              سجل المدفوعات
            </h2>
            <p className="text-sm text-muted-foreground">
              جميع المدفوعات المسجلة لاشتراكك
            </p>
          </div>

          {loadingPayments ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center text-muted-foreground">
                <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>لا توجد مدفوعات مسجلة</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-right p-3 font-medium text-muted-foreground">
                        تاريخ الدفع
                      </th>
                      <th className="text-right p-3 font-medium text-muted-foreground">
                        المبلغ
                      </th>
                      <th className="text-right p-3 font-medium text-muted-foreground">
                        الخطة
                      </th>
                      <th className="text-right p-3 font-medium text-muted-foreground">
                        ملاحظات
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                      >
                        <td className="p-3 text-sm">
                          {format(new Date(p.payment_date), "dd/MM/yyyy")}
                        </td>
                        <td className="p-3 font-semibold">
                          ₪{p.amount?.toLocaleString()}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={p.plan === "pro" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {p.plan}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground text-xs max-w-[300px] truncate">
                          {p.notes || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
