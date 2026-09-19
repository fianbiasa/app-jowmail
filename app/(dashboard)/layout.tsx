import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import {
  LayoutDashboard,
  Mail,
  Users,
  List,
  FileText,
  Settings,
  Shield,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/campaigns", icon: Mail, label: "Campaigns" },
  { href: "/lists", icon: List, label: "Lists" },
  { href: "/subscribers", icon: Users, label: "Subscribers" },
  { href: "/templates", icon: FileText, label: "Templates" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  return (
    <DashboardShell
      navItems={navItems}
      headerTitle="Dashboard"
      userEmail={session.user?.email}
      footerNav={
        session.user?.isSuperAdmin ? (
          <Link
            href="/admin/organizations"
            className="flex items-center gap-3 border-3 border-transparent px-3 py-2 text-sm font-black uppercase tracking-wide text-red hover:border-foreground hover:bg-card hover:shadow-brutal-xs"
          >
            <Shield className="h-4 w-4" />
            Admin Panel
          </Link>
        ) : undefined
      }
    >
      {children}
    </DashboardShell>
  );
}
