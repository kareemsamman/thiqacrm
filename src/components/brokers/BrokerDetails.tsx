import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowRight,
  Pencil,
  Phone,
  FileText,
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { ClientDrawer } from "@/components/clients/ClientDrawer";
import { PolicyWizard } from "@/components/policies/PolicyWizard";
import { PolicyDetailsDrawer } from "@/components/policies/PolicyDetailsDrawer";
import { RowActionsMenu } from "@/components/shared/RowActionsMenu";

interface Broker {
  id: string;
  name: string;
  phone: string | null;
  image_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface Client {
  id: string;
  full_name: string;
  id_number: string;
  phone_number: string | null;
}

interface Policy {
  id: string;
  policy_type_parent: string;
  insurance_price: number;
  profit: number;
  start_date: string;
  end_date: string;
  broker_direction: 'from_broker' | 'to_broker' | null;
  client: { full_name: string } | null;
  car: { car_number: string } | null;
}

interface BrokerDetailsProps {
  broker: Broker;
  onBack: () => void;
  onEdit: () => void;
  onRefresh: () => void;
}

const policyTypeLabels: Record<string, string> = {
  ELZAMI: "إلزامي",
  THIRD_FULL: "طرف ثالث/شامل",
  ROAD_SERVICE: "خدمة الطريق",
  ACCIDENT_FEE_EXEMPTION: "إعفاء حدمات",
};

export function BrokerDetails({ broker, onBack, onEdit, onRefresh }: BrokerDetailsProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCollected: 0,
    totalRemaining: 0,
    // له علي = insurance from broker (broker_direction = 'from_broker')
    fromBrokerTotal: 0,
    // علي له = insurance I made for broker (broker_direction = 'to_broker' or null for existing)
    toBrokerTotal: 0,
  });
  const [clientDrawerOpen, setClientDrawerOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [viewingPolicyId, setViewingPolicyId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch clients under this broker
      const { data: clientsData } = await supabase
        .from("clients")
        .select("id, full_name, id_number, phone_number")
        .eq("broker_id", broker.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      setClients(clientsData || []);

      // Fetch policies for this broker
      const { data: policiesData } = await supabase
        .from("policies")
        .select(`
          id, policy_type_parent, insurance_price, profit, start_date, end_date, broker_direction,
          clients!policies_client_id_fkey(full_name),
          cars!policies_car_id_fkey(car_number)
        `)
        .eq("broker_id", broker.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      const formattedPolicies = (policiesData || []).map((p: any) => ({
        ...p,
        client: p.clients,
        car: p.cars,
      }));
      setPolicies(formattedPolicies);

      // Calculate stats
      const policyIds = formattedPolicies.map((p) => p.id);
      let totalCollected = 0;

      if (policyIds.length > 0) {
        const { data: payments } = await supabase
          .from("policy_payments")
          .select("amount, refused")
          .in("policy_id", policyIds);

        totalCollected =
          payments
            ?.filter((p) => !p.refused)
            .reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      }

      const totalPrice = formattedPolicies.reduce(
        (sum, p) => sum + Number(p.insurance_price),
        0
      );

      // Calculate broker balance by direction
      // له علي = from_broker policies (insurance came from broker, I owe him)
      const fromBrokerPolicies = formattedPolicies.filter(
        (p) => p.broker_direction === 'from_broker'
      );
      // علي له = to_broker OR null (existing policies = I made for broker, he owes me)
      const toBrokerPolicies = formattedPolicies.filter(
        (p) => p.broker_direction === 'to_broker' || p.broker_direction === null
      );

      // Use insurance_price instead of profit for broker accounting
      const fromBrokerTotal = fromBrokerPolicies.reduce(
        (sum, p) => sum + Number(p.insurance_price || 0),
        0
      );
      const toBrokerTotal = toBrokerPolicies.reduce(
        (sum, p) => sum + Number(p.insurance_price || 0),
        0
      );

      setStats({
        totalCollected,
        totalRemaining: totalPrice - totalCollected,
        fromBrokerTotal,
        toBrokerTotal,
      });
    } catch (error) {
      console.error("Error fetching broker data:", error);
    } finally {
      setLoading(false);
    }
  }, [broker.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ar-EG");
  };

  // Net balance: positive = broker owes me, negative = I owe broker
  const netBalance = stats.toBrokerTotal - stats.fromBrokerTotal;

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <span className="text-xl font-bold text-primary">
                  {broker.name.charAt(0)}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{broker.name}</h1>
                {broker.phone && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span dir="ltr">{broker.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onEdit}>
              <Pencil className="h-4 w-4 ml-2" />
              تعديل
            </Button>
            <Button onClick={() => setWizardOpen(true)}>
              <Plus className="h-4 w-4 ml-2" />
              إضافة وثيقة
            </Button>
          </div>
        </div>

        {/* Stats Cards - 5 cards without clients */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* المحصل - Total collected */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Wallet className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">المحصل</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(stats.totalCollected)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* المتبقي - Remaining */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                  <FileText className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">المتبقي</p>
                  <p className="text-xl font-bold text-destructive">
                    {formatCurrency(stats.totalRemaining)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* له علي - What broker wants from me (from_broker) */}
          <Card className="border-orange-200 dark:border-orange-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <TrendingDown className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">له علي</p>
                  <p className="text-xl font-bold text-orange-600">
                    {formatCurrency(stats.fromBrokerTotal)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* علي له - What I want from broker (to_broker or null) */}
          <Card className="border-green-200 dark:border-green-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">علي له</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(stats.toBrokerTotal)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Net Balance */}
          <Card className={cn(
            "border-2",
            netBalance >= 0 ? "border-green-300 dark:border-green-700" : "border-red-300 dark:border-red-700"
          )}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  netBalance >= 0 ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
                )}>
                  <Wallet className={cn(
                    "h-5 w-5",
                    netBalance >= 0 ? "text-green-600" : "text-red-600"
                  )} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {netBalance >= 0 ? "لي عليه" : "له علي (صافي)"}
                  </p>
                  <p className={cn(
                    "text-xl font-bold",
                    netBalance >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {formatCurrency(Math.abs(netBalance))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notes */}
        {broker.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ملاحظات</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{broker.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="policies" className="space-y-4">
          <TabsList>
            <TabsTrigger value="policies" className="gap-2">
              <FileText className="h-4 w-4" />
              الوثائق ({policies.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="policies">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">وثائق الوسيط</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : policies.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    لا توجد وثائق تحت هذا الوسيط
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الجهة</TableHead>
                        <TableHead>العميل</TableHead>
                        <TableHead>السيارة</TableHead>
                        <TableHead>النوع</TableHead>
                        <TableHead>السعر</TableHead>
                        <TableHead>الصلاحية</TableHead>
                        <TableHead className="w-[80px]">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {policies.map((policy) => (
                        <TableRow 
                          key={policy.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setViewingPolicyId(policy.id)}
                        >
                          <TableCell>
                            {policy.broker_direction === 'from_broker' ? (
                              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                عن طريق {broker.name}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                تم تصديرها عن طريقي
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {policy.client?.full_name || "-"}
                          </TableCell>
                          <TableCell className="font-mono text-sm" dir="ltr">
                            {policy.car?.car_number || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {policyTypeLabels[policy.policy_type_parent] ||
                                policy.policy_type_parent}
                            </Badge>
                          </TableCell>
                          <TableCell dir="ltr">
                            {formatCurrency(policy.insurance_price)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(policy.start_date)} - {formatDate(policy.end_date)}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <RowActionsMenu
                              onView={() => setViewingPolicyId(policy.id)}
                              onEdit={() => setViewingPolicyId(policy.id)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Client Drawer - pre-selected broker */}
      <ClientDrawer
        open={clientDrawerOpen}
        onOpenChange={setClientDrawerOpen}
        client={null}
        onSaved={() => {
          fetchData();
          onRefresh();
          setClientDrawerOpen(false);
        }}
        defaultBrokerId={broker.id}
      />

      {/* Policy Wizard - pre-selected broker */}
      <PolicyWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onComplete={() => {
          fetchData();
          onRefresh();
        }}
        defaultBrokerId={broker.id}
      />

      {/* Policy Details Drawer */}
      <PolicyDetailsDrawer
        open={!!viewingPolicyId}
        onOpenChange={(open) => !open && setViewingPolicyId(null)}
        policyId={viewingPolicyId}
        onUpdated={() => {
          fetchData();
          onRefresh();
        }}
      />
    </MainLayout>
  );
}
