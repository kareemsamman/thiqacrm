import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAgentContext } from "@/hooks/useAgentContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  MessageSquare, Save, Loader2, Phone, ShieldCheck, AlertTriangle,
  Clock, CheckCircle2, XCircle, Send, Info,
} from "lucide-react";
import { toast } from "sonner";

type VerificationStatus = "not_verified" | "pending" | "verified" | "failed";

const STATUS_CONFIG: Record<VerificationStatus, { label: string; icon: typeof CheckCircle2; color: string; description: string }> = {
  not_verified: {
    label: "غير موثق",
    icon: XCircle,
    color: "bg-muted text-muted-foreground",
    description: "لم يتم التحقق من رقم المصدر بعد",
  },
  pending: {
    label: "قيد التحقق",
    icon: Clock,
    color: "bg-yellow-100 text-yellow-700",
    description: "جاري التحقق...",
  },
  verified: {
    label: "موثق",
    icon: CheckCircle2,
    color: "bg-green-100 text-green-700",
    description: "الرقم موثق وجاهز لإرسال الرسائل",
  },
  failed: {
    label: "فشل التحقق",
    icon: AlertTriangle,
    color: "bg-red-100 text-red-700",
    description: "فشل التحقق — تواصل مع إدارة ثقة",
  },
};

export default function SmsOnboarding() {
  const { isAdmin, profile } = useAuth();
  const { agent } = useAgentContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [smsSource, setSmsSource] = useState("");
  const [isEnabled, setIsEnabled] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>("not_verified");
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("sms-verify-phone", {
          body: { action: "check_status" },
        });
        if (data?.settings) {
          const s = data.settings;
          setSmsSource(s.sms_source || agent?.phone || "");
          setIsEnabled(s.is_enabled || false);
          setHasCredentials(!!(s.sms_user && s.sms_token));
          setVerificationStatus(s.sms_verification_status || "not_verified");
          setVerificationMessage(s.sms_verification_message || null);
          setVerifiedAt(s.sms_verified_at || null);
        } else if (agent?.phone) {
          setSmsSource(agent.phone);
        }
      } catch (e) {
        console.error("Failed to load SMS settings:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [agent]);

  const handleSaveSource = async () => {
    if (!smsSource.trim()) {
      toast.error("يرجى إدخال رقم المصدر");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("sms-verify-phone", {
        body: { action: "save_source", sms_source: smsSource.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("تم حفظ رقم المصدر");
      // Reset verification if number changed
      if (verificationStatus === "verified") {
        setVerificationStatus("not_verified");
        setIsEnabled(false);
      }
    } catch (e: any) {
      toast.error(e.message || "فشل في الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    setConfirmOpen(false);
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("sms-verify-phone", {
        body: { action: "start_verify" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setVerificationStatus(data.status || "pending");
      setVerificationMessage(data.message || null);

      if (data.status === "verified") {
        setIsEnabled(true);
        setVerifiedAt(new Date().toISOString());
        toast.success(data.message || "تم التحقق بنجاح!");
      } else {
        toast.error(data.message || "فشل التحقق");
      }
    } catch (e: any) {
      setVerificationStatus("failed");
      setVerificationMessage(e.message);
      toast.error(e.message || "فشل في إرسال طلب التحقق");
    } finally {
      setVerifying(false);
    }
  };

  const isVerified = verificationStatus === "verified";
  const canVerify = smsSource.trim() && hasCredentials;
  const statusConfig = STATUS_CONFIG[verificationStatus];
  const StatusIcon = statusConfig.icon;

  if (!isAdmin) return null;

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-3xl" dir="rtl">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            إعدادات SMS
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            تفعيل خدمة الرسائل النصية لإرسال إشعارات وفواتير للعملاء
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-60 w-full" />
          </div>
        ) : (
          <>
            {/* Status Card */}
            <Card className="overflow-hidden">
              <div className={cn("h-1 w-full",
                isVerified ? "bg-green-500" :
                verificationStatus === "pending" ? "bg-yellow-500" :
                verificationStatus === "failed" ? "bg-destructive" :
                "bg-muted"
              )} />
              <CardContent className="pt-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", statusConfig.color)}>
                      <StatusIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">حالة خدمة SMS</span>
                        <Badge className={cn("text-xs", statusConfig.color)}>
                          {statusConfig.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {verificationMessage || statusConfig.description}
                      </p>
                    </div>
                  </div>

                  {isVerified && (
                    <div className="flex items-center gap-2 text-green-600">
                      <ShieldCheck className="h-5 w-5" />
                      <span className="text-sm font-medium">SMS مفعّل</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* No credentials warning */}
            {!hasCredentials && (
              <div className="flex items-start gap-3 p-4 rounded-lg border border-yellow-300 bg-yellow-50">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-yellow-800">بيانات حساب 019sms غير مكتملة</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    يرجى التواصل مع إدارة ثقة لإعداد بيانات حساب SMS الخاص بك (اسم المستخدم والتوكن).
                    بعد ذلك يمكنك تحديد رقم المصدر وتفعيل الخدمة.
                  </p>
                </div>
              </div>
            )}

            {/* Source Number Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Phone className="h-5 w-5" />
                  رقم المصدر
                </CardTitle>
                <CardDescription>
                  الرقم أو الاسم الذي سيظهر للعملاء عند استلامهم رسالة نصية
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="sms-source">رقم المصدر / اسم المرسل</Label>
                  <Input
                    id="sms-source"
                    value={smsSource}
                    onChange={e => setSmsSource(e.target.value)}
                    placeholder="مثال: 05XXXXXXXX أو اسم الشركة"
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground">
                    أدخل رقم الهاتف أو اسم المرسل الذي تريد استخدامه مع 019sms
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleSaveSource} disabled={saving || !smsSource.trim()} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    حفظ رقم المصدر
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setConfirmOpen(true)}
                    disabled={verifying || !canVerify}
                    className="gap-2"
                  >
                    {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {verifying ? "جاري التحقق..." : "تفعيل SMS"}
                  </Button>
                </div>

                {!canVerify && hasCredentials && !smsSource.trim() && (
                  <p className="text-xs text-destructive">يرجى إدخال رقم المصدر أولاً</p>
                )}

                {/* How it works */}
                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <strong>كيف يعمل التفعيل؟</strong><br />
                    سيتم إرسال رسالة اختبار عبر 019sms للتأكد من صحة الإعدادات ورقم المصدر.
                    إذا تم الإرسال بنجاح، سيتم تفعيل خدمة SMS تلقائياً وستتمكن من إرسال رسائل للعملاء.
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Confirmation Dialog */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent dir="rtl" className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                تأكيد تفعيل SMS
              </DialogTitle>
              <DialogDescription className="text-right space-y-2 pt-2">
                <p>سيتم إرسال رسالة تحقق عبر خدمة 019sms باستخدام رقم المصدر <strong dir="ltr">{smsSource}</strong>.</p>
                <p>إذا تم الإرسال بنجاح، سيتم تفعيل خدمة SMS تلقائياً.</p>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>إلغاء</Button>
              <Button onClick={handleVerify} className="gap-2">
                <Send className="h-4 w-4" />
                تفعيل SMS
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
