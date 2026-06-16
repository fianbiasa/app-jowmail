import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mail, Users, List, FileText, Send, MousePointerClick, Eye } from "lucide-react";
import { OverviewChart } from "./overview-chart";

export default async function DashboardPage() {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/auth/login");

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [campaigns, subscribers, lists, templates, totalStats, dailyRaw] =
    await Promise.all([
      prisma.campaign.count({ where: { organizationId: organization.id } }),
      prisma.subscriber.count({
        where: { list: { organizationId: organization.id } },
      }),
      prisma.subscriberList.count({
        where: { organizationId: organization.id },
      }),
      prisma.template.count({ where: { organizationId: organization.id } }),
      // Aggregate totals across all campaigns
      prisma.campaignLog.groupBy({
        by: ["status"],
        where: { campaign: { organizationId: organization.id } },
        _count: { id: true },
      }),
      // Daily sent/opened/clicked for last 30 days (raw SQL for date grouping)
      prisma.$queryRaw<
        { date: Date; sent: bigint; opened: bigint; clicked: bigint }[]
      >`
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
    ]);

  // Aggregate counts by status
  const statMap = Object.fromEntries(
    totalStats.map((s) => [s.status, s._count.id])
  );
  const totalSent = (statMap["sent"] ?? 0) + (statMap["delivered"] ?? 0) +
    (statMap["opened"] ?? 0) + (statMap["clicked"] ?? 0);
  const totalOpened = (statMap["opened"] ?? 0) + (statMap["clicked"] ?? 0);
  const totalClicked = statMap["clicked"] ?? 0;

  // Format daily data for chart
  const chartData = dailyRaw.map((row) => ({
    date: row.date.toISOString().slice(0, 10),
    Terkirim: Number(row.sent),
    Dibuka: Number(row.opened),
    Diklik: Number(row.clicked),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Selamat datang di JowMail
        </h1>
        <p className="text-slate-600">
          Kelola campaign email, subscriber, dan template dari satu dashboard.
        </p>
      </div>

      {/* Count cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Campaigns</CardTitle>
            <Mail className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns}</div>
            <p className="text-xs text-slate-500">Total campaign</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
            <Users className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscribers}</div>
            <p className="text-xs text-slate-500">Total subscriber</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Lists</CardTitle>
            <List className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lists}</div>
            <p className="text-xs text-slate-500">Total list</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Templates</CardTitle>
            <FileText className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates}</div>
            <p className="text-xs text-slate-500">Total template</p>
          </CardContent>
        </Card>
      </div>

      {/* Email activity stat cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Terkirim</CardTitle>
            <Send className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSent.toLocaleString()}</div>
            <p className="text-xs text-slate-500">Semua campaign</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Dibuka</CardTitle>
            <Eye className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOpened.toLocaleString()}</div>
            <p className="text-xs text-slate-500">
              {totalSent > 0
                ? `${((totalOpened / totalSent) * 100).toFixed(1)}% open rate`
                : "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Diklik</CardTitle>
            <MousePointerClick className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClicked.toLocaleString()}</div>
            <p className="text-xs text-slate-500">
              {totalSent > 0
                ? `${((totalClicked / totalSent) * 100).toFixed(1)}% click rate`
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Overview chart */}
      <Card>
        <CardHeader>
          <CardTitle>Aktivitas Email — 30 Hari Terakhir</CardTitle>
          <CardDescription>
            Grafik pengiriman, pembukaan, dan klik lintas semua campaign.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OverviewChart data={chartData} />
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mulai Campaign</CardTitle>
            <CardDescription>
              Buat campaign email baru dan kirim ke subscriber list.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/campaigns/new" className={buttonVariants()}>
              Buat Campaign
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Konfigurasi Postal</CardTitle>
            <CardDescription>
              Hubungkan organisasi dengan Postal Mail Server.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/settings"
              className={buttonVariants({ variant: "outline" })}
            >
              Buka Settings
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
