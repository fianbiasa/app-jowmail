import { NextResponse } from "next/server";
import { getCurrentOrganizationFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSubscriberSchema = z.object({
  listId: z.string(),
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  status: z.enum(["subscribed", "unsubscribed", "bounced", "complained"]).default("subscribed"),
});

export async function GET(request: Request) {
  const { error, organization } = await getCurrentOrganizationFromRequest(
    request as unknown as import("next/server").NextRequest
  );
  if (error || !organization) return error;

  const { searchParams } = new URL(request.url);
  const listId = searchParams.get("listId");
  const query = searchParams.get("q");

  const subscribers = await prisma.subscriber.findMany({
    where: {
      list: { organizationId: organization.id },
      ...(listId ? { listId } : {}),
      ...(query
        ? {
            OR: [
              { email: { contains: query, mode: "insensitive" } },
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { list: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(subscribers);
}

export async function POST(request: Request) {
  const { error, organization } = await getCurrentOrganizationFromRequest(
    request as unknown as import("next/server").NextRequest
  );
  if (error || !organization) return error;

  const body = await request.json();
  const parsed = createSubscriberSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const list = await prisma.subscriberList.findFirst({
    where: { id: parsed.data.listId, organizationId: organization.id },
  });

  if (!list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  try {
    const subscriber = await prisma.subscriber.create({
      data: parsed.data,
    });
    return NextResponse.json(subscriber, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: "Email already exists in this list" },
      { status: 409 }
    );
  }
}
