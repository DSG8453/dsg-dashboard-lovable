import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { ToolCredentialsDialog } from "./ToolCredentialsDialog";
import { ExternalLink, MoreVertical, Trash2, Key, KeyRound } from "lucide-react";
import { toast } from "sonner";

export const ToolCard = ({ tool, onDelete }) => {
  const { user, getUserToolCredentials } = useAuth();
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const [credentials, setCredentials] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Check if user is admin
  const isAdmin = user?.role === "Administrator";

  // Use the credentials_count from the tool if available
  const credentialsCount = tool.credentials_count || 0;
  const hasCredentials = credentialsCount > 0;

  // Fetch credentials when dialog opens (admin only)
  const loadCredentials = async () => {
    if (!tool?.id || !isAdmin) return;
    setIsLoading(true);
    try {
      const creds = await getUserToolCredentials(tool.id);
      setCredentials(creds);
    } catch (error) {
      console.error("Failed to load credentials:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle tool access - just open the URL directly
  const handleAccess = () => {
    if (tool.url && tool.url !== "#") {
      window.open(tool.url, "_blank", "noopener,noreferrer");
    } else {
      toast.info("Tool URL not configured");
    }
  };

  const handleDialogOpen = async (open) => {
    if (!isAdmin) return; // Only admin can open credentials dialog
    setCredentialsDialogOpen(open);
    if (open) {
      await loadCredentials();
    }
  };

  return (
    <>
      <Card className="border-2 border-border/50 shadow-card hover-lift group">
        <CardContent className="p-6 flex flex-col h-full">
          <div className="flex items-start gap-4 mb-4">
            <div className="icon-gradient p-3 rounded-xl text-primary-foreground shadow-md group-hover:shadow-glow transition-shadow duration-300">
              <tool.icon className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-foreground truncate">
                {tool.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="default">{tool.category}</Badge>
                {/* Only show credentials badge to admin */}
                {isAdmin && hasCredentials && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="success" className="gap-1">
                          <KeyRound className="h-3 w-3" />
                          {credentialsCount}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{credentialsCount} credential(s) saved</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
            
            {/* Admin-only dropdown menu */}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="iconSm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleDialogOpen(true)}>
                    <Key className="mr-2 h-4 w-4" />
                    Manage Credentials
                  </DropdownMenuItem>
                  {onDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => onDelete(tool.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove Tool
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">
            {tool.description}
          </p>

          <div className="flex gap-2">
            {/* Access Tool button - available to all users */}
            <Button
              variant="gradient"
              className="flex-1 gap-2"
              onClick={handleAccess}
            >
              <ExternalLink className="h-4 w-4" />
              Access Tool
            </Button>
            
            {/* Manage Credentials button - Admin only */}
            {isAdmin && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDialogOpen(true)}
                    >
                      <Key className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Manage Credentials</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Credentials Dialog - Admin only */}
      {isAdmin && (
        <ToolCredentialsDialog
          tool={tool}
          open={credentialsDialogOpen}
          onOpenChange={handleDialogOpen}
          initialCredentials={credentials}
          isLoading={isLoading}
          onCredentialsChange={loadCredentials}
        />
      )}
    </>
  );
};
