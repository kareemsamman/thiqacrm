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
  Car as CarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mockCars = [
  {
    id: "1",
    carNumber: "12-345-67",
    ownerName: "أحمد محمد",
    manufacturer: "Toyota",
    year: 2022,
    model: "Camry",
    licenseType: "Private",
    color: "White",
    carValue: 120000,
    licenseExpiry: "2025-03-15",
    activePolicies: 2,
  },
  {
    id: "2",
    carNumber: "89-012-34",
    ownerName: "سارة أبو حسين",
    manufacturer: "Hyundai",
    year: 2021,
    model: "Tucson",
    licenseType: "Private",
    color: "Black",
    carValue: 95000,
    licenseExpiry: "2024-11-20",
    activePolicies: 1,
  },
  {
    id: "3",
    carNumber: "56-789-01",
    ownerName: "محمد خالد",
    manufacturer: "Kia",
    year: 2020,
    model: "Sportage",
    licenseType: "Commercial",
    color: "Silver",
    carValue: 85000,
    licenseExpiry: "2025-06-10",
    activePolicies: 3,
  },
  {
    id: "4",
    carNumber: "23-456-78",
    ownerName: "ليلى عمر",
    manufacturer: "Mazda",
    year: 2023,
    model: "CX-5",
    licenseType: "Private",
    color: "Red",
    carValue: 145000,
    licenseExpiry: "2024-08-25",
    activePolicies: 1,
  },
  {
    id: "5",
    carNumber: "90-123-45",
    ownerName: "خالد يوسف",
    manufacturer: "Volkswagen",
    year: 2019,
    model: "Golf",
    licenseType: "Private",
    color: "Blue",
    carValue: 75000,
    licenseExpiry: "2025-01-30",
    activePolicies: 2,
  },
];

const licenseColors: Record<string, string> = {
  Private: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Commercial: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Taxi: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

export default function Cars() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredCars = mockCars.filter(
    (car) =>
      car.carNumber.includes(searchQuery) ||
      car.ownerName.includes(searchQuery) ||
      car.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      car.model.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isExpiringSoon = (date: string) => {
    const expiry = new Date(date);
    const now = new Date();
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  };

  const isExpired = (date: string) => {
    return new Date(date) < new Date();
  };

  return (
    <MainLayout>
      <Header
        title="Cars"
        subtitle="Manage vehicle database"
        action={{ label: "Add Car", onClick: () => {} }}
      />

      <div className="p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by number, owner, make, model..."
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
                  <TableHead className="text-muted-foreground font-medium">Vehicle</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Owner</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Type</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Color</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">Value</TableHead>
                  <TableHead className="text-muted-foreground font-medium">License Expiry</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-center">Policies</TableHead>
                  <TableHead className="text-muted-foreground font-medium w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCars.map((car, index) => (
                  <TableRow
                    key={car.id}
                    className={cn(
                      "border-border/30 transition-colors cursor-pointer",
                      "hover:bg-secondary/30 animate-fade-in"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                          <CarIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-mono font-medium text-foreground">{car.carNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {car.manufacturer} {car.model} {car.year}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{car.ownerName}</TableCell>
                    <TableCell>
                      <Badge className={cn("border", licenseColors[car.licenseType])}>
                        {car.licenseType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{car.color}</TableCell>
                    <TableCell className="text-right font-medium">
                      ₪{car.carValue.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          isExpired(car.licenseExpiry)
                            ? "destructive"
                            : isExpiringSoon(car.licenseExpiry)
                            ? "warning"
                            : "outline"
                        }
                      >
                        {car.licenseExpiry}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{car.activePolicies}</Badge>
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
              Showing {filteredCars.length} vehicles
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
