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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Subscribers</h1>
        <p className="text-slate-600">
          Lihat semua subscriber di seluruh list organisasi.
        </p>
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
                  <TableCell colSpan={6} className="text-center text-slate-500">
                    Belum ada subscriber. Tambahkan dari halaman Lists.
                  </TableCell>
                </TableRow>
              ) : (
                subscribers.map((subscriber) => (
                  <TableRow key={subscriber.id}>
                    <TableCell className="font-medium">{subscriber.email}</TableCell>
                    <TableCell>
                      {subscriber.firstName} {subscriber.lastName}
                    </TableCell>
                    <TableCell>{subscriber.list.name}</TableCell>
                    <TableCell>
                      <span className="inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize bg-slate-100 text-slate-700">
                        {subscriber.status}
                      </span>
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
