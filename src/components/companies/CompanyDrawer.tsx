import { useState, useEffect } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Company = Tables<'insurance_companies'>;

interface CompanyDrawerProps {
  open: boolean;
  onClose: () => void;
  company: Company | null;
  onSuccess: () => void;
}

export function CompanyDrawer({ open, onClose, company, onSuccess }: CompanyDrawerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    active: true,
  });

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name,
        name_ar: company.name_ar || '',
        active: company.active ?? true,
      });
    } else {
      setFormData({
        name: '',
        name_ar: '',
        active: true,
      });
    }
  }, [company, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: 'خطأ',
        description: 'الرجاء إدخال اسم الشركة بالإنجليزية',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      if (company) {
        // Update existing company
        const { error } = await supabase
          .from('insurance_companies')
          .update({
            name: formData.name.trim(),
            name_ar: formData.name_ar.trim() || null,
            active: formData.active,
          })
          .eq('id', company.id);

        if (error) throw error;

        toast({
          title: 'تم التحديث',
          description: 'تم تحديث بيانات الشركة بنجاح',
        });
      } else {
        // Create new company
        const { error } = await supabase
          .from('insurance_companies')
          .insert({
            name: formData.name.trim(),
            name_ar: formData.name_ar.trim() || null,
            active: formData.active,
          });

        if (error) throw error;

        toast({
          title: 'تمت الإضافة',
          description: 'تمت إضافة الشركة بنجاح',
        });
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving company:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في حفظ بيانات الشركة',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>
            {company ? 'تعديل شركة التأمين' : 'إضافة شركة تأمين جديدة'}
          </DrawerTitle>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="name">الاسم بالإنجليزية *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Company Name"
              dir="ltr"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name_ar">الاسم بالعربية</Label>
            <Input
              id="name_ar"
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
              placeholder="اسم الشركة"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="active">الشركة نشطة</Label>
            <Switch
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
            />
          </div>
        </form>

        <DrawerFooter>
          <div className="flex gap-2 w-full">
            <Button
              type="submit"
              className="flex-1"
              disabled={loading}
              onClick={handleSubmit}
            >
              {loading ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              إلغاء
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
