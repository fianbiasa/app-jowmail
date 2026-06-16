"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Eye } from "lucide-react";

const PLACEHOLDER_CONTENT = `
<div style="padding:20px;background:#f3f4f6;border-radius:8px;color:#374151;">
  <p style="margin:0 0 8px;font-weight:600;color:#6b7280;font-size:13px;">[ Konten campaign akan muncul di sini ]</p>
  <p style="margin:0;">Halo <strong>Budi Santoso</strong>, ini adalah contoh konten email yang akan diinjeksikan ke dalam template saat pengiriman campaign.</p>
</div>`;

interface Template {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  plainContent: string | null;
}

interface TemplateFormProps {
  template?: Template;
}

export function TemplateForm({ template }: TemplateFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [htmlContent, setHtmlContent] = useState(template?.htmlContent || "");
  const isEditing = !!template;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const data = {
      name: formData.get("name") as string,
      subject: formData.get("subject") as string,
      htmlContent: formData.get("htmlContent") as string,
      plainContent: formData.get("plainContent") as string,
    };

    try {
      const url = isEditing
        ? `/api/templates/${template.id}`
        : "/api/templates";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save template");
      }

      toast.success(
        isEditing
          ? "Template berhasil diperbarui."
          : "Template berhasil dibuat."
      );
      router.push("/templates");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal menyimpan template"
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Nama Template</Label>
        <Input
          id="name"
          name="name"
          defaultValue={template?.name}
          placeholder="Newsletter Template"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Subject Email</Label>
        <Input
          id="subject"
          name="subject"
          defaultValue={template?.subject}
          placeholder="Halo {{first_name}}, ini newsletter kami!"
          required
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="htmlContent">HTML Layout</Label>
          <Dialog>
            <DialogTrigger
              className={buttonVariants({ variant: "outline", size: "sm" }) + " gap-1"}
              disabled={!htmlContent}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </DialogTrigger>
            <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0">
              <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <DialogTitle>Preview Template</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-hidden bg-slate-100 p-4">
                <iframe
                  srcDoc={htmlContent
                    .replace("{{content}}", PLACEHOLDER_CONTENT)
                    .replace(/\{\{full_name\}\}/g, "Budi Santoso")
                    .replace(/\{\{first_name\}\}/g, "Budi")
                    .replace(/\{\{last_name\}\}/g, "Santoso")
                    .replace(/\{\{email\}\}/g, "budi@example.com")
                    .replace(/\{\{unsubscribe_url\}\}/g, "#")}
                  className="w-full h-full rounded bg-white shadow"
                  sandbox="allow-scripts"
                  title="Email Preview"
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <Textarea
          id="htmlContent"
          name="htmlContent"
          rows={14}
          value={htmlContent}
          onChange={(e) => setHtmlContent(e.target.value)}
          placeholder={`<html>\n<body style="font-family:sans-serif;">\n  <header><!-- logo, brand --></header>\n  <main>{{content}}</main>\n  <footer><!-- unsubscribe footer --></footer>\n</body>\n</html>`}
          required
        />
        <p className="text-xs text-slate-500">
          Tulis HTML layout. Gunakan <code className="bg-slate-100 px-1 rounded">{"{{content}}"}</code> sebagai placeholder — konten campaign akan diinjeksikan di sana saat pengiriman.
          Merge tags lain: {"{{first_name}}"}, {"{{full_name}}"}, {"{{email}}"}, {"{{unsubscribe_url}}"}.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="plainContent">Plain Text Content (opsional)</Label>
        <Textarea
          id="plainContent"
          name="plainContent"
          rows={4}
          defaultValue={template?.plainContent || ""}
          placeholder="Versi teks polos dari email."
        />
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading
            ? "Menyimpan..."
            : isEditing
            ? "Perbarui Template"
            : "Buat Template"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/templates")}
        >
          Batal
        </Button>
      </div>
    </form>
  );
}
