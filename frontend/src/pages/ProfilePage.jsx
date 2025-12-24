import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  User,
  Mail,
  Shield,
  Calendar,
  Edit,
  Key,
  Bell,
  Puzzle,
  Download,
  Check,
  Copy,
  ExternalLink,
} from "lucide-react";

export const ProfilePage = ({ currentUser }) => {
  const [extensionId, setExtensionId] = useState("");
  const [isExtensionSaved, setIsExtensionSaved] = useState(false);

  // Load saved extension ID on mount
  useEffect(() => {
    const savedId = localStorage.getItem('dsg_extension_id');
    if (savedId) {
      setExtensionId(savedId);
      setIsExtensionSaved(true);
    }
  }, []);

  const handleEditProfile = () => {
    toast.info("Edit Profile", {
      description: "Profile editing functionality - coming soon!",
    });
  };

  const handleChangePassword = () => {
    toast.info("Change Password", {
      description: "Password change functionality - coming soon!",
    });
  };

  const handleSaveExtensionId = () => {
    if (!extensionId.trim()) {
      toast.error("Please enter your Extension ID");
      return;
    }
    
    localStorage.setItem('dsg_extension_id', extensionId.trim());
    setIsExtensionSaved(true);
    toast.success("Extension ID Saved!", {
      description: "You can now use auto-login for tools",
    });
  };

  const handleClearExtensionId = () => {
    localStorage.removeItem('dsg_extension_id');
    setExtensionId("");
    setIsExtensionSaved(false);
    toast.info("Extension ID Removed");
  };

  const handleDownloadExtension = () => {
    window.open(`${process.env.REACT_APP_BACKEND_URL}/api/download/extension`, '_blank');
  };

  const copyExtensionId = () => {
    navigator.clipboard.writeText(extensionId);
    toast.success("Extension ID copied!");
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <Card className="border-2 border-border/50 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="bg-gradient-primary text-primary-foreground text-3xl font-bold">
                {currentUser.initials}
              </AvatarFallback>
            </Avatar>
          </div>
          <CardTitle className="text-2xl font-bold">My Profile</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <Separator />

          {/* Profile Fields */}
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
              <div className="p-2 rounded-lg bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Full Name
                </p>
                <p className="text-foreground font-semibold">
                  {currentUser.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Email Address
                </p>
                <p className="text-foreground font-semibold">
                  {currentUser.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
              <div className="p-2 rounded-lg bg-admin/10">
                <Shield className="h-5 w-5 text-admin" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Role
                </p>
                <Badge variant="admin">{currentUser.role}</Badge>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
              <div className="p-2 rounded-lg bg-success/10">
                <Calendar className="h-5 w-5 text-success" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Member Since
                </p>
                <p className="text-foreground font-semibold">
                  {currentUser.joinedDate}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
              <div className="p-2 rounded-lg bg-success/10">
                <Bell className="h-5 w-5 text-success" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Account Status
                </p>
                <Badge variant="active">Active</Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="gradient"
              className="flex-1 gap-2"
              onClick={handleEditProfile}
            >
              <Edit className="h-4 w-4" />
              Edit Profile
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleChangePassword}
            >
              <Key className="h-4 w-4" />
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};