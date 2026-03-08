import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAgentContext } from "@/hooks/useAgentContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Building2,
  Users,
  Car,
  FileText,
  CreditCard,
  CheckCircle2,
  X,
  Sparkles,
  ArrowLeft,
  Palette,
  Rocket,
  ListChecks,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  targetRoute: string;
  emoji: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "branding",
    title: "العلامة التجارية",
    description: "ارفع شعارك واسم وكالتك",
    icon: <Palette className="h-5 w-5" />,
    targetRoute: "/admin/branding",
    emoji: "🎨",
  },
  {
    id: "companies",
    title: "شركات التأمين",
    description: "أضف الشركات التي تتعامل معها",
    icon: <Building2 className="h-5 w-5" />,
    targetRoute: "/companies",
    emoji: "🏢",
  },
  {
    id: "users",
    title: "المستخدمون",
    description: "أضف موظفيك وحدد صلاحياتهم",
    icon: <Users className="h-5 w-5" />,
    targetRoute: "/admin/users",
    emoji: "👥",
  },
  {
    id: "clients",
    title: "العملاء",
    description: "ابدأ بإضافة عملائك وسياراتهم",
    icon: <Car className="h-5 w-5" />,
    targetRoute: "/clients",
    emoji: "🚗",
  },
  {
    id: "policies",
    title: "الوثائق",
    description: "أنشئ أول وثيقة تأمين",
    icon: <FileText className="h-5 w-5" />,
    targetRoute: "/policies",
    emoji: "📄",
  },
];

const ONBOARDING_KEY = "thiqa_onboarding_completed";

async function detectCompletedSteps(agentId: string): Promise<Set<string>> {
  const done = new Set<string>();
  try {
    const [agentRes, companiesRes, profilesRes, clientsRes, policiesRes] = await Promise.all([
      supabase.from("agents").select("logo_url, name_ar").eq("id", agentId).single(),
      supabase.from("insurance_companies").select("id", { count: "exact", head: true }).eq("agent_id", agentId),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("agent_id", agentId),
      supabase.from("clients").select("id", { count: "exact", head: true }).eq("agent_id", agentId),
      supabase.from("policies").select("id", { count: "exact", head: true }).eq("agent_id", agentId),
    ]);

    if (agentRes.data?.logo_url || (agentRes.data?.name_ar && agentRes.data.name_ar.length > 2)) {
      done.add("branding");
    }
    if ((companiesRes.count ?? 0) > 0) done.add("companies");
    if ((profilesRes.count ?? 0) > 1) done.add("users");
    if ((clientsRes.count ?? 0) > 0) done.add("clients");
    if ((policiesRes.count ?? 0) > 0) done.add("policies");
  } catch (e) {
    console.error("Onboarding detection error:", e);
  }
  return done;
}

export function OnboardingWizard() {
  const { user, isAdmin } = useAuth();
  const { agentId } = useAgentContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const isDashboard = location.pathname === "/" || location.pathname === "";

  useEffect(() => {
    if (!user || !isAdmin || !agentId || !isDashboard) {
      setVisible(false);
      return;
    }

    const key = `${ONBOARDING_KEY}_${user.id}`;
    const completed = localStorage.getItem(key);
    if (completed) return;

    let cancelled = false;
    detectCompletedSteps(agentId).then((done) => {
      if (cancelled) return;
      setCompletedSteps(done);

      const allDone = ONBOARDING_STEPS.every((s) => done.has(s.id));
      if (allDone) {
        localStorage.setItem(key, "true");
        return;
      }

      setReady(true);
      setTimeout(() => setVisible(true), 500);
    });

    return () => { cancelled = true; };
  }, [user, isAdmin, agentId, isDashboard]);

  const handleSkip = () => {
    if (user) localStorage.setItem(`${ONBOARDING_KEY}_${user.id}`, "true");
    setVisible(false);
  };

  const handleGoToStep = (step: OnboardingStep) => {
    setVisible(false);
    navigate(step.targetRoute);
  };

  const handleSeedData = async () => {
    if (!agentId) return;
    setSeeding(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('seed-agent-data', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;

      const seeded = data?.seeded || {};
      const parts: string[] = [];
      if (seeded.insurance_companies) parts.push(`${seeded.insurance_companies} شركة تأمين`);
      if (seeded.insurance_categories) parts.push(`${seeded.insurance_categories} نوع تأمين`);
      if (seeded.road_services) parts.push(`${seeded.road_services} خدمة طريق`);
      if (seeded.accident_fee_services) parts.push(`${seeded.accident_fee_services} خدمة إعفاء`);

      if (parts.length > 0) {
        toast.success(`تم إضافة بيانات تجريبية: ${parts.join('، ')}`);
        // Re-detect
        const done = await detectCompletedSteps(agentId);
        setCompletedSteps(done);
      } else {
        toast.info('البيانات التجريبية موجودة مسبقاً');
      }
    } catch (e: any) {
      console.error('Seed error:', e);
      toast.error('فشل في إضافة البيانات التجريبية');
    } finally {
      setSeeding(false);
    }
  };

  if (!visible || !ready) return null;

  const doneCount = ONBOARDING_STEPS.filter(s => completedSteps.has(s.id)).length;
  const progress = (doneCount / ONBOARDING_STEPS.length) * 100;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleSkip} />

      <div className="relative w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="relative bg-primary/5 px-6 pt-6 pb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSkip}
            className="absolute left-3 top-3 h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Rocket className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">مرحباً بك! 👋</h2>
              <p className="text-xs text-muted-foreground">دليل إعداد سريع لوكالتك</p>
            </div>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
              {doneCount}/{ONBOARDING_STEPS.length}
            </span>
          </div>
        </div>

        {/* Steps list */}
        <div className="px-4 py-3 space-y-1.5 max-h-[50vh] overflow-y-auto">
          {ONBOARDING_STEPS.map((step) => {
            const isDone = completedSteps.has(step.id);
            return (
              <button
                key={step.id}
                onClick={() => handleGoToStep(step)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl text-right transition-all duration-200",
                  "hover:bg-muted/80 active:scale-[0.98]",
                  isDone
                    ? "bg-primary/5 border border-primary/20"
                    : "bg-muted/40 border border-transparent hover:border-border"
                )}
              >
                {/* Icon */}
                <div className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 text-lg",
                  isDone ? "bg-primary/10" : "bg-muted"
                )}>
                  {isDone ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <span>{step.emoji}</span>
                  )}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-semibold",
                    isDone ? "text-primary" : "text-foreground"
                  )}>
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{step.description}</p>
                </div>

                {/* Arrow */}
                <ArrowLeft className={cn(
                  "h-4 w-4 shrink-0",
                  isDone ? "text-primary/50" : "text-muted-foreground/50"
                )} />
              </button>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="px-4 pb-4 pt-2 space-y-2 border-t border-border/50">
          {/* Seed data button */}
          <Button
            variant="outline"
            className="w-full h-10 gap-2 text-sm rounded-xl"
            onClick={handleSeedData}
            disabled={seeding}
          >
            {seeding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ListChecks className="h-4 w-4" />
            )}
            {seeding ? 'جاري إضافة البيانات...' : 'إضافة بيانات تجريبية للبداية'}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="flex-1 text-xs text-muted-foreground h-9"
            >
              تخطي الدليل
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function useResetOnboarding() {
  const { user } = useAuth();
  return () => {
    if (user) {
      localStorage.removeItem(`${ONBOARDING_KEY}_${user.id}`);
      window.location.reload();
    }
  };
}
