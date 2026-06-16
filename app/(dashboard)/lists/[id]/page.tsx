import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentOrganization } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { ArrowLeft, Link2 } from "lucide-react";
import { CopySubscribeLink } from "./copy-subscribe-link";
import { AddSubscriberForm } from "./add-subscriber-form";
import { ImportCsvForm } from "./import-csv-form";
import { SubscriberRowActions } from "../../subscribers/subscriber-row-actions";

function getStatusColor(status: string) {
  switch (status) {
    case "subscribed":
      return "bg-green-100 text-green-700";
    case "unsubscribed":
      return "bg-yellow-100 text-yellow-700";
    case "bounced":
      return "bg-red-100 text-red-700";
    case "complained":
      return "bg-orange-100 text-orange-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const organization = await getCurrentOrganization();

  if (!organization) {
    redirect("/");
  }

  const list = await prisma.subscriberList.findFirst({
    where: { id, organizationId: organization.id },
    include: {
      subscribers: {
        orderBy: { createdAt: "desc" },
        take: 100,
      },
    },
  });

  if (!list) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/lists"
          className={buttonVariants({
            variant: "outline",
            size: "icon",
          })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{list.name}</h1>
          <p className="text-slate-600">
            {list.description || "Tidak ada deskripsi"} · {list.subscribers.length} subscriber
          </p>
        </div>
      </div>

      {/* Subscribe form link */}
      <Card className="border-indigo-100 bg-indigo-50/50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 rounded-lg p-2">
              <Link2 className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800">Link Form Subscribe Publik</p>
              <p className="text-xs text-slate-500 mt-0.5">Bagikan link ini agar orang bisa subscribe langsung ke list ini.</p>
            </div>
            <CopySubscribeLink listId={list.id} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tambah Subscriber</CardTitle>
            <CardDescription>
              Tambahkan subscriber baru ke list ini.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AddSubscriberForm listId={list.id} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import CSV</CardTitle>
            <CardDescription>
              Import banyak subscriber dari file CSV. Format: email,firstName,lastName
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImportCsvForm listId={list.id} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Subscriber</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dibuat</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.subscribers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500">
                    Belum ada subscriber di list ini.
                  </TableCell>
                </TableRow>
              ) : (
                list.subscribers.map((subscriber) => (
                  <TableRow key={subscriber.id}>
                    <TableCell className="font-medium">{subscriber.email}</TableCell>
                    <TableCell>
                      {subscriber.firstName} {subscriber.lastName}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${getStatusColor(subscriber.status)}`}>
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
