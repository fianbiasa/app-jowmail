import { notFound, redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TemplateForm } from "../../template-form";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const organization = await getCurrentOrganization();

  if (!organization) {
    redirect("/");
  }

  const template = await prisma.template.findFirst({
    where: { id, organizationId: organization.id },
  });

  if (!template) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Edit Template</h1>
        <p className="text-muted-foreground">Perbarui template email.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Template</CardTitle>
          <CardDescription>
            Perbarui detail template email di bawah ini.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TemplateForm template={template} />
        </CardContent>
      </Card>
    </div>
  );
}
