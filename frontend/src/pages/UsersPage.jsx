import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Plus, Edit, Trash2, UserPlus } from "lucide-react";

const initialUsers = [
  {
    id: 1,
    name: "Admin User",
    email: "admin@dsgtransport.com",
    role: "Admin",
    status: "Active",
    initials: "AU",
  },
  {
    id: 2,
    name: "John Smith",
    email: "john.smith@dsgtransport.com",
    role: "User",
    status: "Active",
    initials: "JS",
  },
  {
    id: 3,
    name: "Sarah Johnson",
    email: "sarah.johnson@dsgtransport.com",
    role: "User",
    status: "Active",
    initials: "SJ",
  },
  {
    id: 4,
    name: "Mike Davis",
    email: "mike.davis@dsgtransport.com",
    role: "User",
    status: "Active",
    initials: "MD",
  },
  {
    id: 5,
    name: "Emily Brown",
    email: "emily.brown@dsgtransport.com",
    role: "User",
    status: "Inactive",
    initials: "EB",
  },
];

export const UsersPage = () => {
  const [users, setUsers] = useState(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "User" });

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

    setUsers([
      ...users,
      {
        id: users.length + 1,
        ...newUser,
        status: "Active",
        initials,
      },
    ]);

    setNewUser({ name: "", email: "", role: "User" });
    setIsAddDialogOpen(false);
    toast.success("User added successfully!");
  };

  const handleEditUser = (user) => {
    toast.info(`Edit user: ${user.name}`, {
      description: "Edit functionality - coming soon!",
    });
  };

  const handleDeleteUser = (userId) => {
    setUsers(users.filter((u) => u.id !== userId));
    toast.success("User removed successfully!");
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground">Manage team members and their access</p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="gradient" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Enter full name"
                  value={newUser.name}
                  onChange={(e) =>
                    setNewUser({ ...newUser, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value) =>
                    setNewUser({ ...newUser, role: value })
                  }
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
              <Button
                variant="gradient"
                className="w-full mt-4"
                onClick={handleAddUser}
              >
                Add User
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback
                      className={`${
                        user.role === "Admin"
                          ? "bg-gradient-primary"
                          : "bg-primary/20 text-primary"
                      } font-semibold ${
                        user.role === "Admin" ? "text-primary-foreground" : ""
                      }`}
                    >
                      {user.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-foreground">{user.name}</h3>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge
                        variant={user.role === "Admin" ? "admin" : "user"}
                      >
                        {user.role}
                      </Badge>
                      <Badge
                        variant={
                          user.status === "Active" ? "active" : "inactive"
                        }
                      >
                        {user.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-none gap-2"
                    onClick={() => handleEditUser(user)}
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                  {user.role !== "Admin" && (
                    <Button
                      variant="danger"
                      size="sm"
                      className="gap-2"
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
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
    </div>
  );
};