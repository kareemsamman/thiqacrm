import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBranches } from "@/hooks/useBranches";
import { AccidentFilesUploader } from "./AccidentFilesUploader";
import {
  Search,
  User,
  CheckCircle,
  Car,
  FileText,
  Building2,
  Calendar,
  Plus,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  full_name: string;
  id_number: string;
  file_number: string | null;
  phone_number: string | null;
}

interface PolicyPackage {
  group_id: string;
  policies: Array<{
    id: string;
    policy_number: string | null;
    policy_type_parent: string;
    policy_type_child: string | null;
    start_date: string;
    end_date: string;
    insurance_price: number;
    cancelled: boolean;
    company: { id: string; name: string; name_ar: string | null } | null;
    car: { id: string; car_number: string } | null;
  }>;
  car_number: string | null;
  car_id: string | null;
  company_name: string | null;
  company_id: string | null;
  total_price: number;
  is_active: boolean;
  is_paid: boolean;
  has_third_full: boolean;
  has_road_service: boolean;
  has_elzami: boolean;
}

interface CoverageOption {
  type: string;
  label: string;
  policy_id: string;
  policy_number: string | null;
}

interface UploadedFile {
  id: string;
  url: string;
  name: string;
  type: string;
}

interface AccidentReportDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  preselectedClientId?: string;
}

const STEPS = ["العميل", "الوثيقة", "البلاغ"];

export function AccidentReportDrawer({
  open,
  onOpenChange,
  onSuccess,
  preselectedClientId,
}: AccidentReportDrawerProps) {
  const { profile, isAdmin, branchId: userBranchId } = useAuth();
  const { branches } = useBranches();
  const [currentStep, setCurrentStep] = useState(0);

  // Step 1: Client
  const [clientSearch, setClientSearch] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [manualClient, setManualClient] = useState({
    full_name: "",
    id_number: "",
    phone_number: "",
  });
  const [useManualClient, setUseManualClient] = useState(false);

  // Step 2: Policy Package & Coverage
  const [packages, setPackages] = useState<PolicyPackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PolicyPackage | null>(null);
  const [coverageOptions, setCoverageOptions] = useState<CoverageOption[]>([]);
  const [selectedCoverage, setSelectedCoverage] = useState<CoverageOption | null>(null);

  // Step 3: Report Details
  const [policyNumber, setPolicyNumber] = useState("");
  const [carNumber, setCarNumber] = useState("");
  const [accidentDate, setAccidentDate] = useState(new Date().toISOString().split("T")[0]);
  const [deductible, setDeductible] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [branchId, setBranchId] = useState(userBranchId || "");

  // Submit
  const [submitting, setSubmitting] = useState(false);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setCurrentStep(0);
      setClientSearch("");
      setClients([]);
      setSelectedClient(null);
      setManualClient({ full_name: "", id_number: "", phone_number: "" });
      setUseManualClient(false);
      setPackages([]);
      setSelectedPackage(null);
      setCoverageOptions([]);
      setSelectedCoverage(null);
      setPolicyNumber("");
      setCarNumber("");
      setAccidentDate(new Date().toISOString().split("T")[0]);
      setDeductible("");
      setFiles([]);
    }
  }, [open]);

  // Load preselected client
  useEffect(() => {
    if (open && preselectedClientId) {
      loadClient(preselectedClientId);
    }
  }, [open, preselectedClientId]);

  const loadClient = async (clientId: string) => {
    const { data } = await supabase
      .from("clients")
      .select("id, full_name, id_number, file_number, phone_number")
      .eq("id", clientId)
      .single();

    if (data) {
      setSelectedClient(data);
    }
  };

  // Search clients
  useEffect(() => {
    if (clientSearch.length >= 2) {
      const timer = setTimeout(() => searchClients(clientSearch), 300);
      return () => clearTimeout(timer);
    } else {
      setClients([]);
    }
  }, [clientSearch]);

  const searchClients = async (query: string) => {
    setLoadingClients(true);
    const { data } = await supabase
      .from("clients")
      .select("id, full_name, id_number, file_number, phone_number")
      .is("deleted_at", null)
      .or(
        `full_name.ilike.%${query}%,id_number.ilike.%${query}%,file_number.ilike.%${query}%,phone_number.ilike.%${query}%`
      )
      .limit(10);

    setLoadingClients(false);
    setClients(data || []);
  };

  // Load packages when client is selected
  useEffect(() => {
    if (selectedClient) {
      loadPackages(selectedClient.id);
    } else {
      setPackages([]);
    }
  }, [selectedClient]);

  const loadPackages = async (clientId: string) => {
    setLoadingPackages(true);
    try {
      const { data: policiesData } = await supabase
        .from("policies")
        .select(`
          id, policy_number, policy_type_parent, policy_type_child,
          start_date, end_date, insurance_price, cancelled, group_id,
          company:insurance_companies(id, name, name_ar),
          car:cars(id, car_number)
        `)
        .eq("client_id", clientId)
        .eq("cancelled", false)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (!policiesData) {
        setPackages([]);
        return;
      }

      // Get payments to determine if paid
      const policyIds = policiesData.map(p => p.id);
      const { data: payments } = await supabase
        .from("policy_payments")
        .select("policy_id, amount, refused")
        .in("policy_id", policyIds);

      const paidByPolicy: Record<string, number> = {};
      (payments || []).forEach(p => {
        if (!p.refused) {
          paidByPolicy[p.policy_id] = (paidByPolicy[p.policy_id] || 0) + p.amount;
        }
      });

      // Group by group_id
      const grouped: Record<string, PolicyPackage> = {};
      const today = new Date();

      policiesData.forEach(policy => {
        const gid = policy.group_id || policy.id;
        if (!grouped[gid]) {
          grouped[gid] = {
            group_id: gid,
            policies: [],
            car_number: null,
            car_id: null,
            company_name: null,
            company_id: null,
            total_price: 0,
            is_active: false,
            is_paid: false,
            has_third_full: false,
            has_road_service: false,
            has_elzami: false,
          };
        }

        grouped[gid].policies.push(policy as any);
        grouped[gid].total_price += policy.insurance_price || 0;

        // Set car info
        if (policy.car && !grouped[gid].car_number) {
          grouped[gid].car_number = policy.car.car_number;
          grouped[gid].car_id = policy.car.id;
        }

        // Set company info from THIRD_FULL policy
        if (policy.policy_type_parent === "THIRD_FULL" && policy.company) {
          grouped[gid].company_name = policy.company.name_ar || policy.company.name;
          grouped[gid].company_id = policy.company.id;
        }

        // Check types
        if (policy.policy_type_parent === "THIRD_FULL") grouped[gid].has_third_full = true;
        if (policy.policy_type_parent === "ROAD_SERVICE") grouped[gid].has_road_service = true;
        if (policy.policy_type_parent === "ELZAMI") grouped[gid].has_elzami = true;

        // Check if active
        const endDate = new Date(policy.end_date);
        if (endDate >= today) {
          grouped[gid].is_active = true;
        }
      });

      // Calculate paid status
      Object.values(grouped).forEach(pkg => {
        const totalPaid = pkg.policies.reduce((sum, p) => sum + (paidByPolicy[p.id] || 0), 0);
        pkg.is_paid = totalPaid >= pkg.total_price;
      });

      // Sort by date (newest first)
      const sorted = Object.values(grouped).sort((a, b) => {
        const aDate = Math.max(...a.policies.map(p => new Date(p.start_date).getTime()));
        const bDate = Math.max(...b.policies.map(p => new Date(p.start_date).getTime()));
        return bDate - aDate;
      });

      setPackages(sorted);
    } catch (error) {
      console.error("Error loading packages:", error);
    } finally {
      setLoadingPackages(false);
    }
  };

  // Update coverage options when package is selected
  useEffect(() => {
    if (selectedPackage) {
      const options: CoverageOption[] = [];

      selectedPackage.policies.forEach(policy => {
        if (policy.policy_type_parent === "THIRD_FULL") {
          options.push({
            type: policy.policy_type_child || "THIRD",
            label: policy.policy_type_child === "FULL" ? "شامل" : "طرف ثالث",
            policy_id: policy.id,
            policy_number: policy.policy_number,
          });
        } else if (policy.policy_type_parent === "ROAD_SERVICE") {
          options.push({
            type: "ROAD_SERVICE",
            label: "خدمات طريق",
            policy_id: policy.id,
            policy_number: null,
          });
        }
        // ELZAMI excluded
      });

      setCoverageOptions(options);
      setSelectedCoverage(null);

      // Auto-populate car number
      if (selectedPackage.car_number) {
        setCarNumber(selectedPackage.car_number);
      }
    } else {
      setCoverageOptions([]);
      setSelectedCoverage(null);
    }
  }, [selectedPackage]);

  // Auto-populate policy number when coverage is selected
  useEffect(() => {
    if (selectedCoverage?.policy_number) {
      setPolicyNumber(selectedCoverage.policy_number);
    } else {
      setPolicyNumber("");
    }
  }, [selectedCoverage]);

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setUseManualClient(false);
    setClientSearch("");
    setClients([]);
  };

  const canProceedStep1 = selectedClient || (useManualClient && manualClient.full_name && manualClient.id_number);
  const canProceedStep2 = selectedPackage && selectedCoverage;
  const canSubmit = selectedCoverage && accidentDate && !submitting && !uploading;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      let clientId = selectedClient?.id;

      // Create client if manual
      if (useManualClient && !clientId) {
        const { data: newClient, error: clientError } = await supabase
          .from("clients")
          .insert({
            full_name: manualClient.full_name,
            id_number: manualClient.id_number,
            phone_number: manualClient.phone_number || null,
            branch_id: branchId || userBranchId || null,
            created_by_admin_id: profile?.id,
          })
          .select("id")
          .single();

        if (clientError) throw clientError;
        clientId = newClient.id;
      }

      if (!clientId) throw new Error("لا يوجد عميل");

      // Create accident report
      const { data: report, error: reportError } = await supabase
        .from("accident_reports")
        .insert({
          client_id: clientId,
          policy_id: selectedCoverage.policy_id,
          car_id: selectedPackage?.car_id || null,
          company_id: selectedPackage?.company_id || null,
          accident_date: accidentDate,
          status: "draft",
          coverage_type: selectedCoverage.type,
          selected_policy_group_id: selectedPackage?.group_id || null,
          deductible_amount: deductible ? parseFloat(deductible) : null,
          branch_id: branchId || userBranchId || null,
          created_by_admin_id: profile?.id,
        })
        .select("id")
        .single();

      if (reportError) throw reportError;

      // Save files
      if (files.length > 0) {
        const fileRecords = files.map(f => ({
          accident_report_id: report.id,
          file_url: f.url,
          file_name: f.name,
          file_type: f.type,
        }));

        await supabase.from("accident_report_files").insert(fileRecords);
      }

      toast.success("تم إنشاء البلاغ بنجاح");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating report:", error);
      toast.error(error.message || "فشل في إنشاء البلاغ");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto" dir="rtl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            بلاغ حادث جديد
          </SheetTitle>
        </SheetHeader>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 my-6">
          {STEPS.map((step, index) => (
            <div key={step} className="flex items-center">
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
                  index < currentStep
                    ? "bg-primary text-primary-foreground"
                    : index === currentStep
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {index < currentStep ? "✓" : index + 1}
              </div>
              <span
                className={cn(
                  "mr-2 text-sm",
                  index === currentStep ? "font-medium" : "text-muted-foreground"
                )}
              >
                {step}
              </span>
              {index < STEPS.length - 1 && (
                <ChevronLeft className="h-4 w-4 mx-2 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>

        <div className="space-y-6 pb-6">
          {/* Step 1: Client Selection */}
          {currentStep === 0 && (
            <div className="space-y-4">
              {/* Branch Selection for Admin */}
              {isAdmin && branches.length > 1 && (
                <div>
                  <Label>الفرع</Label>
                  <Select value={branchId} onValueChange={setBranchId}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الفرع" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name_ar || b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Selected Client Card */}
              {selectedClient && !useManualClient && (
                <Card className="p-4 border-primary bg-primary/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{selectedClient.full_name}</p>
                          <CheckCircle className="h-4 w-4 text-primary" />
                        </div>
                        <p className="text-sm text-muted-foreground">{selectedClient.id_number}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedClient(null)}
                    >
                      تغيير
                    </Button>
                  </div>
                </Card>
              )}

              {/* Search Input */}
              {!selectedClient && !useManualClient && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="ابحث بالاسم، رقم الهوية، الهاتف..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="pr-10"
                    />
                  </div>

                  {loadingClients && (
                    <div className="space-y-2">
                      <Skeleton className="h-14 w-full" />
                      <Skeleton className="h-14 w-full" />
                    </div>
                  )}

                  {!loadingClients && clients.length > 0 && (
                    <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                      {clients.map((client) => (
                        <button
                          key={client.id}
                          type="button"
                          className="w-full p-3 text-right hover:bg-muted/50 transition-colors flex items-center gap-3"
                          onClick={() => handleSelectClient(client)}
                        >
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{client.full_name}</p>
                            <p className="text-sm text-muted-foreground">{client.id_number}</p>
                          </div>
                          {client.file_number && (
                            <Badge variant="secondary">{client.file_number}</Badge>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => setUseManualClient(true)}
                  >
                    <Plus className="h-4 w-4" />
                    إدخال يدوي
                  </Button>
                </div>
              )}

              {/* Manual Client Form */}
              {useManualClient && (
                <div className="space-y-3">
                  <div>
                    <Label>الاسم الكامل *</Label>
                    <Input
                      value={manualClient.full_name}
                      onChange={(e) =>
                        setManualClient({ ...manualClient, full_name: e.target.value })
                      }
                      placeholder="أدخل اسم العميل"
                    />
                  </div>
                  <div>
                    <Label>رقم الهوية *</Label>
                    <Input
                      value={manualClient.id_number}
                      onChange={(e) =>
                        setManualClient({ ...manualClient, id_number: e.target.value })
                      }
                      placeholder="أدخل رقم الهوية"
                    />
                  </div>
                  <div>
                    <Label>رقم الهاتف</Label>
                    <Input
                      value={manualClient.phone_number}
                      onChange={(e) =>
                        setManualClient({ ...manualClient, phone_number: e.target.value })
                      }
                      placeholder="أدخل رقم الهاتف"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setUseManualClient(false);
                      setManualClient({ full_name: "", id_number: "", phone_number: "" });
                    }}
                  >
                    إلغاء
                  </Button>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={() => setCurrentStep(1)}
                  disabled={!canProceedStep1}
                >
                  التالي
                  <ChevronLeft className="h-4 w-4 mr-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Package & Coverage Selection */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">اختر الوثيقة</Label>

              {loadingPackages ? (
                <div className="space-y-3">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : packages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>لا توجد وثائق لهذا العميل</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {packages.map((pkg) => (
                    <Card
                      key={pkg.group_id}
                      className={cn(
                        "p-3 cursor-pointer transition-all",
                        selectedPackage?.group_id === pkg.group_id
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "hover:border-primary/50"
                      )}
                      onClick={() => setSelectedPackage(pkg)}
                    >
                      <div className="space-y-2">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {pkg.company_name && (
                              <div className="flex items-center gap-1">
                                <Building2 className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm font-medium">{pkg.company_name}</span>
                              </div>
                            )}
                            {pkg.car_number && (
                              <div className="flex items-center gap-1">
                                <Car className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm font-mono">{pkg.car_number}</span>
                              </div>
                            )}
                          </div>
                          <span className="text-sm font-medium">₪{pkg.total_price.toLocaleString()}</span>
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-1">
                          <Badge variant={pkg.is_active ? "success" : "secondary"}>
                            {pkg.is_active ? "سارية ✓" : "منتهية"}
                          </Badge>
                          {pkg.has_third_full && (
                            <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                              ثالث/شامل
                            </Badge>
                          )}
                          {pkg.has_elzami && (
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                              إلزامي
                            </Badge>
                          )}
                          {pkg.has_road_service && (
                            <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                              خدمات طريق
                            </Badge>
                          )}
                          {pkg.is_paid && (
                            <Badge variant="success" className="text-xs">
                              مدفوع ✓
                            </Badge>
                          )}
                        </div>

                        {/* Dates */}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(pkg.policies[0]?.start_date)} ← {formatDate(pkg.policies[0]?.end_date)}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Coverage Selection */}
              {selectedPackage && coverageOptions.length > 0 && (
                <div className="space-y-2">
                  <Label>اختر نوع التغطية للبلاغ</Label>
                  <Select
                    value={selectedCoverage?.policy_id || ""}
                    onValueChange={(val) => {
                      const option = coverageOptions.find(o => o.policy_id === val);
                      setSelectedCoverage(option || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع التغطية" />
                    </SelectTrigger>
                    <SelectContent>
                      {coverageOptions.map((option) => (
                        <SelectItem key={option.policy_id} value={option.policy_id}>
                          {option.label}
                          {option.policy_number && (
                            <span className="mr-2 text-muted-foreground">
                              (رقم: {option.policy_number})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedPackage && coverageOptions.length === 0 && (
                <div className="text-center py-4 text-amber-600 text-sm">
                  هذه الباقة لا تحتوي على تغطية طرف ثالث/شامل أو خدمات طريق
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(0)}>
                  <ChevronRight className="h-4 w-4 ml-2" />
                  السابق
                </Button>
                <Button
                  onClick={() => setCurrentStep(2)}
                  disabled={!canProceedStep2}
                >
                  التالي
                  <ChevronLeft className="h-4 w-4 mr-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Report Details */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>رقم البوليصة</Label>
                  <Input
                    value={policyNumber}
                    onChange={(e) => setPolicyNumber(e.target.value)}
                    placeholder="رقم البوليصة"
                  />
                </div>
                <div>
                  <Label>رقم السيارة</Label>
                  <Input
                    value={carNumber}
                    onChange={(e) => setCarNumber(e.target.value)}
                    placeholder="رقم السيارة"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>تاريخ الحادث *</Label>
                  <Input
                    type="date"
                    value={accidentDate}
                    onChange={(e) => setAccidentDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>فتحة التأمين (₪)</Label>
                  <Input
                    type="number"
                    value={deductible}
                    onChange={(e) => setDeductible(e.target.value)}
                    placeholder="اختياري"
                  />
                </div>
              </div>

              <div>
                <Label>الملفات والمستندات</Label>
                <AccidentFilesUploader
                  files={files}
                  onFilesChange={setFiles}
                  uploading={uploading}
                  setUploading={setUploading}
                />
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  <ChevronRight className="h-4 w-4 ml-2" />
                  السابق
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="gap-2"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  إنشاء البلاغ
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
