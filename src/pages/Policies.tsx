import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mockPolicies = [
  {
    id: "1",
    clientName: "أحمد محمد",
    carNumber: "12-345-67",
    policyType: "THIRD_FULL",
    subType: "FULL",
    company: "Menora",
    startDate: "2024-01-15",
    endDate: "2025-01-15",
    price: 2500,
    profit: 450,
    status: "active",
    paymentStatus: "paid",
  },
  {
    id: "2",
    clientName: "سارة أبو حسين",
    carNumber: "89-012-34",
    policyType: "ELZAMI",
    subType: null,
    company: "Harel",
    startDate: "2024-02-20",
    endDate: "2025-02-20",
    price: 1200,
    profit: 0,
    status: "active",
    paymentStatus: "partial",
  },
  {
    id: "3",
    clientName: "محمد خالد",
    carNumber: "56-789-01",
    policyType: "ROAD_SERVICE",
    subType: null,
    company: "Phoenix",
    startDate: "2024-03-10",
    endDate: "2025-03-10",
    price: 350,
    profit: 120,
    status: "active",
    paymentStatus: "unpaid",
  },
  {
    id: "4",
    clientName: "ليلى عمر",
    carNumber: "23-456-78",
    policyType: "THIRD_FULL",
    subType: "THIRD",
    company: "Clal",
    startDate: "2023-06-15",
    endDate: "2024-06-15",
    price: 1800,
    profit: 320,
    status: "expired",
    paymentStatus: "paid",
  },
  {
    id: "5",
    clientName: "خالد يوسف",
    carNumber: "90-123-45",
    policyType: "ACCIDENT_FEE",
    subType: null,
    company: "Menora",
    startDate: "2024-01-01",
    endDate: "2025-01-01",
    price: 600,
    profit: 200,
    status: "active",
    paymentStatus: "paid",
  },
];

const policyTypeColors: Record<string, string> = {
  ELZAMI: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  THIRD_FULL: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  ROAD_SERVICE: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  ACCIDENT_FEE: "bg-green-500/10 text-green-400 border-green-500/20",
};

const statusConfig = {
  active: { label: "Active", variant: "success" as const },
  expired: { label: "Expired", variant: "destructive" as const },
  cancelled: { label: "Cancelled", variant: "secondary" as const },
};

const paymentConfig = {
  paid: { label: "Paid", variant: "success" as const },
  partial: { label: "Partial", variant: "warning" as const },
  unpaid: { label: "Unpaid", variant: "destructive" as const },
};

export default function Policies() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredPolicies = mockPolicies.filter(
    (policy) =>
      policy.clientName.includes(searchQuery) ||
      policy.carNumber.includes(searchQuery) ||
      policy.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      <Header
        title="Policies"
        subtitle="Manage insurance policies"
        action={{ label: "New Policy", onClick: () => {} }}
      />

      <div className="p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search policies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Table */}
        <Card className="glass overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-medium">Client</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Car #</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Type</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Company</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Period</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">Price</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">Profit</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Status</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Payment</TableHead>
                  <TableHead className="text-muted-foreground font-medium w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPolicies.map((policy, index) => (
                  <TableRow
                    key={policy.id}
                    className={cn(
                      "border-border/30 transition-colors cursor-pointer",
                      "hover:bg-secondary/30 animate-fade-in"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <TableCell className="font-medium">{policy.clientName}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {policy.carNumber}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("border", policyTypeColors[policy.policyType])}>
                        {policy.policyType}
                        {policy.subType && ` (${policy.subType})`}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{policy.company}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="text-foreground">{policy.startDate}</p>
                        <p className="text-muted-foreground">{policy.endDate}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₪{policy.price.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-medium text-success">
                      ₪{policy.profit.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[policy.status as keyof typeof statusConfig].variant}>
                        {statusConfig[policy.status as keyof typeof statusConfig].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={paymentConfig[policy.paymentStatus as keyof typeof paymentConfig].variant}>
                        {paymentConfig[policy.paymentStatus as keyof typeof paymentConfig].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-border/30 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Showing {filteredPolicies.length} policies
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">Page 1 of 1</span>
              <Button variant="outline" size="sm" disabled>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
