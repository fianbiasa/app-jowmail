import Link from "next/link";
import { redirect } from "next/navigation";
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
import { CreateListForm } from "./create-list-form";
import { ListRowActions } from "./list-row-actions";

export default async function ListsPage() {
  const organization = await getCurrentOrganization();

  if (!organization) {
    redirect("/");
  }

  const lists = await prisma.subscriberList.findMany({
    where: { organizationId: organization.id },
    include: {
      _count: {
        select: { subscribers: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subscriber Lists</h1>
          <p className="text-slate-600">
            Kelola list subscriber untuk campaign email.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buat List Baru</CardTitle>
          <CardDescription>
            Tambahkan list baru untuk mengelompokkan subscriber.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateListForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead>Jumlah Subscriber</TableHead>
                <TableHead>Dibuat</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lists.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500">
                    Belum ada list. Buat list pertama di atas.
                  </TableCell>
                </TableRow>
              ) : (
                lists.map((list) => (
                  <TableRow key={list.id}>
                    <TableCell className="font-medium">{list.name}</TableCell>
                    <TableCell>{list.description || "-"}</TableCell>
                    <TableCell>{list._count.subscribers}</TableCell>
                    <TableCell>
                      {new Date(list.createdAt).toLocaleDateString("id-ID")}
                    </TableCell>
                    <TableCell>
                      <ListRowActions
                        listId={list.id}
                        name={list.name}
                        description={list.description}
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
