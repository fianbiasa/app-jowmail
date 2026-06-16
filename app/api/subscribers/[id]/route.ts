import { NextResponse } from "next/server";
import { getCurrentOrganizationFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSubscriberSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  status: z.enum(["subscribed", "unsubscribed", "bounced", "complained"]).optional(),
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

  const subscriber = await prisma.subscriber.findFirst({
    where: { id, list: { organizationId: organization.id } },
    include: { list: { select: { name: true } } },
  });

  if (!subscriber) {
    return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
  }

  return NextResponse.json(subscriber);
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
  const parsed = updateSubscriberSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const subscriber = await prisma.subscriber.updateMany({
    where: { id, list: { organizationId: organization.id } },
    data: parsed.data,
  });

  if (subscriber.count === 0) {
    return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
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

  const subscriber = await prisma.subscriber.deleteMany({
    where: { id, list: { organizationId: organization.id } },
  });

  if (subscriber.count === 0) {
    return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
