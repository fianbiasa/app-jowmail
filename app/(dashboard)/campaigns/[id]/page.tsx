import Link from "next/link";
import { redirect, notFound } from "next/navigation";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { CampaignActions } from "./campaign-actions";
import { CampaignChart } from "./campaign-chart";

function getStatusColor(status: string) {
  switch (status) {
    case "queued":
      return "bg-slate-100 text-slate-700";
    case "sent":
      return "bg-blue-100 text-blue-700";
    case "delivered":
      return "bg-green-100 text-green-700";
    case "opened":
      return "bg-purple-100 text-purple-700";
    case "clicked":
      return "bg-indigo-100 text-indigo-700";
    case "bounced":
      return "bg-red-100 text-red-700";
    case "complained":
      return "bg-orange-100 text-orange-700";
    case "failed":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const organization = await getCurrentOrganization();

  if (!organization) {
    redirect("/");
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id, organizationId: organization.id },
    include: {
      list: { select: { name: true } },
      template: { select: { name: true } },
      logs: {
        include: {
          subscriber: { select: { email: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      },
    },
  });

  if (!campaign) {
    notFound();
  }

  const stats = {
    total: campaign.logs.length,
    sent: campaign.logs.filter((l) =>
      ["sent", "delivered", "opened", "clicked"].includes(l.status)
    ).length,
    delivered: campaign.logs.filter((l) =>
      ["delivered", "opened", "clicked"].includes(l.status)
    ).length,
    opened: campaign.logs.filter((l) =>
      ["opened", "clicked"].includes(l.status)
    ).length,
    clicked: campaign.logs.filter((l) => l.status === "clicked").length,
    bounced: campaign.logs.filter((l) => l.status === "bounced").length,
    failed: campaign.logs.filter((l) => l.status === "failed").length,
  };

  const openRate =
    stats.total > 0 ? ((stats.opened / stats.total) * 100).toFixed(1) : "0";
  const clickRate =
    stats.total > 0 ? ((stats.clicked / stats.total) * 100).toFixed(1) : "0";

  // Build daily chart data
  const dailyMap: Record<string, { date: string; opens: number; clicks: number }> = {};
  for (const log of campaign.logs) {
    if (log.openedAt) {
      const day = new Date(log.openedAt).toISOString().slice(0, 10);
      dailyMap[day] = dailyMap[day] || { date: day, opens: 0, clicks: 0 };
      dailyMap[day].opens += 1;
    }
    if (log.clickedAt) {
      const day = new Date(log.clickedAt).toISOString().slice(0, 10);
      dailyMap[day] = dailyMap[day] || { date: day, opens: 0, clicks: 0 };
      dailyMap[day].clicks += 1;
    }
  }
  const dailyStats = Object.values(dailyMap).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  // Top clicked links aggregation
  const clickedLogs = campaign.logs.filter((l) => l.status === "clicked" && l.metadata);
  const linkClickMap: Record<string, number> = {};
  for (const log of clickedLogs) {
    const url = (log.metadata as Record<string, string>)?.clickedUrl;
    if (url) {
      linkClickMap[url] = (linkClickMap[url] || 0) + 1;
    }
  }
  const topLinks = Object.entries(linkClickMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([url, clicks]) => ({ url, clicks }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/campaigns"
          className={buttonVariants({ variant: "outline", size: "icon" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
          <p className="text-slate-600">
            {campaign.list.name} · {campaign.template.name}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <CampaignActions campaign={campaign} />
        {["draft", "scheduled"].includes(campaign.status) && (
          <Link
            href={`/campaigns/${campaign.id}/edit`}
            className={buttonVariants({ variant: "outline" })}
          >
            Edit Campaign
          </Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Terkirim</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Dibuka</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.opened}</div>
            <p className="text-xs text-slate-500">{openRate}% open rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Diklik</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clicked}</div>
            <p className="text-xs text-slate-500">{clickRate}% click rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Bounced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.bounced}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Gagal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-500">{stats.failed}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aktivitas Harian</CardTitle>
          <CardDescription>Open & click per hari.</CardDescription>
        </CardHeader>
        <CardContent>
          <CampaignChart data={dailyStats} />
        </CardContent>
      </Card>

      {topLinks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Link Paling Banyak Diklik</CardTitle>
            <CardDescription>Top 10 link berdasarkan jumlah klik unik.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topLinks.map(({ url, clicks }, i) => (
                <div key={url} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-5 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline truncate block"
                    >
                      {url}
                    </a>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{clicks}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Detail Pengiriman</CardTitle>
          <CardDescription>
            Status pengiriman per subscriber.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Postal Message ID</TableHead>
                <TableHead>Sent At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaign.logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-500">
                    Campaign belum dikirim.
                  </TableCell>
                </TableRow>
              ) : (
                campaign.logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {log.subscriber.email}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {log.postalMessageId || "-"}
                    </TableCell>
                    <TableCell>
                      {log.sentAt
                        ? new Date(log.sentAt).toLocaleString("id-ID")
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
