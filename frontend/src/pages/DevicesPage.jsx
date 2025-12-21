import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Monitor,
  Smartphone,
  Tablet,
  Settings,
  Trash2,
  Shield,
  CheckCircle,
  XCircle,
} from "lucide-react";

const initialDevices = [
  {
    id: 1,
    user: "admin@dsgtransport.com",
    device: "Chrome / Windows",
    type: "desktop",
    lastActive: "Today",
    status: "Approved",
    ip: "192.168.1.100",
  },
  {
    id: 2,
    user: "john.smith@dsgtransport.com",
    device: "Safari / iOS",
    type: "mobile",
    lastActive: "2 days ago",
    status: "Approved",
    ip: "192.168.1.105",
  },
  {
    id: 3,
    user: "sarah.johnson@dsgtransport.com",
    device: "Firefox / macOS",
    type: "desktop",
    lastActive: "1 hour ago",
    status: "Approved",
    ip: "192.168.1.110",
  },
  {
    id: 4,
    user: "mike.davis@dsgtransport.com",
    device: "Chrome / Android",
    type: "mobile",
    lastActive: "3 days ago",
    status: "Pending",
    ip: "10.0.0.55",
  },
  {
    id: 5,
    user: "emily.brown@dsgtransport.com",
    device: "Safari / iPad",
    type: "tablet",
    lastActive: "1 week ago",
    status: "Revoked",
    ip: "172.16.0.25",
  },
];

const DeviceIcon = ({ type }) => {
  const icons = {
    desktop: Monitor,
    mobile: Smartphone,
    tablet: Tablet,
  };
  const Icon = icons[type] || Monitor;
  return <Icon className="h-5 w-5" />;
};

export const DevicesPage = () => {
  const [devices, setDevices] = useState(initialDevices);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);

  const handleManageDevice = (device) => {
    setSelectedDevice(device);
    setManageDialogOpen(true);
  };

  const approveDevice = () => {
    setDevices(
      devices.map((d) =>
        d.id === selectedDevice.id ? { ...d, status: "Approved" } : d
      )
    );
    toast.success(`Device approved for ${selectedDevice.user}`);
    setManageDialogOpen(false);
  };

  const revokeDevice = () => {
    setDevices(
      devices.map((d) =>
        d.id === selectedDevice.id ? { ...d, status: "Revoked" } : d
      )
    );
    toast.warning(`Device access revoked for ${selectedDevice.user}`);
    setManageDialogOpen(false);
  };

  const removeDevice = () => {
    setDevices(devices.filter((d) => d.id !== selectedDevice.id));
    toast.success("Device removed from records");
    setManageDialogOpen(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Device Management</h1>
        <p className="text-muted-foreground">
          Approve and monitor devices used by team members
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="border-2 border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success-light">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {devices.filter((d) => d.status === "Approved").length}
              </p>
              <p className="text-sm text-muted-foreground">Approved Devices</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning-light">
              <Shield className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {devices.filter((d) => d.status === "Pending").length}
              </p>
              <p className="text-sm text-muted-foreground">Pending Approval</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {devices.filter((d) => d.status === "Revoked").length}
              </p>
              <p className="text-sm text-muted-foreground">Revoked Access</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Devices Table */}
      <Card className="border-2 border-border/50 shadow-card overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">User</TableHead>
                <TableHead className="font-semibold">Device</TableHead>
                <TableHead className="font-semibold hidden md:table-cell">
                  Last Active
                </TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{device.user}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-muted">
                        <DeviceIcon type={device.type} />
                      </div>
                      <span>{device.device}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {device.lastActive}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        device.status === "Approved"
                          ? "active"
                          : device.status === "Pending"
                          ? "warning"
                          : "destructive"
                      }
                    >
                      {device.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => handleManageDevice(device)}
                    >
                      <Settings className="h-4 w-4" />
                      <span className="hidden sm:inline">Manage</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Manage Device Dialog */}
      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Device</DialogTitle>
            <DialogDescription>Update device access permissions</DialogDescription>
          </DialogHeader>
          {selectedDevice && (
            <div className="py-4 space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center gap-2">
                  <DeviceIcon type={selectedDevice.type} />
                  <span className="font-semibold">{selectedDevice.device}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  User: {selectedDevice.user}
                </p>
                <p className="text-sm text-muted-foreground">
                  IP Address: {selectedDevice.ip}
                </p>
                <p className="text-sm text-muted-foreground">
                  Last Active: {selectedDevice.lastActive}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                {selectedDevice.status !== "Approved" && (
                  <Button variant="gradient" className="gap-2" onClick={approveDevice}>
                    <CheckCircle className="h-4 w-4" />
                    Approve Device
                  </Button>
                )}
                {selectedDevice.status !== "Revoked" && (
                  <Button
                    variant="outline"
                    className="gap-2 border-warning text-warning hover:bg-warning/10"
                    onClick={revokeDevice}
                  >
                    <XCircle className="h-4 w-4" />
                    Revoke Access
                  </Button>
                )}
                <Button variant="danger" className="gap-2" onClick={removeDevice}>
                  <Trash2 className="h-4 w-4" />
                  Remove Device
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};