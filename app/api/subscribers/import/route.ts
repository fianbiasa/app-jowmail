import { NextResponse } from "next/server";
import { getCurrentOrganizationFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const rowSchema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const importSchema = z.object({
  listId: z.string(),
  subscribers: z.array(z.unknown()),
});

export async function POST(request: Request) {
  const { error, organization } = await getCurrentOrganizationFromRequest(
    request as unknown as import("next/server").NextRequest
  );
  if (error || !organization) return error;

  const body = await request.json();
  const parsed = importSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Format request tidak valid" }, { status: 400 });
  }

  // Filter out rows with invalid emails instead of rejecting the whole batch
  const validRows = parsed.data.subscribers
    .map((r) => rowSchema.safeParse(r))
    .filter((r) => r.success)
    .map((r) => (r as { success: true; data: z.infer<typeof rowSchema> }).data);

  const list = await prisma.subscriberList.findFirst({
    where: { id: parsed.data.listId, organizationId: organization.id },
  });

  if (!list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  // Quota check: count current subscribers across all lists in the org
  const currentCount = await prisma.subscriber.count({
    where: {
      list: { organizationId: organization.id },
      status: { not: "unsubscribed" },
    },
  });

  const unlimited = organization.quotaSubscribers === -1;
  const available = unlimited ? Infinity : organization.quotaSubscribers - currentCount;
  if (!unlimited && available <= 0) {
    return NextResponse.json(
      { error: `Kuota subscriber (${organization.quotaSubscribers}) sudah penuh. Upgrade plan untuk menambah lebih banyak subscriber.` },
      { status: 403 }
    );
  }

  // Only import up to available quota
  const toImport = unlimited ? validRows : validRows.slice(0, available);

  let created = 0;
  let skipped = 0;

  for (const item of toImport) {
    try {
      await prisma.subscriber.create({
        data: {
          listId: parsed.data.listId,
          email: item.email,
          firstName: item.firstName,
          lastName: item.lastName,
          status: "subscribed",
        },
      });
      created++;
    } catch (e) {
      skipped++;
    }
  }

  const invalidCount = parsed.data.subscribers.length - validRows.length;
  const truncated = validRows.length - toImport.length;
  return NextResponse.json({ created, skipped, truncated, invalidCount });
}
