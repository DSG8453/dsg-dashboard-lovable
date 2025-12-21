import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Shield, Globe } from "lucide-react";

const initialIPs = [
  {
    id: 1,
    ip: "192.168.1.0/24",
    description: "Office Network",
    status: "Active",
    addedDate: "2025-01-10",
  },
  {
    id: 2,
    ip: "10.0.0.1",
    description: "VPN Gateway",
    status: "Active",
    addedDate: "2025-01-15",
  },
  {
    id: 3,
    ip: "172.16.0.0/16",
    description: "Remote Workers",
    status: "Active",
    addedDate: "2025-02-01",
  },
  {
    id: 4,
    ip: "203.0.113.50",
    description: "Partner Access",
    status: "Inactive",
    addedDate: "2025-01-20",
  },
];

export const IPManagementPage = () => {
  const [ips, setIPs] = useState(initialIPs);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newIP, setNewIP] = useState({ ip: "", description: "" });

  const handleAddIP = () => {
    if (!newIP.ip || !newIP.description) {
      toast.error("Please fill in all fields");
      return;
    }

    setIPs([
      ...ips,
      {
        id: ips.length + 1,
        ...newIP,
        status: "Active",
        addedDate: new Date().toISOString().split("T")[0],
      },
    ]);

    setNewIP({ ip: "", description: "" });
    setIsAddDialogOpen(false);
    toast.success("IP address added to whitelist!");
  };

  const toggleIPStatus = (id) => {
    setIPs(
      ips.map((ip) =>
        ip.id === id
          ? { ...ip, status: ip.status === "Active" ? "Inactive" : "Active" }
          : ip
      )
    );
    toast.success("IP status updated!");
  };

  const handleDeleteIP = (id) => {
    setIPs(ips.filter((ip) => ip.id !== id));
    toast.success("IP address removed from whitelist!");
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">IP Whitelist Management</h1>
          <p className="text-muted-foreground">
            Configure allowed IP addresses for secure access
          </p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="gradient" className="gap-2">
              <Plus className="h-4 w-4" />
              Add IP Address
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add IP Address</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="ip">IP Address / CIDR</Label>
                <Input
                  id="ip"
                  placeholder="e.g., 192.168.1.0/24 or 10.0.0.1"
                  value={newIP.ip}
                  onChange={(e) => setNewIP({ ...newIP, ip: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Enter description"
                  value={newIP.description}
                  onChange={(e) =>
                    setNewIP({ ...newIP, description: e.target.value })
                  }
                />
              </div>
              <Button
                variant="gradient"
                className="w-full mt-4"
                onClick={handleAddIP}
              >
                Add to Whitelist
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Card */}
      <Card className="border-2 border-primary/20 bg-primary/5 mb-6">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              IP Whitelist Security
            </p>
            <p className="text-xs text-muted-foreground">
              Only whitelisted IP addresses can access company tools and resources.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* IP Table */}
      <Card className="border-2 border-border/50 shadow-card overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">IP Address</TableHead>
                <TableHead className="font-semibold">Description</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold hidden sm:table-cell">
                  Added Date
                </TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ips.map((ip) => (
                <TableRow key={ip.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                        {ip.ip}
                      </code>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{ip.description}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={ip.status === "Active"}
                        onCheckedChange={() => toggleIPStatus(ip.id)}
                      />
                      <Badge
                        variant={
                          ip.status === "Active" ? "active" : "inactive"
                        }
                      >
                        {ip.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {new Date(ip.addedDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="iconSm"
                        onClick={() =>
                          toast.info("Edit IP", {
                            description: "Edit functionality - coming soon!",
                          })
                        }
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="danger"
                        size="iconSm"
                        onClick={() => handleDeleteIP(ip.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};