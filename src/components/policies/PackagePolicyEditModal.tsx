import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArabicDatePicker } from "@/components/ui/arabic-date-picker";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, X, Shield, Car, Truck, FileCheck, Package, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import { calculatePolicyProfit } from "@/lib/pricingCalculator";
import { formatCurrency } from "@/lib/utils";
import type { Enums } from "@/integrations/supabase/types";

interface PolicyData {
  id: string;
  policy_type_parent: string;
  policy_type_child: string | null;
  start_date: string;
  end_date: string;
  insurance_price: number;
  is_under_24?: boolean | null;
  group_id: string | null;
  insurance_companies?: {
    id: string;
    name: string;
    name_ar: string | null;
  } | null;
  road_services?: {
    id: string;
    name: string;
    name_ar: string | null;
  } | null;
  accident_fee_services?: {
    id: string;
    name: string;
    name_ar: string | null;
  } | null;
  cars?: {
    car_type: string | null;
    car_value: number | null;
    year: number | null;
    car_number: string | null;
  } | null;
  clients?: {
    full_name: string | null;
  } | null;
}

interface PackagePolicyEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string | null;
  initialPolicyId?: string | null;
  onSaved?: () => void;
}

interface EditState {
  startDate: string;
  endDate: string;
  insurancePrice: string;
}

const policyTypeLabels: Record<string, string> = {
  ELZAMI: "إلزامي",
  THIRD_FULL: "ثالث/شامل",
  ROAD_SERVICE: "خدمات الطريق",
  ACCIDENT_FEE_EXEMPTION: "إعفاء رسوم حادث",
};

const policyChildLabels: Record<string, string> = {
  THIRD: "طرف ثالث",
  FULL: "شامل",
};

const policyTypeConfig: Record<string, { icon: React.ElementType; bg: string; text: string; border: string }> = {
  ELZAMI: { icon: Shield, bg: "bg-blue-500/10", text: "text-blue-700", border: "border-blue-500/30" },
  THIRD_FULL: { icon: Car, bg: "bg-purple-500/10", text: "text-purple-700", border: "border-purple-500/30" },
  ROAD_SERVICE: { icon: Truck, bg: "bg-orange-500/10", text: "text-orange-700", border: "border-orange-500/30" },
  ACCIDENT_FEE_EXEMPTION: { icon: FileCheck, bg: "bg-green-500/10", text: "text-green-700", border: "border-green-500/30" },
};

// Sort order for policy types
const policyTypeSortOrder: Record<string, number> = {
  THIRD_FULL: 1,
  ELZAMI: 2,
  ROAD_SERVICE: 3,
  ACCIDENT_FEE_EXEMPTION: 4,
};

export function PackagePolicyEditModal({
  open,
  onOpenChange,
  groupId,
  initialPolicyId,
  onSaved,
}: PackagePolicyEditModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policies, setPolicies] = useState<PolicyData[]>([]);
  const [editStates, setEditStates] = useState<Record<string, EditState>>({});
  const [clientName, setClientName] = useState<string>("");
  const [carNumber, setCarNumber] = useState<string>("");

  // Fetch all policies in the package
  const fetchPolicies = useCallback(async () => {
    if (!groupId || !open) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("policies")
        .select(`
          id,
          policy_type_parent,
          policy_type_child,
          start_date,
          end_date,
          insurance_price,
          is_under_24,
          group_id,
          insurance_companies (id, name, name_ar),
          road_services (id, name, name_ar),
          accident_fee_services (id, name, name_ar),
          cars (car_type, car_value, year, car_number),
          clients (full_name)
        `)
        .eq("group_id", groupId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Sort by policy type
      const sortedData = (data || []).sort((a, b) => {
        const orderA = policyTypeSortOrder[a.policy_type_parent] || 99;
        const orderB = policyTypeSortOrder[b.policy_type_parent] || 99;
        return orderA - orderB;
      });

      setPolicies(sortedData);

      // Initialize edit states
      const states: Record<string, EditState> = {};
      sortedData.forEach((p) => {
        states[p.id] = {
          startDate: p.start_date || "",
          endDate: p.end_date || "",
          insurancePrice: p.insurance_price?.toString() || "0",
        };
      });
      setEditStates(states);

      // Get client name and car number from first policy
      if (sortedData.length > 0) {
        setClientName(sortedData[0].clients?.full_name || "");
        setCarNumber(sortedData[0].cars?.car_number || "");
      }
    } catch (error) {
      console.error("Error fetching package policies:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل الوثائق",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [groupId, open, toast]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setPolicies([]);
      setEditStates({});
      setClientName("");
      setCarNumber("");
    }
  }, [open]);

  const getTypeName = (policy: PolicyData) => {
    if (policy.policy_type_parent === "THIRD_FULL" && policy.policy_type_child) {
      return policyChildLabels[policy.policy_type_child] || policy.policy_type_child;
    }
    return policyTypeLabels[policy.policy_type_parent] || policy.policy_type_parent;
  };

  const getCompanyName = (policy: PolicyData) => {
    if (policy.policy_type_parent === "ROAD_SERVICE" && policy.road_services) {
      return policy.road_services.name_ar || policy.road_services.name;
    }
    if (policy.policy_type_parent === "ACCIDENT_FEE_EXEMPTION" && policy.accident_fee_services) {
      return policy.accident_fee_services.name_ar || policy.accident_fee_services.name;
    }
    if (policy.insurance_companies) {
      return policy.insurance_companies.name_ar || policy.insurance_companies.name;
    }
    return "-";
  };

  const updateEditState = (policyId: string, field: keyof EditState, value: string) => {
    setEditStates((prev) => ({
      ...prev,
      [policyId]: {
        ...prev[policyId],
        [field]: value,
      },
    }));
  };

  const calculateTotal = () => {
    return Object.values(editStates).reduce((sum, state) => {
      return sum + (parseFloat(state.insurancePrice) || 0);
    }, 0);
  };

  const handleSaveAll = async () => {
    if (policies.length === 0) return;

    setSaving(true);
    try {
      // Process each policy
      for (const policy of policies) {
        const state = editStates[policy.id];
        if (!state) continue;

        const price = parseFloat(state.insurancePrice) || 0;
        let companyPayment = price;
        let profit = 0;

        // Recalculate profit based on policy type
        if (policy.policy_type_parent === "ELZAMI") {
          const { data: companyData } = await supabase
            .from("insurance_companies")
            .select("elzami_commission")
            .eq("id", policy.insurance_companies?.id || "")
            .single();
          profit = companyData?.elzami_commission || 0;
          companyPayment = price;
        } else if (["ROAD_SERVICE", "ACCIDENT_FEE_EXEMPTION"].includes(policy.policy_type_parent)) {
          if (policy.policy_type_parent === "ROAD_SERVICE" && policy.road_services?.id) {
            const { data: priceData } = await supabase
              .from("company_road_service_prices")
              .select("company_cost")
              .eq("road_service_id", policy.road_services.id)
              .limit(1)
              .single();
            companyPayment = priceData?.company_cost || price;
          } else if (policy.policy_type_parent === "ACCIDENT_FEE_EXEMPTION" && policy.accident_fee_services?.id) {
            const { data: priceData } = await supabase
              .from("company_accident_fee_prices")
              .select("company_cost")
              .eq("accident_fee_service_id", policy.accident_fee_services.id)
              .limit(1)
              .single();
            companyPayment = priceData?.company_cost || price;
          }
          profit = price - companyPayment;
        } else if (policy.policy_type_parent === "THIRD_FULL" && policy.insurance_companies?.id) {
          const ageBand: Enums<"age_band"> = policy.is_under_24 ? "UNDER_24" : "UP_24";
          const result = await calculatePolicyProfit({
            policyTypeParent: policy.policy_type_parent as Enums<"policy_type_parent">,
            policyTypeChild: (policy.policy_type_child || null) as Enums<"policy_type_child"> | null,
            companyId: policy.insurance_companies.id,
            carType: (policy.cars?.car_type || "car") as Enums<"car_type">,
            ageBand,
            carValue: policy.cars?.car_value || null,
            carYear: policy.cars?.year || null,
            insurancePrice: price,
          });
          companyPayment = result.companyPayment;
          profit = result.profit;
        }

        // Update the policy
        const { error } = await supabase
          .from("policies")
          .update({
            start_date: state.startDate,
            end_date: state.endDate,
            insurance_price: price,
            payed_for_company: companyPayment,
            profit,
            updated_at: new Date().toISOString(),
          })
          .eq("id", policy.id);

        if (error) throw error;
      }

      toast({ title: "تم الحفظ", description: "تم تحديث جميع وثائق الباقة بنجاح" });
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      console.error("Error saving policies:", error);
      toast({
        title: "خطأ",
        description: "فشل في حفظ التغييرات",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!groupId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader className="text-right shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span>تعديل الباقة</span>
              {clientName && (
                <span className="text-muted-foreground font-normal mr-2">
                  - {clientName}
                </span>
              )}
              {carNumber && (
                <span className="font-mono text-muted-foreground font-normal mr-1 ltr-nums">
                  ({carNumber})
                </span>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : policies.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            لا توجد وثائق في هذه الباقة
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 py-4">
                {policies.map((policy) => {
                  const config = policyTypeConfig[policy.policy_type_parent] || policyTypeConfig.ELZAMI;
                  const Icon = config.icon;
                  const state = editStates[policy.id];

                  return (
                    <div
                      key={policy.id}
                      className={cn(
                        "rounded-lg border p-4 space-y-4",
                        config.border,
                        config.bg
                      )}
                    >
                      {/* Header */}
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", config.bg)}>
                          <Icon className={cn("h-4 w-4", config.text)} />
                        </div>
                        <div className="flex-1">
                          <Badge className={cn("text-xs", config.bg, config.text, "border", config.border)}>
                            {getTypeName(policy)}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          الشركة: <span className="font-medium text-foreground">{getCompanyName(policy)}</span>
                        </div>
                      </div>

                      {/* Editable Fields */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">تاريخ البدء</Label>
                          <ArabicDatePicker
                            value={state?.startDate || ""}
                            onChange={(v) => updateEditState(policy.id, "startDate", v)}
                            compact
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">تاريخ الانتهاء</Label>
                          <ArabicDatePicker
                            value={state?.endDate || ""}
                            onChange={(v) => updateEditState(policy.id, "endDate", v)}
                            compact
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">السعر (₪)</Label>
                          <Input
                            type="number"
                            value={state?.insurancePrice || "0"}
                            onChange={(e) => updateEditState(policy.id, "insurancePrice", e.target.value)}
                            className="h-9 text-left ltr-nums"
                            min="0"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Total Summary */}
            <div className="shrink-0 border-t pt-4 mt-2">
              <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calculator className="h-5 w-5" />
                  <span className="font-medium">إجمالي الباقة</span>
                </div>
                <div className="text-2xl font-bold text-primary ltr-nums">
                  {formatCurrency(calculateTotal())}
                </div>
              </div>
            </div>
          </>
        )}

        <DialogFooter className="gap-2 shrink-0 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            <X className="h-4 w-4 ml-1" />
            إلغاء
          </Button>
          <Button onClick={handleSaveAll} disabled={saving || loading || policies.length === 0}>
            {saving ? (
              <Loader2 className="h-4 w-4 ml-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 ml-1" />
            )}
            حفظ جميع التغييرات
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
