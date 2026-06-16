import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  listId: z.string(),
  email: z.string().email("Email tidak valid"),
  firstName: z.string().max(100).optional().or(z.literal("").transform(() => undefined)),
  lastName: z.string().max(100).optional().or(z.literal("").transform(() => undefined)),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { allowed } = await rateLimit(`ratelimit:subscribe:${ip}`, 10, 60);
  if (!allowed) {
    return NextResponse.json({ error: "Terlalu banyak permintaan. Coba lagi dalam 1 menit." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, { status: 400 });
  }

  const { listId, email, firstName, lastName } = parsed.data;

  const list = await prisma.subscriberList.findUnique({
    where: { id: listId },
    include: { organization: { select: { quotaSubscribers: true } } },
  });

  if (!list) {
    return NextResponse.json({ error: "Form subscribe tidak ditemukan." }, { status: 404 });
  }

  // Check if already subscribed
  const existing = await prisma.subscriber.findFirst({
    where: { listId, email },
  });

  if (existing) {
    if (existing.status === "subscribed") {
      return NextResponse.json({ status: "already" });
    }
    // Re-subscribe if unsubscribed
    await prisma.subscriber.update({
      where: { id: existing.id },
      data: { status: "subscribed", firstName, lastName },
    });
    return NextResponse.json({ status: "resubscribed" });
  }

  // Quota check
  const currentCount = await prisma.subscriber.count({
    where: {
      list: { organizationId: list.organizationId },
      status: { not: "unsubscribed" },
    },
  });

  if (currentCount >= list.organization.quotaSubscribers) {
    return NextResponse.json({ error: "Pendaftaran sementara ditutup." }, { status: 403 });
  }

  await prisma.subscriber.create({
    data: { listId, email, firstName, lastName, status: "subscribed" },
  });

  return NextResponse.json({ status: "subscribed" });
}
