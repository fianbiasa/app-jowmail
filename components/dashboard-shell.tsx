import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

type NavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
};

export function DashboardShell({
  navItems,
  headerTitle,
  userEmail,
  badge,
  footerNav,
  children,
}: {
  navItems: NavItem[];
  headerTitle: string;
  userEmail?: string | null;
  badge?: React.ReactNode;
  footerNav?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 border-r-4 border-foreground bg-card px-4 py-6 md:block">
        <Link href="/dashboard" className="flex items-center gap-2 px-2">
          <span className="inline-block -rotate-2 border-3 border-foreground bg-foreground px-3 py-1.5 font-heading text-lg text-yellow shadow-brutal-xs">
            JOWMAIL!
          </span>
        </Link>
        {badge && <div className="mt-3 px-2">{badge}</div>}

        <nav className="mt-8 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 border-3 border-transparent px-3 py-2 text-sm font-black uppercase tracking-wide text-foreground transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-foreground hover:bg-card hover:shadow-brutal-xs"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        {footerNav && (
          <div className="mt-8 border-t-3 border-foreground pt-4">
            {footerNav}
          </div>
        )}
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b-4 border-foreground bg-card px-6">
          <h2 className="font-heading text-lg uppercase tracking-tight">
            {headerTitle}
          </h2>
          <div className="flex items-center gap-3">
            {userEmail && (
              <span className="hidden text-sm font-bold sm:inline">
                {userEmail}
              </span>
            )}
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
