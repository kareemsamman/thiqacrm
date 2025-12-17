import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldX, Mail, LogOut } from "lucide-react";

export default function NoAccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-destructive/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-warning/10 blur-3xl" />
      </div>

      <Card className="w-full max-w-md glass animate-scale-in">
        <CardHeader className="text-center space-y-4">
          {/* Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20">
            <ShieldX className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Access Pending
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Your account is awaiting admin approval
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="rounded-lg bg-secondary/30 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Signed in as:</span>
            </div>
            <p className="font-medium text-foreground">user@example.com</p>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              An administrator needs to approve your access request before you can use the system.
            </p>
            <p className="text-sm text-muted-foreground text-center">
              If you believe this is an error, please contact:
            </p>
            <p className="text-sm font-medium text-primary text-center">
              morshed500@gmail.com
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button variant="outline" className="w-full gap-2">
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
