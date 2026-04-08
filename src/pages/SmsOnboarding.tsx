import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAgentContext } from "@/hooks/useAgentContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  MessageSquare, Save, Loader2, Phone, ShieldCheck, AlertTriangle,
  Clock, CheckCircle2, XCircle, Send, Eye, EyeOff, Info,
} from "lucide-react";
import { toast } from "sonner";

interface SmsSettings {
  sms_user: string | null;
  sms_token: string | null;
  sms_source: string | null;
  is_enabled: boolean;
  sms_verification_status: "not_verified" | "pending" | "verified" | "failed";
  sms_verification_message: string | null;
  sms_verified_at: string | null;
}

const STATUS_CONFIG = {
  not_verified: {
    label: "غير موثق",
    icon: XCircle,
    color: "bg-muted text-muted-foreground",
    description: "لم يتم التحقق من إعدادات SMS بعد",
  },
  pending: {
    label: "قيد التحقق",
    icon: Clock,
    color: "bg-yellow-100 text-yellow-700",
    description: "جاري التحقق من الإعدادات...",
  },
  verified: {
    label: "موثق",
    icon: CheckCircle2,
    color: "bg-green-100 text-green-700",
    description: "الرقم موثق وجاهز للإرسال",
  },
  failed: {
    label: "فشل التحقق",
    icon: AlertTriangle,
    color: "bg-red-100 text-red-700",
    description: "فشل التحقق — يرجى مراجعة الإعدادات والمحاولة مرة أخرى",
  },
};

export default function SmsOnboarding() {
  const { isAdmin, profile } = useAuth();
  const { agent } = useAgentContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [smsUser, setSmsUser] = useState("");
  const [smsToken, setSmsToken] = useState("");
  const [smsSource, setSmsSource] = useState("");
  const [isEnabled, setIsEnabled] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<SmsSettings["sms_verification_status"]>("not_verified");
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);

  // Load settings
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("sms-verify-phone", {
          body: { action: "check_status" },
        });
        if (data?.settings) {
          const s = data.settings;
          setSmsUser(s.sms_user || "");
          setSmsToken(s.sms_token || "");
          setSmsSource(s.sms_source || agent?.phone || "");
          setIsEnabled(s.is_enabled || false);
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("sms-verify-phone", {
        body: {
          action: "save_settings",
          sms_user: smsUser.trim(),
          sms_token: smsToken.trim(),
          sms_source: smsSource.trim(),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("تم حفظ إعدادات SMS");
      // Reset verification if credentials changed
      if (verificationStatus === "verified") {
        setVerificationStatus("not_verified");
        setIsEnabled(false);
      }
    } catch (e: any) {
      toast.error(e.message || "فشل في حفظ الإعدادات");
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
  const canVerify = smsUser.trim() && smsToken.trim() && smsSource.trim();
  const statusConfig = STATUS_CONFIG[verificationStatus];
  const StatusIcon = statusConfig.icon;

  if (!isAdmin) return null;

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-3xl" dir="rtl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            إعدادات SMS
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            ربط حسابك مع خدمة 019sms لإرسال رسائل نصية للعملاء
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-60 w-full" />
          </div>
        ) : (
          <>
            {/* Verification Status Card */}
            <Card className="overflow-hidden">
              <div className={cn("h-1 w-full",
                verificationStatus === "verified" ? "bg-green-500" :
                verificationStatus === "pending" ? "bg-yellow-500" :
                verificationStatus === "failed" ? "bg-destructive" :
                "bg-muted"
              )} />
              <CardContent className="pt-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", statusConfig.color)}>
                      <StatusIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">حالة التحقق</span>
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

            {/* SMS Credentials */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Phone className="h-5 w-5" />
                  بيانات حساب 019sms
                </CardTitle>
                <CardDescription>
                  أدخل بيانات حسابك في 019sms لتتمكن من إرسال رسائل نصية
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="sms-user">اسم المستخدم (019)</Label>
                  <Input
                    id="sms-user"
                    value={smsUser}
                    onChange={e => setSmsUser(e.target.value)}
                    placeholder="اسم المستخدم الخاص بك في 019sms"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sms-token">Token (019)</Label>
                  <div className="relative">
                    <Input
                      id="sms-token"
                      type={showToken ? "text" : "password"}
                      value={smsToken}
                      onChange={e => setSmsToken(e.target.value)}
                      placeholder="التوكن الخاص بحسابك"
                      dir="ltr"
                      className="pe-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sms-source">رقم المصدر</Label>
                  <Input
                    id="sms-source"
                    value={smsSource}
                    onChange={e => setSmsSource(e.target.value)}
                    placeholder="05XXXXXXXX"
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground">
                    رقم الهاتف الذي ستظهر منه الرسائل للعملاء
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={isEnabled}
                      disabled={!isVerified}
                      onCheckedChange={async (v) => {
                        setIsEnabled(v);
                        await supabase.from("sms_settings").update({ is_enabled: v }).eq("agent_id", agent?.id);
                      }}
                    />
                    <Label className={cn(!isVerified && "text-muted-foreground")}>تفعيل SMS</Label>
                  </div>
                  {!isVerified && (
                    <p className="text-xs text-muted-foreground">
                      لا يمكن التفعيل قبل إكمال التحقق
                    </p>
                  )}
                </div>

                <Separator />

                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleSave} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    حفظ الإعدادات
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setConfirmOpen(true)}
                    disabled={verifying || !canVerify}
                    className="gap-2"
                  >
                    {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {verifying ? "جاري التحقق..." : "إرسال طلب التحقق"}
                  </Button>
                </div>

                {/* Info note */}
                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <strong>كيف يعمل التحقق؟</strong><br />
                    سيتم إرسال رسالة اختبار إلى رقم المصدر عبر 019sms للتأكد من صحة البيانات.
                    إذا تم الإرسال بنجاح، سيتم تفعيل خدمة SMS تلقائياً.
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
                تأكيد طلب التحقق
              </DialogTitle>
              <DialogDescription className="text-right space-y-2 pt-2">
                <p>سيتم إرسال رسالة تحقق إلى الرقم <strong dir="ltr">{smsSource}</strong> عبر خدمة 019sms.</p>
                <p>يرجى التأكد من:</p>
                <ul className="list-disc list-inside space-y-1 text-right">
                  <li>صحة بيانات الحساب (اسم المستخدم والتوكن)</li>
                  <li>صحة رقم المصدر</li>
                  <li>أن حسابك في 019sms فعّال</li>
                </ul>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>إلغاء</Button>
              <Button onClick={handleVerify} className="gap-2">
                <Send className="h-4 w-4" />
                إرسال طلب التحقق
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
