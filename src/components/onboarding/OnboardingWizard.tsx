import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  CheckCircle2,
  X,
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

async function detectCompletedSteps(agentId: string): Promise<Set<string>> {
  const done = new Set<string>();
  try {
    const [agentRes, siteSettingsRes, companiesRes, profilesRes, clientsRes, policiesRes] = await Promise.all([
      supabase.from("agents").select("logo_url, name_ar").eq("id", agentId).single(),
      supabase
        .from("site_settings")
        .select("logo_url, site_title, site_description")
        .eq("agent_id", agentId)
        .maybeSingle(),
      supabase.from("insurance_companies").select("id", { count: "exact", head: true }).eq("agent_id", agentId),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("agent_id", agentId),
      supabase.from("clients").select("id", { count: "exact", head: true }).eq("agent_id", agentId),
      supabase.from("policies").select("id", { count: "exact", head: true }).eq("agent_id", agentId),
    ]);

    const agentBrandingReady =
      Boolean(agentRes.data?.logo_url) ||
      Boolean(agentRes.data?.name_ar && agentRes.data.name_ar.trim().length > 2);

    const siteBrandingReady =
      Boolean(siteSettingsRes.data?.logo_url) ||
      Boolean(siteSettingsRes.data?.site_title && siteSettingsRes.data.site_title.trim().length > 0) ||
      Boolean(siteSettingsRes.data?.site_description && siteSettingsRes.data.site_description.trim().length > 0);

    if (agentBrandingReady || siteBrandingReady) done.add("branding");
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
  const [visible, setVisible] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const previousDoneCountRef = useRef(0);

  const refreshCompletedSteps = useCallback(async () => {
    if (!agentId) return { done: new Set<string>(), gainedProgress: false };

    const done = await detectCompletedSteps(agentId);
    setCompletedSteps(done);

    const doneCount = ONBOARDING_STEPS.filter((step) => done.has(step.id)).length;
    const gainedProgress = doneCount > previousDoneCountRef.current;
    previousDoneCountRef.current = doneCount;

    return { done, gainedProgress };
  }, [agentId]);

  // Listen for manual trigger from sidebar profile menu
  useEffect(() => {
    const manualOpenHandler = () => {
      setManualOpen(true);
      setReady(true);
      setVisible(true);
      refreshCompletedSteps();
    };

    const progressUpdatedHandler = async () => {
      if (onboardingCompleted) return;

      const { done, gainedProgress } = await refreshCompletedSteps();
      const allDone = ONBOARDING_STEPS.every((s) => done.has(s.id));

      if (allDone && user?.id) {
        await supabase.from("profiles").update({ onboarding_completed: true } as any).eq("id", user.id);
        setOnboardingCompleted(true);
        return;
      }

      if (gainedProgress) {
        setReady(true);
        setVisible(true);
      }
    };

    window.addEventListener("show-onboarding", manualOpenHandler);
    window.addEventListener("onboarding-progress-updated", progressUpdatedHandler);

    return () => {
      window.removeEventListener("show-onboarding", manualOpenHandler);
      window.removeEventListener("onboarding-progress-updated", progressUpdatedHandler);
    };
  }, [refreshCompletedSteps, onboardingCompleted, user?.id]);

  // Auto-show onboarding if not completed yet
  useEffect(() => {
    if (!user || !isAdmin || !agentId) {
      if (!manualOpen) setVisible(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", user.id)
          .single();

        if (cancelled) return;

        const isCompleted = Boolean((profile as any)?.onboarding_completed);
        setOnboardingCompleted(isCompleted);
        if (isCompleted) return;

        const { done } = await refreshCompletedSteps();
        if (cancelled) return;

        const allDone = ONBOARDING_STEPS.every((s) => done.has(s.id));
        if (allDone) {
          await supabase.from("profiles").update({ onboarding_completed: true } as any).eq("id", user.id);
          setOnboardingCompleted(true);
          return;
        }

        setReady(true);
        setTimeout(() => {
          if (!cancelled) setVisible(true);
        }, 500);
      } catch (e) {
        console.error("Onboarding check error:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, isAdmin, agentId, manualOpen, refreshCompletedSteps]);

  // Re-check progress periodically while onboarding is still active
  useEffect(() => {
    if (!user || !isAdmin || !agentId || onboardingCompleted !== false || manualOpen) return;

    const intervalId = window.setInterval(async () => {
      if (document.hidden || visible) return;

      const { done, gainedProgress } = await refreshCompletedSteps();
      if (!gainedProgress) return;

      const allDone = ONBOARDING_STEPS.every((s) => done.has(s.id));
      if (allDone && user.id) {
        await supabase.from("profiles").update({ onboarding_completed: true } as any).eq("id", user.id);
        setOnboardingCompleted(true);
        return;
      }

      setReady(true);
      setVisible(true);
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [user, isAdmin, agentId, onboardingCompleted, manualOpen, visible, refreshCompletedSteps]);

  const handleSkip = async () => {
    setVisible(false);
    setManualOpen(false);
    // Mark completed in DB
    if (user && !manualOpen) {
      await supabase.from("profiles").update({ onboarding_completed: true } as any).eq("id", user.id);
    }
  };

  const handleClose = () => {
    setVisible(false);
    setManualOpen(false);
  };

  const handleGoToStep = (step: OnboardingStep) => {
    setVisible(false);
    setManualOpen(false);
    navigate(step.targetRoute);
  };

  const handleSeedData = async () => {
    if (!agentId) return;
    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-agent-data');
      if (error) throw error;

      const seeded = data?.seeded || {};
      const parts: string[] = [];
      if (seeded.insurance_companies) parts.push(`${seeded.insurance_companies} شركة تأمين`);
      if (seeded.insurance_categories) parts.push(`${seeded.insurance_categories} نوع تأمين`);
      if (seeded.road_services) parts.push(`${seeded.road_services} خدمة طريق`);
      if (seeded.accident_fee_services) parts.push(`${seeded.accident_fee_services} خدمة إعفاء`);

      if (parts.length > 0) {
        toast.success(`تم إضافة بيانات تجريبية: ${parts.join('، ')}`);
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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="relative bg-primary/5 px-6 pt-6 pb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
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

                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-semibold transition-all",
                    isDone ? "text-primary line-through decoration-2 decoration-primary/60" : "text-foreground"
                  )}>
                    {step.title}
                  </p>
                  <p className={cn("text-xs truncate", isDone ? "text-primary/70 line-through decoration-primary/40" : "text-muted-foreground")}>{step.description}</p>
                </div>

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

          {!manualOpen && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="flex-1 text-xs text-muted-foreground h-9"
              >
                تخطي الدليل ولا تعرضه مرة أخرى
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
