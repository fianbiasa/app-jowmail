import { NextResponse } from "next/server";
import { getCurrentOrganizationFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, organization } = await getCurrentOrganizationFromRequest(
    request as unknown as import("next/server").NextRequest
  );
  if (error || !organization) return error;

  const campaign = await prisma.campaign.findFirst({
    where: { id, organizationId: organization.id },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const logs = await prisma.campaignLog.findMany({
    where: { campaignId: id },
    select: {
      status: true,
      sentAt: true,
      deliveredAt: true,
      openedAt: true,
      clickedAt: true,
    },
  });

  const total = logs.length;
  const sent = logs.filter((l) =>
    ["sent", "delivered", "opened", "clicked"].includes(l.status)
  ).length;
  const delivered = logs.filter((l) =>
    ["delivered", "opened", "clicked"].includes(l.status)
  ).length;
  const opened = logs.filter((l) =>
    ["opened", "clicked"].includes(l.status)
  ).length;
  const clicked = logs.filter((l) => l.status === "clicked").length;
  const bounced = logs.filter((l) => l.status === "bounced").length;
  const complained = logs.filter((l) => l.status === "complained").length;
  const failed = logs.filter((l) => l.status === "failed").length;

  // Daily open counts for chart (last 30 days)
  const dailyMap: Record<string, { opens: number; clicks: number }> = {};
  for (const log of logs) {
    if (log.openedAt) {
      const day = log.openedAt.toISOString().slice(0, 10);
      dailyMap[day] = dailyMap[day] || { opens: 0, clicks: 0 };
      dailyMap[day].opens += 1;
    }
    if (log.clickedAt) {
      const day = log.clickedAt.toISOString().slice(0, 10);
      dailyMap[day] = dailyMap[day] || { opens: 0, clicks: 0 };
      dailyMap[day].clicks += 1;
    }
  }
  const dailyStats = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }));

  return NextResponse.json({
    total,
    sent,
    delivered,
    opened,
    clicked,
    bounced,
    complained,
    failed,
    openRate: total > 0 ? ((opened / total) * 100).toFixed(1) : "0",
    clickRate: total > 0 ? ((clicked / total) * 100).toFixed(1) : "0",
    deliveryRate: total > 0 ? ((delivered / total) * 100).toFixed(1) : "0",
    dailyStats,
  });
}
