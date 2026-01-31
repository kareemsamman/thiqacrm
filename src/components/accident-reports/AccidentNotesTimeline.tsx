import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MessageSquare, Plus, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AccidentNote {
  id: string;
  note: string;
  created_at: string;
  created_by: string | null;
  profile?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

interface AccidentNotesTimelineProps {
  accidentReportId: string;
  notes: AccidentNote[];
  loading: boolean;
  onRefresh: () => void;
}

export function AccidentNotesTimeline({
  accidentReportId,
  notes,
  loading,
  onRefresh,
}: AccidentNotesTimelineProps) {
  const { profile } = useAuth();
  const [newNote, setNewNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast.error("يرجى كتابة ملاحظة");
      return;
    }

    setAdding(true);
    try {
      const { error } = await supabase
        .from("accident_report_notes")
        .insert({
          accident_report_id: accidentReportId,
          note: newNote.trim(),
          created_by: profile?.id || null,
        });

      if (error) throw error;

      toast.success("تمت إضافة الملاحظة");
      setNewNote("");
      setShowForm(false);
      onRefresh();
    } catch (error: any) {
      console.error("Error adding note:", error);
      toast.error("فشل في إضافة الملاحظة");
    } finally {
      setAdding(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          الملاحظات ({notes.length})
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

      {/* Add Note Form */}
      {showForm && (
        <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
          <Textarea
            placeholder="اكتب ملاحظة جديدة..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowForm(false);
                setNewNote("");
              }}
              disabled={adding}
            >
              إلغاء
            </Button>
            <Button
              size="sm"
              onClick={handleAddNote}
              disabled={adding || !newNote.trim()}
              className="gap-1"
            >
              {adding && <Loader2 className="h-3 w-3 animate-spin" />}
              حفظ
            </Button>
          </div>
        </div>
      )}

      {/* Notes Timeline */}
      {notes.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">
          لا توجد ملاحظات بعد
        </div>
      ) : (
        <div className="relative space-y-4 pr-4">
          {/* Timeline line */}
          <div className="absolute right-[7px] top-2 bottom-2 w-0.5 bg-border" />

          {notes.map((note, index) => (
            <div key={note.id} className="relative flex gap-3">
              {/* Timeline dot */}
              <div
                className={cn(
                  "absolute right-0 top-2 w-4 h-4 rounded-full border-2 border-background",
                  index === 0 ? "bg-primary" : "bg-muted-foreground/30"
                )}
              />

              {/* Note Content */}
              <div className="flex-1 mr-5 bg-card border rounded-lg p-3 space-y-2">
                <p className="text-sm whitespace-pre-wrap">{note.note}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>
                    {note.profile?.full_name ||
                      note.profile?.email?.split("@")[0] ||
                      "مجهول"}
                  </span>
                  <span>•</span>
                  <span>{formatDate(note.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
