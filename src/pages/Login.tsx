import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, AlertCircle, ArrowRight, Eye, EyeOff, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import thiqaLogo from "@/assets/thiqa-logo.svg";
import loginBgMobile from "@/assets/login-bg-mobile.png";
import { isThiqaSuperAdminEmail } from "@/lib/superAdmin";
import { Separator } from "@/components/ui/separator";
import { ArabicDatePicker } from "@/components/ui/arabic-date-picker";
import { digitsOnly } from "@/lib/validation";

type PageView = "login" | "signup";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const navigate = useNavigate();
  const { user, isActive, isSuperAdmin, loading: authLoading } = useAuth();
  
  const [pageView, setPageView] = useState<PageView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Signup fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  
  // Signup validation errors (shown after attempted submit)
  const [signupErrors, setSignupErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    try { setIsInIframe(window.self !== window.top); } catch { setIsInIframe(true); }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      if (!isThiqaSuperAdminEmail(user.email)) {
        sessionStorage.setItem('admin_session_active', 'true');
      }
      if (isActive) {
        navigate(isSuperAdmin ? '/thiqa' : '/', { replace: true });
      } else {
        navigate('/no-access', { replace: true });
      }
    }
  }, [user, isActive, isSuperAdmin, authLoading, navigate]);

  const handleGoogleLogin = async () => {
    if (isInIframe) { window.open(window.location.href, '_blank'); return; }
    try {
      setLoading(true);
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) {
        if (error.message.includes('provider is not enabled')) {
          toast.error("مزود Google غير مفعل.");
        } else {
          toast.error("حدث خطأ في تسجيل الدخول");
        }
      }
    } catch { toast.error("حدث خطأ غير متوقع"); }
    finally { setLoading(false); }
  };

  const handleEmailPasswordLogin = async () => {
    if (!email || !email.includes("@")) { toast.error("يرجى إدخال بريد إلكتروني صحيح"); return; }
    if (!password || password.length < 6) { toast.error("كلمة المرور 6 أحرف على الأقل"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
        } else if (error.message.includes("Email not confirmed")) {
          toast.error("البريد الإلكتروني غير مؤكد. تحقق من بريدك.");
        } else {
          toast.error(error.message);
        }
        return;
      }
      toast.success("تم تسجيل الدخول بنجاح");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "حدث خطأ غير متوقع");
    } finally { setLoading(false); }
  };

  const validateSignupForm = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!firstName.trim()) errors.firstName = "الاسم الأول مطلوب";
    if (!lastName.trim()) errors.lastName = "الاسم الأخير مطلوب";
    if (!signupEmail || !signupEmail.includes("@")) errors.signupEmail = "يرجى إدخال بريد إلكتروني صحيح";
    if (signupPhone.trim() && digitsOnly(signupPhone).length !== 10) errors.signupPhone = "رقم الهاتف يجب أن يكون 10 أرقام";
    if (!signupPassword || signupPassword.length < 6) errors.signupPassword = "كلمة المرور 6 أحرف على الأقل";
    if (signupPassword !== signupConfirmPassword) errors.signupConfirmPassword = "كلمة المرور غير متطابقة";
    return errors;
  };

  const handleSignup = async () => {
    const errors = validateSignupForm();
    setSignupErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('register-agent', {
        body: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: signupEmail.trim(),
          password: signupPassword,
          phone: digitsOnly(signupPhone) || null,
          birth_date: birthDate || null,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      toast.success("تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.");
      setPageView("login");
      setEmail(signupEmail);
      setPassword(signupPassword);
      setFirstName(""); setLastName(""); setSignupEmail(""); setSignupPassword(""); 
      setSignupConfirmPassword(""); setSignupPhone(""); setBirthDate("");
      setSignupErrors({});
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "حدث خطأ غير متوقع");
    } finally { setLoading(false); }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const siteTitle = "Thiqa";
  const siteDesc = "نظام إدارة التأمين";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative" dir="rtl">
      {/* Mobile background */}
      <div className="fixed inset-0 lg:hidden -z-10">
        <img src={loginBgMobile} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      </div>

      {/* Left panel - background (desktop) */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden">
        <img src="/images/thiqa-bg.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/20 to-transparent" />
        <div className="relative z-10 text-center space-y-4">
          <img src={thiqaLogo} alt="ثقة" className="mx-auto w-40 h-40 drop-shadow-2xl" />
          <p className="text-white/80 text-lg font-light tracking-wide">نظام إدارة التأمين</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:bg-gradient-to-br lg:from-muted/40 lg:to-background">
        <div className="w-full max-w-md animate-scale-in">
          <div className="rounded-3xl border border-white/20 bg-white/70 dark:bg-card/70 backdrop-blur-xl shadow-2xl shadow-black/10 overflow-hidden">
            {/* Header */}
            <div className="text-center pt-10 pb-4 px-8">
              <img src={thiqaLogo} alt={siteTitle} className="mx-auto h-14 w-14 object-contain lg:hidden mb-4" />
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{siteTitle}</h1>
              <p className="text-muted-foreground mt-1 text-sm">{siteDesc}</p>
            </div>

            {/* Content */}
            <div className="px-8 pb-10 space-y-5">
              {isInIframe && (
                <Alert className="border-amber-300/60 bg-amber-50/80 dark:bg-amber-900/20 backdrop-blur-sm rounded-xl">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-sm mr-2 text-amber-800 dark:text-amber-200">
                    تسجيل الدخول بـ Google لا يعمل داخل المعاينة.
                  </AlertDescription>
                </Alert>
              )}

              {pageView === "login" ? (
                <>
                  {/* Google Login */}
                  {isInIframe ? (
                    <Button className="w-full h-12 text-base gap-3 rounded-xl bg-foreground hover:bg-foreground/90 text-background shadow-lg" onClick={() => window.open(window.location.origin + '/login', '_blank')}>
                      <ExternalLink className="h-5 w-5" />افتح في تبويب جديد
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full h-12 text-base gap-3 rounded-xl border-border/60 bg-white/60 dark:bg-card/60 backdrop-blur-sm hover:bg-white hover:border-primary/40 transition-all duration-200 shadow-sm"
                      onClick={handleGoogleLogin}
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                      )}
                      تسجيل الدخول بـ Google
                    </Button>
                  )}

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/40" /></div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-white/70 dark:bg-card/70 backdrop-blur-sm px-3 text-muted-foreground">أو</span>
                    </div>
                  </div>

                  {/* Email/Password Login */}
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-sm font-medium">البريد الإلكتروني</Label>
                      <Input id="login-email" type="email" placeholder="your-email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="ltr-input h-11 rounded-xl bg-white/60 dark:bg-card/60 backdrop-blur-sm border-border/60" disabled={loading} dir="ltr" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-sm font-medium">كلمة المرور</Label>
                      <div className="relative">
                        <Input id="login-password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-xl bg-white/60 dark:bg-card/60 backdrop-blur-sm border-border/60 pl-10" disabled={loading} dir="ltr" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button className="w-full h-12 text-base gap-2 rounded-xl shadow-lg" onClick={handleEmailPasswordLogin} disabled={loading || !email || !password}>
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                      {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
                    </Button>
                  </div>

                  <Separator />

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">ليس لديك حساب؟</p>
                    <Button variant="outline" className="w-full h-11 rounded-xl gap-2" onClick={() => setPageView("signup")}>
                      <UserPlus className="h-4 w-4" />
                      إنشاء حساب وكيل جديد
                    </Button>
                  </div>
                </>
              ) : (
                /* Signup Form */
                <>
                  {/* Google Signup */}
                  {!isInIframe && (
                    <>
                      <Button
                        variant="outline"
                        className="w-full h-12 text-base gap-3 rounded-xl border-border/60 bg-white/60 dark:bg-card/60 backdrop-blur-sm hover:bg-white hover:border-primary/40 transition-all duration-200 shadow-sm"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                      >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                          <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                          </svg>
                        )}
                        التسجيل بـ Google
                      </Button>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/40" /></div>
                        <div className="relative flex justify-center text-xs">
                          <span className="bg-white/70 dark:bg-card/70 backdrop-blur-sm px-3 text-muted-foreground">أو أنشئ حساب يدوياً</span>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">الاسم الأول *</Label>
                        <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="محمد" className="h-10 rounded-xl bg-white/60 dark:bg-card/60 border-border/60" disabled={loading} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">الاسم الأخير *</Label>
                        <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="أحمد" className="h-10 rounded-xl bg-white/60 dark:bg-card/60 border-border/60" disabled={loading} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">تاريخ الميلاد</Label>
                      <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="h-10 rounded-xl bg-white/60 dark:bg-card/60 border-border/60" disabled={loading} dir="ltr" />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">البريد الإلكتروني *</Label>
                      <Input type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} placeholder="your-email@example.com" className="h-10 rounded-xl bg-white/60 dark:bg-card/60 border-border/60" disabled={loading} dir="ltr" />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">رقم الهاتف</Label>
                      <Input type="tel" value={signupPhone} onChange={(e) => setSignupPhone(e.target.value)} placeholder="05xxxxxxxx" className="h-10 rounded-xl bg-white/60 dark:bg-card/60 border-border/60" disabled={loading} dir="ltr" />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">كلمة المرور *</Label>
                      <Input type="password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} placeholder="6 أحرف على الأقل" className="h-10 rounded-xl bg-white/60 dark:bg-card/60 border-border/60" disabled={loading} dir="ltr" autoComplete="new-password" />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">تأكيد كلمة المرور *</Label>
                      <Input type="password" value={signupConfirmPassword} onChange={(e) => setSignupConfirmPassword(e.target.value)} placeholder="أعد إدخال كلمة المرور" className="h-10 rounded-xl bg-white/60 dark:bg-card/60 border-border/60" disabled={loading} dir="ltr" autoComplete="new-password" />
                    </div>

                    <Button className="w-full h-12 text-base gap-2 rounded-xl shadow-lg" onClick={handleSignup} disabled={loading}>
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
                      {loading ? "جاري التسجيل..." : "إنشاء حساب"}
                    </Button>
                  </div>

                  <Separator />

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">لديك حساب بالفعل؟</p>
                    <Button variant="ghost" className="w-full h-10 rounded-xl" onClick={() => setPageView("login")}>
                      تسجيل الدخول
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
