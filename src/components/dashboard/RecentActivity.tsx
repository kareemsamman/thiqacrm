import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Users, Car, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

const activities = [
  {
    id: 1,
    type: "policy",
    action: "New policy created",
    detail: "THIRD_FULL for أحمد محمد",
    time: "2 min ago",
    icon: FileText,
  },
  {
    id: 2,
    type: "payment",
    action: "Payment received",
    detail: "₪2,500 from سارة أبو حسين",
    time: "15 min ago",
    icon: CreditCard,
  },
  {
    id: 3,
    type: "client",
    action: "New client added",
    detail: "خالد يوسف - File #1245",
    time: "1 hour ago",
    icon: Users,
  },
  {
    id: 4,
    type: "car",
    action: "Car updated",
    detail: "License renewed for 12-345-67",
    time: "2 hours ago",
    icon: Car,
  },
  {
    id: 5,
    type: "policy",
    action: "Policy renewed",
    detail: "ELZAMI for محمد خالد",
    time: "3 hours ago",
    icon: FileText,
  },
];

const typeColors = {
  policy: "text-primary bg-primary/10",
  payment: "text-success bg-success/10",
  client: "text-accent bg-accent/10",
  car: "text-warning bg-warning/10",
};

export function RecentActivity() {
  return (
    <Card className="glass">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.map((activity, index) => (
          <div
            key={activity.id}
            className={cn(
              "flex items-start gap-3 animate-fade-in",
              `stagger-${index + 1}`
            )}
            style={{ animationFillMode: "backwards" }}
          >
            <div className={cn("rounded-lg p-2", typeColors[activity.type as keyof typeof typeColors])}>
              <activity.icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{activity.action}</p>
              <p className="text-sm text-muted-foreground truncate">{activity.detail}</p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
