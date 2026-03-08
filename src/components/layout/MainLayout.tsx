import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { BottomToolbar } from "./BottomToolbar";
import { AnnouncementPopup } from "./AnnouncementPopup";
import { TaskPopupReminder } from "@/components/tasks/TaskPopupReminder";
import { useAgentContext } from "@/hooks/useAgentContext";

interface MainLayoutProps {
  children: ReactNode;
  onPolicyComplete?: () => void;
}

export function MainLayout({ children, onPolicyComplete }: MainLayoutProps) {
  const { isThiqaSuperAdmin } = useAgentContext();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Sidebar />

      {/* Main content - responsive margins */}
      <main className={`min-h-screen transition-all duration-300 p-3 pt-16 md:pt-6 md:p-6 ${isThiqaSuperAdmin ? 'md:mr-[5rem] pb-6' : 'md:mr-[17.5rem] pb-40'}`}>
        <div className="max-w-full">{children}</div>
      </main>

      {/* Sticky bottom toolbar - hidden for Thiqa super admin */}
      {!isThiqaSuperAdmin && <BottomToolbar onPolicyComplete={onPolicyComplete} />}

      {/* Announcement popup */}
      {!isThiqaSuperAdmin && <AnnouncementPopup />}

      {/* Task reminder popup */}
      {!isThiqaSuperAdmin && <TaskPopupReminder />}
    </div>
  );
}