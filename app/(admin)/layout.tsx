import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { Shield, Building2, Mail } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/auth/login");
  if (!session.user?.isSuperAdmin) redirect("/dashboard");

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-64 border-r bg-white px-4 py-6 hidden md:block">
        <Link href="/dashboard" className="flex items-center gap-2 px-2">
          <Mail className="h-6 w-6 text-blue-600" />
          <span className="text-xl font-bold">JowMail</span>
        </Link>
        <div className="mt-2 px-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
            <Shield className="h-3 w-3" /> Super Admin
          </span>
        </div>

        <nav className="mt-8 space-y-1">
          <Link
            href="/admin/organizations"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <Building2 className="h-4 w-4" />
            Organizations
          </Link>
        </nav>

        <div className="mt-8 border-t pt-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            ← Kembali ke App
          </Link>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-white px-6">
          <h2 className="text-lg font-semibold">Admin Panel</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 hidden sm:inline">
              {session.user?.email}
            </span>
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
