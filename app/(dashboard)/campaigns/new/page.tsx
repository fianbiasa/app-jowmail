import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CampaignForm } from "../campaign-form";

export default async function NewCampaignPage() {
  const organization = await getCurrentOrganization();

  if (!organization) {
    redirect("/");
  }

  const [lists, templates] = await Promise.all([
    prisma.subscriberList.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.template.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Campaign Baru</h1>
        <p className="text-slate-600">Buat campaign email baru.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Campaign</CardTitle>
          <CardDescription>
            Pilih list, template, dan pengaturan pengiriman.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CampaignForm lists={lists} templates={templates} />
        </CardContent>
      </Card>
    </div>
  );
}
