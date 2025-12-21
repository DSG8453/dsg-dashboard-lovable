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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, Key, Mail, Send } from "lucide-react";

const users = [
  {
    id: 1,
    name: "Admin User",
    email: "admin@dsgtransport.com",
    role: "Admin",
    lastPasswordChange: "2025-01-15",
  },
  {
    id: 2,
    name: "John Smith",
    email: "john.smith@dsgtransport.com",
    role: "User",
    lastPasswordChange: "2025-02-01",
  },
  {
    id: 3,
    name: "Sarah Johnson",
    email: "sarah.johnson@dsgtransport.com",
    role: "User",
    lastPasswordChange: "2025-01-20",
  },
  {
    id: 4,
    name: "Mike Davis",
    email: "mike.davis@dsgtransport.com",
    role: "User",
    lastPasswordChange: "2025-02-10",
  },
];

export const CredentialsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleResetPassword = (user) => {
    setSelectedUser(user);
    setResetDialogOpen(true);
  };

  const confirmResetPassword = () => {
    toast.success(`Password reset email sent to ${selectedUser.email}`, {
      description: "User will receive instructions to set a new password.",
    });
    setResetDialogOpen(false);
    setSelectedUser(null);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">User Login Credentials</h1>
        <p className="text-muted-foreground">
          Manage user authentication and send password resets
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Credentials Table */}
      <Card className="border-2 border-border/50 shadow-card overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">User</TableHead>
                <TableHead className="font-semibold">Email (Username)</TableHead>
                <TableHead className="font-semibold">Role</TableHead>
                <TableHead className="font-semibold hidden sm:table-cell">
                  Last Password Change
                </TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/30">
                  <TableCell className="font-semibold">{user.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === "Admin" ? "admin" : "user"}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {new Date(user.lastPasswordChange).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="gradient"
                      size="sm"
                      className="gap-2"
                      onClick={() => handleResetPassword(user)}
                    >
                      <Key className="h-4 w-4" />
                      <span className="hidden sm:inline">Reset Password</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reset Password Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Send a password reset email to {selectedUser?.name}?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 rounded-lg bg-muted/50 mb-4">
              <p className="text-sm text-muted-foreground">Reset email will be sent to:</p>
              <p className="font-semibold text-foreground">{selectedUser?.email}</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setResetDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="gradient"
                className="flex-1 gap-2"
                onClick={confirmResetPassword}
              >
                <Send className="h-4 w-4" />
                Send Reset Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};