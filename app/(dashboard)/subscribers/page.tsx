import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
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
import { SubscriberRowActions } from "./subscriber-row-actions";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/components/ui/button";
import { Download } from "lucide-react";

function getStatusVariant(status: string): VariantProps<typeof badgeVariants>["variant"] {
  switch (status) {
    case "subscribed":   return "lime";
    case "unsubscribed": return "yellow";
    case "bounced":      return "red";
    case "complained":   return "orange";
    default:             return "neutral";
  }
}

export default async function SubscribersPage() {
  const organization = await getCurrentOrganization();

  if (!organization) {
    redirect("/");
  }

  const subscribers = await prisma.subscriber.findMany({
    where: { list: { organizationId: organization.id } },
    include: { list: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl">Subscribers</h1>
          <p className="text-muted-foreground">
            Lihat semua subscriber di seluruh list organisasi.
          </p>
        </div>
        <a href="/api/subscribers/export" className={buttonVariants({ variant: "outline" }) + " gap-2"}>
          <Download className="h-4 w-4" />
          Export CSV
        </a>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Semua Subscriber</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>List</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dibuat</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscribers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Belum ada subscriber. Tambahkan dari halaman Lists.
                  </TableCell>
                </TableRow>
              ) : (
                subscribers.map((subscriber) => (
                  <TableRow key={subscriber.id}>
                    <TableCell className="font-bold">{subscriber.email}</TableCell>
                    <TableCell>
                      {subscriber.firstName} {subscriber.lastName}
                    </TableCell>
                    <TableCell>{subscriber.list.name}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(subscriber.status)}>{subscriber.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(subscriber.createdAt).toLocaleDateString("id-ID")}
                    </TableCell>
                    <TableCell>
                      <SubscriberRowActions
                        subscriberId={subscriber.id}
                        email={subscriber.email}
                        firstName={subscriber.firstName}
                        lastName={subscriber.lastName}
                        status={subscriber.status}
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
