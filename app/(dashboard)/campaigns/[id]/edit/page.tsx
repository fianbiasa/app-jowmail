import { redirect, notFound } from "next/navigation";
import { getCurrentOrganization } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CampaignForm } from "../../campaign-form";

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const organization = await getCurrentOrganization();

  if (!organization) redirect("/");

  const [campaign, lists, templates] = await Promise.all([
    prisma.campaign.findFirst({
      where: { id, organizationId: organization.id },
    }),
    prisma.subscriberList.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.template.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!campaign) notFound();

  if (!["draft", "scheduled"].includes(campaign.status)) {
    redirect(`/campaigns/${id}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Campaign</h1>
        <p className="text-slate-600">Perbarui pengaturan campaign.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Campaign</CardTitle>
          <CardDescription>
            Hanya campaign berstatus draft atau scheduled yang dapat diedit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CampaignForm
            lists={lists}
            templates={templates}
            campaign={{
              ...campaign,
              scheduledAt: campaign.scheduledAt?.toISOString() ?? null,
              htmlContent: campaign.htmlContent ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
