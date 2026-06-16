import { NextResponse } from "next/server";
import { getCurrentOrganizationFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  fromName: z.string().min(1).optional(),
  fromEmail: z.string().email().optional(),
  replyTo: z.string().email().optional().nullable().or(z.literal("").transform(() => undefined)),
  listId: z.string().optional(),
  templateId: z.string().optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  htmlContent: z.string().optional(),
});

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
    include: {
      list: { select: { name: true } },
      template: { select: { name: true } },
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  return NextResponse.json(campaign);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, organization } = await getCurrentOrganizationFromRequest(
    request as unknown as import("next/server").NextRequest
  );
  if (error || !organization) return error;

  const body = await request.json();
  const parsed = updateCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const existing = await prisma.campaign.findFirst({
    where: { id, organizationId: organization.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (!["draft", "scheduled"].includes(existing.status)) {
    return NextResponse.json(
      { error: "Hanya campaign draft atau scheduled yang bisa diedit" },
      { status: 400 }
    );
  }

  const { scheduledAt, ...rest } = parsed.data;

  const updated = await prisma.campaign.update({
    where: { id },
    data: {
      ...rest,
      ...(scheduledAt !== undefined
        ? {
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
            status: scheduledAt ? "scheduled" : "draft",
          }
        : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, organization } = await getCurrentOrganizationFromRequest(
    request as unknown as import("next/server").NextRequest
  );
  if (error || !organization) return error;

  const existing = await prisma.campaign.findFirst({
    where: { id, organizationId: organization.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (["sending", "queued"].includes(existing.status)) {
    return NextResponse.json(
      { error: "Campaign sedang berjalan, tidak bisa dihapus" },
      { status: 400 }
    );
  }

  await prisma.campaign.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
