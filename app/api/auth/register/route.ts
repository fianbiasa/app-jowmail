import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  organizationName: z.string().min(1),
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { name, email, password, organizationName } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Email sudah terdaftar" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // Generate unique slug
  let slug = slugify(organizationName);
  const slugExists = await prisma.organization.findUnique({ where: { slug } });
  if (slugExists) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name, email, passwordHash },
    });

    const organization = await tx.organization.create({
      data: {
        name: organizationName,
        slug,
        plan: "free",
      },
    });

    await tx.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: "owner",
      },
    });
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
