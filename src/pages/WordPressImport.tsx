import { useState, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Trash2, FileJson, AlertTriangle, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface PreviewCounts {
  insuranceCompanies: number;
  pricingRules: number;
  brokers: number;
  clients: number;
  cars: number;
  policies: number;
  payments: number;
  outsideCheques: number;
  invoices: number;
  mediaFiles: number;
  carAccidents: number;
}

interface ImportStats {
  [key: string]: { inserted: number; updated: number; errors: string[] };
}

const WordPressImport = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [jsonData, setJsonData] = useState<any>(null);
  const [fileName, setFileName] = useState<string>("");
  const [preview, setPreview] = useState<PreviewCounts | null>(null);
  const [clearBeforeImport, setClearBeforeImport] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [importing, setImporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast({ title: "خطأ", description: "يرجى اختيار ملف JSON", variant: "destructive" });
      return;
    }

    setFileName(file.name);
    setImportStats(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      setJsonData(data);

      // Get preview counts
      const { data: result, error } = await supabase.functions.invoke('wordpress-import', {
        body: { action: 'preview', data }
      });

      if (error) throw error;
      setPreview(result.counts);
      toast({ title: "تم تحميل الملف", description: "تم قراءة الملف بنجاح" });
    } catch (err: any) {
      toast({ title: "خطأ في قراءة الملف", description: err.message, variant: "destructive" });
      setJsonData(null);
      setPreview(null);
    }
  };

  const handleImport = async () => {
    if (!jsonData) return;

    setImporting(true);
    setProgress(10);
    setImportStats(null);

    try {
      setProgress(30);
      const { data: result, error } = await supabase.functions.invoke('wordpress-import', {
        body: { action: 'import', data: jsonData, clearBeforeImport }
      });

      setProgress(90);
      if (error) throw error;

      setImportStats(result.stats);
      setProgress(100);
      toast({ title: "تم الاستيراد بنجاح", description: "تم استيراد البيانات من WordPress" });
    } catch (err: any) {
      toast({ title: "خطأ في الاستيراد", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const handleClearAll = async () => {
    if (deleteConfirmText !== "DELETE ALL") return;

    setClearing(true);
    try {
      const { error } = await supabase.functions.invoke('wordpress-import', {
        body: { action: 'clear' }
      });

      if (error) throw error;
      toast({ title: "تم الحذف", description: "تم حذف جميع البيانات بنجاح" });
      setDeleteConfirmText("");
    } catch (err: any) {
      toast({ title: "خطأ في الحذف", description: err.message, variant: "destructive" });
    } finally {
      setClearing(false);
    }
  };

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">ليس لديك صلاحية الوصول لهذه الصفحة</p>
        </div>
      </MainLayout>
    );
  }

  const entityLabels: Record<string, string> = {
    insuranceCompanies: "شركات التأمين",
    pricingRules: "قواعد التسعير",
    brokers: "الوسطاء",
    clients: "العملاء",
    cars: "السيارات",
    policies: "الوثائق",
    payments: "المدفوعات",
    outsideCheques: "الشيكات الخارجية",
    invoices: "الفواتير",
    mediaFiles: "ملفات الوسائط",
    carAccidents: "حوادث السيارات",
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">استيراد بيانات WordPress</h1>
          <p className="text-muted-foreground">استيراد البيانات من نظام WordPress القديم</p>
        </div>

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              تحميل ملف JSON
            </CardTitle>
            <CardDescription>قم بتحميل ملف التصدير من WordPress</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full">
              <Upload className="h-4 w-4 ml-2" />
              {fileName || "اختر ملف JSON"}
            </Button>

            {preview && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                {Object.entries(preview).map(([key, count]) => (
                  <div key={key} className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm">{entityLabels[key]}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Import Options */}
        {jsonData && (
          <Card>
            <CardHeader>
              <CardTitle>خيارات الاستيراد</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="clear"
                  checked={clearBeforeImport}
                  onCheckedChange={(v) => setClearBeforeImport(v === true)}
                />
                <Label htmlFor="clear" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  حذف جميع البيانات قبل الاستيراد
                </Label>
              </div>

              {importing && <Progress value={progress} className="w-full" />}

              <Button onClick={handleImport} disabled={importing} className="w-full">
                {importing ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Upload className="h-4 w-4 ml-2" />}
                {importing ? "جاري الاستيراد..." : "بدء الاستيراد"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Import Results */}
        {importStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                نتائج الاستيراد
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(importStats).map(([key, stats]) => (
                  <div key={key} className="flex items-center justify-between p-2 border rounded">
                    <span>{entityLabels[key]}</span>
                    <div className="flex gap-2">
                      <Badge variant="default">{stats.inserted} جديد</Badge>
                      <Badge variant="secondary">{stats.updated} محدث</Badge>
                      {stats.errors.length > 0 && (
                        <Badge variant="destructive">{stats.errors.length} أخطاء</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {Object.values(importStats).some(s => s.errors.length > 0) && (
                <div className="mt-4">
                  <Separator className="my-4" />
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    الأخطاء
                  </h4>
                  <ScrollArea className="h-40 border rounded p-2">
                    {Object.entries(importStats).map(([key, stats]) =>
                      stats.errors.map((err, i) => (
                        <p key={`${key}-${i}`} className="text-sm text-destructive">{err}</p>
                      ))
                    )}
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Clear All Data */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              حذف جميع البيانات
            </CardTitle>
            <CardDescription>
              سيتم حذف: العملاء، السيارات، الوثائق، المدفوعات، الفواتير، الوسائط، الحوادث، الوسطاء
              <br />
              <strong>لن يتم حذف:</strong> شركات التأمين، قواعد التسعير، الفروع، المستخدمين
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 ml-2" />
                  حذف جميع البيانات
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                  <AlertDialogDescription>
                    هذا الإجراء لا يمكن التراجع عنه. اكتب "DELETE ALL" للتأكيد.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE ALL"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearAll}
                    disabled={deleteConfirmText !== "DELETE ALL" || clearing}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {clearing ? "جاري الحذف..." : "حذف"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default WordPressImport;
