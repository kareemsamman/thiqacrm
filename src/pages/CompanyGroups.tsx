import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, Building2, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type { Tables } from '@/integrations/supabase/types';

type CompanyGroup = Tables<'insurance_company_groups'>;
type Company = Tables<'insurance_companies'>;

interface GroupWithCompanies extends CompanyGroup {
  companies: Company[];
}

export default function CompanyGroups() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [groups, setGroups] = useState<GroupWithCompanies[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<CompanyGroup | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    display_name: '',
    display_name_ar: '',
  });

  const fetchGroups = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('insurance_company_groups')
        .select(`
          *,
          companies:insurance_companies(*)
        `)
        .order('display_name', { ascending: true });

      if (searchQuery) {
        query = query.or(`display_name.ilike.%${searchQuery}%,display_name_ar.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setGroups((data as any) || []);
    } catch (error) {
      console.error('Error fetching company groups:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في جلب مجموعات الشركات',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [searchQuery]);

  const handleAddGroup = () => {
    setSelectedGroup(null);
    setFormData({ display_name: '', display_name_ar: '' });
    setDrawerOpen(true);
  };

  const handleEditGroup = (group: CompanyGroup) => {
    setSelectedGroup(group);
    setFormData({
      display_name: group.display_name,
      display_name_ar: group.display_name_ar || '',
    });
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.display_name.trim()) {
      toast({
        title: 'خطأ',
        description: 'الرجاء إدخال اسم المجموعة',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (selectedGroup) {
        const { error } = await supabase
          .from('insurance_company_groups')
          .update({
            display_name: formData.display_name.trim(),
            display_name_ar: formData.display_name_ar.trim() || null,
          })
          .eq('id', selectedGroup.id);

        if (error) throw error;

        toast({
          title: 'تم التحديث',
          description: 'تم تحديث بيانات المجموعة بنجاح',
        });
      } else {
        const { error } = await supabase
          .from('insurance_company_groups')
          .insert({
            display_name: formData.display_name.trim(),
            display_name_ar: formData.display_name_ar.trim() || null,
          });

        if (error) throw error;

        toast({
          title: 'تمت الإضافة',
          description: 'تمت إضافة المجموعة بنجاح',
        });
      }

      setDrawerOpen(false);
      fetchGroups();
    } catch (error: any) {
      console.error('Error saving company group:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في حفظ بيانات المجموعة',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedGroup) return;

    setDeleting(true);
    try {
      // First unlink all companies from this group
      await supabase
        .from('insurance_companies')
        .update({ group_id: null })
        .eq('group_id', selectedGroup.id);

      // Then delete the group
      const { error } = await supabase
        .from('insurance_company_groups')
        .delete()
        .eq('id', selectedGroup.id);

      if (error) throw error;

      toast({
        title: 'تم الحذف',
        description: 'تم حذف المجموعة بنجاح',
      });

      setDeleteDialogOpen(false);
      setDrawerOpen(false);
      fetchGroups();
    } catch (error: any) {
      console.error('Error deleting company group:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في حذف المجموعة',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <Building2 className="h-16 w-16 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-semibold">غير مصرح</h2>
            <p className="text-muted-foreground">هذه الصفحة متاحة للمسؤولين فقط</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header
        title="مجموعات الشركات"
        subtitle="تجميع الشركات تحت علامة تجارية واحدة للتقارير الموحدة"
      />

      <div className="p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث عن مجموعة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          <Button onClick={handleAddGroup}>
            <Plus className="h-4 w-4 ml-2" />
            إضافة مجموعة
          </Button>
        </div>

        {/* Groups Table */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الاسم بالإنجليزية</TableHead>
                <TableHead className="text-right">الاسم بالعربية</TableHead>
                <TableHead className="text-right">عدد الشركات</TableHead>
                <TableHead className="text-right">الشركات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                  </TableRow>
                ))
              ) : groups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    لا توجد مجموعات
                  </TableCell>
                </TableRow>
              ) : (
                groups.map((group) => (
                  <TableRow
                    key={group.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleEditGroup(group)}
                  >
                    <TableCell className="font-medium">{group.display_name}</TableCell>
                    <TableCell>{group.display_name_ar || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{group.companies?.length || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {group.companies?.slice(0, 3).map((company) => (
                          <Badge key={company.id} variant="outline" className="text-xs">
                            {company.name_ar || company.name}
                          </Badge>
                        ))}
                        {(group.companies?.length || 0) > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{group.companies.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Group Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="flex flex-row items-center justify-between">
            <DrawerTitle>
              {selectedGroup ? 'تعديل المجموعة' : 'إضافة مجموعة جديدة'}
            </DrawerTitle>
            {selectedGroup && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 ml-1" />
                حذف
              </Button>
            )}
          </DrawerHeader>

          <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="display_name" className="text-right block">الاسم بالإنجليزية *</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="Group Name"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_name_ar" className="text-right block">الاسم بالعربية</Label>
              <Input
                id="display_name_ar"
                value={formData.display_name_ar}
                onChange={(e) => setFormData({ ...formData, display_name_ar: e.target.value })}
                placeholder="اسم المجموعة"
                className="text-right"
              />
            </div>

            {selectedGroup && (
              <div className="pt-4 border-t">
                <Label className="text-sm text-muted-foreground">الشركات المرتبطة</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {groups.find(g => g.id === selectedGroup.id)?.companies?.map((company) => (
                    <Badge key={company.id} variant="secondary">
                      {company.name_ar || company.name}
                    </Badge>
                  ))}
                  {!groups.find(g => g.id === selectedGroup.id)?.companies?.length && (
                    <span className="text-sm text-muted-foreground">لا توجد شركات مرتبطة</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  لربط شركة بهذه المجموعة، اذهب إلى صفحة الشركات وقم بتعديل الشركة
                </p>
              </div>
            )}
          </form>

          <DrawerFooter>
            <div className="flex gap-2 w-full">
              <Button
                type="submit"
                className="flex-1"
                disabled={saving}
                onClick={handleSubmit}
              >
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </Button>
              <Button variant="outline" onClick={() => setDrawerOpen(false)} disabled={saving}>
                إلغاء
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              هل أنت متأكد أنك تريد حذف المجموعة "{selectedGroup?.display_name_ar || selectedGroup?.display_name}"؟
              <br />
              <span className="text-muted-foreground">
                سيتم فك ارتباط جميع الشركات من هذه المجموعة.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel disabled={deleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 ml-1 animate-spin" />
                  جاري الحذف...
                </>
              ) : (
                'حذف'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
