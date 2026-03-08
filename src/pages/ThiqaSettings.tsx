import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Mail, Save, Loader2, Eye, EyeOff } from "lucide-react";

interface SmtpSettings {
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
      (data || []).forEach((r: any) => { map[r.setting_key] = r.setting_value || ""; });
      return map;
    },
  });
}

function SmtpSettingsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useThiqaPlatformSettings();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<SmtpSettings | null>(null);

  // Initialize form when data loads
  const currentForm: SmtpSettings = form || {
    smtp_host: settings?.smtp_host || "smtp.hostinger.com",
    smtp_port: settings?.smtp_port || "465",
    smtp_user: settings?.smtp_user || "",
    smtp_password: settings?.smtp_password || "",
    smtp_sender_name: settings?.smtp_sender_name || "Thiqa Insurance",
  };

  const saveMutation = useMutation({
    mutationFn: async (formData: SmtpSettings) => {
      const entries = Object.entries(formData);
      for (const [key, value] of entries) {
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

  const update = (key: keyof SmtpSettings, value: string) => {
    setForm({ ...currentForm, [key]: value });
  };

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
              value={currentForm.smtp_host}
              onChange={(e) => update("smtp_host", e.target.value)}
              placeholder="smtp.hostinger.com"
              className="ltr-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp_port">المنفذ (Port)</Label>
            <Input
              id="smtp_port"
              value={currentForm.smtp_port}
              onChange={(e) => update("smtp_port", e.target.value)}
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
            value={currentForm.smtp_user}
            onChange={(e) => update("smtp_user", e.target.value)}
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
              value={currentForm.smtp_password}
              onChange={(e) => update("smtp_password", e.target.value)}
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
            value={currentForm.smtp_sender_name}
            onChange={(e) => update("smtp_sender_name", e.target.value)}
            placeholder="Thiqa Insurance"
          />
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={() => saveMutation.mutate(currentForm)}
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

        <Tabs defaultValue="smtp" className="w-full">
          <TabsList>
            <TabsTrigger value="smtp" className="gap-2">
              <Mail className="h-4 w-4" />
              البريد الإلكتروني
            </TabsTrigger>
          </TabsList>

          <TabsContent value="smtp">
            <SmtpSettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
