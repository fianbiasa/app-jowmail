import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";
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

  const statusConfig: Record<string, { label: string; variant: VariantProps<typeof badgeVariants>["variant"] }> = {
    draft:     { label: "Draft",     variant: "neutral" },
    scheduled: { label: "Scheduled", variant: "cyan" },
    queued:    { label: "Queued",    variant: "yellow" },
    sending:   { label: "Sending",   variant: "purple" },
    sent:      { label: "Sent",      variant: "lime" },
    failed:    { label: "Failed",    variant: "red" },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Selamat datang kembali, <span className="font-bold">{organization.name}</span>
          </p>
        </div>
        <Link href="/campaigns/new" className={buttonVariants({ size: "sm" }) + " gap-1.5"}>
          <Plus className="h-4 w-4" />
          Campaign Baru
        </Link>
      </div>

      {/* Resource counts */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Campaigns", value: campaigns, icon: Mail, href: "/campaigns", bg: "bg-yellow" },
          { label: "Subscribers", value: subscribers.toLocaleString(), icon: Users, href: "/subscribers", bg: "bg-pink" },
          { label: "Lists", value: lists, icon: LayoutList, href: "/lists", bg: "bg-cyan" },
          { label: "Templates", value: templates, icon: FileText, href: "/templates", bg: "bg-lime" },
        ].map((item) => (
          <Link key={item.label} href={item.href} className="block">
            <Card>
              <CardContent className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">{item.label}</p>
                  <p className="text-3xl font-black tracking-tight mt-1">{item.value}</p>
                </div>
                <div className={`${item.bg} flex size-11 items-center justify-center border-3 border-foreground`}>
                  <item.icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Email performance */}
      <div className="grid gap-5 sm:grid-cols-3">
        <Card className="bg-purple text-white">
          <CardContent>
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              <span className="text-sm font-bold uppercase tracking-wide">Total Terkirim</span>
            </div>
            <p className="text-4xl font-black mt-2">{totalSent.toLocaleString()}</p>
            <p className="text-xs mt-1 font-bold">semua campaign</p>
          </CardContent>
        </Card>
        <Card className="bg-orange text-white">
          <CardContent>
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span className="text-sm font-bold uppercase tracking-wide">Total Dibuka</span>
            </div>
            <p className="text-4xl font-black mt-2">{totalOpened.toLocaleString()}</p>
            <p className="text-xs mt-1 font-bold flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> {openRate}% open rate
            </p>
          </CardContent>
        </Card>
        <Card className="bg-lime text-foreground">
          <CardContent>
            <div className="flex items-center gap-2">
              <MousePointerClick className="h-4 w-4" />
              <span className="text-sm font-bold uppercase tracking-wide">Total Diklik</span>
            </div>
            <p className="text-4xl font-black mt-2">{totalClicked.toLocaleString()}</p>
            <p className="text-xs mt-1 font-bold flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> {clickRate}% click rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Aktivitas Email — 30 Hari Terakhir</CardTitle>
        </CardHeader>
        <CardContent>
          <OverviewChart data={chartData} />
        </CardContent>
      </Card>

      {/* Recent campaigns */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Campaign Terbaru</CardTitle>
          <Link href="/campaigns" className="text-sm font-bold uppercase hover:underline flex items-center gap-1">
            Lihat semua <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          {recentCampaigns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Belum ada campaign.{" "}
              <Link href="/campaigns/new" className="font-bold hover:underline">Buat sekarang →</Link>
            </div>
          ) : (
            <div>
              {recentCampaigns.map((c) => {
                const s = statusConfig[c.status] ?? { label: c.status, variant: "neutral" as const };
                return (
                  <Link key={c.id} href={`/campaigns/${c.id}`} className="flex items-center justify-between py-3 border-b-2 border-dashed border-foreground/20 last:border-b-0 hover:bg-accent/25 -mx-2 px-2 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(c.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        {" · "}{c._count.logs} penerima
                      </p>
                    </div>
                    <Badge variant={s.variant} className="ml-3 shrink-0">
                      {s.label}
                    </Badge>
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
