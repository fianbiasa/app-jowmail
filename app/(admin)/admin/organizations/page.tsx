import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatQuota } from "@/lib/plans";
import { OrgEditDialog } from "./org-edit-dialog";

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
        <h1 className="text-2xl font-bold tracking-tight">Organizations</h1>
        <p className="text-slate-500 text-sm mt-1">Kelola plan dan quota semua organisasi.</p>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide border-b">
            <tr>
              <th className="px-5 py-3 text-left">Organisasi</th>
              <th className="px-5 py-3 text-left">Plan</th>
              <th className="px-5 py-3 text-right">Subscribers</th>
              <th className="px-5 py-3 text-right">Quota Sub.</th>
              <th className="px-5 py-3 text-right">Email/Bulan</th>
              <th className="px-5 py-3 text-right">Terkirim</th>
              <th className="px-5 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orgs.map((org) => (
              <tr key={org.id} className="hover:bg-slate-50">
                <td className="px-5 py-3">
                  <div className="font-medium text-slate-800">{org.name}</div>
                  <div className="text-xs text-slate-400">{org.slug}</div>
                </td>
                <td className="px-5 py-3">
                  <PlanBadge plan={org.plan} />
                </td>
                <td className="px-5 py-3 text-right text-slate-700">
                  {(subCountByOrg[org.id] ?? 0).toLocaleString("id-ID")}
                </td>
                <td className="px-5 py-3 text-right">
                  <span className={org.quotaSubscribers === -1 ? "text-emerald-600 font-medium" : "text-slate-700"}>
                    {formatQuota(org.quotaSubscribers)}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className={org.quotaEmailsPerMonth === -1 ? "text-emerald-600 font-medium" : "text-slate-700"}>
                    {formatQuota(org.quotaEmailsPerMonth)}
                  </span>
                </td>
                <td className="px-5 py-3 text-right text-slate-700">
                  {org.emailsSentThisMonth.toLocaleString("id-ID")}
                </td>
                <td className="px-5 py-3 text-center">
                  <OrgEditDialog
                    org={{
                      id: org.id,
                      name: org.name,
                      plan: org.plan,
                      quotaSubscribers: org.quotaSubscribers,
                      quotaEmailsPerMonth: org.quotaEmailsPerMonth,
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    free: "bg-slate-100 text-slate-600",
    starter: "bg-blue-100 text-blue-700",
    pro: "bg-indigo-100 text-indigo-700",
    unlimited: "bg-emerald-100 text-emerald-700",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${colors[plan] ?? "bg-slate-100 text-slate-600"}`}>
      {plan}
    </span>
  );
}
