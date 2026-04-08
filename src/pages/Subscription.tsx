import { useState, useEffect, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAgentContext } from "@/hooks/useAgentContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Crown, CreditCard, Calendar, Clock, AlertTriangle, Check, MessageCircle,
  Sparkles, ShieldCheck, Pause, Info, ArrowUp, ArrowDown, Zap, Star,
  Rocket, Shield, Trash2, XCircle, Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";

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
}

interface PaymentRecord {
  id: string;
  amount: number;
  plan: string;
  payment_date: string;
  notes: string | null;
  created_at: string;
}

const PLAN_ICONS: Record<string, typeof Rocket> = {
  starter: Zap,
  basic: Shield,
  pro: Rocket,
  custom: Star,
};

export default function Subscription() {
  const { isAdmin } = useAuth();
  const { agent, agentId } = useAgentContext();
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [changingPlan, setChangingPlan] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "upgrade" | "downgrade" | "cancel";
    plan?: PlanData;
  } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingPlans(true);
      try {
        const { data } = await supabase
          .from("subscription_plans")
          .select("id, plan_key, name, name_ar, description, monthly_price, yearly_price, badge, features, sort_order")
          .eq("is_active", true)
          .order("sort_order");
        if (data && data.length > 0) {
          setPlans(data.map((p: any) => ({
            ...p,
            features: (typeof p.features === "string" ? JSON.parse(p.features) : p.features) || [],
          })));
        }
      } catch { /* silent */ } finally { setLoadingPlans(false); }
    })();
  }, []);

  useEffect(() => {
    if (!agentId) return;
    (async () => {
      setLoadingPayments(true);
      try {
        const { data } = await supabase
          .from("agent_subscription_payments")
          .select("id, amount, plan, payment_date, notes, created_at")
          .eq("agent_id", agentId)
          .order("payment_date", { ascending: false })
          .limit(50);
        if (data) setPayments(data);
      } catch { /* silent */ } finally { setLoadingPayments(false); }
    })();
  }, [agentId]);

  const sub = useMemo(() => {
    if (!agent) return null;
    const status = agent.subscription_status;
    const isTrial = status === "trial" || (agent.monthly_price === 0 && status === "active");
    const trialEnd = agent.trial_ends_at ? new Date(agent.trial_ends_at) : (isTrial && agent.subscription_expires_at ? new Date(agent.subscription_expires_at) : null);
    const expiresAt = agent.subscription_expires_at ? new Date(agent.subscription_expires_at) : null;
    const now = new Date();
    const endDate = isTrial ? trialEnd : expiresAt;
    const daysRemaining = endDate ? Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / 86400000)) : null;
    const isExpired = endDate ? endDate < now : false;
    const isActive = (status === "active" || status === "trial") && !isExpired;
    const isPaused = status === "paused" || status === "suspended";
    const isCancelled = status === "cancelled";
    const trialProgress = isTrial && trialEnd
      ? Math.min(100, Math.max(0, ((35 - (daysRemaining || 0)) / 35) * 100))
      : 0;
    return { isTrial, trialEnd, expiresAt: endDate, daysRemaining, isExpired, isActive, isPaused, isCancelled, trialProgress };
  }, [agent]);

  const handlePlanChange = async (targetPlan: PlanData) => {
    if (!agent || !agentId) return;
    setChangingPlan(true);
    try {
      const isUpgrade = targetPlan.monthly_price > (agent.monthly_price || 0);

      if (sub?.isTrial) {
        // During trial: store pending_plan, activate after trial
        const { error } = await supabase.from("agents").update({
          pending_plan: targetPlan.plan_key,
        }).eq("id", agentId);
        if (error) throw error;
        toast.success(`تم اختيار خطة ${targetPlan.name}. ستبدأ بعد انتهاء الفترة التجريبية.`);
      } else {
        // Immediate plan change
        const { error } = await supabase.from("agents").update({
          plan: targetPlan.plan_key,
          monthly_price: targetPlan.monthly_price,
        }).eq("id", agentId);
        if (error) throw error;
        toast.success(isUpgrade
          ? `تمت الترقية إلى خطة ${targetPlan.name} بنجاح!`
          : `تم التحويل إلى خطة ${targetPlan.name}.`
        );
      }
      // Reload
      window.location.reload();
    } catch (e: any) {
      toast.error(e.message || "فشل في تغيير الخطة");
    } finally {
      setChangingPlan(false);
      setConfirmDialog(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!agentId) return;
    setChangingPlan(true);
    try {
      const { error } = await supabase.from("agents").update({
        subscription_status: "cancelled",
        cancelled_at: new Date().toISOString(),
      }).eq("id", agentId);
      if (error) throw error;
      toast.success("تم إلغاء الاشتراك. يمكنك إعادة الاشتراك في أي وقت.");
      window.location.reload();
    } catch (e: any) {
      toast.error(e.message || "فشل في إلغاء الاشتراك");
    } finally {
      setChangingPlan(false);
      setConfirmDialog(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (!agentId) return;
    setDeletingAccount(true);
    try {
      const { error } = await supabase.functions.invoke("delete-agent", {
        body: { agentId },
      });
      if (error) throw error;
      toast.success("تم حذف الحساب بنجاح.");
      // Sign out
      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch (e: any) {
      toast.error(e.message || "فشل في حذف الحساب");
      setDeletingAccount(false);
      setDeleteDialog(false);
    }
  };

  if (!agent) return null;

  const currentPlanData = plans.find(p => p.plan_key === agent.plan);

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto" dir="rtl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="h-6 w-6 text-primary" />
            إدارة الاشتراك
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            عرض وإدارة اشتراكك وتغيير خطتك
          </p>
        </div>

        {/* ═══ Current Plan Card ═══ */}
        {!sub ? <Skeleton className="h-48 w-full rounded-xl" /> : (
          <Card className={cn(
            "overflow-hidden border-0 shadow-md",
            sub.isPaused && "ring-2 ring-yellow-400/40",
            sub.isExpired && "ring-2 ring-destructive/40",
            sub.isCancelled && "ring-2 ring-muted",
          )}>
            <div className={cn(
              "h-1.5 w-full",
              sub.isPaused ? "bg-yellow-500" :
              sub.isExpired || sub.isCancelled ? "bg-destructive" :
              sub.isTrial ? "bg-gradient-to-l from-blue-500 to-purple-500" :
              "bg-gradient-to-l from-green-500 to-emerald-600"
            )} />
            <CardContent className="p-5 md:p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
                <div className="space-y-4 flex-1">
                  {/* Plan name + badge */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center",
                      sub.isTrial ? "bg-blue-100 text-blue-600" :
                      sub.isPaused ? "bg-yellow-100 text-yellow-600" :
                      sub.isExpired || sub.isCancelled ? "bg-red-100 text-red-600" :
                      "bg-green-100 text-green-600"
                    )}>
                      {sub.isTrial ? <Sparkles className="h-5 w-5" /> :
                       sub.isPaused ? <Pause className="h-5 w-5" /> :
                       sub.isExpired || sub.isCancelled ? <AlertTriangle className="h-5 w-5" /> :
                       <ShieldCheck className="h-5 w-5" />}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">
                        {sub.isTrial ? "تجربة مجانية" :
                         sub.isCancelled ? "اشتراك ملغي" :
                         `خطة ${currentPlanData?.name || agent.plan}`}
                      </h2>
                      <Badge className={cn("text-[10px] mt-0.5",
                        sub.isTrial ? "bg-blue-600" :
                        sub.isPaused ? "bg-yellow-500" :
                        sub.isExpired || sub.isCancelled ? "bg-destructive" :
                        "bg-green-600"
                      )}>
                        {sub.isTrial ? "فترة تجريبية" :
                         sub.isPaused ? "معلّق" :
                         sub.isExpired ? "منتهي" :
                         sub.isCancelled ? "ملغي" : "فعال"}
                      </Badge>
                    </div>
                  </div>

                  {/* Trial progress */}
                  {sub.isTrial && sub.daysRemaining !== null && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">الفترة التجريبية</span>
                        <span className={cn("font-bold", sub.daysRemaining <= 7 ? "text-destructive" : "text-blue-600")}>
                          {sub.daysRemaining} يوم متبقي من 35
                        </span>
                      </div>
                      <Progress value={sub.trialProgress} className="h-2" />
                      {agent.pending_plan && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Info className="h-3.5 w-3.5" />
                          ستبدأ خطة {agent.pending_plan === "pro" ? "Pro" : "Basic"} تلقائياً بعد انتهاء التجربة
                        </p>
                      )}
                    </div>
                  )}

                  {/* Warning messages */}
                  {sub.isPaused && (
                    <div className="flex items-start gap-2 text-sm text-yellow-700 bg-yellow-50 rounded-lg p-3">
                      <Pause className="h-4 w-4 mt-0.5 shrink-0" />
                      حسابك معلّق. تواصل مع إدارة ثقة لإعادة التفعيل.
                    </div>
                  )}
                  {sub.isExpired && !sub.isCancelled && (
                    <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/5 rounded-lg p-3">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      انتهى اشتراكك. اختر خطة للاستمرار.
                    </div>
                  )}

                  {/* Stats */}
                  {!sub.isTrial && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><CreditCard className="h-3.5 w-3.5" />السعر الشهري</p>
                        <p className="text-lg font-bold">₪{agent.monthly_price?.toLocaleString() ?? 0}</p>
                      </div>
                      {sub.expiresAt && (
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />تاريخ الانتهاء</p>
                          <p className="text-lg font-bold">{format(sub.expiresAt, "dd/MM/yyyy")}</p>
                        </div>
                      )}
                      {sub.daysRemaining !== null && !sub.isExpired && (
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" />الأيام المتبقية</p>
                          <p className={cn("text-lg font-bold", sub.daysRemaining <= 7 && "text-destructive")}>{sub.daysRemaining} يوم</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Contact CTA */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <a href="https://wa.me/972525143581" target="_blank" rel="noopener noreferrer">
                    <Button className="bg-green-600 hover:bg-green-700 text-white gap-2">
                      <MessageCircle className="h-4 w-4" />
                      تواصل مع إدارة ثقة
                    </Button>
                  </a>
                  <p className="text-xs text-muted-foreground">للمساعدة والاستفسارات</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ Plans Section ═══ */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold">الخطط المتاحة</h2>
            <p className="text-sm text-muted-foreground">اختر الخطة التي تناسب احتياجاتك</p>
          </div>

          {loadingPlans ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-80 w-full rounded-xl" />)}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map((plan) => {
                  const isCurrent = agent.plan === plan.plan_key;
                  const isPending = agent.pending_plan === plan.plan_key;
                  const isUpgrade = plan.monthly_price > (agent.monthly_price || 0);
                  const PlanIcon = PLAN_ICONS[plan.plan_key] || Shield;

                  return (
                    <Card key={plan.id} className={cn(
                      "relative overflow-hidden transition-all",
                      isCurrent ? "border-2 border-primary shadow-lg" : "border hover:border-primary/40 hover:shadow-md",
                      isPending && "border-2 border-blue-500"
                    )}>
                      {isCurrent && (
                        <div className="absolute top-0 inset-x-0 bg-primary text-primary-foreground text-center text-xs font-bold py-1">
                          خطتك الحالية
                        </div>
                      )}
                      {isPending && !isCurrent && (
                        <div className="absolute top-0 inset-x-0 bg-blue-600 text-white text-center text-xs font-bold py-1">
                          ستبدأ بعد التجربة
                        </div>
                      )}
                      {plan.badge && !isCurrent && !isPending && (
                        <div className="absolute top-0 inset-x-0 bg-muted text-muted-foreground text-center text-xs font-medium py-1">
                          {plan.badge}
                        </div>
                      )}

                      <CardContent className={cn("pt-8 pb-5 space-y-4", (isCurrent || isPending || plan.badge) && "pt-10")}>
                        {/* Plan header with icon */}
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center",
                            isCurrent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          )}>
                            <PlanIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold">{plan.name}</h4>
                            {plan.name_ar && <p className="text-xs text-muted-foreground">{plan.name_ar}</p>}
                          </div>
                        </div>

                        {/* Price */}
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl font-extrabold">₪{plan.monthly_price}</span>
                          <span className="text-sm text-muted-foreground">/ شهرياً</span>
                        </div>

                        {plan.description && (
                          <p className="text-xs text-muted-foreground leading-relaxed">{plan.description}</p>
                        )}

                        {/* Features */}
                        <ul className="space-y-2">
                          {plan.features.map((f, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                              <span>{f.text}</span>
                            </li>
                          ))}
                        </ul>

                        {/* Action button */}
                        <div className="pt-2">
                          {isCurrent ? (
                            <Button variant="outline" className="w-full" disabled>الخطة الحالية</Button>
                          ) : isPending ? (
                            <Button variant="outline" className="w-full border-blue-300 text-blue-600" disabled>تم الاختيار</Button>
                          ) : (
                            <Button
                              className={cn("w-full gap-2",
                                isUpgrade ? "bg-primary hover:bg-primary/90" : "bg-muted text-foreground hover:bg-muted/80"
                              )}
                              onClick={() => setConfirmDialog({
                                type: isUpgrade ? "upgrade" : "downgrade",
                                plan,
                              })}
                            >
                              {isUpgrade ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                              {isUpgrade ? "ترقية" : "تغيير"} للخطة
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Custom Plan Card */}
                <Card className="border border-dashed hover:border-primary/40 transition-all">
                  <CardContent className="pt-8 pb-5 space-y-4 flex flex-col items-center justify-center text-center min-h-[300px]">
                    <div className="h-12 w-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                      <Star className="h-6 w-6" />
                    </div>
                    <h4 className="text-lg font-bold">خطة مخصصة</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      تحتاج ميزات محددة أو أسعار خاصة؟<br />تواصل معنا لإنشاء خطة تناسب احتياجاتك.
                    </p>
                    <a
                      href={`https://wa.me/972525143581?text=${encodeURIComponent(`مرحباً، أريد طلب خطة اشتراك مخصصة.\nمعرف الوكيل: ${agentId}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full"
                    >
                      <Button variant="outline" className="w-full gap-2 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300">
                        <MessageCircle className="h-4 w-4" />
                        طلب خطة مخصصة
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              </div>

              {/* Proration note */}
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <strong>ملاحظة حول تغيير الخطة:</strong> عند الترقية، ستحصل على الميزات الجديدة فوراً ويتم احتساب الفرق في الفاتورة القادمة.
                  عند التخفيض، يتم التحويل فوراً بدون استرجاع لأيام الخطة السابقة.
                </div>
              </div>
            </>
          )}
        </div>

        {/* ═══ Payment History ═══ */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            سجل المدفوعات
          </h2>

          {loadingPayments ? (
            <Skeleton className="h-40 w-full rounded-xl" />
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
                      <th className="text-right p-3 font-medium text-muted-foreground">تاريخ الدفع</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">المبلغ</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">الخطة</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="p-3">{format(new Date(p.payment_date), "dd/MM/yyyy")}</td>
                        <td className="p-3 font-semibold">₪{p.amount?.toLocaleString()}</td>
                        <td className="p-3"><Badge variant={p.plan === "pro" ? "default" : "secondary"} className="text-xs">{p.plan}</Badge></td>
                        <td className="p-3 text-muted-foreground text-xs truncate max-w-[200px]">{p.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        {/* ═══ Danger Zone ═══ */}
        {isAdmin && (
          <Card className="border border-destructive/20">
            <CardContent className="py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-destructive flex items-center gap-2"><XCircle className="h-4 w-4" />منطقة الخطر</h3>
                <p className="text-xs text-muted-foreground mt-1">إلغاء الاشتراك أو حذف الحساب بالكامل مع جميع البيانات</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {sub?.isActive && !sub.isCancelled && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                    onClick={() => setConfirmDialog({ type: "cancel" })}
                  >
                    <Pause className="h-3.5 w-3.5 ml-1" />
                    إلغاء الاشتراك
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialog(true)}
                >
                  <Trash2 className="h-3.5 w-3.5 ml-1" />
                  حذف الحساب
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ Confirm Plan Change Dialog ═══ */}
        <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
          <DialogContent dir="rtl" className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {confirmDialog?.type === "upgrade" && "تأكيد الترقية"}
                {confirmDialog?.type === "downgrade" && "تأكيد تغيير الخطة"}
                {confirmDialog?.type === "cancel" && "تأكيد إلغاء الاشتراك"}
              </DialogTitle>
              <DialogDescription className="text-right">
                {confirmDialog?.type === "upgrade" && confirmDialog.plan && (
                  <>
                    سيتم ترقيتك إلى خطة <strong>{confirmDialog.plan.name}</strong> بسعر <strong>₪{confirmDialog.plan.monthly_price}/شهر</strong>.
                    {sub?.isTrial
                      ? " ستبدأ الخطة بعد انتهاء الفترة التجريبية."
                      : " ستحصل على الميزات الجديدة فوراً. الفرق يُحسب في الفاتورة القادمة."}
                  </>
                )}
                {confirmDialog?.type === "downgrade" && confirmDialog.plan && (
                  <>
                    سيتم تحويلك إلى خطة <strong>{confirmDialog.plan.name}</strong> بسعر <strong>₪{confirmDialog.plan.monthly_price}/شهر</strong>.
                    التحويل فوري ولا يتم استرجاع أيام الخطة السابقة.
                  </>
                )}
                {confirmDialog?.type === "cancel" && (
                  <>
                    هل أنت متأكد من إلغاء اشتراكك؟ ستفقد الوصول للنظام.
                    يمكنك إعادة الاشتراك لاحقاً عبر التواصل مع إدارة ثقة.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 sm:flex-row-reverse">
              <Button variant="outline" onClick={() => setConfirmDialog(null)} disabled={changingPlan}>إلغاء</Button>
              <Button
                className={confirmDialog?.type === "cancel" ? "bg-yellow-600 hover:bg-yellow-700" : ""}
                onClick={() => {
                  if (confirmDialog?.type === "cancel") handleCancelSubscription();
                  else if (confirmDialog?.plan) handlePlanChange(confirmDialog.plan);
                }}
                disabled={changingPlan}
              >
                {changingPlan && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                {confirmDialog?.type === "upgrade" && "تأكيد الترقية"}
                {confirmDialog?.type === "downgrade" && "تأكيد التحويل"}
                {confirmDialog?.type === "cancel" && "تأكيد الإلغاء"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ═══ Delete Account Dialog ═══ */}
        <DeleteConfirmDialog
          open={deleteDialog}
          onOpenChange={setDeleteDialog}
          onConfirm={handleDeleteAccount}
          title="حذف الحساب بالكامل"
          description="سيتم حذف حسابك وجميع البيانات المرتبطة به (عملاء، وثائق، مدفوعات، ملفات) بشكل نهائي ولا يمكن التراجع. هل أنت متأكد؟"
          loading={deletingAccount}
        />
      </div>
    </MainLayout>
  );
}
