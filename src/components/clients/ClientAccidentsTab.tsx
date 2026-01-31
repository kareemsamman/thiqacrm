import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { AccidentReportDrawer } from "@/components/accident-reports/AccidentReportDrawer";
import {
  AlertTriangle,
  Plus,
  Calendar,
  FileText,
  Building2,
  Eye,
  Save,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AccidentReport {
  id: string;
  accident_date: string;
  status: string;
  coverage_type: string | null;
  report_number: number | null;
  created_at: string;
  policy: {
    id: string;
    policy_number: string | null;
  } | null;
  car: {
    car_number: string;
  } | null;
  company: {
    name: string;
    name_ar: string | null;
  } | null;
}

interface ClientAccidentsTabProps {
  clientId: string;
  accidentNotes: string | null;
  onNotesChange: (notes: string) => void;
}

const statusLabels: Record<string, string> = {
  draft: "مسودة",
  submitted: "مُقدَّم",
  closed: "مُغلق",
};

const statusColors: Record<string, string> = {
  draft: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  submitted: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  closed: "bg-green-500/10 text-green-700 border-green-500/20",
};

const coverageLabels: Record<string, string> = {
  THIRD: "طرف ثالث",
  FULL: "شامل",
  ROAD_SERVICE: "خدمات طريق",
};

export function ClientAccidentsTab({
  clientId,
  accidentNotes,
  onNotesChange,
}: ClientAccidentsTabProps) {
  const navigate = useNavigate();
  const [reports, setReports] = useState<AccidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notesValue, setNotesValue] = useState(accidentNotes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesChanged, setNotesChanged] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("accident_reports")
        .select(`
          id,
          accident_date,
          status,
          coverage_type,
          report_number,
          created_at,
          policy:policies(id, policy_number),
          car:cars(car_number),
          company:insurance_companies(name, name_ar)
        `)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReports((data as any) || []);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    setNotesValue(accidentNotes || "");
    setNotesChanged(false);
  }, [accidentNotes]);

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from("clients")
        .update({ accident_notes: notesValue || null })
        .eq("id", clientId);

      if (error) throw error;

      toast.success("تم حفظ ملاحظات الحوادث");
      onNotesChange(notesValue);
      setNotesChanged(false);
    } catch (error) {
      console.error("Error saving notes:", error);
      toast.error("فشل في حفظ الملاحظات");
    } finally {
      setSavingNotes(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB");
  };

  const openReports = reports.filter((r) => r.status !== "closed").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <h3 className="font-semibold">بلاغات الحوادث</h3>
          {openReports > 0 && (
            <Badge variant="destructive" className="text-xs">
              {openReports} مفتوحة
            </Badge>
          )}
        </div>
        <Button onClick={() => setDrawerOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          بلاغ جديد
        </Button>
      </div>

      {/* Accident Notes Card */}
      <Card className="p-4 space-y-3 bg-amber-500/5 border-amber-500/20">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            ملاحظات الحوادث العامة
          </h4>
          {notesChanged && (
            <Button
              size="sm"
              onClick={handleSaveNotes}
              disabled={savingNotes}
              className="gap-1"
            >
              {savingNotes ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              حفظ
            </Button>
          )}
        </div>
        <Textarea
          placeholder="مثال: هذا المؤمن لديه 5 حوادث، لا نرغب بتأمين هذه المركبة له..."
          value={notesValue}
          onChange={(e) => {
            setNotesValue(e.target.value);
            setNotesChanged(true);
          }}
          rows={3}
          className="resize-none bg-background"
        />
      </Card>

      {/* Reports Table */}
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>لا توجد بلاغات حوادث لهذا العميل</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">رقم البلاغ</TableHead>
                <TableHead className="text-right">تاريخ الحادث</TableHead>
                <TableHead className="text-right">رقم السيارة</TableHead>
                <TableHead className="text-right">نوع التغطية</TableHead>
                <TableHead className="text-right">الشركة</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow
                  key={report.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() =>
                    navigate(`/policies/${report.policy?.id}/accident/${report.id}`)
                  }
                >
                  <TableCell>
                    {report.report_number ? (
                      <Badge variant="outline" className="font-mono">
                        #{report.report_number}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {formatDate(report.accident_date)}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">
                    {report.car?.car_number || "-"}
                  </TableCell>
                  <TableCell>
                    {report.coverage_type ? (
                      <Badge variant="secondary">
                        {coverageLabels[report.coverage_type] || report.coverage_type}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {report.company ? (
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        {report.company.name_ar || report.company.name}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[report.status]}>
                      {statusLabels[report.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/policies/${report.policy?.id}/accident/${report.id}`);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AccidentReportDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onSuccess={() => {
          setDrawerOpen(false);
          fetchReports();
        }}
        preselectedClientId={clientId}
      />
    </div>
  );
}
