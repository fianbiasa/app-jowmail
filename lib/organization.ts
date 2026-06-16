import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getCurrentOrganization() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });

  return membership?.organization ?? null;
}
