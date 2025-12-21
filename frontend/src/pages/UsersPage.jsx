import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Search,
  UserPlus,
  Edit,
  Trash2,
  MoreVertical,
  Shield,
  Ban,
  RefreshCw,
  Mail,
  UserCheck,
  UserX,
  Settings,
} from "lucide-react";

const initialUsers = [
  {
    id: 1,
    name: "Admin User",
    email: "admin@dsgtransport.com",
    role: "Admin",
    status: "Active",
    initials: "AU",
    accessLevel: "full",
    lastActive: "Just now",
    invitedAt: "Dec 1, 2025",
  },
  {
    id: 2,
    name: "John Smith",
    email: "john.smith@dsgtransport.com",
    role: "User",
    status: "Active",
    initials: "JS",
    accessLevel: "standard",
    lastActive: "2 hours ago",
    invitedAt: "Dec 5, 2025",
  },
  {
    id: 3,
    name: "Sarah Johnson",
    email: "sarah.johnson@dsgtransport.com",
    role: "User",
    status: "Active",
    initials: "SJ",
    accessLevel: "standard",
    lastActive: "1 day ago",
    invitedAt: "Dec 8, 2025",
  },
  {
    id: 4,
    name: "Mike Davis",
    email: "mike.davis@dsgtransport.com",
    role: "User",
    status: "Suspended",
    initials: "MD",
    accessLevel: "limited",
    lastActive: "3 days ago",
    invitedAt: "Dec 10, 2025",
  },
  {
    id: 5,
    name: "Emily Brown",
    email: "emily.brown@dsgtransport.com",
    role: "User",
    status: "Pending",
    initials: "EB",
    accessLevel: "standard",
    lastActive: "Never",
    invitedAt: "Dec 18, 2025",
  },
];

const accessLevels = [
  { value: "full", label: "Full Access", description: "All tools and admin features" },
  { value: "standard", label: "Standard", description: "All tools, no admin features" },
  { value: "limited", label: "Limited", description: "Selected tools only" },
  { value: "readonly", label: "Read Only", description: "View only, no actions" },
];

const statusOptions = [
  { value: "Active", color: "success" },
  { value: "Suspended", color: "destructive" },
  { value: "Pending", color: "warning" },
];

export const UsersPage = () => {
  const [users, setUsers] = useState(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "User", accessLevel: "standard" });
  const [editUser, setEditUser] = useState(null);

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email) {
      toast.error("Please fill in all fields");
      return;
    }

    const initials = newUser.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

    const user = {
      id: Date.now(),
      ...newUser,
      status: "Pending",
      initials,
      lastActive: "Never",
      invitedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    };

    setUsers([...users, user]);
    setNewUser({ name: "", email: "", role: "User", accessLevel: "standard" });
    setIsAddDialogOpen(false);
    toast.success("Invitation sent!", {
      description: `An invitation email has been sent to ${user.email}`,
    });
  };

  const handleEditUser = (user) => {
    setEditUser({ ...user });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editUser.name || !editUser.email) {
      toast.error("Please fill in all fields");
      return;
    }

    setUsers(users.map((u) => (u.id === editUser.id ? editUser : u)));
    setIsEditDialogOpen(false);
    setEditUser(null);
    toast.success("User updated successfully!");
  };

  const handleDeleteUser = () => {
    if (selectedUser) {
      setUsers(users.filter((u) => u.id !== selectedUser.id));
      toast.success(`${selectedUser.name} has been removed`);
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const handleSuspendUser = (user) => {
    setUsers(
      users.map((u) =>
        u.id === user.id ? { ...u, status: "Suspended" } : u
      )
    );
    toast.warning(`${user.name} has been suspended`, {
      description: "User can no longer access the portal.",
    });
  };

  const handleReactivateUser = (user) => {
    setUsers(
      users.map((u) =>
        u.id === user.id ? { ...u, status: "Active" } : u
      )
    );
    toast.success(`${user.name} has been reactivated`, {
      description: "User can now access the portal.",
    });
  };

  const handleResendInvitation = (user) => {
    toast.success("Invitation resent!", {
      description: `A new invitation email has been sent to ${user.email}`,
    });
  };

  const handleChangeAccessLevel = (user, newLevel) => {
    setUsers(
      users.map((u) =>
        u.id === user.id ? { ...u, accessLevel: newLevel } : u
      )
    );
    const levelLabel = accessLevels.find((l) => l.value === newLevel)?.label;
    toast.success(`Access level updated`, {
      description: `${user.name} now has ${levelLabel} access.`,
    });
  };

  const getStatusBadge = (status) => {
    const variants = {
      Active: "active",
      Suspended: "destructive",
      Pending: "warning",
    };
    return variants[status] || "secondary";
  };

  const getAccessBadge = (level) => {
    const variants = {
      full: "admin",
      standard: "default",
      limited: "secondary",
      readonly: "outline",
    };
    return variants[level] || "secondary";
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground">Manage team members, access levels, and permissions</p>
        </div>

        <Button variant="gradient" className="gap-2" onClick={() => setIsAddDialogOpen(true)}>
          <UserPlus className="h-4 w-4" />
          Invite User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card className="border-2 border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-foreground">{users.length}</p>
            <p className="text-sm text-muted-foreground">Total Users</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-success">
              {users.filter((u) => u.status === "Active").length}
            </p>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-warning">
              {users.filter((u) => u.status === "Pending").length}
            </p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-destructive">
              {users.filter((u) => u.status === "Suspended").length}
            </p>
            <p className="text-sm text-muted-foreground">Suspended</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users by name or email..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* User Cards */}
      <div className="space-y-4 stagger-children">
        {filteredUsers.map((user) => (
          <Card
            key={user.id}
            className="border-2 border-border/50 shadow-card hover:shadow-card-hover transition-shadow"
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                {/* User Info */}
                <div className="flex items-center gap-4 flex-1">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback
                      className={`${
                        user.role === "Admin"
                          ? "bg-gradient-primary text-primary-foreground"
                          : user.status === "Suspended"
                          ? "bg-destructive/20 text-destructive"
                          : "bg-primary/20 text-primary"
                      } font-semibold`}
                    >
                      {user.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-foreground">{user.name}</h3>
                      {user.role === "Admin" && (
                        <Shield className="h-4 w-4 text-admin" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">Last active: {user.lastActive}</p>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={user.role === "Admin" ? "admin" : "user"}>
                    {user.role}
                  </Badge>
                  <Badge variant={getStatusBadge(user.status)}>
                    {user.status}
                  </Badge>
                  <Badge variant={getAccessBadge(user.accessLevel)}>
                    {accessLevels.find((l) => l.value === user.accessLevel)?.label}
                  </Badge>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* Quick Access Level Change */}
                  <Select
                    value={user.accessLevel}
                    onValueChange={(value) => handleChangeAccessLevel(user, value)}
                  >
                    <SelectTrigger className="w-32 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {accessLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          <div>
                            <p className="font-medium">{level.label}</p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Actions Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => handleEditUser(user)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit User
                      </DropdownMenuItem>

                      {user.status === "Pending" && (
                        <DropdownMenuItem onClick={() => handleResendInvitation(user)}>
                          <Mail className="mr-2 h-4 w-4" />
                          Resend Invitation
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator />

                      {user.status === "Active" && user.role !== "Admin" && (
                        <DropdownMenuItem
                          onClick={() => handleSuspendUser(user)}
                          className="text-warning focus:text-warning"
                        >
                          <Ban className="mr-2 h-4 w-4" />
                          Suspend User
                        </DropdownMenuItem>
                      )}

                      {user.status === "Suspended" && (
                        <DropdownMenuItem
                          onClick={() => handleReactivateUser(user)}
                          className="text-success focus:text-success"
                        >
                          <UserCheck className="mr-2 h-4 w-4" />
                          Reactivate User
                        </DropdownMenuItem>
                      )}

                      {user.role !== "Admin" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser(user);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete User
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No users found matching your search.</p>
        </div>
      )}

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
            <DialogDescription>
              Send an invitation to join the DSG Transport portal
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Enter full name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="User">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="access">Access Level</Label>
                <Select
                  value={newUser.accessLevel}
                  onValueChange={(value) => setNewUser({ ...newUser, accessLevel: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select access" />
                  </SelectTrigger>
                  <SelectContent>
                    {accessLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button variant="gradient" className="w-full mt-4" onClick={handleAddUser}>
              <Mail className="mr-2 h-4 w-4" />
              Send Invitation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and settings
            </DialogDescription>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editName">Full Name</Label>
                <Input
                  id="editName"
                  value={editUser.name}
                  onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editEmail">Email Address</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editUser.email}
                  onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={editUser.role}
                    onValueChange={(value) => setEditUser({ ...editUser, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="User">User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editUser.status}
                    onValueChange={(value) => setEditUser({ ...editUser, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Suspended">Suspended</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Access Level</Label>
                <Select
                  value={editUser.accessLevel}
                  onValueChange={(value) => setEditUser({ ...editUser, accessLevel: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accessLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        <div>
                          <p className="font-medium">{level.label}</p>
                          <p className="text-xs text-muted-foreground">{level.description}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="gradient" className="flex-1" onClick={handleSaveEdit}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedUser?.name}? This action cannot be undone.
              All user data and access will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
