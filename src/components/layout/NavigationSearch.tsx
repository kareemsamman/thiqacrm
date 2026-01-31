import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileSearch } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useAuth } from "@/hooks/useAuth";
import { navigationGroups } from "./Sidebar";

const SUPER_ADMIN_EMAIL = "morshed500@gmail.com";

interface NavigationSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NavigationSearch({ open, onOpenChange }: NavigationSearchProps) {
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();
  
  const isSuperAdmin = profile?.email === SUPER_ADMIN_EMAIL;

  // Filter groups and items based on role
  const filteredGroups = navigationGroups
    .filter(group => !group.adminOnly || isAdmin)
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (item.superAdminOnly && !isSuperAdmin) return false;
        if (item.adminOnly && !isAdmin) return false;
        return true;
      }),
    }))
    .filter(group => group.items.length > 0);

  const handleSelect = (href: string) => {
    onOpenChange(false);
    navigate(href);
  };

  // Keyboard shortcut: Ctrl+/ or ⌘/
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="ابحث عن صفحة..." className="text-right" dir="rtl" />
      <CommandList dir="rtl">
        <CommandEmpty>لا توجد نتائج.</CommandEmpty>
        {filteredGroups.map((group) => (
          <CommandGroup key={group.name} heading={group.name}>
            {group.items.map((item) => (
              <CommandItem
                key={item.href}
                value={item.name}
                onSelect={() => handleSelect(item.href)}
                className="flex items-center gap-3 cursor-pointer"
              >
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <span>{item.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
