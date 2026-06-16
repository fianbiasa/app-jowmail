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
import { TemplatePreviewButton } from "./template-preview-button";

export default async function TemplatesPage() {
  const organization = await getCurrentOrganization();

  if (!organization) {
    redirect("/");
  }

  const templates = await prisma.template.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
          <p className="text-slate-600">
            Kelola template email untuk campaign.
          </p>
        </div>
        <Link href="/templates/new" className={buttonVariants()}>
          Template Baru
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Template</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Dibuat</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-500">
                    Belum ada template. Buat template pertama.
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>{template.subject}</TableCell>
                    <TableCell>
                      {new Date(template.createdAt).toLocaleDateString("id-ID")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TemplatePreviewButton
                          name={template.name}
                          htmlContent={template.htmlContent}
                        />
                        <Link
                          href={`/templates/${template.id}/edit`}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          Edit
                        </Link>
                      </div>
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
