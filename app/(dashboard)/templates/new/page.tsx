import { getCurrentOrganization } from "@/lib/organization";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TemplateForm } from "../template-form";

export default async function NewTemplatePage() {
  const organization = await getCurrentOrganization();

  if (!organization) {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Template Baru</h1>
        <p className="text-slate-600">Buat template email baru.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Template</CardTitle>
          <CardDescription>
            Isi detail template email di bawah ini.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TemplateForm />
        </CardContent>
      </Card>
    </div>
  );
}
