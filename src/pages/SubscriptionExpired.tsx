import { AlertTriangle, Pause, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAgentContext } from "@/hooks/useAgentContext";
import thiqaLogoIcon from "@/assets/thiqa-logo-icon.svg";

export default function SubscriptionExpired() {
  const { signOut } = useAuth();
  const { agent, isSubscriptionPaused } = useAgentContext();

  const isPaused = isSubscriptionPaused;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-md w-full text-center space-y-6">
        <img src={thiqaLogo} alt="ثقة" className="h-16 w-16 mx-auto" />
        
        <div className={`rounded-2xl border p-8 space-y-4 ${isPaused ? 'border-warning/20 bg-warning/5' : 'border-destructive/20 bg-destructive/5'}`}>
          <div className="flex justify-center">
            <div className={`rounded-full p-3 ${isPaused ? 'bg-yellow-500/10' : 'bg-destructive/10'}`}>
              {isPaused ? (
                <Pause className="h-8 w-8 text-yellow-600" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-destructive" />
              )}
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-foreground">
            {isPaused ? 'تم تعليق الحساب' : 'انتهى الاشتراك'}
          </h1>
          
          <p className="text-muted-foreground leading-relaxed">
            {isPaused 
              ? 'حسابك في منصة ثقة تم تعليقه مؤقتاً. يرجى التواصل مع إدارة ثقة لإعادة تفعيل الحساب.'
              : 'اشتراكك في منصة ثقة قد انتهى. يرجى التواصل مع إدارة ثقة لتجديد الاشتراك.'
            }
          </p>

          <div className="pt-4 space-y-3">
            <a 
              href="tel:0525143581" 
              className="inline-flex items-center gap-2 text-primary hover:underline font-medium text-lg"
            >
              <Phone className="h-5 w-5" />
              <span dir="ltr">052-514-3581</span>
            </a>
            <div>
              <a
                href="https://wa.me/972525143581"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-green-600 hover:underline text-sm"
              >
                تواصل عبر واتساب
              </a>
            </div>
          </div>
        </div>

        <Button 
          variant="outline" 
          onClick={() => signOut()}
          className="w-full"
        >
          تسجيل الخروج
        </Button>
      </div>
    </div>
  );
}
