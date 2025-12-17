import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronRight } from "lucide-react";

const expiringPolicies = [
  {
    id: 1,
    clientName: "أحمد محمد",
    carNumber: "12-345-67",
    expiresIn: 3,
    policyType: "THIRD_FULL",
    company: "Menora",
  },
  {
    id: 2,
    clientName: "سارة أبو حسين",
    carNumber: "89-012-34",
    expiresIn: 5,
    policyType: "ELZAMI",
    company: "Harel",
  },
  {
    id: 3,
    clientName: "محمد خالد",
    carNumber: "56-789-01",
    expiresIn: 7,
    policyType: "ROAD_SERVICE",
    company: "Phoenix",
  },
  {
    id: 4,
    clientName: "ليلى عمر",
    carNumber: "23-456-78",
    expiresIn: 10,
    policyType: "THIRD_FULL",
    company: "Clal",
  },
];

export function ExpiringPolicies() {
  return (
    <Card className="glass">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <CardTitle className="text-base">Expiring Soon</CardTitle>
        </div>
        <Button variant="ghost" size="sm" className="text-primary">
          View All <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {expiringPolicies.map((policy) => (
          <div
            key={policy.id}
            className="flex items-center justify-between rounded-lg bg-secondary/30 p-3 transition-colors hover:bg-secondary/50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <span className="text-sm font-bold text-warning">{policy.expiresIn}d</span>
              </div>
              <div>
                <p className="font-medium text-foreground">{policy.clientName}</p>
                <p className="text-sm text-muted-foreground">{policy.carNumber}</p>
              </div>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="mb-1">
                {policy.policyType}
              </Badge>
              <p className="text-xs text-muted-foreground">{policy.company}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
