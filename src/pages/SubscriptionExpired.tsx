import { AlertTriangle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import thiqaLogo from "@/assets/thiqa-logo.svg";

export default function SubscriptionExpired() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-md w-full text-center space-y-6">
        <img src={thiqaLogo} alt="ثقة" className="h-16 w-16 mx-auto" />
        
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-foreground">
            انتهى الاشتراك
          </h1>
          
          <p className="text-muted-foreground leading-relaxed">
            اشتراكك في منصة ثقة قد انتهى أو تم تعليقه. 
            يرجى التواصل مع إدارة ثقة لتجديد الاشتراك.
          </p>

          <div className="pt-4 space-y-3">
            <a 
              href="tel:+972500000000" 
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <Phone className="h-4 w-4" />
              <span>تواصل مع إدارة ثقة</span>
            </a>
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
