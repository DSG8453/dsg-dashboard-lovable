import { HeaderCard } from "@/components/dashboard/HeaderCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { ToolCard } from "@/components/dashboard/ToolCard";
import {
  Wrench,
  Users,
  Activity,
  Shield,
  Monitor,
  Package,
  FileCheck,
  Cloud,
  Truck,
  Database,
} from "lucide-react";

const stats = [
  { value: "8", label: "Active Tools", variant: "blue", icon: Wrench },
  { value: "12", label: "Total Users", variant: "indigo", icon: Users },
  { value: "Operational", label: "System Status", variant: "green", icon: Activity },
];

const tools = [
  {
    id: 1,
    name: "Bitwarden",
    category: "Security",
    description: "Password manager for secure credential storage and sharing across the team.",
    icon: Shield,
    url: "https://vault.bitwarden.com",
  },
  {
    id: 2,
    name: "Zoho Assist",
    category: "Support",
    description: "Remote desktop support and control panel for IT assistance and troubleshooting.",
    icon: Monitor,
    url: "https://assist.zoho.com",
  },
  {
    id: 3,
    name: "Ascend TMS",
    category: "TMS",
    description: "Transportation management system for fleet operations and logistics tracking.",
    icon: Truck,
    url: "#",
  },
  {
    id: 4,
    name: "RMIS",
    category: "Compliance",
    description: "Risk management and compliance tracking system for regulatory requirements.",
    icon: FileCheck,
    url: "#",
  },
  {
    id: 5,
    name: "DAT Load Board",
    category: "Freight",
    description: "Load board platform for finding and posting freight opportunities.",
    icon: Package,
    url: "#",
  },
  {
    id: 6,
    name: "Truckstop",
    category: "Freight",
    description: "Freight matching and load board services for trucking companies.",
    icon: Cloud,
    url: "#",
  },
  {
    id: 7,
    name: "Fleet Maintenance",
    category: "Operations",
    description: "Vehicle maintenance tracking and scheduling system for fleet management.",
    icon: Wrench,
    url: "#",
  },
  {
    id: 8,
    name: "Fuel Cards Portal",
    category: "Finance",
    description: "Fuel card management and expense tracking for fleet operations.",
    icon: Database,
    url: "#",
  },
];

export const DashboardPage = ({ currentUser }) => {
  return (
    <div className="animate-fade-in">
      <HeaderCard currentUser={currentUser} />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 stagger-children">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Tools Section */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground mb-6">All Company Tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 stagger-children">
          {tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </div>
    </div>
  );
};