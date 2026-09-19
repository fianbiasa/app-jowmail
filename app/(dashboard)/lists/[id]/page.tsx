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
import { ArrowLeft, Link2, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { CopySubscribeLink } from "./copy-subscribe-link";
import { AddSubscriberForm } from "./add-subscriber-form";
import { ImportCsvForm } from "./import-csv-form";
import { SubscriberRowActions } from "../../subscribers/subscriber-row-actions";
import { SubscriberSearch } from "./subscriber-search";
import { Suspense } from "react";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";

const PAGE_SIZE = 50;

function getStatusVariant(status: string): VariantProps<typeof badgeVariants>["variant"] {
  switch (status) {
    case "subscribed":   return "lime";
    case "unsubscribed": return "yellow";
    case "bounced":      return "red";
    case "complained":   return "orange";
    default:             return "neutral";
  }
}

export default async function ListDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const { id } = await params;
  const { search = "", page: pageStr = "1" } = await searchParams;
  const page = Math.max(1, parseInt(pageStr) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const organization = await getCurrentOrganization();
  if (!organization) redirect("/");

  const list = await prisma.subscriberList.findFirst({
    where: { id, organizationId: organization.id },
  });
  if (!list) notFound();

  const where = {
    listId: id,
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" as const } },
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [subscribers, total, totalAll] = await Promise.all([
    prisma.subscriber.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.subscriber.count({ where }),
    prisma.subscriber.count({ where: { listId: id } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const buildUrl = (p: number) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (p > 1) params.set("page", String(p));
    const q = params.toString();
    return `/lists/${id}${q ? `?${q}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/lists" className={buttonVariants({ variant: "outline", size: "icon" })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl">{list.name}</h1>
          <p className="text-muted-foreground">
            {list.description || "Tidak ada deskripsi"} · {totalAll.toLocaleString("id-ID")} subscriber
          </p>
        </div>
      </div>

      {/* Subscribe form link */}
      <Card className="bg-cyan/20">
        <CardContent className="flex items-center gap-3">
          <div className="bg-cyan flex size-9 items-center justify-center border-3 border-foreground shrink-0">
            <Link2 className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">Link Form Subscribe Publik</p>
            <p className="text-xs text-muted-foreground mt-0.5 font-semibold">Bagikan link ini agar orang bisa subscribe langsung ke list ini.</p>
          </div>
          <CopySubscribeLink listId={list.id} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tambah Subscriber</CardTitle>
            <CardDescription>Tambahkan subscriber baru ke list ini.</CardDescription>
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
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>Daftar Subscriber</CardTitle>
              {search && (
                <p className="text-sm text-muted-foreground font-bold mt-1">
                  {total.toLocaleString("id-ID")} hasil untuk &quot;{search}&quot;
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Suspense>
                <SubscriberSearch defaultValue={search} />
              </Suspense>
              <a
                href={`/api/subscribers/export?listId=${list.id}${search ? `&q=${encodeURIComponent(search)}` : ""}`}
                className={buttonVariants({ variant: "outline", size: "sm" }) + " gap-2 shrink-0"}
              >
                <Download className="h-4 w-4" />
                Export CSV
              </a>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Email</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dibuat</TableHead>
                <TableHead className="pr-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscribers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                    {search ? "Tidak ada subscriber yang cocok." : "Belum ada subscriber di list ini."}
                  </TableCell>
                </TableRow>
              ) : (
                subscribers.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-bold pl-6">{s.email}</TableCell>
                    <TableCell>{[s.firstName, s.lastName].filter(Boolean).join(" ") || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(s.status)}>{s.status}</Badge>
                    </TableCell>
                    <TableCell>{new Date(s.createdAt).toLocaleDateString("id-ID")}</TableCell>
                    <TableCell className="pr-6">
                      <SubscriberRowActions
                        subscriberId={s.id}
                        email={s.email}
                        firstName={s.firstName}
                        lastName={s.lastName}
                        status={s.status}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t-4 border-foreground bg-muted">
              <p className="text-sm font-bold text-muted-foreground">
                Menampilkan {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} dari {total.toLocaleString("id-ID")}
              </p>
              <div className="flex items-center gap-2">
                <Link
                  href={buildUrl(page - 1)}
                  aria-disabled={page <= 1}
                  className={buttonVariants({ variant: "outline", size: "sm" }) + (page <= 1 ? " pointer-events-none opacity-40" : "")}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Link>
                <span className="text-sm font-bold px-1">
                  {page} / {totalPages}
                </span>
                <Link
                  href={buildUrl(page + 1)}
                  aria-disabled={page >= totalPages}
                  className={buttonVariants({ variant: "outline", size: "sm" }) + (page >= totalPages ? " pointer-events-none opacity-40" : "")}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
