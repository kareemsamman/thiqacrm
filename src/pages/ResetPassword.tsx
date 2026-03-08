import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import thiqaLogoIcon from "@/assets/thiqa-logo-icon.svg";
import loginBgMobile from "@/assets/login-bg-mobile.png";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    // Check if we're already in a recovery session from hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async () => {
    if (password.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("كلمة المرور غير متطابقة");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      toast.success("تم تغيير كلمة المرور بنجاح");
      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (e: any) {
      toast.error(e.message || "حدث خطأ في تغيير كلمة المرور");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative" dir="rtl">
      <div className="fixed inset-0 lg:hidden -z-10">
        <img src={loginBgMobile} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/30 backdrop-blur-md" />
      </div>
      <div className="hidden lg:block fixed inset-0 -z-10 bg-gradient-to-br from-muted/40 to-background" />

      <div className="w-full max-w-md animate-scale-in">
        <div className="rounded-3xl border border-white/20 bg-white/95 dark:bg-card/95 lg:bg-white/70 lg:dark:bg-card/70 backdrop-blur-xl shadow-2xl shadow-black/10 overflow-hidden">
          <div className="text-center pt-8 pb-4 px-5 sm:px-8">
            <img src={thiqaLogo} alt="ثقة" className="mx-auto h-14 w-14 object-contain mb-4" />
            <h1 className="text-2xl font-bold text-foreground">تعيين كلمة مرور جديدة</h1>
            <p className="text-muted-foreground mt-1 text-sm">أدخل كلمة المرور الجديدة</p>
          </div>

          <div className="px-5 sm:px-8 pb-8 space-y-4">
            {success ? (
              <div className="text-center space-y-3 py-4">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
                <p className="font-medium text-green-700">تم تغيير كلمة المرور بنجاح!</p>
                <p className="text-sm text-muted-foreground">جاري التحويل لصفحة تسجيل الدخول...</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>كلمة المرور الجديدة</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="6 أحرف على الأقل"
                      className="h-11 rounded-xl pl-10"
                      dir="ltr"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>تأكيد كلمة المرور</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="أعد إدخال كلمة المرور"
                    className="h-11 rounded-xl"
                    dir="ltr"
                  />
                </div>
                <Button
                  className="w-full h-12 text-base rounded-xl shadow-lg"
                  onClick={handleReset}
                  disabled={loading || password.length < 6 || password !== confirmPassword}
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin ml-2" /> : null}
                  {loading ? "جاري التحديث..." : "تحديث كلمة المرور"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
