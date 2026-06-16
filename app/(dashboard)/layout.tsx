import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
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
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-white px-4 py-6 hidden md:block">
        <Link href="/dashboard" className="flex items-center gap-2 px-2">
          <Mail className="h-6 w-6 text-blue-600" />
          <span className="text-xl font-bold">JowMail</span>
        </Link>

        <nav className="mt-8 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
          {session.user?.isSuperAdmin && (
            <Link
              href="/admin/organizations"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 mt-4 border-t border-slate-100 pt-4"
            >
              <Shield className="h-4 w-4" />
              Admin Panel
            </Link>
          )}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-white px-6">
          <h2 className="text-lg font-semibold">Dashboard</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 hidden sm:inline">
              {session.user?.email}
            </span>
            <Link
              href="/settings"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Settings
            </Link>
            <Link
              href="/api/auth/signout"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Sign out
            </Link>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
