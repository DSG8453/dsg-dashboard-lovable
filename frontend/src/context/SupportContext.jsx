import { createContext, useContext, useState, useEffect } from "react";

const SupportContext = createContext(null);

const defaultSettings = {
  whatsappNumber: "+1234567890",
  supportEmail: "support@dsgtransport.com",
  businessHours: "Mon-Fri 9AM-6PM EST",
};

const initialIssues = [
  {
    id: 1,
    userId: 2,
    userName: "John Smith",
    userEmail: "john.smith@dsgtransport.com",
    title: "Cannot access Zoho Assist",
    description: "Getting 403 error when trying to launch Zoho Assist tool. Credentials are saved but launch fails.",
    status: "open",
    priority: "high",
    category: "tool_access",
    createdAt: "2025-12-20T10:30:00Z",
    aiAnalysis: null,
    adminNotes: "",
    resolution: null,
  },
  {
    id: 2,
    userId: 3,
    userName: "Sarah Johnson",
    userEmail: "sarah.johnson@dsgtransport.com",
    title: "Dashboard loading slowly",
    description: "The dashboard takes more than 10 seconds to load after login. Other pages work fine.",
    status: "in_progress",
    priority: "medium",
    category: "performance",
    createdAt: "2025-12-19T14:15:00Z",
    aiAnalysis: {
      diagnosis: "Performance issue likely caused by large number of tool cards rendering simultaneously.",
      suggestedFix: "Implement lazy loading for tool cards and add pagination for users with many tools.",
      confidence: 0.85,
      analyzedAt: "2025-12-19T14:20:00Z",
    },
    adminNotes: "Investigating performance optimizations",
    resolution: null,
  },
];

export const SupportProvider = ({ children }) => {
  const [settings, setSettings] = useState(defaultSettings);
  const [issues, setIssues] = useState(initialIssues);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedSettings = localStorage.getItem("dsg_support_settings");
    const savedIssues = localStorage.getItem("dsg_support_issues");
    
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
    if (savedIssues) {
      setIssues(JSON.parse(savedIssues));
    }
    setIsLoading(false);
  }, []);

  // Save settings
  const updateSettings = (newSettings) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem("dsg_support_settings", JSON.stringify(updated));
  };

  // Report new issue
  const reportIssue = (issue, user) => {
    const newIssue = {
      id: Date.now(),
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      ...issue,
      status: "open",
      createdAt: new Date().toISOString(),
      aiAnalysis: null,
      adminNotes: "",
      resolution: null,
    };
    
    const updated = [newIssue, ...issues];
    setIssues(updated);
    localStorage.setItem("dsg_support_issues", JSON.stringify(updated));
    return newIssue;
  };

  // Send to Emergent AI for analysis
  const analyzeWithAI = async (issueId) => {
    // Simulate AI analysis
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    const issue = issues.find((i) => i.id === issueId);
    if (!issue) return null;

    // Mock AI responses based on category
    const aiResponses = {
      tool_access: {
        diagnosis: `Access issue detected for ${issue.userName}. This could be caused by: 1) Expired credentials, 2) IP whitelist restrictions, 3) Tool-specific permission settings.`,
        suggestedFix: "1. Verify user's saved credentials are current\n2. Check if user's IP is whitelisted\n3. Confirm tool permissions in admin panel\n4. Clear browser cache and retry",
        confidence: 0.88,
      },
      performance: {
        diagnosis: "Performance degradation identified. Possible causes: Network latency, browser cache issues, or heavy DOM rendering.",
        suggestedFix: "1. Implement virtualized list rendering\n2. Add loading states for async operations\n3. Enable browser caching for static assets\n4. Consider pagination for large datasets",
        confidence: 0.82,
      },
      login: {
        diagnosis: "Authentication issue detected. Could be session expiration, SSO configuration, or credential mismatch.",
        suggestedFix: "1. Reset user's password\n2. Clear session storage\n3. Verify SSO provider connection\n4. Check for account lockout status",
        confidence: 0.90,
      },
      ui_bug: {
        diagnosis: "UI rendering issue reported. May be caused by CSS conflicts, JavaScript errors, or responsive design issues.",
        suggestedFix: "1. Check browser console for errors\n2. Test in different browsers\n3. Clear cache and hard refresh\n4. Review recent UI changes for conflicts",
        confidence: 0.75,
      },
      other: {
        diagnosis: "Issue requires manual investigation. Insufficient data for automated diagnosis.",
        suggestedFix: "1. Gather more details from user\n2. Check system logs\n3. Review recent changes\n4. Escalate to development team if needed",
        confidence: 0.60,
      },
    };

    const analysis = aiResponses[issue.category] || aiResponses.other;
    
    const aiAnalysis = {
      ...analysis,
      analyzedAt: new Date().toISOString(),
    };

    const updated = issues.map((i) =>
      i.id === issueId ? { ...i, aiAnalysis, status: "analyzed" } : i
    );
    setIssues(updated);
    localStorage.setItem("dsg_support_issues", JSON.stringify(updated));
    
    return aiAnalysis;
  };

  // Update issue
  const updateIssue = (issueId, updates) => {
    const updated = issues.map((i) =>
      i.id === issueId ? { ...i, ...updates } : i
    );
    setIssues(updated);
    localStorage.setItem("dsg_support_issues", JSON.stringify(updated));
  };

  // Resolve issue and notify user
  const resolveIssue = (issueId, resolution) => {
    const updated = issues.map((i) =>
      i.id === issueId
        ? {
            ...i,
            status: "resolved",
            resolution: {
              ...resolution,
              resolvedAt: new Date().toISOString(),
            },
          }
        : i
    );
    setIssues(updated);
    localStorage.setItem("dsg_support_issues", JSON.stringify(updated));
  };

  // Delete issue
  const deleteIssue = (issueId) => {
    const updated = issues.filter((i) => i.id !== issueId);
    setIssues(updated);
    localStorage.setItem("dsg_support_issues", JSON.stringify(updated));
  };

  // Get issues for a specific user
  const getUserIssues = (userId) => {
    return issues.filter((i) => i.userId === userId);
  };

  // Get WhatsApp link
  const getWhatsAppLink = (message = "") => {
    const phone = settings.whatsappNumber.replace(/[^0-9]/g, "");
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${phone}${message ? `?text=${encodedMessage}` : ""}`;
  };

  const value = {
    settings,
    issues,
    isLoading,
    updateSettings,
    reportIssue,
    analyzeWithAI,
    updateIssue,
    resolveIssue,
    deleteIssue,
    getUserIssues,
    getWhatsAppLink,
  };

  return <SupportContext.Provider value={value}>{children}</SupportContext.Provider>;
};

export const useSupport = () => {
  const context = useContext(SupportContext);
  if (!context) {
    throw new Error("useSupport must be used within a SupportProvider");
  }
  return context;
};
