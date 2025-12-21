import { useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

// Layout Components
import { Navbar } from "@/components/layout/Navbar";

// Page Components
import { DashboardPage } from "@/pages/DashboardPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { UsersPage } from "@/pages/UsersPage";
import { CredentialsPage } from "@/pages/CredentialsPage";
import { IPManagementPage } from "@/pages/IPManagementPage";
import { DevicesPage } from "@/pages/DevicesPage";
import { ActivityLogsPage } from "@/pages/ActivityLogsPage";

function App() {
  const [currentUser] = useState({
    name: "Admin User",
    email: "admin@dsgtransport.com",
    role: "Administrator",
    initials: "AU",
    joinedDate: "December 21, 2025",
  });

  return (
    <div className="min-h-screen bg-gradient-dsg">
      <BrowserRouter>
        <Navbar currentUser={currentUser} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Routes>
            <Route path="/" element={<DashboardPage currentUser={currentUser} />} />
            <Route path="/profile" element={<ProfilePage currentUser={currentUser} />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/credentials" element={<CredentialsPage />} />
            <Route path="/ip-management" element={<IPManagementPage />} />
            <Route path="/devices" element={<DevicesPage />} />
            <Route path="/activity-logs" element={<ActivityLogsPage />} />
          </Routes>
        </main>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </div>
  );
}

export default App;