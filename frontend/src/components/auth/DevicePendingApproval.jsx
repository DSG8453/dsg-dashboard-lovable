import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Monitor, Clock, XCircle, Shield, RefreshCw, LogOut } from "lucide-react";

export const DevicePendingApproval = () => {
  const { user, deviceStatus, deviceInfo, checkDeviceStatus, logout } = useAuth();

  const handleRefresh = async () => {
    await checkDeviceStatus();
    // Reload page if approved
    window.location.reload();
  };

  const getStatusContent = () => {
    switch (deviceStatus) {
      case "pending":
        return {
          icon: <Clock className="h-16 w-16 text-warning" />,
          title: "Device Pending Approval",
          description: "Your device is awaiting admin approval. Please contact your administrator to approve access from this device.",
          badgeVariant: "warning",
          badgeText: "Pending Approval",
        };
      case "rejected":
        return {
          icon: <XCircle className="h-16 w-16 text-destructive" />,
          title: "Device Rejected",
          description: "Access from this device has been rejected by an administrator. Please contact support if you believe this is an error.",
          badgeVariant: "destructive",
          badgeText: "Rejected",
        };
      case "revoked":
        return {
          icon: <Shield className="h-16 w-16 text-destructive" />,
          title: "Device Access Revoked",
          description: "Your access from this device has been revoked. Please contact your administrator for more information.",
          badgeVariant: "destructive",
          badgeText: "Revoked",
        };
      default:
        return {
          icon: <Monitor className="h-16 w-16 text-muted-foreground" />,
          title: "Device Not Recognized",
          description: "This device is not recognized. Please try logging in again.",
          badgeVariant: "secondary",
          badgeText: "Unknown",
        };
    }
  };

  const status = getStatusContent();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md border-2 shadow-xl">
        <CardContent className="p-8 text-center">
          {/* Logo/Icon */}
          <div className="mb-6 flex justify-center">
            {status.icon}
          </div>

          {/* Status Badge */}
          <Badge variant={status.badgeVariant} className="mb-4">
            {status.badgeText}
          </Badge>

          {/* Title */}
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {status.title}
          </h1>

          {/* Description */}
          <p className="text-muted-foreground mb-6">
            {status.description}
          </p>

          {/* Device Info */}
          <div className="p-4 rounded-lg bg-muted/50 mb-6 text-left">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Device Information
            </h3>
            <div className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">User:</span> {user?.name}</p>
              <p><span className="text-muted-foreground">Email:</span> {user?.email}</p>
              <p><span className="text-muted-foreground">Device:</span> {deviceInfo?.device_name || "Unknown"}</p>
              <p><span className="text-muted-foreground">Browser:</span> {deviceInfo?.browser || "Unknown"}</p>
              <p><span className="text-muted-foreground">OS:</span> {deviceInfo?.os || "Unknown"}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {deviceStatus === "pending" && (
              <Button 
                variant="gradient" 
                className="w-full gap-2"
                onClick={handleRefresh}
              >
                <RefreshCw className="h-4 w-4" />
                Check Approval Status
              </Button>
            )}
            
            <Button 
              variant="outline" 
              className="w-full gap-2"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>

          {/* Help Text */}
          <p className="text-xs text-muted-foreground mt-6">
            Need help? Contact your administrator or support team.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
