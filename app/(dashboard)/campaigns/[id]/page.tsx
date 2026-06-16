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
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { CampaignActions } from "./campaign-actions";
import { CampaignChart } from "./campaign-chart";
import { Suspense } from "react";

const PAGE_SIZE = 50;

function getStatusColor(status: string) {
  switch (status) {
    case "queued":     return "bg-slate-100 text-slate-700";
    case "sent":       return "bg-blue-100 text-blue-700";
    case "delivered":  return "bg-green-100 text-green-700";
    case "opened":     return "bg-purple-100 text-purple-700";
    case "clicked":    return "bg-indigo-100 text-indigo-700";
    case "bounced":    return "bg-red-100 text-red-700";
    case "complained": return "bg-orange-100 text-orange-700";
    case "failed":     return "bg-red-100 text-red-700";
    default:           return "bg-slate-100 text-slate-700";
  }
}

export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const { id } = await params;
  const { page: pageStr = "1", search = "" } = await searchParams;
  const page = Math.max(1, parseInt(pageStr) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const organization = await getCurrentOrganization();
  if (!organization) redirect("/");

  const campaign = await prisma.campaign.findFirst({
    where: { id, organizationId: organization.id },
    include: {
      list: { select: { name: true } },
      template: { select: { name: true } },
    },
  });
  if (!campaign) notFound();

  // Stats via count queries — never limited by take
  const [total, sent, opened, clicked, bounced, failed] = await Promise.all([
    prisma.campaignLog.count({ where: { campaignId: id } }),
    prisma.campaignLog.count({ where: { campaignId: id, status: { in: ["sent", "delivered", "opened", "clicked"] } } }),
    prisma.campaignLog.count({ where: { campaignId: id, status: { in: ["opened", "clicked"] } } }),
    prisma.campaignLog.count({ where: { campaignId: id, status: "clicked" } }),
    prisma.campaignLog.count({ where: { campaignId: id, status: "bounced" } }),
    prisma.campaignLog.count({ where: { campaignId: id, status: "failed" } }),
  ]);

  const openRate  = total > 0 ? ((opened  / total) * 100).toFixed(1) : "0";
  const clickRate = total > 0 ? ((clicked / total) * 100).toFixed(1) : "0";

  // Daily chart via raw SQL
  type DayRow = { date: Date; opens: bigint; clicks: bigint };
  const dailyRaw = await prisma.$queryRaw<DayRow[]>`
    SELECT
      COALESCE(o.day, c.day) as date,
      COALESCE(o.cnt, 0)     as opens,
      COALESCE(c.cnt, 0)     as clicks
    FROM (
      SELECT DATE("openedAt") as day, COUNT(*)::bigint as cnt
      FROM "CampaignLog"
      WHERE "campaignId" = ${id} AND "openedAt" IS NOT NULL
      GROUP BY DATE("openedAt")
    ) o
    FULL OUTER JOIN (
      SELECT DATE("clickedAt") as day, COUNT(*)::bigint as cnt
      FROM "CampaignLog"
      WHERE "campaignId" = ${id} AND "clickedAt" IS NOT NULL
      GROUP BY DATE("clickedAt")
    ) c ON o.day = c.day
    ORDER BY date
  `;
  const dailyStats = dailyRaw.map((r) => ({
    date: r.date.toISOString().slice(0, 10),
    opens: Number(r.opens),
    clicks: Number(r.clicks),
  }));

  // Top clicked links via raw SQL on JSON metadata
  type LinkRow = { url: string; clicks: bigint };
  const topLinksRaw = await prisma.$queryRaw<LinkRow[]>`
    SELECT metadata->>'clickedUrl' as url, COUNT(*)::bigint as clicks
    FROM "CampaignLog"
    WHERE "campaignId" = ${id}
      AND status = 'clicked'
      AND metadata->>'clickedUrl' IS NOT NULL
    GROUP BY metadata->>'clickedUrl'
    ORDER BY clicks DESC
    LIMIT 10
  `;
  const topLinks = topLinksRaw.map((r) => ({ url: r.url, clicks: Number(r.clicks) }));

  // Paginated detail table
  const logWhere = {
    campaignId: id,
    ...(search
      ? { subscriber: { email: { contains: search, mode: "insensitive" as const } } }
      : {}),
  };
  const [logs, logTotal] = await Promise.all([
    prisma.campaignLog.findMany({
      where: logWhere,
      include: { subscriber: { select: { email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.campaignLog.count({ where: logWhere }),
  ]);
  const totalPages = Math.ceil(logTotal / PAGE_SIZE);

  const buildUrl = (p: number) => {
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    if (p > 1) q.set("page", String(p));
    return `/campaigns/${id}${q.toString() ? `?${q}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/campaigns" className={buttonVariants({ variant: "outline", size: "icon" })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
          <p className="text-slate-600">{campaign.list.name} · {campaign.template.name}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <CampaignActions campaign={campaign} />
        {["draft", "scheduled"].includes(campaign.status) && (
          <Link href={`/campaigns/${campaign.id}/edit`} className={buttonVariants({ variant: "outline" })}>
            Edit Campaign
          </Link>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Total",    value: total,    color: "" },
          { label: "Terkirim", value: sent,     color: "" },
          { label: "Dibuka",   value: opened,   color: "", sub: `${openRate}% open rate` },
          { label: "Diklik",   value: clicked,  color: "", sub: `${clickRate}% click rate` },
          { label: "Bounced",  value: bounced,  color: "text-red-600" },
          { label: "Gagal",    value: failed,   color: "text-slate-400" },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value.toLocaleString("id-ID")}</div>
              {s.sub && <p className="text-xs text-slate-500 mt-0.5">{s.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Daily chart */}
      {dailyStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Aktivitas Harian</CardTitle>
            <CardDescription>Open & click per hari.</CardDescription>
          </CardHeader>
          <CardContent>
            <CampaignChart data={dailyStats} />
          </CardContent>
        </Card>
      )}

      {/* Top links */}
      {topLinks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Link Paling Banyak Diklik</CardTitle>
            <CardDescription>Top 10 link berdasarkan jumlah klik.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topLinks.map(({ url, clicks }, i) => (
                <div key={url} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-5 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline truncate block">
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

      {/* Detail table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>Detail Pengiriman</CardTitle>
              <CardDescription>Status pengiriman per subscriber.</CardDescription>
            </div>
            <Suspense>
              <LogSearch defaultValue={search} campaignId={id} />
            </Suspense>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Postal ID</TableHead>
                <TableHead className="pr-6">Waktu Kirim</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-500 py-10">
                    {search ? "Tidak ada hasil." : "Campaign belum dikirim."}
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium pl-6">{log.subscriber.email}</TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{log.postalMessageId || "—"}</TableCell>
                    <TableCell className="pr-6">
                      {log.sentAt ? new Date(log.sentAt).toLocaleString("id-ID") : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t bg-slate-50/50">
              <p className="text-sm text-slate-500">
                Menampilkan {skip + 1}–{Math.min(skip + PAGE_SIZE, logTotal)} dari {logTotal.toLocaleString("id-ID")}
              </p>
              <div className="flex items-center gap-2">
                <Link href={buildUrl(page - 1)} aria-disabled={page <= 1}
                  className={buttonVariants({ variant: "outline", size: "sm" }) + (page <= 1 ? " pointer-events-none opacity-40" : "")}>
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Link>
                <span className="text-sm text-slate-600 px-1">{page} / {totalPages}</span>
                <Link href={buildUrl(page + 1)} aria-disabled={page >= totalPages}
                  className={buttonVariants({ variant: "outline", size: "sm" }) + (page >= totalPages ? " pointer-events-none opacity-40" : "")}>
                  Next <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Inline client search component
import { LogSearchClient } from "./log-search-client";
function LogSearch({ defaultValue, campaignId }: { defaultValue?: string; campaignId: string }) {
  return <LogSearchClient defaultValue={defaultValue} campaignId={campaignId} />;
}
