import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAgentContext } from "@/hooks/useAgentContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  MessageSquare, Loader2, ShieldCheck, AlertTriangle,
  CheckCircle2, XCircle, Send, MessageCircle,
} from "lucide-react";
import { toast } from "sonner";

type VerificationStatus = "not_verified" | "pending" | "verified" | "failed";

export default function SmsOnboarding() {
  const { isAdmin } = useAuth();
  const { agent } = useAgentContext();
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [isEnabled, setIsEnabled] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>("not_verified");
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("sms-verify-phone", {
          body: { action: "check_status" },
        });
        if (data?.settings) {
          const s = data.settings;
          setIsEnabled(s.is_enabled || false);
          setHasCredentials(!!(s.sms_user && s.sms_token));
          setVerificationStatus(s.sms_verification_status || "not_verified");
          setVerificationMessage(s.sms_verification_message || null);
        }
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, [agent]);

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
        toast.success("تم تفعيل خدمة SMS بنجاح!");
      } else {
        toast.error(data.message || "فشل التفعيل");
      }
    } catch (e: any) {
      setVerificationStatus("failed");
      setVerificationMessage(e.message);
      toast.error(e.message || "فشل في تفعيل خدمة SMS");
    } finally {
      setVerifying(false);
    }
  };

  const isVerified = verificationStatus === "verified";

  if (!isAdmin) return null;

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto" dir="rtl">
        <div className="text-center">
          <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            خدمة الرسائل النصية
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            إرسال إشعارات وفواتير للعملاء عبر SMS
          </p>
        </div>

        {loading ? (
          <Skeleton className="h-60 w-full" />
        ) : (
          <Card className="overflow-hidden">
            <div className={cn("h-1.5 w-full",
              isVerified ? "bg-green-500" : "bg-muted"
            )} />
            <CardContent className="pt-8 pb-8">
              <div className="flex flex-col items-center text-center space-y-5">
                {/* Status icon */}
                <div className={cn(
                  "h-16 w-16 rounded-2xl flex items-center justify-center",
                  isVerified ? "bg-green-100 text-green-600" :
                  verificationStatus === "failed" ? "bg-red-100 text-red-600" :
                  "bg-muted text-muted-foreground"
                )}>
                  {isVerified ? <CheckCircle2 className="h-8 w-8" /> :
                   verificationStatus === "failed" ? <AlertTriangle className="h-8 w-8" /> :
                   <MessageSquare className="h-8 w-8" />}
                </div>

                {/* Status text */}
                <div>
                  <h2 className="text-xl font-bold">
                    {isVerified ? "خدمة SMS مفعّلة" :
                     verificationStatus === "failed" ? "فشل تفعيل SMS" :
                     "خدمة SMS غير مفعّلة"}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isVerified ? "يمكنك الآن إرسال رسائل نصية للعملاء" :
                     verificationStatus === "failed" ? (verificationMessage || "تواصل مع إدارة ثقة للمساعدة") :
                     !hasCredentials ? "تواصل مع إدارة ثقة لإعداد خدمة SMS لحسابك" :
                     "اضغط على الزر أدناه لتفعيل خدمة الرسائل النصية"}
                  </p>
                </div>

                {/* Badge */}
                <Badge className={cn("text-xs px-3 py-1",
                  isVerified ? "bg-green-100 text-green-700" :
                  verificationStatus === "failed" ? "bg-red-100 text-red-700" :
                  "bg-muted text-muted-foreground"
                )}>
                  {isVerified ? "مفعّل" :
                   verificationStatus === "failed" ? "فشل التفعيل" :
                   "غير مفعّل"}
                </Badge>

                {/* Actions */}
                {!isVerified && hasCredentials && (
                  <Button
                    size="lg"
                    onClick={() => setConfirmOpen(true)}
                    disabled={verifying}
                    className="gap-2 px-8"
                  >
                    {verifying ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    {verifying ? "جاري التفعيل..." : "تفعيل خدمة SMS"}
                  </Button>
                )}

                {!hasCredentials && (
                  <a href="https://wa.me/972525143581" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="lg" className="gap-2 px-8">
                      <MessageCircle className="h-5 w-5" />
                      تواصل مع إدارة ثقة
                    </Button>
                  </a>
                )}

                {isVerified && (
                  <div className="flex items-center gap-2 text-green-600">
                    <ShieldCheck className="h-5 w-5" />
                    <span className="text-sm font-medium">جاهز لإرسال الرسائل</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Confirmation Dialog */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent dir="rtl" className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                تفعيل خدمة SMS
              </DialogTitle>
              <DialogDescription className="text-right pt-2">
                سيتم التحقق من إعدادات خدمة الرسائل النصية وتفعيلها لحسابك.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>إلغاء</Button>
              <Button onClick={handleVerify} className="gap-2">
                <Send className="h-4 w-4" />
                تفعيل
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
