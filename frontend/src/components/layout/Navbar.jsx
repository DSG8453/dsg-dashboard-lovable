import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";
import { useSupport } from "@/context/SupportContext";
import { devicesAPI } from "@/services/api";
import {
  LayoutDashboard,
  User,
  Users,
  Key,
  Globe,
  Smartphone,
  FileText,
  LogOut,
  Menu,
  ChevronDown,
  HeadphonesIcon,
  TicketIcon,
} from "lucide-react";

export const Navbar = ({ currentUser }) => {
  const { t, i18n } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingDevicesCount, setPendingDevicesCount] = useState(0);
  const { logout } = useAuth();
  const { issues } = useSupport();
  const navigate = useNavigate();

  // Role checks
  const isSuperAdmin = currentUser?.role === "Super Administrator";
  const isAdmin = currentUser?.role === "Administrator";
  const isUser = currentUser?.role === "User";
  
  // Count open issues for badge
  const userIssues = isSuperAdmin 
    ? issues 
    : issues.filter((i) => i.user_id === currentUser?.id);
  const openIssuesCount = userIssues.filter((i) => i.status !== "resolved").length;

  // Fetch pending devices count for Super Admin
  useEffect(() => {
    const fetchPendingDevices = async () => {
      if (isSuperAdmin) {
        try {
          const pending = await devicesAPI.getPending();
          setPendingDevicesCount(pending.length);
        } catch (error) {
          console.error("Failed to fetch pending devices:", error);
        }
      }
    };

    fetchPendingDevices();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingDevices, 30000);
    return () => clearInterval(interval);
  }, [isSuperAdmin]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  // Navigation items based on role
  const getNavigation = () => {
    // User only sees Dashboard
    if (isUser) {
      return [
        { id: "dashboard", name: t("nav.dashboard"), href: "/", icon: LayoutDashboard },
      ];
    }

    // Admin navigation (limited)
    if (!isSuperAdmin) {
      return [
        { id: "dashboard", name: t("nav.dashboard"), href: "/", icon: LayoutDashboard },
        { id: "profile", name: t("nav.profile"), href: "/profile", icon: User },
        { id: "users", name: t("nav.users"), href: "/users", icon: Users },
      ];
    }

    // Super Admin gets full navigation
    return [
      { id: "dashboard", name: t("nav.dashboard"), href: "/", icon: LayoutDashboard },
      { id: "profile", name: t("nav.profile"), href: "/profile", icon: User },
      { id: "users", name: t("nav.users"), href: "/users", icon: Users },
      { id: "credentials", name: t("nav.credentials"), href: "/credentials", icon: Key },
      { id: "ipManagement", name: t("nav.ipManagement"), href: "/ip-management", icon: Globe },
      { id: "devices", name: t("nav.devices"), href: "/devices", icon: Smartphone },
      { id: "activityLogs", name: t("nav.activityLogs"), href: "/activity-logs", icon: FileText },
    ];
  };

  const navigation = getNavigation();

  return (
    <nav className="sticky top-0 z-50 glass-card-strong shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/691ee53ded166d6334e8b9c6/0583cf617_315logodsg_.png"
              alt="DSG Transport LLC"
              className="h-10 w-auto"
            />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navigation.map((item) => (
              <NavLink key={item.id} to={item.href}>
                {({ isActive }) => (
                  <Button
                    variant={isActive ? "navActive" : "nav"}
                    size="sm"
                    className={`gap-2 ${item.id === "devices" ? "relative" : ""}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="hidden xl:inline">{item.name}</span>
                    {item.id === "devices" && pendingDevicesCount > 0 && (
                      <Badge 
                        variant="warning" 
                        className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-yellow-500 text-black pointer-events-none"
                      >
                        {pendingDevicesCount}
                      </Badge>
                    )}
                  </Button>
                )}
              </NavLink>
            ))}

            {/* Issues Button - For all users */}
            <NavLink to="/issues">
              {({ isActive }) => (
                <Button
                  variant={isActive ? "navActive" : "nav"}
                  size="sm"
                  className="gap-2 relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <TicketIcon className="h-4 w-4" />
                  <span className="hidden xl:inline">
                    {isSuperAdmin ? t("nav.allIssues") : t("nav.myIssues")}
                  </span>
                  {openIssuesCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs pointer-events-none"
                    >
                      {openIssuesCount}
                    </Badge>
                  )}
                </Button>
              )}
            </NavLink>

            {/* Super Admin-only Support Management */}
            {isSuperAdmin && (
              <NavLink to="/support">
                {({ isActive }) => (
                  <Button
                    variant={isActive ? "navActive" : "nav"}
                    size="sm"
                    className="gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <HeadphonesIcon className="h-4 w-4" />
                    <span className="hidden xl:inline">{t("nav.support")}</span>
                  </Button>
                )}
              </NavLink>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground text-sm font-semibold">
                      {currentUser?.initials || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-semibold text-foreground">
                      {currentUser?.name || t("user.defaultName")}
                    </p>
                    <p className="text-xs text-admin">{currentUser?.role || t("user.defaultRole")}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-semibold">{currentUser?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {currentUser?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Profile - Admin and Super Admin only */}
                {(isAdmin || isSuperAdmin) && (
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    {t("nav.profile")}
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuItem onClick={() => navigate("/issues")}>
                  <TicketIcon className="mr-2 h-4 w-4" />
                  {isSuperAdmin ? t("nav.allIssues") : t("nav.myIssues")}
                  {openIssuesCount > 0 && (
                    <Badge variant="destructive" className="ml-auto">
                      {openIssuesCount}
                    </Badge>
                  )}
                </DropdownMenuItem>
                
                {isSuperAdmin && (
                  <DropdownMenuItem onClick={() => navigate("/support")}>
                    <HeadphonesIcon className="mr-2 h-4 w-4" />
                    {t("nav.supportManagement")}
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuLabel>{t("nav.language")}</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => i18n.changeLanguage("en")}>
                  <span>{t("nav.english")}</span>
                  {i18n.resolvedLanguage?.startsWith("en") && <Badge className="ml-auto">EN</Badge>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => i18n.changeLanguage("es")}>
                  <span>{t("nav.spanish")}</span>
                  {i18n.resolvedLanguage?.startsWith("es") && <Badge className="ml-auto">ES</Badge>}
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("nav.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="flex flex-col gap-4 mt-8">
                  <div className="flex items-center gap-3 pb-4 border-b border-border">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
                        {currentUser?.initials || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{currentUser?.name}</p>
                      <p className="text-sm text-admin">{currentUser?.role}</p>
                    </div>
                  </div>

                  <nav className="flex flex-col gap-1">
                    {navigation.map((item) => (
                      <NavLink
                        key={item.id}
                        to={item.href}
                        onClick={() => setMobileOpen(false)}
                      >
                        {({ isActive }) => (
                          <Button
                            variant={isActive ? "navActive" : "nav"}
                            className="w-full justify-start gap-3"
                          >
                            <item.icon className="h-5 w-5" />
                            {item.name}
                            {item.id === "devices" && pendingDevicesCount > 0 && (
                              <Badge variant="warning" className="ml-auto bg-yellow-500 text-black">
                                {pendingDevicesCount}
                              </Badge>
                            )}
                          </Button>
                        )}
                      </NavLink>
                    ))}

                    {/* Issues - Mobile */}
                    <NavLink to="/issues" onClick={() => setMobileOpen(false)}>
                      {({ isActive }) => (
                        <Button
                          variant={isActive ? "navActive" : "nav"}
                          className="w-full justify-start gap-3"
                        >
                          <TicketIcon className="h-5 w-5" />
                          {isSuperAdmin ? t("nav.allIssues") : t("nav.myIssues")}
                          {openIssuesCount > 0 && (
                            <Badge variant="destructive" className="ml-auto">
                              {openIssuesCount}
                            </Badge>
                          )}
                        </Button>
                      )}
                    </NavLink>

                    {/* Super Admin Support - Mobile */}
                    {isSuperAdmin && (
                      <NavLink to="/support" onClick={() => setMobileOpen(false)}>
                        {({ isActive }) => (
                          <Button
                            variant={isActive ? "navActive" : "nav"}
                            className="w-full justify-start gap-3"
                          >
                            <HeadphonesIcon className="h-5 w-5" />
                            {t("nav.supportManagement")}
                          </Button>
                        )}
                      </NavLink>
                    )}
                  </nav>

                  <div className="pt-4 border-t border-border space-y-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("nav.language")}</p>
                    <div className="flex gap-2">
                      <Button
                        variant={i18n.resolvedLanguage?.startsWith("en") ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => i18n.changeLanguage("en")}
                      >
                        {t("nav.english")}
                      </Button>
                      <Button
                        variant={i18n.resolvedLanguage?.startsWith("es") ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => i18n.changeLanguage("es")}
                      >
                        {t("nav.spanish")}
                      </Button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <Button
                      variant="danger"
                      className="w-full justify-start gap-3"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-5 w-5" />
                      {t("nav.logout")}
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};
