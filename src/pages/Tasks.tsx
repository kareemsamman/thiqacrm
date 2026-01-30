import { useState } from "react";
import { format, addDays, subDays } from "date-fns";
import { ar } from "date-fns/locale";
import {
  Plus,
  ChevronRight,
  ChevronLeft,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ListTodo,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { useTasks, Task } from "@/hooks/useTasks";
import { useAuth } from "@/hooks/useAuth";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { TaskCard } from "@/components/tasks/TaskCard";
import { cn } from "@/lib/utils";

type FilterTab = 'my-tasks' | 'created-by-me' | 'all';

export default function Tasks() {
  const { user, isAdmin } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterTab, setFilterTab] = useState<FilterTab>('my-tasks');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const {
    tasks,
    isLoading,
    stats,
    createTask,
    completeTask,
    deleteTask,
    isCreating,
  } = useTasks(selectedDate);

  // Filter tasks based on selected tab
  const filteredTasks = tasks.filter(task => {
    switch (filterTab) {
      case 'my-tasks':
        return task.assigned_to === user?.id;
      case 'created-by-me':
        return task.created_by === user?.id;
      case 'all':
        return true;
      default:
        return true;
    }
  });

  const pendingTasks = filteredTasks.filter(t => t.status === 'pending');
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');

  const goToYesterday = () => setSelectedDate(subDays(selectedDate, 1));
  const goToTomorrow = () => setSelectedDate(addDays(selectedDate, 1));
  const goToToday = () => setSelectedDate(new Date());

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setEditingTask(null);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <ListTodo className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">المهام اليومية</h1>
              <p className="text-sm text-muted-foreground">
                إدارة وتتبع المهام اليومية
              </p>
            </div>
          </div>

          <Button onClick={() => setDrawerOpen(true)}>
            <Plus className="h-4 w-4 ml-2" />
            مهمة جديدة
          </Button>
        </div>

        {/* Filter Tabs */}
        <Tabs value={filterTab} onValueChange={(v) => setFilterTab(v as FilterTab)}>
          <TabsList>
            <TabsTrigger value="my-tasks">مهامي</TabsTrigger>
            <TabsTrigger value="created-by-me">أنشأتها</TabsTrigger>
            {isAdmin && <TabsTrigger value="all">الكل</TabsTrigger>}
          </TabsList>
        </Tabs>

        {/* Date Navigation */}
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={goToYesterday}>
                <ChevronRight className="h-4 w-4 ml-1" />
                أمس
              </Button>

              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={isToday ? "default" : "outline"}
                      className="min-w-[200px]"
                    >
                      <CalendarIcon className="h-4 w-4 ml-2" />
                      {format(selectedDate, "EEEE, d MMMM yyyy", { locale: ar })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      locale={ar}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                {!isToday && (
                  <Button variant="outline" size="sm" onClick={goToToday}>
                    اليوم
                  </Button>
                )}
              </div>

              <Button variant="ghost" size="sm" onClick={goToTomorrow}>
                غداً
                <ChevronLeft className="h-4 w-4 mr-1" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className={cn(
            "transition-all",
            stats.pending > 0 && "border-primary/50"
          )}>
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">معلقة</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">منجزة</p>
              </div>
            </CardContent>
          </Card>

          <Card className={cn(
            "transition-all",
            stats.overdue > 0 && "border-destructive/50"
          )}>
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.overdue}</p>
                <p className="text-xs text-muted-foreground">متأخرة</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          {isLoading ? (
            <>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </>
          ) : filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ListTodo className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  لا توجد مهام لهذا اليوم
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setDrawerOpen(true)}
                >
                  <Plus className="h-4 w-4 ml-2" />
                  أضف مهمة
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Pending tasks first */}
              {pendingTasks.length > 0 && (
                <div className="space-y-2">
                  {pendingTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onComplete={completeTask}
                      onEdit={handleEdit}
                      onDelete={deleteTask}
                    />
                  ))}
                </div>
              )}

              {/* Completed tasks */}
              {completedTasks.length > 0 && (
                <div className="space-y-2 mt-6">
                  <p className="text-sm text-muted-foreground font-medium px-1">
                    المهام المنجزة ({completedTasks.length})
                  </p>
                  {completedTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onComplete={completeTask}
                      onEdit={handleEdit}
                      onDelete={deleteTask}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Task Drawer */}
      <TaskDrawer
        open={drawerOpen}
        onOpenChange={handleCloseDrawer}
        task={editingTask}
        onSubmit={createTask}
        isSubmitting={isCreating}
        defaultDate={selectedDate}
      />
    </MainLayout>
  );
}
