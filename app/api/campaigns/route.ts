import { NextResponse } from "next/server";
import { getCurrentOrganizationFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createCampaignSchema = z.object({
  name: z.string().min(1),
  listId: z.string().min(1),
  templateId: z.string().min(1),
  subject: z.string().min(1),
  fromName: z.string().min(1),
  fromEmail: z.string().email(),
  replyTo: z.string().email().optional().or(z.literal("").transform(() => undefined)),
  scheduledAt: z.string().datetime().optional().nullable(),
  htmlContent: z.string().min(1),
});

export async function GET(request: Request) {
  const { error, organization } = await getCurrentOrganizationFromRequest(
    request as unknown as import("next/server").NextRequest
  );
  if (error || !organization) return error;

  const campaigns = await prisma.campaign.findMany({
    where: { organizationId: organization.id },
    include: {
      list: { select: { name: true } },
      template: { select: { name: true } },
      _count: {
        select: { logs: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(campaigns);
}

export async function POST(request: Request) {
  const { error, organization } = await getCurrentOrganizationFromRequest(
    request as unknown as import("next/server").NextRequest
  );
  if (error || !organization) return error;

  const body = await request.json();
  const parsed = createCampaignSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const [list, template] = await Promise.all([
    prisma.subscriberList.findFirst({
      where: { id: parsed.data.listId, organizationId: organization.id },
    }),
    prisma.template.findFirst({
      where: { id: parsed.data.templateId, organizationId: organization.id },
    }),
  ]);

  if (!list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const { scheduledAt, ...rest } = parsed.data;
  const campaign = await prisma.campaign.create({
    data: {
      organizationId: organization.id,
      ...rest,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status: scheduledAt ? "scheduled" : "draft",
    },
  });

  return NextResponse.json(campaign, { status: 201 });
}
