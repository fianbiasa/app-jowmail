import { NextResponse } from "next/server";
import { getCurrentOrganizationFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { sendViaOrganization } from "@/lib/postal/send";
import { z } from "zod";

const testSchema = z.object({
  to: z.string().email(),
});

function replaceMergeTags(
  content: string,
  vars: Record<string, string>
): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, organization } = await getCurrentOrganizationFromRequest(
    request as unknown as import("next/server").NextRequest
  );
  if (error || !organization) return error;

  const body = await request.json();
  const parsed = testSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id, organizationId: organization.id },
    include: { template: true },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const vars = {
    email: parsed.data.to,
    first_name: "Test",
    last_name: "User",
    full_name: "Test User",
    unsubscribe_url: "#",
  };

  const campaignBody = campaign.htmlContent || "";
  const templateLayout = campaign.template.htmlContent;
  const mergedHtml = templateLayout.includes("{{content}}")
    ? templateLayout.replace("{{content}}", campaignBody)
    : templateLayout + campaignBody;

  try {
    const result = await sendViaOrganization({
      organizationId: organization.id,
      to: [parsed.data.to],
      from: `${campaign.fromName} <${campaign.fromEmail}>`,
      subject: `[TEST] ${replaceMergeTags(campaign.subject, vars)}`,
      htmlBody: replaceMergeTags(mergedHtml, vars),
      plainBody: replaceMergeTags(
        campaign.plainContent || campaign.template.plainContent || "",
        vars
      ),
      replyTo: campaign.replyTo || undefined,
      tag: `campaign-test-${campaign.id}`,
    });

    return NextResponse.json({ success: true, result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to send test email" },
      { status: 500 }
    );
  }
}
