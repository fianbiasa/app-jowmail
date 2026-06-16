import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getCurrentOrganizationFromRequest(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), organization: null };
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) {
    return { error: NextResponse.json({ error: "No organization found" }, { status: 404 }), organization: null };
  }

  return { error: null, organization: membership.organization };
}
