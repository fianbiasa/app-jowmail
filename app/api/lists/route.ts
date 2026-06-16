import { NextResponse } from "next/server";
import { getCurrentOrganizationFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createListSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function GET(request: Request) {
  const { error, organization } = await getCurrentOrganizationFromRequest(
    request as unknown as import("next/server").NextRequest
  );
  if (error || !organization) return error;

  const lists = await prisma.subscriberList.findMany({
    where: { organizationId: organization.id },
    include: {
      _count: {
        select: { subscribers: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(lists);
}

export async function POST(request: Request) {
  const { error, organization } = await getCurrentOrganizationFromRequest(
    request as unknown as import("next/server").NextRequest
  );
  if (error || !organization) return error;

  const body = await request.json();
  const parsed = createListSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const list = await prisma.subscriberList.create({
    data: {
      organizationId: organization.id,
      name: parsed.data.name,
      description: parsed.data.description,
    },
  });

  return NextResponse.json(list, { status: 201 });
}
