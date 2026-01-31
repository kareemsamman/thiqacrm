
# خطة: إضافة إمكانية حذف المرتجعات

## المشكلة
حالياً جدول المرتجعات لا يحتوي على زر حذف. المستخدم يريد حذف المرتجعات اليدوية التي أضافها.

---

## التعديلات المطلوبة

### ملف: `src/components/clients/RefundsTab.tsx`

#### 1) إضافة imports جديدة
```typescript
import { Trash2 } from 'lucide-react';
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog';
```

#### 2) إضافة حالات (states) جديدة
```typescript
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
const [refundToDelete, setRefundToDelete] = useState<RefundRecord | null>(null);
```

#### 3) إضافة mutation للحذف
```typescript
const deleteRefundMutation = useMutation({
  mutationFn: async (refundId: string) => {
    const { error } = await supabase
      .from('customer_wallet_transactions')
      .delete()
      .eq('id', refundId);

    if (error) throw error;
  },
  onSuccess: () => {
    toast.success('تم حذف المرتجع بنجاح');
    queryClient.invalidateQueries({ queryKey: ['client-refunds', clientId] });
    setDeleteDialogOpen(false);
    setRefundToDelete(null);
    onRefundAdded?.(); // لتحديث الرصيد في الصفحة الرئيسية
  },
  onError: (error) => {
    console.error('Error deleting refund:', error);
    toast.error('حدث خطأ أثناء حذف المرتجع');
  },
});
```

#### 4) إضافة دالة تأكيد الحذف
```typescript
const handleDeleteClick = (refund: RefundRecord) => {
  setRefundToDelete(refund);
  setDeleteDialogOpen(true);
};

const confirmDelete = () => {
  if (refundToDelete) {
    deleteRefundMutation.mutate(refundToDelete.id);
  }
};
```

#### 5) إضافة عمود "إجراءات" في الجدول

**في TableHeader:**
```tsx
<TableHead className="text-right w-[80px]">إجراءات</TableHead>
```

**في TableBody (داخل كل صف):**
```tsx
<TableCell>
  {/* السماح بالحذف فقط للمرتجعات اليدوية */}
  {refund.transaction_type === 'manual_refund' && (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
      onClick={() => handleDeleteClick(refund)}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )}
</TableCell>
```

#### 6) إضافة مكون تأكيد الحذف
```tsx
<DeleteConfirmDialog
  open={deleteDialogOpen}
  onOpenChange={setDeleteDialogOpen}
  onConfirm={confirmDelete}
  title="حذف المرتجع"
  description={`هل أنت متأكد من حذف مرتجع بقيمة ₪${refundToDelete?.amount?.toLocaleString()}؟ لا يمكن التراجع عن هذا الإجراء.`}
  loading={deleteRefundMutation.isPending}
/>
```

---

## ملاحظات مهمة

| النوع | قابل للحذف |
|-------|------------|
| `manual_refund` (مرتجع يدوي) | نعم |
| `refund` (إلغاء تأمين) | لا - مرتبط بإلغاء وثيقة |
| `transfer_refund_owed` (تحويل تأمين) | لا - مرتبط بتحويل وثيقة |

السبب: المرتجعات الناتجة عن إلغاء أو تحويل الوثائق مرتبطة بعمليات أخرى ويجب عدم حذفها يدوياً للحفاظ على سلامة البيانات.

---

## النتيجة المتوقعة

- عمود جديد "إجراءات" في الجدول
- زر حذف (أحمر) يظهر فقط للمرتجعات اليدوية
- نافذة تأكيد قبل الحذف
- تحديث تلقائي للجدول والرصيد بعد الحذف
