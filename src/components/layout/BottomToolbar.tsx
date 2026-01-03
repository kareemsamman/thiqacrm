import { useState } from "react";
import { Plus, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { PolicyWizard } from "@/components/policies/PolicyWizard";
import { GlobalPolicySearch } from "./GlobalPolicySearch";

interface BottomToolbarProps {
  onPolicyComplete?: () => void;
}

export function BottomToolbar({ onPolicyComplete }: BottomToolbarProps) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      {/* Sticky bottom toolbar with glassy style */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-border/50 bg-background/80 backdrop-blur-xl shadow-lg">
          {/* Create Insurance Button */}
          <Button 
            onClick={() => setWizardOpen(true)}
            className="rounded-full gap-2"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">وثيقة جديدة</span>
            <FileText className="h-4 w-4 sm:hidden" />
          </Button>

          {/* Separator */}
          <div className="h-6 w-px bg-border/50" />

          {/* Search Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full h-9 w-9"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Separator */}
          <div className="h-6 w-px bg-border/50" />

          {/* Notifications */}
          <NotificationsDropdown />
        </div>
      </div>

      {/* Policy Wizard */}
      <PolicyWizard 
        open={wizardOpen} 
        onOpenChange={setWizardOpen}
        onComplete={() => {
          onPolicyComplete?.();
        }}
      />

      {/* Global Search Dialog */}
      <GlobalPolicySearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
