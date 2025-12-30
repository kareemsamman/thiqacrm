import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FileUploader } from "@/components/media/FileUploader";
import { 
  ArrowLeft, 
  Plus, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Banknote,
  Building2,
  Receipt,
  XCircle,
  Image,
  Loader2
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
import { cn } from "@/lib/utils";

interface Broker {
  id: string;
  name: string;
  phone: string | null;
}

interface Transaction {
  id: string;
  direction: 'we_owe' | 'broker_owes';
  total_amount: number;
  settlement_date: string;
  status: string;
  notes: string | null;
  created_at: string;
  payment_type: string;
  cheque_number: string | null;
  cheque_image_url: string | null;
  bank_reference: string | null;
  refused: boolean;
  card_last_four: string | null;
}

type PaymentType = 'cash' | 'cheque' | 'bank_transfer' | 'visa';

const paymentTypeLabels: Record<PaymentType, string> = {
  cash: 'نقداً',
  cheque: 'شيك',
  bank_transfer: 'تحويل بنكي',
  visa: 'بطاقة ائتمان',
};

const PaymentTypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'cash': return <Banknote className="h-4 w-4" />;
    case 'cheque': return <Receipt className="h-4 w-4" />;
    case 'bank_transfer': return <Building2 className="h-4 w-4" />;
    case 'visa': return <CreditCard className="h-4 w-4" />;
    default: return <Wallet className="h-4 w-4" />;
  }
};

export default function BrokerWallet() {
  const { brokerId } = useParams<{ brokerId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [broker, setBroker] = useState<Broker | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTransaction, setShowNewTransaction] = useState(false);
  
  // Wallet summary
  const [paidToBroker, setPaidToBroker] = useState(0);
  const [receivedFromBroker, setReceivedFromBroker] = useState(0);

  // New transaction form
  const [direction, setDirection] = useState<'we_owe' | 'broker_owes'>('broker_owes');
  const [amount, setAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Payment method fields
  const [paymentType, setPaymentType] = useState<PaymentType>('cash');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeImageUrl, setChequeImageUrl] = useState('');
  const [bankReference, setBankReference] = useState('');

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

      // Fetch transactions (settlements)
      const { data: transactionsData } = await supabase
        .from('broker_settlements')
        .select('*')
        .eq('broker_id', brokerId)
        .order('settlement_date', { ascending: false });

      if (transactionsData) {
        setTransactions(transactionsData as Transaction[]);
        
        // Calculate totals (exclude refused)
        const paid = transactionsData
          .filter((t: any) => t.direction === 'we_owe' && !t.refused)
          .reduce((sum: number, t: any) => sum + (t.total_amount || 0), 0);
        const received = transactionsData
          .filter((t: any) => t.direction === 'broker_owes' && !t.refused)
          .reduce((sum: number, t: any) => sum + (t.total_amount || 0), 0);
        
        setPaidToBroker(paid);
        setReceivedFromBroker(received);
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

  const validateChequeNumber = (num: string) => {
    return /^\d{8}$/.test(num);
  };

  const handleSaveTransaction = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({ title: "خطأ", description: "يرجى إدخال مبلغ صحيح", variant: "destructive" });
      return;
    }

    if (paymentType === 'cheque' && !validateChequeNumber(chequeNumber)) {
      toast({ title: "خطأ", description: "رقم الشيك يجب أن يكون 8 أرقام", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('broker_settlements')
        .insert({
          broker_id: brokerId,
          direction,
          total_amount: parseFloat(amount),
          settlement_date: transactionDate,
          notes,
          status: 'completed',
          created_by_admin_id: user?.id,
          payment_type: paymentType,
          cheque_number: paymentType === 'cheque' ? chequeNumber : null,
          cheque_image_url: paymentType === 'cheque' ? chequeImageUrl : null,
          bank_reference: paymentType === 'bank_transfer' ? bankReference : null,
          refused: false,
        });

      if (error) throw error;

      toast({ title: "تم الحفظ", description: "تم تسجيل المعاملة بنجاح" });
      setShowNewTransaction(false);
      resetForm();
      fetchBrokerData();
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast({ title: "خطأ", description: "فشل في حفظ المعاملة", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRefused = async (transaction: Transaction) => {
    try {
      const { error } = await supabase
        .from('broker_settlements')
        .update({ refused: !transaction.refused })
        .eq('id', transaction.id);

      if (error) throw error;
      
      toast({ 
        title: transaction.refused ? "تم استعادة المعاملة" : "تم إلغاء المعاملة",
        description: transaction.refused ? "المعاملة فعّالة الآن" : "تم تحديد المعاملة كمرفوضة"
      });
      
      fetchBrokerData();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل في تحديث المعاملة", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setDirection('broker_owes');
    setAmount('');
    setTransactionDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setPaymentType('cash');
    setChequeNumber('');
    setChequeImageUrl('');
    setBankReference('');
  };

  // Balance = received from broker - paid to broker
  const netBalance = receivedFromBroker - paidToBroker;

  if (loading) {
    return (
      <MainLayout>
        <div className="p-6 space-y-6" dir="rtl">
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
      <div className="p-6 space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
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
          <Button onClick={() => setShowNewTransaction(true)} className="gap-2" size="lg">
            <Plus className="h-5 w-5" />
            دفعة جديدة
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
                <p className="text-sm text-muted-foreground">دفعت للوسيط</p>
                <p className="text-2xl font-bold text-red-600">₪{paidToBroker.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
                <ArrowDownLeft className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">استلمت من الوسيط</p>
                <p className="text-2xl font-bold text-green-600">₪{receivedFromBroker.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card className={cn(
            "p-6",
            netBalance >= 0 ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-3 rounded-xl",
                netBalance >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
              )}>
                <Wallet className={cn(
                  "h-6 w-6",
                  netBalance >= 0 ? 'text-green-600' : 'text-red-600'
                )} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {netBalance >= 0 ? 'لي عنده' : 'له عندي'}
                </p>
                <p className={cn(
                  "text-2xl font-bold",
                  netBalance >= 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  ₪{Math.abs(netBalance).toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card>
          <div className="p-4 border-b">
            <h2 className="font-semibold">سجل المعاملات</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الاتجاه</TableHead>
                  <TableHead>طريقة الدفع</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>ملاحظات</TableHead>
                  <TableHead className="w-20">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      لا توجد معاملات بعد
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((transaction) => (
                    <TableRow key={transaction.id} className={cn(transaction.refused && "opacity-50")}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {new Date(transaction.settlement_date).toLocaleDateString('ar-EG')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {transaction.direction === 'we_owe' ? (
                          <Badge variant="outline" className="text-red-600 border-red-200">
                            <ArrowUpRight className="h-3 w-3 ml-1" />
                            دفعت للوسيط
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-600 border-green-200">
                            <ArrowDownLeft className="h-3 w-3 ml-1" />
                            استلمت من الوسيط
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <PaymentTypeIcon type={transaction.payment_type || 'cash'} />
                          <span>{paymentTypeLabels[(transaction.payment_type || 'cash') as PaymentType]}</span>
                          {transaction.cheque_number && (
                            <Badge variant="secondary" className="text-xs">
                              #{transaction.cheque_number}
                            </Badge>
                          )}
                          {transaction.cheque_image_url && (
                            <a href={transaction.cheque_image_url} target="_blank" rel="noopener noreferrer">
                              <Image className="h-4 w-4 text-blue-500 cursor-pointer" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        ₪{transaction.total_amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {transaction.refused ? (
                          <Badge className="bg-red-100 text-red-700">
                            <XCircle className="h-3 w-3 ml-1" />
                            مرفوض
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle2 className="h-3 w-3 ml-1" />
                            مكتمل
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                        {transaction.notes || '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleRefused(transaction)}
                          className={cn(
                            "text-xs",
                            transaction.refused ? "text-green-600 hover:text-green-700" : "text-red-600 hover:text-red-700"
                          )}
                        >
                          {transaction.refused ? "استعادة" : "رفض"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* New Transaction Dialog */}
        <Dialog open={showNewTransaction} onOpenChange={setShowNewTransaction}>
          <DialogContent className="max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                دفعة جديدة - {broker?.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5 mt-4">
              {/* Direction */}
              <div>
                <Label className="mb-2 block">اتجاه الدفعة</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={direction === 'broker_owes' ? 'default' : 'outline'}
                    className={cn(
                      "h-16 flex-col gap-1",
                      direction === 'broker_owes' && "bg-green-600 hover:bg-green-700"
                    )}
                    onClick={() => setDirection('broker_owes')}
                  >
                    <ArrowDownLeft className="h-5 w-5" />
                    <span>استلمت من الوسيط</span>
                  </Button>
                  <Button
                    type="button"
                    variant={direction === 'we_owe' ? 'default' : 'outline'}
                    className={cn(
                      "h-16 flex-col gap-1",
                      direction === 'we_owe' && "bg-red-600 hover:bg-red-700"
                    )}
                    onClick={() => setDirection('we_owe')}
                  >
                    <ArrowUpRight className="h-5 w-5" />
                    <span>دفعت للوسيط</span>
                  </Button>
                </div>
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>المبلغ (₪)</Label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="text-lg h-12"
                  />
                </div>
                <div>
                  <Label>التاريخ</Label>
                  <ArabicDatePicker
                    value={transactionDate}
                    onChange={(date) => setTransactionDate(date)}
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-3">
                <Label>طريقة الدفع</Label>
                <div className="grid grid-cols-4 gap-2">
                  {(['cash', 'cheque', 'bank_transfer', 'visa'] as PaymentType[]).map((type) => (
                    <Button
                      key={type}
                      type="button"
                      variant={paymentType === type ? 'default' : 'outline'}
                      className={cn(
                        "flex-col gap-1 h-16 text-xs",
                        paymentType === type && "bg-primary"
                      )}
                      onClick={() => setPaymentType(type)}
                    >
                      <PaymentTypeIcon type={type} />
                      {paymentTypeLabels[type]}
                    </Button>
                  ))}
                </div>

                {/* Cheque Fields */}
                {paymentType === 'cheque' && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg">
                    <div>
                      <Label className="text-xs">رقم الشيك (8 أرقام)</Label>
                      <Input
                        value={chequeNumber}
                        onChange={(e) => setChequeNumber(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        placeholder="12345678"
                        maxLength={8}
                        className={cn(
                          "h-9",
                          chequeNumber && !validateChequeNumber(chequeNumber) && "border-red-500"
                        )}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">صورة الشيك</Label>
                      <FileUploader
                        entityType="cheque"
                        onUploadComplete={(files) => {
                          if (files.length > 0 && files[0].cdn_url) {
                            setChequeImageUrl(files[0].cdn_url);
                          }
                        }}
                        accept="image/*"
                        maxFiles={1}
                      />
                      {chequeImageUrl && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          تم الرفع
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Bank Transfer Fields */}
                {paymentType === 'bank_transfer' && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <Label className="text-xs">رقم المرجع / الحوالة</Label>
                    <Input
                      value={bankReference}
                      onChange={(e) => setBankReference(e.target.value)}
                      placeholder="رقم التحويل البنكي"
                      className="h-9"
                    />
                  </div>
                )}

                {/* Visa Note */}
                {paymentType === 'visa' && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                    سيتم تسجيل الدفع يدوياً
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <Label>ملاحظات (اختياري)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات إضافية..."
                  className="resize-none h-16"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowNewTransaction(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleSaveTransaction} disabled={saving} className="min-w-[120px]">
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                      جاري الحفظ
                    </>
                  ) : (
                    'حفظ الدفعة'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
