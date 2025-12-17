import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArabicDatePicker } from "@/components/ui/arabic-date-picker";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, CreditCard, Loader2, ImageIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import type { Enums } from "@/integrations/supabase/types";

interface Payment {
  id: string;
  amount: number;
  payment_type: string;
  payment_date: string;
  cheque_number: string | null;
  cheque_image_url: string | null;
  refused: boolean | null;
  notes: string | null;
}

interface PolicyPaymentsSectionProps {
  policyId: string;
  payments: Payment[];
  onPaymentsChange: () => void;
}

const paymentTypeLabels: Record<string, string> = {
  "cash": "نقدي",
  "cheque": "شيك",
  "visa": "فيزا",
  "transfer": "تحويل",
};

const PAYMENT_TYPES = [
  { value: "cash", label: "نقدي" },
  { value: "cheque", label: "شيك" },
  { value: "visa", label: "فيزا" },
  { value: "transfer", label: "تحويل" },
];

export function PolicyPaymentsSection({ policyId, payments, onPaymentsChange }: PolicyPaymentsSectionProps) {
  const { toast } = useToast();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    amount: "",
    payment_type: "cash",
    payment_date: new Date().toISOString().split('T')[0],
    cheque_number: "",
    refused: false,
    notes: "",
  });

  const resetForm = () => {
    setFormData({
      amount: "",
      payment_type: "cash",
      payment_date: new Date().toISOString().split('T')[0],
      cheque_number: "",
      refused: false,
      notes: "",
    });
  };

  const handleAdd = async () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({ title: "خطأ", description: "الرجاء إدخال مبلغ صحيح", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('policy_payments')
        .insert({
          policy_id: policyId,
          amount: parseFloat(formData.amount),
          payment_type: formData.payment_type as Enums<'payment_type'>,
          payment_date: formData.payment_date,
          cheque_number: formData.payment_type === 'cheque' ? formData.cheque_number : null,
          refused: formData.refused,
          notes: formData.notes || null,
        });

      if (error) throw error;

      toast({ title: "تمت الإضافة", description: "تمت إضافة الدفعة بنجاح" });
      setAddDialogOpen(false);
      resetForm();
      onPaymentsChange();
    } catch (error) {
      console.error('Error adding payment:', error);
      toast({ title: "خطأ", description: "فشل في إضافة الدفعة", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedPayment) return;
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({ title: "خطأ", description: "الرجاء إدخال مبلغ صحيح", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('policy_payments')
        .update({
          amount: parseFloat(formData.amount),
          payment_type: formData.payment_type as Enums<'payment_type'>,
          payment_date: formData.payment_date,
          cheque_number: formData.payment_type === 'cheque' ? formData.cheque_number : null,
          refused: formData.refused,
          notes: formData.notes || null,
        })
        .eq('id', selectedPayment.id);

      if (error) throw error;

      toast({ title: "تم التحديث", description: "تم تحديث الدفعة بنجاح" });
      setEditDialogOpen(false);
      setSelectedPayment(null);
      resetForm();
      onPaymentsChange();
    } catch (error) {
      console.error('Error updating payment:', error);
      toast({ title: "خطأ", description: "فشل في تحديث الدفعة", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPayment) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('policy_payments')
        .delete()
        .eq('id', selectedPayment.id);

      if (error) throw error;

      toast({ title: "تم الحذف", description: "تم حذف الدفعة بنجاح" });
      setDeleteDialogOpen(false);
      setSelectedPayment(null);
      onPaymentsChange();
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast({ title: "خطأ", description: "فشل في حذف الدفعة", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const openEditDialog = (payment: Payment) => {
    setSelectedPayment(payment);
    setFormData({
      amount: payment.amount.toString(),
      payment_type: payment.payment_type,
      payment_date: payment.payment_date,
      cheque_number: payment.cheque_number || "",
      refused: payment.refused || false,
      notes: payment.notes || "",
    });
    setEditDialogOpen(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ar-EG');
  };

  const formatCurrency = (amount: number) => {
    return `₪${amount.toLocaleString('ar-EG')}`;
  };

  return (
    <>
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <CreditCard className="h-4 w-4" />
            <span>سجل الدفعات ({payments.length})</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 ml-1" />
            إضافة دفعة
          </Button>
        </div>

        {payments.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">لا توجد دفعات مسجلة</p>
        ) : (
          <div className="space-y-2">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border",
                  payment.refused ? "bg-destructive/5 border-destructive/20" : "bg-muted/30"
                )}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-bold">{formatCurrency(payment.amount)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(payment.payment_date)}</p>
                  </div>
                  <Badge variant="secondary">{paymentTypeLabels[payment.payment_type]}</Badge>
                  {payment.cheque_number && (
                    <span className="text-xs text-muted-foreground">#{payment.cheque_number}</span>
                  )}
                  {payment.refused && (
                    <Badge variant="destructive">راجع</Badge>
                  )}
                  {payment.cheque_image_url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setImagePreview(payment.cheque_image_url)}
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEditDialog(payment)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => {
                      setSelectedPayment(payment);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add Payment Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة دفعة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>المبلغ (₪)</Label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(f => ({ ...f, amount: e.target.value }))}
                dir="ltr"
                className="text-left"
              />
            </div>
            <div className="space-y-2">
              <Label>طريقة الدفع</Label>
              <Select
                value={formData.payment_type}
                onValueChange={(v) => setFormData(f => ({ ...f, payment_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>تاريخ الدفع</Label>
              <ArabicDatePicker
                value={formData.payment_date}
                onChange={(v) => setFormData(f => ({ ...f, payment_date: v }))}
              />
            </div>
            {formData.payment_type === 'cheque' && (
              <div className="space-y-2">
                <Label>رقم الشيك</Label>
                <Input
                  value={formData.cheque_number}
                  onChange={(e) => setFormData(f => ({ ...f, cheque_number: e.target.value }))}
                  dir="ltr"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="refused-add"
                checked={formData.refused}
                onChange={(e) => setFormData(f => ({ ...f, refused: e.target.checked }))}
                className="h-4 w-4"
              />
              <Label htmlFor="refused-add" className="cursor-pointer">راجع (مرفوض)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Payment Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل الدفعة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>المبلغ (₪)</Label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(f => ({ ...f, amount: e.target.value }))}
                dir="ltr"
                className="text-left"
              />
            </div>
            <div className="space-y-2">
              <Label>طريقة الدفع</Label>
              <Select
                value={formData.payment_type}
                onValueChange={(v) => setFormData(f => ({ ...f, payment_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>تاريخ الدفع</Label>
              <ArabicDatePicker
                value={formData.payment_date}
                onChange={(v) => setFormData(f => ({ ...f, payment_date: v }))}
              />
            </div>
            {formData.payment_type === 'cheque' && (
              <div className="space-y-2">
                <Label>رقم الشيك</Label>
                <Input
                  value={formData.cheque_number}
                  onChange={(e) => setFormData(f => ({ ...f, cheque_number: e.target.value }))}
                  dir="ltr"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="refused-edit"
                checked={formData.refused}
                onChange={(e) => setFormData(f => ({ ...f, refused: e.target.checked }))}
                className="h-4 w-4"
              />
              <Label htmlFor="refused-edit" className="cursor-pointer">راجع (مرفوض)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="حذف الدفعة"
        description={`هل أنت متأكد من حذف هذه الدفعة بقيمة ${selectedPayment ? formatCurrency(selectedPayment.amount) : ''}؟`}
        loading={deleting}
      />

      {/* Image Preview Dialog */}
      {imagePreview && (
        <Dialog open={!!imagePreview} onOpenChange={() => setImagePreview(null)}>
          <DialogContent className="sm:max-w-2xl p-2">
            <DialogHeader className="sr-only">
              <DialogTitle>معاينة صورة الشيك</DialogTitle>
            </DialogHeader>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 left-2 z-10"
              onClick={() => setImagePreview(null)}
            >
              <X className="h-4 w-4" />
            </Button>
            <img
              src={imagePreview}
              alt="صورة الشيك"
              className="w-full h-auto rounded-lg"
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
