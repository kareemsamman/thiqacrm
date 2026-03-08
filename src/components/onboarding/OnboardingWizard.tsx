import { useState, useEffect } from "react";
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
  CreditCard,
  Settings,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  ArrowRight,
  Palette,
} from "lucide-react";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  targetRoute: string;
  tips: string[];
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "branding",
    title: "العلامة التجارية",
    description: "خصص مظهر النظام بشعارك واسم وكالتك",
    icon: <Palette className="h-6 w-6" />,
    targetRoute: "/admin/branding",
    tips: [
      "ارفع شعار وكالتك",
      "أدخل اسم الوكالة بالعربية",
      "اختر ألوان النظام المفضلة",
    ],
  },
  {
    id: "companies",
    title: "شركات التأمين",
    description: "أضف شركات التأمين التي تتعامل معها",
    icon: <Building2 className="h-6 w-6" />,
    targetRoute: "/companies",
    tips: [
      "أضف كل شركة تأمين تتعامل معها",
      "أدخل نسبة العمولة لكل شركة",
      "أضف قواعد التسعير لكل نوع تأمين",
    ],
  },
  {
    id: "users",
    title: "المستخدمون والفروع",
    description: "أضف موظفيك وأنشئ الفروع إن وجدت",
    icon: <Users className="h-6 w-6" />,
    targetRoute: "/admin/users",
    tips: [
      "أنشئ فروعاً إذا كان لديك أكثر من مكتب",
      "أضف الموظفين وحدد صلاحياتهم",
      "عيّن كل موظف لفرعه",
    ],
  },
  {
    id: "clients",
    title: "العملاء والسيارات",
    description: "ابدأ بإضافة عملائك وسياراتهم",
    icon: <Car className="h-6 w-6" />,
    targetRoute: "/clients",
    tips: [
      "أضف بيانات العميل (الاسم، الهوية، الهاتف)",
      "أضف سيارات العميل مع رقم الرخصة",
      "يمكنك استيراد البيانات من ملف",
    ],
  },
  {
    id: "policies",
    title: "الوثائق",
    description: "أنشئ أول وثيقة تأمين",
    icon: <FileText className="h-6 w-6" />,
    targetRoute: "/policies",
    tips: [
      "اختر نوع التأمين (إلزامي، شامل، إلخ)",
      "حدد الشركة والسعر",
      "سجّل الدفعات المستلمة",
    ],
  },
  {
    id: "payments",
    title: "إعدادات الدفع",
    description: "فعّل طرق الدفع الإلكتروني",
    icon: <CreditCard className="h-6 w-6" />,
    targetRoute: "/admin/payment-settings",
    tips: [
      "فعّل Tranzila للدفع بالبطاقة",
      "أضف بيانات الحساب البنكي للتحويلات",
    ],
  },
];

const ONBOARDING_KEY = "thiqa_onboarding_completed";

export function OnboardingWizard() {
  const { user, isAdmin } = useAuth();
  const { agentId } = useAgentContext();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user || !isAdmin || !agentId) return;
    
    const key = `${ONBOARDING_KEY}_${user.id}`;
    const completed = localStorage.getItem(key);
    if (!completed) {
      // Delay to not overlap with page load
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [user, isAdmin, agentId]);

  const handleSkip = () => {
    if (user) {
      localStorage.setItem(`${ONBOARDING_KEY}_${user.id}`, "true");
    }
    setVisible(false);
  };

  const handleComplete = () => {
    if (user) {
      localStorage.setItem(`${ONBOARDING_KEY}_${user.id}`, "true");
    }
    setVisible(false);
  };

  const handleGoToStep = (step: OnboardingStep) => {
    setCompletedSteps(prev => new Set(prev).add(step.id));
    navigate(step.targetRoute);
    setVisible(false);
  };

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!visible) return null;

  const step = ONBOARDING_STEPS[currentStep];
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" dir="rtl">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleSkip} />
      
      {/* Card */}
      <div className="relative w-full max-w-lg mx-4 rounded-3xl border border-white/20 bg-card shadow-2xl overflow-hidden animate-scale-in">
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold text-primary">دليل البداية</span>
            <span className="text-xs text-muted-foreground">({currentStep + 1}/{ONBOARDING_STEPS.length})</span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSkip} className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-2 px-6 pb-4">
          {ONBOARDING_STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setCurrentStep(i)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === currentStep ? "w-8 bg-primary" : completedSteps.has(s.id) ? "w-2 bg-primary/50" : "w-2 bg-muted-foreground/20"
              )}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
              {step.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{step.title}</h2>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          </div>

          {/* Tips */}
          <div className="space-y-2 bg-muted/50 rounded-2xl p-4 mb-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">نصائح:</p>
            {step.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-foreground">{tip}</span>
              </div>
            ))}
          </div>

          {/* Go to page button */}
          <Button
            className="w-full h-11 rounded-xl gap-2 mb-3"
            onClick={() => handleGoToStep(step)}
          >
            الذهاب إلى {step.title}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between px-6 pb-5 gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="gap-1 rounded-xl"
          >
            <ChevronRight className="h-4 w-4" />
            السابق
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-muted-foreground text-xs"
          >
            تخطي الدليل
          </Button>

          {currentStep < ONBOARDING_STEPS.length - 1 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              className="gap-1 rounded-xl"
            >
              التالي
              <ChevronLeft className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleComplete}
              className="gap-1 rounded-xl"
            >
              <CheckCircle2 className="h-4 w-4" />
              إنهاء
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook to reset onboarding (for settings)
export function useResetOnboarding() {
  const { user } = useAuth();
  return () => {
    if (user) {
      localStorage.removeItem(`${ONBOARDING_KEY}_${user.id}`);
      window.location.reload();
    }
  };
}
