import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Mail, Save, Loader2, Eye, EyeOff, Shield } from "lucide-react";

function GeneralSettingsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useThiqaPlatformSettings();
  const skipVerification = settings?.skip_email_verification === "true";

  const toggleMutation = useMutation({
    mutationFn: async (newValue: boolean) => {
      const { error } = await supabase
        .from("thiqa_platform_settings")
        .upsert(
          { setting_key: "skip_email_verification", setting_value: String(newValue), updated_at: new Date().toISOString() },
          { onConflict: "setting_key" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["thiqa-platform-settings"] });
      toast({ title: "تم الحفظ", description: "تم تحديث الإعداد بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في حفظ الإعداد", variant: "destructive" });
    },
  });

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          إعدادات عامة
        </CardTitle>
        <CardDescription>إعدادات التسجيل والتفعيل</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">تخطي تفعيل البريد الإلكتروني</Label>
            <p className="text-sm text-muted-foreground">
              عند التفعيل، لن يُطلب من الوكلاء الجدد تأكيد بريدهم الإلكتروني عبر OTP
            </p>
          </div>
          <Switch
            checked={skipVerification}
            onCheckedChange={(checked) => toggleMutation.mutate(checked)}
            disabled={toggleMutation.isPending}
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface SmtpForm {
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_password: string;
  smtp_sender_name: string;
}

function useThiqaPlatformSettings() {
  return useQuery({
    queryKey: ["thiqa-platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("thiqa_platform_settings")
        .select("setting_key, setting_value");
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((r) => { map[r.setting_key] = r.setting_value || ""; });
      return map;
    },
  });
}

function SmtpSettingsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useThiqaPlatformSettings();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<SmtpForm>({
    smtp_host: "",
    smtp_port: "465",
    smtp_user: "",
    smtp_password: "",
    smtp_sender_name: "Thiqa Insurance",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        smtp_host: settings.smtp_host || "smtp.hostinger.com",
        smtp_port: settings.smtp_port || "465",
        smtp_user: settings.smtp_user || "",
        smtp_password: settings.smtp_password || "",
        smtp_sender_name: settings.smtp_sender_name || "Thiqa Insurance",
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (formData: SmtpForm) => {
      for (const [key, value] of Object.entries(formData)) {
        const { error } = await supabase
          .from("thiqa_platform_settings")
          .update({ setting_value: value, updated_at: new Date().toISOString() })
          .eq("setting_key", key);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["thiqa-platform-settings"] });
      toast({ title: "تم الحفظ", description: "تم حفظ إعدادات SMTP بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في حفظ الإعدادات", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          إعدادات SMTP للمنصة
        </CardTitle>
        <CardDescription>
          إعدادات البريد الإلكتروني المستخدم لإرسال رسائل التحقق والتفعيل
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="smtp_host">خادم SMTP (Host)</Label>
            <Input
              id="smtp_host"
              value={form.smtp_host}
              onChange={(e) => setForm(f => ({ ...f, smtp_host: e.target.value }))}
              placeholder="smtp.hostinger.com"
              className="ltr-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp_port">المنفذ (Port)</Label>
            <Input
              id="smtp_port"
              value={form.smtp_port}
              onChange={(e) => setForm(f => ({ ...f, smtp_port: e.target.value }))}
              placeholder="465"
              className="ltr-input"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="smtp_user">البريد الإلكتروني (SMTP User)</Label>
          <Input
            id="smtp_user"
            type="email"
            value={form.smtp_user}
            onChange={(e) => setForm(f => ({ ...f, smtp_user: e.target.value }))}
            placeholder="noreply@thiqa.app"
            className="ltr-input"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="smtp_password">كلمة المرور (SMTP Password)</Label>
          <div className="relative">
            <Input
              id="smtp_password"
              type={showPassword ? "text" : "password"}
              value={form.smtp_password}
              onChange={(e) => setForm(f => ({ ...f, smtp_password: e.target.value }))}
              placeholder="••••••••"
              className="ltr-input pe-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="smtp_sender_name">اسم المرسل</Label>
          <Input
            id="smtp_sender_name"
            value={form.smtp_sender_name}
            onChange={(e) => setForm(f => ({ ...f, smtp_sender_name: e.target.value }))}
            placeholder="Thiqa Insurance"
          />
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 ml-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 ml-2" />
            )}
            حفظ الإعدادات
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ThiqaSettings() {
  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">إعدادات المنصة</h1>
            <p className="text-muted-foreground">إدارة إعدادات منصة ثقة</p>
          </div>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList>
            <TabsTrigger value="general" className="gap-2">
              <Shield className="h-4 w-4" />
              عام
            </TabsTrigger>
            <TabsTrigger value="smtp" className="gap-2">
              <Mail className="h-4 w-4" />
              البريد الإلكتروني
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <GeneralSettingsTab />
          </TabsContent>

          <TabsContent value="smtp">
            <SmtpSettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
