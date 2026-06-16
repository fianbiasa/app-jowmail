"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { z } from "zod";

const settingsSchema = z.object({
  organizationId: z.string(),
  name: z.string().min(1),
  postalBaseUrl: z.string().url(),
  postalApiKey: z.string().min(1),
  postalServer: z.string().optional(),
});

export async function updateOrganizationSettings(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const data = settingsSchema.safeParse({
    organizationId: formData.get("organizationId"),
    name: formData.get("name"),
    postalBaseUrl: formData.get("postalBaseUrl"),
    postalApiKey: formData.get("postalApiKey"),
    postalServer: formData.get("postalServer") || undefined,
  });

  if (!data.success) {
    return { error: "Invalid data", issues: data.error.issues };
  }

  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: session.user.id,
      organizationId: data.data.organizationId,
      role: { in: ["owner", "admin"] },
    },
  });

  if (!membership) {
    return { error: "Tidak ada izin untuk mengubah organisasi ini" };
  }

  const { encrypted, iv } = encrypt(data.data.postalApiKey);

  await prisma.organization.update({
    where: { id: data.data.organizationId },
    data: {
      name: data.data.name,
      postalBaseUrl: data.data.postalBaseUrl,
      postalApiKey: encrypted,
      postalApiKeyIv: iv,
      postalServer: data.data.postalServer || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: data.data.organizationId,
      userId: session.user.id,
      action: "settings.updated",
      targetType: "Organization",
      targetId: data.data.organizationId,
    },
  });

  revalidatePath("/settings");
  return { success: true };
}
