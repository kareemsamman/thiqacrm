import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  ArrowLeft, 
  Plus, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft,
  FileText,
  Calendar,
  CheckCircle2,
  Clock
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArabicDatePicker } from "@/components/ui/arabic-date-picker";
import { Checkbox } from "@/components/ui/checkbox";

interface Broker {
  id: string;
  name: string;
  phone: string | null;
}

interface Settlement {
  id: string;
  direction: 'we_owe' | 'broker_owes';
  total_amount: number;
  settlement_number: string | null;
  settlement_date: string;
  status: string;
  notes: string | null;
  created_at: string;
}

interface Policy {
  id: string;
  policy_number: string | null;
  insurance_price: number;
  start_date: string;
  client: { full_name: string } | null;
  broker_direction: string | null;
}

export default function BrokerWallet() {
  const { brokerId } = useParams<{ brokerId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [broker, setBroker] = useState<Broker | null>(null);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewSettlement, setShowNewSettlement] = useState(false);
  
  // Wallet summary
  const [weOweTotal, setWeOweTotal] = useState(0);
  const [brokerOwesTotal, setBrokerOwesTotal] = useState(0);

  // New settlement form
  const [direction, setDirection] = useState<'we_owe' | 'broker_owes'>('broker_owes');
  const [totalAmount, setTotalAmount] = useState('');
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [brokerPolicies, setBrokerPolicies] = useState<Policy[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (brokerId) {
      fetchBrokerData();
    }
  }, [brokerId]);

  const fetchBrokerData = async () => {
    setLoading(true);
    try {
      // Fetch broker
      const { data: brokerData, error: brokerError } = await supabase
        .from('brokers')
        .select('id, name, phone')
        .eq('id', brokerId)
        .single();

      if (brokerError) throw brokerError;
      setBroker(brokerData);

      // Fetch settlements
      const { data: settlementsData } = await supabase
        .from('broker_settlements')
        .select('*')
        .eq('broker_id', brokerId)
        .order('settlement_date', { ascending: false });

      if (settlementsData) {
        setSettlements(settlementsData as Settlement[]);
        
        // Calculate totals
        const weOwe = settlementsData
          .filter((s: any) => s.direction === 'we_owe')
          .reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0);
        const brokerOwes = settlementsData
          .filter((s: any) => s.direction === 'broker_owes')
          .reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0);
        
        setWeOweTotal(weOwe);
        setBrokerOwesTotal(brokerOwes);
      }

      // Fetch policies linked to this broker
      const { data: policiesData } = await supabase
        .from('policies')
        .select('id, policy_number, insurance_price, start_date, broker_direction, client:clients(full_name)')
        .eq('broker_id', brokerId)
        .is('deleted_at', null)
        .order('start_date', { ascending: false });

      if (policiesData) {
        setBrokerPolicies(policiesData as unknown as Policy[]);
      }
    } catch (error) {
      console.error('Error fetching broker data:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل بيانات الوسيط",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePolicySelect = (policyId: string, checked: boolean) => {
    if (checked) {
      setSelectedPolicies([...selectedPolicies, policyId]);
    } else {
      setSelectedPolicies(selectedPolicies.filter(id => id !== policyId));
      const newAllocations = { ...allocations };
      delete newAllocations[policyId];
      setAllocations(newAllocations);
    }
  };

  const handleAllocationChange = (policyId: string, amount: number) => {
    setAllocations({ ...allocations, [policyId]: amount });
  };

  const handleEqualSplit = () => {
    if (selectedPolicies.length === 0 || !totalAmount) return;
    const total = parseFloat(totalAmount);
    const perPolicy = Math.floor(total / selectedPolicies.length);
    const remainder = total - (perPolicy * selectedPolicies.length);
    
    const newAllocations: Record<string, number> = {};
    selectedPolicies.forEach((id, index) => {
      newAllocations[id] = index === 0 ? perPolicy + remainder : perPolicy;
    });
    setAllocations(newAllocations);
  };

  const handleProportionalSplit = () => {
    if (selectedPolicies.length === 0 || !totalAmount) return;
    const total = parseFloat(totalAmount);
    const selectedPolicyData = brokerPolicies.filter(p => selectedPolicies.includes(p.id));
    const totalPremium = selectedPolicyData.reduce((sum, p) => sum + (p.insurance_price || 0), 0);
    
    if (totalPremium === 0) {
      handleEqualSplit();
      return;
    }

    const newAllocations: Record<string, number> = {};
    let allocated = 0;
    selectedPolicyData.forEach((p, index) => {
      if (index === selectedPolicyData.length - 1) {
        newAllocations[p.id] = total - allocated;
      } else {
        const amount = Math.round((p.insurance_price / totalPremium) * total);
        newAllocations[p.id] = amount;
        allocated += amount;
      }
    });
    setAllocations(newAllocations);
  };

  const handleSaveSettlement = async () => {
    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      toast({ title: "خطأ", description: "يرجى إدخال مبلغ صحيح", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Create settlement
      const { data: settlement, error: settlementError } = await supabase
        .from('broker_settlements')
        .insert({
          broker_id: brokerId,
          direction,
          total_amount: parseFloat(totalAmount),
          settlement_date: settlementDate,
          notes,
          status: 'completed',
          created_by_admin_id: user?.id,
        })
        .select()
        .single();

      if (settlementError) throw settlementError;

      // Create settlement items for selected policies
      if (selectedPolicies.length > 0 && settlement) {
        const items = selectedPolicies.map(policyId => ({
          settlement_id: settlement.id,
          policy_id: policyId,
          amount: allocations[policyId] || 0,
        }));

        const { error: itemsError } = await supabase
          .from('broker_settlement_items')
          .insert(items);

        if (itemsError) throw itemsError;
      }

      toast({ title: "تم الحفظ", description: "تم إنشاء التسوية بنجاح" });
      setShowNewSettlement(false);
      resetForm();
      fetchBrokerData();
    } catch (error) {
      console.error('Error saving settlement:', error);
      toast({ title: "خطأ", description: "فشل في حفظ التسوية", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setDirection('broker_owes');
    setTotalAmount('');
    setSettlementDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setSelectedPolicies([]);
    setAllocations({});
  };

  const netBalance = brokerOwesTotal - weOweTotal;

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6" dir="rtl">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/brokers')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Wallet className="h-6 w-6" />
                محفظة الوسيط
              </h1>
              <p className="text-muted-foreground">{broker?.name}</p>
            </div>
          </div>
          <Button onClick={() => setShowNewSettlement(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            تسوية جديدة
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30">
                <ArrowUpRight className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">نحن ندين له</p>
                <p className="text-2xl font-bold text-red-600">₪{weOweTotal.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
                <ArrowDownLeft className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">يدين لنا</p>
                <p className="text-2xl font-bold text-green-600">₪{brokerOwesTotal.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card className={`p-6 ${netBalance >= 0 ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${netBalance >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                <Wallet className={`h-6 w-6 ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الرصيد الصافي</p>
                <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {netBalance >= 0 ? '+' : ''}₪{netBalance.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Settlements Table */}
        <Card>
          <div className="p-4 border-b">
            <h2 className="font-semibold">سجل التسويات</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>التاريخ</TableHead>
                <TableHead>الاتجاه</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>ملاحظات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settlements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    لا توجد تسويات بعد
                  </TableCell>
                </TableRow>
              ) : (
                settlements.map((settlement) => (
                  <TableRow key={settlement.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(settlement.settlement_date).toLocaleDateString('ar-EG')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {settlement.direction === 'we_owe' ? (
                        <Badge variant="outline" className="text-red-600 border-red-200">
                          <ArrowUpRight className="h-3 w-3 ml-1" />
                          نحن ندين
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-200">
                          <ArrowDownLeft className="h-3 w-3 ml-1" />
                          يدين لنا
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold">
                      ₪{settlement.total_amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {settlement.status === 'completed' ? (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle2 className="h-3 w-3 ml-1" />
                          مكتمل
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-700">
                          <Clock className="h-3 w-3 ml-1" />
                          معلق
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {settlement.notes || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* New Settlement Dialog */}
        <Dialog open={showNewSettlement} onOpenChange={setShowNewSettlement}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                تسوية جديدة - {broker?.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* Direction & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>الاتجاه</Label>
                  <Select value={direction} onValueChange={(v: 'we_owe' | 'broker_owes') => setDirection(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="broker_owes">الوسيط يدين لنا</SelectItem>
                      <SelectItem value="we_owe">نحن ندين للوسيط</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>المبلغ الإجمالي (₪)</Label>
                  <Input
                    type="number"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>تاريخ التسوية</Label>
                  <ArabicDatePicker
                    value={settlementDate}
                    onChange={(date) => setSettlementDate(date)}
                  />
                </div>
              </div>

              {/* Policies Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>ربط بالوثائق (اختياري)</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleEqualSplit}
                      disabled={selectedPolicies.length === 0 || !totalAmount}
                    >
                      تقسيم متساوي
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleProportionalSplit}
                      disabled={selectedPolicies.length === 0 || !totalAmount}
                    >
                      تقسيم نسبي
                    </Button>
                  </div>
                </div>

                <Card className="max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>العميل</TableHead>
                        <TableHead>السعر</TableHead>
                        <TableHead>المبلغ المخصص</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {brokerPolicies.map((policy) => (
                        <TableRow key={policy.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedPolicies.includes(policy.id)}
                              onCheckedChange={(checked) => handlePolicySelect(policy.id, !!checked)}
                            />
                          </TableCell>
                          <TableCell>{policy.client?.full_name || '-'}</TableCell>
                          <TableCell>₪{policy.insurance_price?.toLocaleString()}</TableCell>
                          <TableCell>
                            {selectedPolicies.includes(policy.id) && (
                              <Input
                                type="number"
                                value={allocations[policy.id] || ''}
                                onChange={(e) => handleAllocationChange(policy.id, parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="w-24 h-8"
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </div>

              {/* Notes */}
              <div>
                <Label>ملاحظات</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات إضافية..."
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowNewSettlement(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleSaveSettlement} disabled={saving}>
                  {saving ? 'جاري الحفظ...' : 'حفظ التسوية'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}