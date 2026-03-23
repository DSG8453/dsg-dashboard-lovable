import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useAuth } from "@/context/AuthContext";
import { zohoAPI } from "@/services/api";
import {
  Edit,
  ExternalLink,
  Laptop,
  Loader2,
  Monitor,
  RefreshCw,
  Save,
  Search,
  Shield,
  Trash2,
  UserCircle2,
} from "lucide-react";

const EMPTY_FORM = {
  user_email: "",
  computer_id: "",
  device_name: "",
};

const compareAssignments = (left, right) =>
  left.user_email.localeCompare(right.user_email, undefined, {
    sensitivity: "base",
  });

const normalizeAssignment = (assignment) => {
  if (!assignment || typeof assignment !== "object") {
    return null;
  }

  const userEmail =
    assignment.user_email ??
    assignment.userEmail ??
    assignment.email ??
    "";
  const deviceName =
    assignment.device_name ??
    assignment.deviceName ??
    assignment.name ??
    "";
  const computerId =
    assignment.computer_id ??
    assignment.computerId ??
    assignment.computer ??
    "";

  if (!userEmail && !deviceName && !computerId) {
    return null;
  }

  return {
    user_email: String(userEmail),
    device_name: String(deviceName || ""),
    computer_id: String(computerId || ""),
  };
};

const extractAssignments = (payload) => {
  const collection = Array.isArray(payload)
    ? payload
    : payload?.devices ||
      payload?.assignments ||
      payload?.items ||
      payload?.data ||
      [];

  if (!Array.isArray(collection)) {
    return [];
  }

  return collection
    .map(normalizeAssignment)
    .filter(Boolean)
    .sort(compareAssignments);
};

const getErrorMessage = (error, fallbackMessage) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
};

const getSessionUrl = (payload) => {
  if (!payload) {
    return null;
  }

  const sessionUrl = payload?.session_url;
  if (
    typeof sessionUrl === "string" &&
    (sessionUrl.startsWith("http://") ||
      sessionUrl.startsWith("https://") ||
      sessionUrl.startsWith("/"))
  ) {
    return sessionUrl;
  }

  return null;
};

export const ZohoDeviceManagerPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin =
    user?.role === "Administrator" || user?.role === "Super Administrator";

  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [launchingEmail, setLaunchingEmail] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingEmail, setEditingEmail] = useState(null);
  const [formState, setFormState] = useState(EMPTY_FORM);

  const resetForm = () => {
    setFormState(EMPTY_FORM);
    setEditingEmail(null);
  };

  const fetchAssignments = useCallback(
    async ({ showSpinner = true } = {}) => {
      if (!isAdmin) {
        setIsLoading(false);
        return;
      }

      if (showSpinner) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const data = await zohoAPI.getDevices();
        const nextAssignments = extractAssignments(data);
        setAssignments(nextAssignments);
      } catch (error) {
        toast.error(getErrorMessage(error, "Failed to load Zoho assignments"));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [isAdmin]
  );

  useEffect(() => {
    if (user && !isAdmin) {
      toast.error("Access denied. Administrators only.");
      navigate("/", { replace: true });
    }
  }, [user, isAdmin, navigate]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const filteredAssignments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return assignments;
    }

    return assignments.filter((assignment) =>
      [assignment.user_email, assignment.device_name, assignment.computer_id]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [assignments, searchQuery]);

  const stats = useMemo(() => {
    const uniqueUsers = new Set(
      assignments.map((assignment) => assignment.user_email.toLowerCase())
    ).size;
    const uniqueComputers = new Set(
      assignments
        .map((assignment) => assignment.computer_id)
        .filter(Boolean)
    ).size;

    return [
      {
        label: "Assignments",
        value: assignments.length,
        icon: UserCircle2,
        accent: "text-foreground",
        background: "bg-muted",
      },
      {
        label: "Unique Users",
        value: uniqueUsers,
        icon: Shield,
        accent: "text-admin",
        background: "bg-admin/10",
      },
      {
        label: "Computer IDs",
        value: uniqueComputers,
        icon: Monitor,
        accent: "text-primary",
        background: "bg-primary/10",
      },
    ];
  }, [assignments]);

  const handleEdit = (assignment) => {
    setEditingEmail(assignment.user_email);
    setFormState({
      user_email: assignment.user_email,
      computer_id: assignment.computer_id,
      device_name: assignment.device_name,
    });
  };

  const handleSubmit = async () => {
    const payload = {
      user_email: formState.user_email.trim().toLowerCase(),
      computer_id: formState.computer_id.trim(),
      device_name: formState.device_name.trim(),
    };

    if (!payload.user_email || !payload.computer_id || !payload.device_name) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!payload.user_email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSaving(true);
    try {
      await zohoAPI.saveDevice(payload);
      await fetchAssignments({ showSpinner: false });
      toast.success(
        editingEmail
          ? `Zoho assignment updated for ${payload.user_email}`
          : `Zoho assignment created for ${payload.user_email}`
      );
      resetForm();
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          editingEmail
            ? "Failed to update Zoho assignment"
            : "Failed to create Zoho assignment"
        )
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      await zohoAPI.deleteDevice(deleteTarget.user_email);
      setAssignments((currentAssignments) =>
        currentAssignments.filter(
          (assignment) => assignment.user_email !== deleteTarget.user_email
        )
      );
      if (editingEmail === deleteTarget.user_email) {
        resetForm();
      }
      toast.success(`Zoho assignment removed for ${deleteTarget.user_email}`);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete Zoho assignment"));
    }
  };

  const handleLaunch = async (assignment) => {
    setLaunchingEmail(assignment.user_email);

    try {
      const response = await zohoAPI.launch(assignment.user_email);
      const sessionUrl = getSessionUrl(response);

      if (sessionUrl) {
        window.open(sessionUrl, "_blank");
        toast.success(`Launching Zoho for ${assignment.user_email}`);
        return;
      }

      toast.error("Zoho session URL is missing from the launch response");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to launch Zoho"));
    } finally {
      setLaunchingEmail(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Zoho Device Manager</h1>
          <p className="text-muted-foreground">
            Manage Zoho Assist device assignments and launch sessions with your
            current admin access.
          </p>
        </div>

        <Button
          variant="outline"
          className="gap-2"
          onClick={() => fetchAssignments({ showSpinner: false })}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      <Card className="border-2 border-admin/20 bg-admin/5 shadow-card">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-admin/10">
              <Shield className="h-5 w-5 text-admin" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Admin-only Zoho controls</p>
              <p className="text-sm text-muted-foreground">
                Assign computer IDs, update device names, and launch Zoho using the
                same dashboard authentication token already in your session.
              </p>
            </div>
          </div>
          <Badge variant="admin" className="self-start sm:self-center">
            Admin Access
          </Badge>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-2 border-border/50 shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.background}`}>
                <stat.icon className={`h-5 w-5 ${stat.accent}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${stat.accent}`}>{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
        <Card className="border-2 border-border/50 shadow-card">
          <CardHeader>
            <CardTitle>{editingEmail ? "Edit Assignment" : "Add New Assignment"}</CardTitle>
            <CardDescription>
              {editingEmail
                ? "Update the current device mapping for this user."
                : "Create a Zoho device assignment for an admin-managed user."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="zoho-user-email">User Email</Label>
              <Input
                id="zoho-user-email"
                type="email"
                placeholder="user@dsgtransport.net"
                value={formState.user_email}
                disabled={Boolean(editingEmail)}
                onChange={(event) =>
                  setFormState((currentState) => ({
                    ...currentState,
                    user_email: event.target.value,
                  }))
                }
              />
              {editingEmail && (
                <p className="text-xs text-muted-foreground">
                  Email is locked during edit because the backend uses it as the
                  assignment identifier.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="zoho-computer-id">Computer ID</Label>
              <Input
                id="zoho-computer-id"
                placeholder="Enter Zoho computer ID"
                value={formState.computer_id}
                onChange={(event) =>
                  setFormState((currentState) => ({
                    ...currentState,
                    computer_id: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zoho-device-name">Device Name</Label>
              <Input
                id="zoho-device-name"
                placeholder="Enter device name"
                value={formState.device_name}
                onChange={(event) =>
                  setFormState((currentState) => ({
                    ...currentState,
                    device_name: event.target.value,
                  }))
                }
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="gradient"
                className="flex-1 gap-2"
                onClick={handleSubmit}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {editingEmail ? "Save Changes" : "Save Assignment"}
                  </>
                )}
              </Button>

              {editingEmail && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={resetForm}
                  disabled={isSaving}
                >
                  Cancel Edit
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-border/50 shadow-card overflow-hidden">
          <CardHeader className="gap-4">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
              <div>
                <CardTitle>Device Assignments</CardTitle>
                <CardDescription>
                  Review every Zoho assignment, edit details, remove mappings, or
                  launch Zoho directly.
                </CardDescription>
              </div>

              <div className="relative w-full lg:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email, device, or computer ID"
                  className="pl-10"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {filteredAssignments.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Laptop className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {assignments.length === 0
                    ? "No Zoho assignments yet"
                    : "No assignments match your search"}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {assignments.length === 0
                    ? "Create the first Zoho device assignment using the form on the left."
                    : "Try a different search term to find the assignment you need."}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">User Email</TableHead>
                    <TableHead className="font-semibold">Device Name</TableHead>
                    <TableHead className="font-semibold">Computer ID</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssignments.map((assignment) => {
                    const isLaunching = launchingEmail === assignment.user_email;

                    return (
                      <TableRow key={assignment.user_email} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{assignment.user_email}</TableCell>
                        <TableCell className="max-w-[220px] truncate" title={assignment.device_name || "Unnamed device"}>
                          {assignment.device_name || "Unnamed device"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {assignment.computer_id || "Not set"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => handleEdit(assignment)}
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </Button>

                            <Button
                              variant="gradient"
                              size="sm"
                              className="gap-2"
                              onClick={() => handleLaunch(assignment)}
                              disabled={isLaunching}
                            >
                              {isLaunching ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ExternalLink className="h-4 w-4" />
                              )}
                              Launch Zoho
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                setDeleteTarget(assignment);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Zoho assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the Zoho device assignment for{" "}
              <strong>{deleteTarget?.user_email}</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Assignment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
