import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Plus, Loader2, Calendar, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AccidentReminder {
  id: string;
  reminder_date: string;
  reminder_text: string | null;
  is_done: boolean;
  created_at: string;
}

interface AccidentRemindersProps {
  accidentReportId: string;
  reminders: AccidentReminder[];
  loading: boolean;
  onRefresh: () => void;
}

export function AccidentReminders({
  accidentReportId,
  reminders,
  loading,
  onRefresh,
}: AccidentRemindersProps) {
  const { profile } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newReminder, setNewReminder] = useState({
    date: "",
    text: "",
  });
  const [updating, setUpdating] = useState<string | null>(null);

  const handleAddReminder = async () => {
    if (!newReminder.date) {
      toast.error("يرجى تحديد تاريخ التذكير");
      return;
    }

    setAdding(true);
    try {
      const { error } = await supabase
        .from("accident_report_reminders")
        .insert({
          accident_report_id: accidentReportId,
          reminder_date: newReminder.date,
          reminder_text: newReminder.text || null,
          created_by: profile?.id || null,
        });

      if (error) throw error;

      toast.success("تمت إضافة التذكير");
      setNewReminder({ date: "", text: "" });
      setShowForm(false);
      onRefresh();
    } catch (error: any) {
      console.error("Error adding reminder:", error);
      toast.error("فشل في إضافة التذكير");
    } finally {
      setAdding(false);
    }
  };

  const handleToggleDone = async (reminder: AccidentReminder) => {
    setUpdating(reminder.id);
    try {
      const { error } = await supabase
        .from("accident_report_reminders")
        .update({ is_done: !reminder.is_done })
        .eq("id", reminder.id);

      if (error) throw error;
      onRefresh();
    } catch (error: any) {
      console.error("Error updating reminder:", error);
      toast.error("فشل في تحديث التذكير");
    } finally {
      setUpdating(null);
    }
  };

  const handleDeleteReminder = async (id: string) => {
    setUpdating(id);
    try {
      const { error } = await supabase
        .from("accident_report_reminders")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("تم حذف التذكير");
      onRefresh();
    } catch (error: any) {
      console.error("Error deleting reminder:", error);
      toast.error("فشل في حذف التذكير");
    } finally {
      setUpdating(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB");
  };

  const isOverdue = (dateStr: string, isDone: boolean) => {
    if (isDone) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reminderDate = new Date(dateStr);
    return reminderDate < today;
  };

  const isToday = (dateStr: string) => {
    const today = new Date();
    const reminderDate = new Date(dateStr);
    return (
      today.getFullYear() === reminderDate.getFullYear() &&
      today.getMonth() === reminderDate.getMonth() &&
      today.getDate() === reminderDate.getDate()
    );
  };

  // Sort: pending first (by date), then done
  const sortedReminders = [...reminders].sort((a, b) => {
    if (a.is_done !== b.is_done) return a.is_done ? 1 : -1;
    return new Date(a.reminder_date).getTime() - new Date(b.reminder_date).getTime();
  });

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Bell className="h-4 w-4" />
          التذكيرات ({reminders.filter(r => !r.is_done).length})
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="gap-1"
        >
          <Plus className="h-3 w-3" />
          إضافة
        </Button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Input
                type="date"
                value={newReminder.date}
                onChange={(e) =>
                  setNewReminder({ ...newReminder, date: e.target.value })
                }
                className="text-sm"
              />
            </div>
            <div>
              <Input
                placeholder="نص التذكير (اختياري)"
                value={newReminder.text}
                onChange={(e) =>
                  setNewReminder({ ...newReminder, text: e.target.value })
                }
                className="text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowForm(false);
                setNewReminder({ date: "", text: "" });
              }}
              disabled={adding}
            >
              إلغاء
            </Button>
            <Button
              size="sm"
              onClick={handleAddReminder}
              disabled={adding || !newReminder.date}
              className="gap-1"
            >
              {adding && <Loader2 className="h-3 w-3 animate-spin" />}
              حفظ
            </Button>
          </div>
        </div>
      )}

      {/* Reminders List */}
      {sortedReminders.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground text-sm">
          لا توجد تذكيرات
        </div>
      ) : (
        <div className="space-y-2">
          {sortedReminders.map((reminder) => (
            <div
              key={reminder.id}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg border",
                reminder.is_done
                  ? "bg-muted/30 opacity-60"
                  : isOverdue(reminder.reminder_date, reminder.is_done)
                  ? "bg-destructive/10 border-destructive/30"
                  : isToday(reminder.reminder_date)
                  ? "bg-amber-500/10 border-amber-500/30"
                  : "bg-card"
              )}
            >
              <Checkbox
                checked={reminder.is_done}
                onCheckedChange={() => handleToggleDone(reminder)}
                disabled={updating === reminder.id}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span
                    className={cn(
                      "text-sm font-medium",
                      reminder.is_done && "line-through"
                    )}
                  >
                    {formatDate(reminder.reminder_date)}
                  </span>
                  {isOverdue(reminder.reminder_date, reminder.is_done) && (
                    <span className="text-xs text-destructive">متأخر</span>
                  )}
                  {isToday(reminder.reminder_date) && !reminder.is_done && (
                    <span className="text-xs text-amber-600">اليوم</span>
                  )}
                </div>
                {reminder.reminder_text && (
                  <p
                    className={cn(
                      "text-xs text-muted-foreground truncate",
                      reminder.is_done && "line-through"
                    )}
                  >
                    {reminder.reminder_text}
                  </p>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => handleDeleteReminder(reminder.id)}
                disabled={updating === reminder.id}
              >
                {updating === reminder.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
