import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";
import { CampaignRowActions } from "./campaign-row-actions";

function getStatusVariant(status: string): VariantProps<typeof badgeVariants>["variant"] {
  switch (status) {
    case "draft":
      return "neutral";
    case "queued":
      return "cyan";
    case "sending":
      return "yellow";
    case "sent":
      return "lime";
    case "failed":
      return "red";
    default:
      return "neutral";
  }
}

export default async function CampaignsPage() {
  const organization = await getCurrentOrganization();

  if (!organization) {
    redirect("/");
  }

  const campaigns = await prisma.campaign.findMany({
    where: { organizationId: organization.id },
    include: {
      list: { select: { name: true } },
      template: { select: { name: true } },
      _count: {
        select: { logs: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl">Campaigns</h1>
          <p className="text-muted-foreground">
            Kelola dan kirim campaign email ke subscriber.
          </p>
        </div>
        <Link href="/campaigns/new" className={buttonVariants()}>
          Campaign Baru
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Campaign</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>List</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dibuat</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Belum ada campaign. Buat campaign pertama.
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-bold">{campaign.name}</TableCell>
                    <TableCell>{campaign.list.name}</TableCell>
                    <TableCell>{campaign.template.name}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(campaign.status)}>
                        {campaign.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(campaign.createdAt).toLocaleDateString("id-ID")}
                    </TableCell>
                    <TableCell>
                      <CampaignRowActions
                        campaignId={campaign.id}
                        status={campaign.status}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
