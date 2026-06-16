import { NextResponse } from "next/server";
import { getCurrentOrganizationFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateTemplateSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  htmlContent: z.string().min(1),
  plainContent: z.string().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, organization } = await getCurrentOrganizationFromRequest(
    request as unknown as import("next/server").NextRequest
  );
  if (error || !organization) return error;

  const template = await prisma.template.findFirst({
    where: { id, organizationId: organization.id },
  });

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json(template);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, organization } = await getCurrentOrganizationFromRequest(
    request as unknown as import("next/server").NextRequest
  );
  if (error || !organization) return error;

  const body = await request.json();
  const parsed = updateTemplateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const template = await prisma.template.updateMany({
    where: { id, organizationId: organization.id },
    data: parsed.data,
  });

  if (template.count === 0) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, organization } = await getCurrentOrganizationFromRequest(
    request as unknown as import("next/server").NextRequest
  );
  if (error || !organization) return error;

  const template = await prisma.template.deleteMany({
    where: { id, organizationId: organization.id },
  });

  if (template.count === 0) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
