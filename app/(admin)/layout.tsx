import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { Shield, Building2 } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/auth/login");
  if (!session.user?.isSuperAdmin) redirect("/dashboard");

  return (
    <DashboardShell
      navItems={[
        { href: "/admin/organizations", icon: Building2, label: "Organizations" },
      ]}
      headerTitle="Admin Panel"
      userEmail={session.user?.email}
      badge={
        <span className="inline-flex items-center gap-1 border-2 border-foreground bg-red px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-white">
          <Shield className="h-3 w-3" /> Super Admin
        </span>
      }
      footerNav={
        <a
          href="/dashboard"
          className="flex items-center gap-3 border-3 border-transparent px-3 py-2 text-sm font-black uppercase tracking-wide text-foreground hover:border-foreground hover:bg-card hover:shadow-brutal-xs"
        >
          ← Kembali ke App
        </a>
      }
    >
      {children}
    </DashboardShell>
  );
}
