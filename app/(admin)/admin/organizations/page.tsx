import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatQuota } from "@/lib/plans";
import { OrgEditDialog } from "./org-edit-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";

export default async function AdminOrganizationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuperAdmin) redirect("/dashboard");

  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { members: true, campaigns: true } },
    },
  });

  const subscriberCounts = await prisma.subscriber.groupBy({
    by: ["listId"],
    where: { list: { organizationId: { in: orgs.map((o) => o.id) } } },
    _count: true,
  });

  const listOrgs = await prisma.subscriberList.findMany({
    where: { organizationId: { in: orgs.map((o) => o.id) } },
    select: { id: true, organizationId: true },
  });

  const subCountByOrg: Record<string, number> = {};
  for (const { id, organizationId } of listOrgs) {
    const count = subscriberCounts.find((s) => s.listId === id)?._count ?? 0;
    subCountByOrg[organizationId] = (subCountByOrg[organizationId] ?? 0) + count;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Organizations</h1>
        <p className="text-muted-foreground text-sm mt-1">Kelola plan dan quota semua organisasi.</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Organisasi</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead className="text-right">Subscribers</TableHead>
            <TableHead className="text-right">Quota Sub.</TableHead>
            <TableHead className="text-right">Email/Bulan</TableHead>
            <TableHead className="text-right">Terkirim</TableHead>
            <TableHead className="text-center">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orgs.map((org) => (
            <TableRow key={org.id}>
              <TableCell>
                <div className="font-bold">{org.name}</div>
                <div className="text-xs text-muted-foreground">{org.slug}</div>
              </TableCell>
              <TableCell>
                <PlanBadge plan={org.plan} />
              </TableCell>
              <TableCell className="text-right">
                {(subCountByOrg[org.id] ?? 0).toLocaleString("id-ID")}
              </TableCell>
              <TableCell className="text-right">
                <span className={org.quotaSubscribers === -1 ? "text-lime font-black" : ""}>
                  {formatQuota(org.quotaSubscribers)}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <span className={org.quotaEmailsPerMonth === -1 ? "text-lime font-black" : ""}>
                  {formatQuota(org.quotaEmailsPerMonth)}
                </span>
              </TableCell>
              <TableCell className="text-right">
                {org.emailsSentThisMonth.toLocaleString("id-ID")}
              </TableCell>
              <TableCell className="text-center">
                <OrgEditDialog
                  org={{
                    id: org.id,
                    name: org.name,
                    plan: org.plan,
                    quotaSubscribers: org.quotaSubscribers,
                    quotaEmailsPerMonth: org.quotaEmailsPerMonth,
                  }}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const variants: Record<string, VariantProps<typeof badgeVariants>["variant"]> = {
    free: "neutral",
    starter: "cyan",
    pro: "purple",
    unlimited: "lime",
  };
  return (
    <Badge variant={variants[plan] ?? "neutral"}>
      {plan}
    </Badge>
  );
}
