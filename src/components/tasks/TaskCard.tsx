import { useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  Clock,
  Check,
  MoreVertical,
  User,
  ArrowLeft,
  Trash2,
  Edit,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Task } from "@/hooks/useTasks";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  onComplete: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

export function TaskCard({ task, onComplete, onEdit, onDelete }: TaskCardProps) {
  const { user } = useAuth();
  const [completing, setCompleting] = useState(false);

  const isOverdue = () => {
    if (task.status !== 'pending') return false;
    const now = new Date();
    const dueDateTime = new Date(`${task.due_date}T${task.due_time}`);
    return dueDateTime < now;
  };

  const isCompleted = task.status === 'completed';
  const overdue = isOverdue();

  const creatorName = task.creator?.full_name || task.creator?.email?.split('@')[0] || 'غير معروف';
  const assigneeName = task.assignee?.full_name || task.assignee?.email?.split('@')[0] || 'غير معروف';
  const isAssignedToMe = task.assigned_to === user?.id;
  const isCreatedByMe = task.created_by === user?.id;

  const handleComplete = async () => {
    setCompleting(true);
    await onComplete(task.id);
    setCompleting(false);
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5); // HH:MM
  };

  return (
    <Card
      className={cn(
        "transition-all duration-200 hover:shadow-md",
        isCompleted && "opacity-60 bg-muted/30",
        overdue && "border-destructive/50 bg-destructive/5"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Time badge */}
          <div
            className={cn(
              "flex flex-col items-center justify-center min-w-[60px] py-2 px-2 rounded-lg",
              isCompleted
                ? "bg-green-100 text-green-700"
                : overdue
                ? "bg-destructive/10 text-destructive"
                : "bg-primary/10 text-primary"
            )}
          >
            <Clock className="h-4 w-4 mb-1" />
            <span className="text-sm font-bold font-mono">
              {formatTime(task.due_time)}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h4
                  className={cn(
                    "font-medium text-base leading-tight",
                    isCompleted && "line-through text-muted-foreground"
                  )}
                >
                  {task.title}
                </h4>
                {task.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {task.description}
                  </p>
                )}
              </div>

              {/* Status badges */}
              <div className="flex items-center gap-1">
                {overdue && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="h-3 w-3 ml-1" />
                    متأخر
                  </Badge>
                )}
                {isCompleted && (
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                    <Check className="h-3 w-3 ml-1" />
                    منجز
                  </Badge>
                )}
              </div>
            </div>

            {/* Assignment info */}
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              {isCreatedByMe && isAssignedToMe ? (
                <span>أنشأتها لنفسك</span>
              ) : (
                <span className="flex items-center gap-1">
                  من: {isCreatedByMe ? "أنت" : creatorName}
                  <ArrowLeft className="h-3 w-3" />
                  إلى: {isAssignedToMe ? "أنت" : assigneeName}
                </span>
              )}
            </div>

            {/* Completed info */}
            {isCompleted && task.completed_at && (
              <div className="text-xs text-muted-foreground mt-1">
                أُنجز في {format(new Date(task.completed_at), "HH:mm", { locale: ar })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {!isCompleted && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={handleComplete}
                disabled={completing}
              >
                <Check className="h-4 w-4" />
                <span className="mr-1 hidden sm:inline">إنجاز</span>
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(task)}>
                  <Edit className="h-4 w-4 ml-2" />
                  تعديل
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(task.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 ml-2" />
                  حذف
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
