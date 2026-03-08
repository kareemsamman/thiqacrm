import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { User, Phone, Mail, Save, Loader2 } from "lucide-react";

interface ProfileEditDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileEditDrawer({ open, onOpenChange }: ProfileEditDrawerProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState((profile as any)?.phone || "");

  // Sync state when drawer opens
  const handleOpenChange = (val: boolean) => {
    if (val) {
      setFullName(profile?.full_name || "");
      setPhone((profile as any)?.phone || "");
    }
    onOpenChange(val);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Use upsert to handle case where profile row might not exist
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          email: user.email || profile?.email || '',
          full_name: fullName.trim() || null,
          phone: phone.trim() || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (error) throw error;
      toast.success("تم تحديث الملف الشخصي");
      await refreshProfile();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Profile save error:', err);
      toast.error("خطأ: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const userName = profile?.full_name || profile?.email?.split("@")[0] || "";
  const initial = userName.charAt(0).toUpperCase();

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-80 sm:w-96" dir="rtl">
        <SheetHeader className="mb-6">
          <SheetTitle>الملف الشخصي</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col items-center gap-3 mb-8">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={userName}
              className="h-20 w-20 rounded-full object-cover ring-2 ring-primary/20"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 shadow-lg">
              <span className="text-3xl font-bold text-primary-foreground">{initial}</span>
            </div>
          )}
          <p className="text-sm text-muted-foreground">{profile?.email}</p>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              الاسم الكامل
            </Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="أدخل اسمك"
              dir="rtl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              البريد الإلكتروني
            </Label>
            <Input
              id="email"
              value={profile?.email || ""}
              disabled
              className="opacity-60"
              dir="ltr"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              رقم الهاتف
            </Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05xxxxxxxx"
              dir="ltr"
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full mt-4">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            ) : (
              <Save className="h-4 w-4 ml-2" />
            )}
            حفظ التغييرات
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
