import { NextResponse } from "next/server";
import { getCurrentOrganizationFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { emailQueue } from "@/lib/queue";

export async function POST(
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
    include: {
      template: true,
      list: {
        include: {
          subscribers: {
            where: { status: "subscribed" },
          },
        },
      },
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (!["draft", "scheduled"].includes(campaign.status)) {
    return NextResponse.json(
      { error: "Campaign can only be sent from draft or scheduled status" },
      { status: 400 }
    );
  }

  // Quota check: monthly email limit (-1 = unlimited)
  const subscriberCount = campaign.list.subscribers.length;
  if (organization.quotaEmailsPerMonth !== -1) {
    const remaining = organization.quotaEmailsPerMonth - organization.emailsSentThisMonth;
    if (remaining < subscriberCount) {
      return NextResponse.json(
        { error: `Kuota email bulanan tidak cukup. Tersisa ${remaining} dari ${organization.quotaEmailsPerMonth}. Butuh ${subscriberCount}.` },
        { status: 403 }
      );
    }
  }

  if (campaign.list.subscribers.length === 0) {
    return NextResponse.json(
      { error: "No active subscribers in this list" },
      { status: 400 }
    );
  }

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: "queued" },
  });

  for (const subscriber of campaign.list.subscribers) {
    await prisma.campaignLog.create({
      data: {
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "queued",
      },
    });

    await emailQueue.add(
      `send-${campaign.id}-${subscriber.id}`,
      {
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        organizationId: organization.id,
        from: `${campaign.fromName} <${campaign.fromEmail}>`,
        subject: campaign.subject,
        htmlBody: campaign.htmlContent || "",       // campaign body (WYSIWYG)
        templateHtml: campaign.template.htmlContent, // layout wrapper
        plainBody: campaign.plainContent || campaign.template.plainContent || "",
        replyTo: campaign.replyTo || undefined,
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      }
    );
  }

  await prisma.$transaction([
    prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: "sending", sentAt: new Date() },
    }),
    prisma.organization.update({
      where: { id: organization.id },
      data: { emailsSentThisMonth: { increment: subscriberCount } },
    }),
  ]);

  return NextResponse.json({
    success: true,
    queued: subscriberCount,
  });
}
