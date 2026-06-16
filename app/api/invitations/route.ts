import { NextResponse } from "next/server";
import { getCurrentOrganizationFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const inviteSchema = z.object({
  organizationId: z.string(),
  email: z.string().email(),
  role: z.enum(["admin", "member"]),
});

export async function POST(request: Request) {
  const { error, organization } = await getCurrentOrganizationFromRequest(
    request as unknown as import("next/server").NextRequest
  );
  if (error || !organization) return error;

  const body = await request.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  const { email, role } = parsed.data;

  // Check if already a member
  const existingMember = await prisma.organizationMember.findFirst({
    where: {
      organizationId: organization.id,
      user: { email },
    },
  });
  if (existingMember) {
    return NextResponse.json(
      { error: "User sudah menjadi anggota organisasi" },
      { status: 409 }
    );
  }

  // Upsert invitation (resend if exists)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const existing = await prisma.invitation.findFirst({
    where: { organizationId: organization.id, email, acceptedAt: null },
  });

  const invitation = existing
    ? await prisma.invitation.update({
        where: { id: existing.id },
        data: { expiresAt, role },
      })
    : await prisma.invitation.create({
        data: { organizationId: organization.id, email, role, expiresAt },
      });

  return NextResponse.json({
    success: true,
    inviteUrl: `${process.env.NEXTAUTH_URL}/auth/invite/${invitation.token}`,
    token: invitation.token,
  });
}
