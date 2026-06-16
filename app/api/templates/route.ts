import { NextResponse } from "next/server";
import { getCurrentOrganizationFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createTemplateSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  htmlContent: z.string().min(1),
  plainContent: z.string().optional(),
});

export async function GET(request: Request) {
  const { error, organization } = await getCurrentOrganizationFromRequest(
    request as unknown as import("next/server").NextRequest
  );
  if (error || !organization) return error;

  const templates = await prisma.template.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(templates);
}

export async function POST(request: Request) {
  const { error, organization } = await getCurrentOrganizationFromRequest(
    request as unknown as import("next/server").NextRequest
  );
  if (error || !organization) return error;

  const body = await request.json();
  const parsed = createTemplateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const template = await prisma.template.create({
    data: {
      organizationId: organization.id,
      name: parsed.data.name,
      subject: parsed.data.subject,
      htmlContent: parsed.data.htmlContent,
      plainContent: parsed.data.plainContent,
    },
  });

  return NextResponse.json(template, { status: 201 });
}
