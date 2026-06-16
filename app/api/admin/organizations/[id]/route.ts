import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  plan: z.string(),
  quotaSubscribers: z.number().int().min(-1),
  quotaEmailsPerMonth: z.number().int().min(-1),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const org = await prisma.organization.update({
    where: { id },
    data: {
      plan: parsed.data.plan,
      quotaSubscribers: parsed.data.quotaSubscribers,
      quotaEmailsPerMonth: parsed.data.quotaEmailsPerMonth,
    },
    select: {
      id: true,
      name: true,
      plan: true,
      quotaSubscribers: true,
      quotaEmailsPerMonth: true,
    },
  });

  return NextResponse.json(org);
}
