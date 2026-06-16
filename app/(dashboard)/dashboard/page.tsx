import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Mail, Users, LayoutList, FileText,
  Send, MousePointerClick, Eye, TrendingUp, Plus, ArrowRight,
} from "lucide-react";
import { OverviewChart } from "../overview-chart";

export default async function DashboardPage() {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/auth/login");

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [campaigns, subscribers, lists, templates, totalStats, dailyRaw, recentCampaigns] =
    await Promise.all([
      prisma.campaign.count({ where: { organizationId: organization.id } }),
      prisma.subscriber.count({ where: { list: { organizationId: organization.id } } }),
      prisma.subscriberList.count({ where: { organizationId: organization.id } }),
      prisma.template.count({ where: { organizationId: organization.id } }),
      prisma.campaignLog.groupBy({
        by: ["status"],
        where: { campaign: { organizationId: organization.id } },
        _count: { id: true },
      }),
      prisma.$queryRaw<{ date: Date; sent: bigint; opened: bigint; clicked: bigint }[]>`
        SELECT
          DATE(cl."sentAt") as date,
          COUNT(*) FILTER (WHERE cl.status NOT IN ('queued','failed')) as sent,
          COUNT(*) FILTER (WHERE cl.status IN ('opened','clicked')) as opened,
          COUNT(*) FILTER (WHERE cl.status = 'clicked') as clicked
        FROM "CampaignLog" cl
        JOIN "Campaign" c ON c.id = cl."campaignId"
        WHERE c."organizationId" = ${organization.id}
          AND cl."sentAt" >= ${thirtyDaysAgo}
        GROUP BY DATE(cl."sentAt")
        ORDER BY DATE(cl."sentAt")
      `,
      prisma.campaign.findMany({
        where: { organizationId: organization.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true, name: true, status: true, createdAt: true,
          _count: { select: { logs: true } },
        },
      }),
    ]);

  const statMap = Object.fromEntries(totalStats.map((s) => [s.status, s._count.id]));
  const totalSent =
    (statMap["sent"] ?? 0) + (statMap["delivered"] ?? 0) +
    (statMap["opened"] ?? 0) + (statMap["clicked"] ?? 0);
  const totalOpened = (statMap["opened"] ?? 0) + (statMap["clicked"] ?? 0);
  const totalClicked = statMap["clicked"] ?? 0;
  const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : "0";
  const clickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : "0";

  const chartData = dailyRaw.map((r) => ({
    date: r.date.toISOString().slice(0, 10),
    Terkirim: Number(r.sent),
    Dibuka: Number(r.opened),
    Diklik: Number(r.clicked),
  }));

  const statusConfig: Record<string, { label: string; cls: string }> = {
    draft:     { label: "Draft",     cls: "bg-slate-100 text-slate-600" },
    scheduled: { label: "Scheduled", cls: "bg-blue-100 text-blue-700" },
    queued:    { label: "Queued",    cls: "bg-yellow-100 text-yellow-700" },
    sending:   { label: "Sending",   cls: "bg-indigo-100 text-indigo-700" },
    sent:      { label: "Sent",      cls: "bg-green-100 text-green-700" },
    failed:    { label: "Failed",    cls: "bg-red-100 text-red-700" },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Selamat datang kembali, <span className="font-medium">{organization.name}</span>
          </p>
        </div>
        <Link href="/campaigns/new" className={buttonVariants({ size: "sm" }) + " gap-1.5"}>
          <Plus className="h-4 w-4" />
          Campaign Baru
        </Link>
      </div>

      {/* Resource counts */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Campaigns", value: campaigns, icon: Mail, href: "/campaigns", color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Subscribers", value: subscribers.toLocaleString(), icon: Users, href: "/subscribers", color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Lists", value: lists, icon: LayoutList, href: "/lists", color: "text-sky-600", bg: "bg-sky-50" },
          { label: "Templates", value: templates, icon: FileText, href: "/templates", color: "text-violet-600", bg: "bg-violet-50" },
        ].map((item) => (
          <Link key={item.label} href={item.href} className="block group">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{item.label}</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{item.value}</p>
                  </div>
                  <div className={`${item.bg} ${item.color} rounded-xl p-2.5`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Email performance */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-0 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 opacity-80">
              <Send className="h-4 w-4" />
              <span className="text-sm font-medium">Total Terkirim</span>
            </div>
            <p className="text-4xl font-bold mt-2">{totalSent.toLocaleString()}</p>
            <p className="text-xs opacity-70 mt-1">semua campaign</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 opacity-80">
              <Eye className="h-4 w-4" />
              <span className="text-sm font-medium">Total Dibuka</span>
            </div>
            <p className="text-4xl font-bold mt-2">{totalOpened.toLocaleString()}</p>
            <p className="text-xs opacity-70 mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> {openRate}% open rate
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 opacity-80">
              <MousePointerClick className="h-4 w-4" />
              <span className="text-sm font-medium">Total Diklik</span>
            </div>
            <p className="text-4xl font-bold mt-2">{totalClicked.toLocaleString()}</p>
            <p className="text-xs opacity-70 mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> {clickRate}% click rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Aktivitas Email — 30 Hari Terakhir</CardTitle>
        </CardHeader>
        <CardContent>
          <OverviewChart data={chartData} />
        </CardContent>
      </Card>

      {/* Recent campaigns */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Campaign Terbaru</CardTitle>
          <Link href="/campaigns" className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
            Lihat semua <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="pt-0">
          {recentCampaigns.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              Belum ada campaign.{" "}
              <Link href="/campaigns/new" className="text-indigo-600 hover:underline">Buat sekarang →</Link>
            </div>
          ) : (
            <div className="divide-y">
              {recentCampaigns.map((c) => {
                const s = statusConfig[c.status] ?? { label: c.status, cls: "bg-slate-100 text-slate-600" };
                return (
                  <Link key={c.id} href={`/campaigns/${c.id}`} className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{c.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(c.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        {" · "}{c._count.logs} penerima
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ml-3 shrink-0 ${s.cls}`}>
                      {s.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
