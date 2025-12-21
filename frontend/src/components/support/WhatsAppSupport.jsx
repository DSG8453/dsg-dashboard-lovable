import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSupport } from "@/context/SupportContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { MessageCircle, Send, X, HelpCircle, AlertTriangle } from "lucide-react";

const categories = [
  { value: "tool_access", label: "Tool Access Issue" },
  { value: "login", label: "Login / Authentication" },
  { value: "performance", label: "Performance / Speed" },
  { value: "ui_bug", label: "UI / Display Bug" },
  { value: "other", label: "Other" },
];

const priorities = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High - Urgent" },
];

export const WhatsAppSupport = () => {
  const { settings, getWhatsAppLink, reportIssue } = useSupport();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportData, setReportData] = useState({
    title: "",
    description: "",
    category: "",
    priority: "medium",
  });

  const handleWhatsAppClick = () => {
    const message = `Hi, I'm ${user?.name || "a user"} from DSG Transport LLC portal. I need assistance with:`;
    window.open(getWhatsAppLink(message), "_blank");
  };

  const handleReportSubmit = () => {
    if (!reportData.title || !reportData.description || !reportData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    reportIssue(reportData, user);
    toast.success("Issue reported successfully!", {
      description: "Our team will review and respond shortly.",
    });
    setReportData({ title: "", description: "", category: "", priority: "medium" });
    setIsReportOpen(false);
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating WhatsApp Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setIsOpen(true)}
                className="h-14 w-14 rounded-full shadow-lg bg-[#25D366] hover:bg-[#128C7E] text-white"
                size="icon"
              >
                <MessageCircle className="h-7 w-7" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Need Help? Contact Support</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Support Options Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              How can we help?
            </DialogTitle>
            <DialogDescription>
              Choose how you'd like to get support
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {/* WhatsApp Quick Chat */}
            <Button
              variant="outline"
              className="w-full h-auto py-4 justify-start gap-4 hover:bg-[#25D366]/10 hover:border-[#25D366]"
              onClick={handleWhatsAppClick}
            >
              <div className="p-2 rounded-full bg-[#25D366]">
                <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="font-semibold">WhatsApp Quick Chat</p>
                <p className="text-sm text-muted-foreground">Chat with IT support instantly</p>
              </div>
            </Button>

            {/* Report Issue */}
            <Button
              variant="outline"
              className="w-full h-auto py-4 justify-start gap-4 hover:bg-primary/10 hover:border-primary"
              onClick={() => setIsReportOpen(true)}
            >
              <div className="p-2 rounded-full bg-primary">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold">Report an Issue</p>
                <p className="text-sm text-muted-foreground">Submit a detailed problem report</p>
              </div>
            </Button>

            {/* Contact Info */}
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-2">Support Hours</p>
              <p className="text-sm font-medium">{settings.businessHours}</p>
              <p className="text-sm text-muted-foreground mt-2">
                WhatsApp: {settings.whatsappNumber}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Issue Dialog */}
      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Report an Issue
            </DialogTitle>
            <DialogDescription>
              Describe the problem you're experiencing. Our team and AI assistant will analyze it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Issue Title *</Label>
              <Input
                id="title"
                placeholder="Brief description of the problem"
                value={reportData.title}
                onChange={(e) => setReportData({ ...reportData, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={reportData.category}
                  onValueChange={(value) => setReportData({ ...reportData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={reportData.priority}
                  onValueChange={(value) => setReportData({ ...reportData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Detailed Description *</Label>
              <Textarea
                id="description"
                placeholder="Please describe the issue in detail. Include steps to reproduce, error messages, etc."
                rows={4}
                value={reportData.description}
                onChange={(e) => setReportData({ ...reportData, description: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsReportOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="gradient"
                className="flex-1 gap-2"
                onClick={handleReportSubmit}
              >
                <Send className="h-4 w-4" />
                Submit Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
