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
import { CampaignRowActions } from "./campaign-row-actions";

function getStatusColor(status: string) {
  switch (status) {
    case "draft":
      return "bg-slate-100 text-slate-700";
    case "queued":
      return "bg-blue-100 text-blue-700";
    case "sending":
      return "bg-yellow-100 text-yellow-700";
    case "sent":
      return "bg-green-100 text-green-700";
    case "failed":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
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
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-slate-600">
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
                  <TableCell colSpan={6} className="text-center text-slate-500">
                    Belum ada campaign. Buat campaign pertama.
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell>{campaign.list.name}</TableCell>
                    <TableCell>{campaign.template.name}</TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${getStatusColor(campaign.status)}`}>
                        {campaign.status}
                      </span>
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
