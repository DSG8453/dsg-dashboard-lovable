import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Download,
  RefreshCw,
  LogIn,
  LogOut,
  Eye,
  Settings,
  UserPlus,
  Key,
} from "lucide-react";
import { toast } from "sonner";

const activityLogs = [
  {
    id: 1,
    user: "admin@dsgtransport.com",
    action: "Accessed",
    tool: "Bitwarden",
    time: "10 minutes ago",
    ip: "192.168.1.100",
    type: "access",
  },
  {
    id: 2,
    user: "john.smith@dsgtransport.com",
    action: "Accessed",
    tool: "Zoho Assist",
    time: "1 hour ago",
    ip: "192.168.1.105",
    type: "access",
  },
  {
    id: 3,
    user: "sarah.johnson@dsgtransport.com",
    action: "Accessed",
    tool: "Ascend TMS",
    time: "3 hours ago",
    ip: "192.168.1.110",
    type: "access",
  },
  {
    id: 4,
    user: "admin@dsgtransport.com",
    action: "Added User",
    tool: "System",
    time: "5 hours ago",
    ip: "192.168.1.100",
    type: "admin",
  },
  {
    id: 5,
    user: "mike.davis@dsgtransport.com",
    action: "Login",
    tool: "Portal",
    time: "6 hours ago",
    ip: "10.0.0.55",
    type: "auth",
  },
  {
    id: 6,
    user: "admin@dsgtransport.com",
    action: "Password Reset",
    tool: "System",
    time: "1 day ago",
    ip: "192.168.1.100",
    type: "security",
  },
  {
    id: 7,
    user: "emily.brown@dsgtransport.com",
    action: "Logout",
    tool: "Portal",
    time: "2 days ago",
    ip: "172.16.0.25",
    type: "auth",
  },
  {
    id: 8,
    user: "admin@dsgtransport.com",
    action: "Updated Settings",
    tool: "System",
    time: "3 days ago",
    ip: "192.168.1.100",
    type: "admin",
  },
];

const ActionIcon = ({ type }) => {
  const icons = {
    access: Eye,
    auth: LogIn,
    admin: UserPlus,
    security: Key,
    settings: Settings,
  };
  const Icon = icons[type] || Eye;
  return <Icon className="h-4 w-4" />;
};

export const ActivityLogsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");

  const filteredLogs = activityLogs.filter((log) => {
    const matchesSearch =
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.tool.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || log.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleRefresh = () => {
    toast.success("Activity logs refreshed!");
  };

  const handleExport = () => {
    toast.success("Exporting activity logs...", {
      description: "CSV file will be downloaded shortly.",
    });
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Activity Logs</h1>
          <p className="text-muted-foreground">
            Monitor all user activity and tool access
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button variant="gradient" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search activity logs..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Activities</SelectItem>
            <SelectItem value="access">Tool Access</SelectItem>
            <SelectItem value="auth">Authentication</SelectItem>
            <SelectItem value="admin">Admin Actions</SelectItem>
            <SelectItem value="security">Security Events</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Activity Table */}
      <Card className="border-2 border-border/50 shadow-card overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">User</TableHead>
                <TableHead className="font-semibold">Action</TableHead>
                <TableHead className="font-semibold">Tool</TableHead>
                <TableHead className="font-semibold hidden md:table-cell">Time</TableHead>
                <TableHead className="font-semibold hidden lg:table-cell">
                  IP Address
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{log.user}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-1.5 rounded-md ${
                          log.type === "access"
                            ? "bg-primary/10 text-primary"
                            : log.type === "auth"
                            ? "bg-success-light text-success"
                            : log.type === "admin"
                            ? "bg-admin-light text-admin"
                            : "bg-warning-light text-warning"
                        }`}
                      >
                        <ActionIcon type={log.type} />
                      </div>
                      <span>{log.action}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.tool}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {log.time}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {log.ip}
                    </code>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {filteredLogs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No activity logs found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};