import { NextResponse } from "next/server";
import { getCurrentOrganizationFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateListSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
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

  const list = await prisma.subscriberList.findFirst({
    where: { id, organizationId: organization.id },
    include: {
      _count: {
        select: { subscribers: true },
      },
    },
  });

  if (!list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  return NextResponse.json(list);
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
  const parsed = updateListSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const list = await prisma.subscriberList.updateMany({
    where: { id, organizationId: organization.id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
    },
  });

  if (list.count === 0) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
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

  const list = await prisma.subscriberList.deleteMany({
    where: { id, organizationId: organization.id },
  });

  if (list.count === 0) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
