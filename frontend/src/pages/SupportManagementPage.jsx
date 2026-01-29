import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useSupport } from "@/context/SupportContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Settings,
  MessageCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  Bot,
  Send,
  Trash2,
  Eye,
  Loader2,
  Sparkles,
  UserCheck,
  Phone,
  Mail,
  Building,
} from "lucide-react";

const statusColors = {
  open: "warning",
  analyzed: "default",
  in_progress: "default",
  resolved: "success",
};

const statusLabels = {
  open: "Open",
  analyzed: "AI Analyzed",
  in_progress: "In Progress",
  resolved: "Resolved",
};

const priorityColors = {
  low: "secondary",
  medium: "warning",
  high: "destructive",
};

export const SupportManagementPage = () => {
  const { user } = useAuth();
  const { settings, issues, updateSettings, analyzeWithAI, updateIssue, resolveIssue, deleteIssue } = useSupport();
  const [editSettings, setEditSettings] = useState(settings);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  const isSuperAdmin = user?.role === "Super Administrator";

  const handleSaveSettings = () => {
    updateSettings(editSettings);
    toast.success("Support settings updated!");
  };

  const handleAnalyzeWithAI = async (issueId) => {
    setIsAnalyzing(true);
    toast.info("Sending to AI for analysis...");
    
    try {
      const analysis = await analyzeWithAI(issueId);
      if (analysis) {
        toast.success("AI Analysis Complete!", {
          description: `Confidence: ${Math.round(analysis.confidence * 100)}%`,
        });
        // Refresh selected issue
        const updated = issues.find((i) => i.id === issueId);
        if (updated) setSelectedIssue(updated);
      }
    } catch (error) {
      toast.error("Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleResolve = () => {
    if (!resolutionNote.trim()) {
      toast.error("Please add a resolution note");
      return;
    }

    resolveIssue(selectedIssue.id, {
      note: resolutionNote,
      resolvedBy: user.name,
      appliedFix: selectedIssue.aiAnalysis?.suggestedFix || "Manual fix applied",
    });

    toast.success("Issue resolved!", {
      description: `User ${selectedIssue.userName} will be notified.`,
    });
    setSelectedIssue(null);
    setResolutionNote("");
  };

  const handleSaveNotes = () => {
    updateIssue(selectedIssue.id, { adminNotes });
    toast.success("Notes saved!");
  };

  const openIssues = issues.filter((i) => i.status !== "resolved");
  const resolvedIssues = issues.filter((i) => i.status === "resolved");

  // Only Super Admin can access this page
  if (!isSuperAdmin) {
    return (
      <div className="animate-fade-in">
        <Card className="border-2 border-border/50">
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Super Admin Access Required</h2>
            <p className="text-muted-foreground">
              Only Super Administrator can access the support management panel.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              You can view and track your reported issues from the "My Issues" page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Support Management</h1>
        <p className="text-muted-foreground">
          Manage WhatsApp support settings and resolve user issues with AI assistance
        </p>
      </div>

      <Tabs defaultValue="issues" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
          <TabsTrigger value="issues" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Issues ({openIssues.length})
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Issues Tab */}
        <TabsContent value="issues" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="border-2 border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning-light">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{openIssues.filter((i) => i.status === "open").length}</p>
                  <p className="text-sm text-muted-foreground">Open</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{openIssues.filter((i) => i.status === "analyzed").length}</p>
                  <p className="text-sm text-muted-foreground">AI Analyzed</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-light">
                  <Loader2 className="h-5 w-5 text-indigo" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{openIssues.filter((i) => i.status === "in_progress").length}</p>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success-light">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{resolvedIssues.length}</p>
                  <p className="text-sm text-muted-foreground">Resolved</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Issues List */}
          <Card className="border-2 border-border/50">
            <CardHeader>
              <CardTitle>User Reported Issues</CardTitle>
              <CardDescription>Review, analyze with AI, and resolve issues</CardDescription>
            </CardHeader>
            <CardContent>
              {openIssues.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
                  <p className="text-muted-foreground">No open issues. Great job!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {openIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedIssue(issue);
                        setAdminNotes(issue.adminNotes || "");
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{issue.title}</h3>
                            <Badge variant={statusColors[issue.status]}>
                              {statusLabels[issue.status]}
                            </Badge>
                            <Badge variant={priorityColors[issue.priority]}>
                              {issue.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {issue.description.substring(0, 100)}...
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>By: {issue.userName}</span>
                            <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                            {issue.aiAnalysis && (
                              <span className="flex items-center gap-1 text-primary">
                                <Sparkles className="h-3 w-3" />
                                AI Analyzed
                              </span>
                            )}
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card className="border-2 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-[#25D366]" />
                WhatsApp Support Settings
              </CardTitle>
              <CardDescription>
                Configure the WhatsApp number and support information displayed to users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="whatsapp" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    WhatsApp Number
                  </Label>
                  <Input
                    id="whatsapp"
                    placeholder="+1234567890"
                    value={editSettings.whatsappNumber}
                    onChange={(e) =>
                      setEditSettings({ ...editSettings, whatsappNumber: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Include country code (e.g., +1 for USA)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Support Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="support@company.com"
                    value={editSettings.supportEmail}
                    onChange={(e) =>
                      setEditSettings({ ...editSettings, supportEmail: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="hours" className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Business Hours
                  </Label>
                  <Input
                    id="hours"
                    placeholder="Mon-Fri 9AM-6PM EST"
                    value={editSettings.businessHours}
                    onChange={(e) =>
                      setEditSettings({ ...editSettings, businessHours: e.target.value })
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button variant="gradient" onClick={handleSaveSettings}>
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Issue Detail Dialog */}
      <Dialog open={!!selectedIssue} onOpenChange={() => setSelectedIssue(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedIssue && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  {selectedIssue.title}
                </DialogTitle>
                <DialogDescription>
                  Reported by {selectedIssue.userName} ({selectedIssue.userEmail})
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Issue Info */}
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant={statusColors[selectedIssue.status]}>
                      {statusLabels[selectedIssue.status]}
                    </Badge>
                    <Badge variant={priorityColors[selectedIssue.priority]}>
                      {selectedIssue.priority} priority
                    </Badge>
                    <Badge variant="outline">{selectedIssue.category.replace("_", " ")}</Badge>
                  </div>
                  <p className="text-sm">{selectedIssue.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Submitted: {new Date(selectedIssue.createdAt).toLocaleString()}
                  </p>
                </div>

                {/* AI Analysis Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-primary" />
                      AI Analysis
                    </Label>
                    {!selectedIssue.aiAnalysis && (
                      <Button
                        size="sm"
                        variant="gradient"
                        onClick={() => handleAnalyzeWithAI(selectedIssue.id)}
                        disabled={isAnalyzing}
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Send to AI
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {selectedIssue.aiAnalysis ? (
                    <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          AI Diagnosis
                        </span>
                        <Badge variant="default">
                          {Math.round(selectedIssue.aiAnalysis.confidence * 100)}% confidence
                        </Badge>
                      </div>
                      <p className="text-sm mb-4">{selectedIssue.aiAnalysis.diagnosis}</p>
                      
                      <Label className="text-sm font-medium">Suggested Fix:</Label>
                      <pre className="text-sm mt-1 p-3 rounded bg-muted whitespace-pre-wrap">
                        {selectedIssue.aiAnalysis.suggestedFix}
                      </pre>
                      <p className="text-xs text-muted-foreground mt-2">
                        Analyzed: {new Date(selectedIssue.aiAnalysis.analyzedAt).toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg border border-dashed border-border text-center">
                      <Bot className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Click "Send to AI" to get AI-powered analysis and suggested fixes
                      </p>
                    </div>
                  )}
                </div>

                {/* Admin Notes */}
                <div className="space-y-2">
                  <Label>Admin Notes</Label>
                  <Textarea
                    placeholder="Add internal notes about this issue..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                  />
                  <Button size="sm" variant="outline" onClick={handleSaveNotes}>
                    Save Notes
                  </Button>
                </div>

                <Separator />

                {/* Resolution */}
                {selectedIssue.status !== "resolved" && (
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-success" />
                      Resolve & Notify User
                    </Label>
                    <Textarea
                      placeholder="Describe the resolution and any steps the user should take..."
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-3">
                      <Button
                        variant="gradient"
                        className="flex-1 gap-2"
                        onClick={handleResolve}
                      >
                        <CheckCircle className="h-4 w-4" />
                        Resolve & Send to User
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          updateIssue(selectedIssue.id, { status: "in_progress" })
                        }
                      >
                        Mark In Progress
                      </Button>
                    </div>
                  </div>
                )}

                {/* Already Resolved */}
                {selectedIssue.resolution && (
                  <div className="p-4 rounded-lg bg-success-light border border-success/30">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span className="font-medium text-success">Resolved</span>
                    </div>
                    <p className="text-sm">{selectedIssue.resolution.note}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      By {selectedIssue.resolution.resolvedBy} on{" "}
                      {new Date(selectedIssue.resolution.resolvedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
