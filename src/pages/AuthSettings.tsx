import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Mail, Smartphone, Save, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AuthSettingsData {
  id: string;
  email_otp_enabled: boolean;
  gmail_sender_email: string | null;
  gmail_app_password: string | null;
  email_subject_template: string | null;
  email_body_template: string | null;
  sms_otp_enabled: boolean;
  sms_019_user: string | null;
  sms_019_token: string | null;
  sms_019_source: string | null;
  sms_message_template: string | null;
}

export default function AuthSettings() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [showSmsToken, setShowSmsToken] = useState(false);
  
  const [settings, setSettings] = useState<AuthSettingsData>({
    id: "",
    email_otp_enabled: false,
    gmail_sender_email: "",
    gmail_app_password: "",
    email_subject_template: "رمز التحقق: {code}",
    email_body_template: "رمز التحقق الخاص بك هو: {code}\n\nهذا الرمز صالح لمدة 5 دقائق.",
    sms_otp_enabled: false,
    sms_019_user: "",
    sms_019_token: "",
    sms_019_source: "",
    sms_message_template: "رمز التحقق الخاص بك هو: {code}",
  });

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/");
      toast.error("ليس لديك صلاحية الوصول لهذه الصفحة");
    }
  }, [authLoading, isAdmin, navigate]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("auth_settings")
        .select("*")
        .limit(1)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No settings found, create default
          const { data: newData, error: insertError } = await supabase
            .from("auth_settings")
            .insert({})
            .select()
            .single();
          
          if (insertError) throw insertError;
          if (newData) {
            setSettings({
              ...settings,
              id: newData.id,
              ...newData,
            });
          }
        } else {
          throw error;
        }
      } else if (data) {
        setSettings({
          id: data.id,
          email_otp_enabled: data.email_otp_enabled || false,
          gmail_sender_email: data.gmail_sender_email || "",
          gmail_app_password: data.gmail_app_password || "",
          email_subject_template: data.email_subject_template || "رمز التحقق: {code}",
          email_body_template: data.email_body_template || "رمز التحقق الخاص بك هو: {code}\n\nهذا الرمز صالح لمدة 5 دقائق.",
          sms_otp_enabled: data.sms_otp_enabled || false,
          sms_019_user: data.sms_019_user || "",
          sms_019_token: data.sms_019_token || "",
          sms_019_source: data.sms_019_source || "",
          sms_message_template: data.sms_message_template || "رمز التحقق الخاص بك هو: {code}",
        });
      }
    } catch (error) {
      console.error("Error fetching auth settings:", error);
      toast.error("فشل في تحميل الإعدادات");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("auth_settings")
        .update({
          email_otp_enabled: settings.email_otp_enabled,
          gmail_sender_email: settings.gmail_sender_email || null,
          gmail_app_password: settings.gmail_app_password || null,
          email_subject_template: settings.email_subject_template,
          email_body_template: settings.email_body_template,
          sms_otp_enabled: settings.sms_otp_enabled,
          sms_019_user: settings.sms_019_user || null,
          sms_019_token: settings.sms_019_token || null,
          sms_019_source: settings.sms_019_source || null,
          sms_message_template: settings.sms_message_template,
        })
        .eq("id", settings.id);

      if (error) throw error;
      toast.success("تم حفظ الإعدادات بنجاح");
    } catch (error) {
      console.error("Error saving auth settings:", error);
      toast.error("فشل في حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">إعدادات المصادقة</h1>
            <p className="text-muted-foreground">إدارة طرق تسجيل الدخول OTP</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
          </Button>
        </div>

        <Tabs defaultValue="email" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="email" className="gap-2">
              <Mail className="h-4 w-4" />
              البريد الإلكتروني
            </TabsTrigger>
            <TabsTrigger value="sms" className="gap-2">
              <Smartphone className="h-4 w-4" />
              الرسائل النصية
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>تسجيل الدخول بالبريد الإلكتروني OTP</CardTitle>
                    <CardDescription>
                      إرسال رمز التحقق عبر البريد الإلكتروني
                    </CardDescription>
                  </div>
                  <Switch
                    checked={settings.email_otp_enabled}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, email_otp_enabled: checked })
                    }
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    يتطلب إعداد حساب Gmail مع كلمة مرور تطبيقات. 
                    <a 
                      href="https://support.google.com/accounts/answer/185833" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary underline mr-1"
                    >
                      تعلم المزيد
                    </a>
                  </AlertDescription>
                </Alert>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="gmail_sender">بريد Gmail المرسل</Label>
                    <Input
                      id="gmail_sender"
                      type="email"
                      placeholder="your-email@gmail.com"
                      value={settings.gmail_sender_email || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, gmail_sender_email: e.target.value })
                      }
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gmail_password">كلمة مرور التطبيقات</Label>
                    <div className="relative">
                      <Input
                        id="gmail_password"
                        type={showEmailPassword ? "text" : "password"}
                        placeholder="xxxx xxxx xxxx xxxx"
                        value={settings.gmail_app_password || ""}
                        onChange={(e) =>
                          setSettings({ ...settings, gmail_app_password: e.target.value })
                        }
                        dir="ltr"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute left-0 top-0 h-full px-3"
                        onClick={() => setShowEmailPassword(!showEmailPassword)}
                      >
                        {showEmailPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email_subject">عنوان الرسالة</Label>
                  <Input
                    id="email_subject"
                    value={settings.email_subject_template || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, email_subject_template: e.target.value })
                    }
                    placeholder="رمز التحقق: {code}"
                  />
                  <p className="text-xs text-muted-foreground">استخدم {"{code}"} لإدراج رمز التحقق</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email_body">نص الرسالة</Label>
                  <Textarea
                    id="email_body"
                    rows={4}
                    value={settings.email_body_template || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, email_body_template: e.target.value })
                    }
                    placeholder="رمز التحقق الخاص بك هو: {code}"
                  />
                  <p className="text-xs text-muted-foreground">استخدم {"{code}"} لإدراج رمز التحقق</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sms" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>تسجيل الدخول بالرسائل النصية OTP</CardTitle>
                    <CardDescription>
                      إرسال رمز التحقق عبر الرسائل النصية (019)
                    </CardDescription>
                  </div>
                  <Switch
                    checked={settings.sms_otp_enabled}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, sms_otp_enabled: checked })
                    }
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="sms_user">اسم المستخدم (019)</Label>
                    <Input
                      id="sms_user"
                      value={settings.sms_019_user || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, sms_019_user: e.target.value })
                      }
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sms_token">رمز API</Label>
                    <div className="relative">
                      <Input
                        id="sms_token"
                        type={showSmsToken ? "text" : "password"}
                        value={settings.sms_019_token || ""}
                        onChange={(e) =>
                          setSettings({ ...settings, sms_019_token: e.target.value })
                        }
                        dir="ltr"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute left-0 top-0 h-full px-3"
                        onClick={() => setShowSmsToken(!showSmsToken)}
                      >
                        {showSmsToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sms_source">مصدر الرسالة</Label>
                    <Input
                      id="sms_source"
                      value={settings.sms_019_source || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, sms_019_source: e.target.value })
                      }
                      dir="ltr"
                      placeholder="ABInsurance"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sms_message">نص الرسالة</Label>
                  <Textarea
                    id="sms_message"
                    rows={3}
                    value={settings.sms_message_template || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, sms_message_template: e.target.value })
                    }
                    placeholder="رمز التحقق الخاص بك هو: {code}"
                  />
                  <p className="text-xs text-muted-foreground">استخدم {"{code}"} لإدراج رمز التحقق</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
