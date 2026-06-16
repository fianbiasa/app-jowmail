"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/rich-text-editor";

interface List {
  id: string;
  name: string;
}

interface Template {
  id: string;
  name: string;
}

interface Campaign {
  id: string;
  name: string;
  listId: string;
  templateId: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string | null;
  scheduledAt?: string | Date | null;
  htmlContent?: string | null;
}

interface CampaignFormProps {
  lists: List[];
  templates: Template[];
  campaign?: Campaign;
}

export function CampaignForm({ lists, templates, campaign }: CampaignFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [htmlContent, setHtmlContent] = useState(campaign?.htmlContent || "");
  const [listId, setListId] = useState(campaign?.listId || "");
  const [templateId, setTemplateId] = useState(campaign?.templateId || "");
  const isEditing = !!campaign;

  const defaultScheduledAt = campaign?.scheduledAt
    ? new Date(campaign.scheduledAt).toISOString().slice(0, 16)
    : "";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!htmlContent || htmlContent === "<p></p>") {
      toast.error("Konten email tidak boleh kosong.");
      return;
    }

    setIsLoading(true);

    if (!listId) { toast.error("Pilih subscriber list."); setIsLoading(false); return; }
    if (!templateId) { toast.error("Pilih template."); setIsLoading(false); return; }

    const formData = new FormData(event.currentTarget);
    const scheduledAtRaw = formData.get("scheduledAt") as string;
    const replyToRaw = (formData.get("replyTo") as string) || "";
    const data = {
      name: formData.get("name") as string,
      listId,
      templateId,
      subject: formData.get("subject") as string,
      fromName: formData.get("fromName") as string,
      fromEmail: formData.get("fromEmail") as string,
      replyTo: replyToRaw || undefined,
      scheduledAt: scheduledAtRaw ? new Date(scheduledAtRaw).toISOString() : null,
      htmlContent,
    };

    try {
      const url = isEditing ? `/api/campaigns/${campaign.id}` : "/api/campaigns";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save campaign");
      }

      const saved = await response.json();
      toast.success(isEditing ? "Campaign berhasil diperbarui." : "Campaign berhasil dibuat.");
      router.push(`/campaigns/${isEditing ? campaign.id : saved.id}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal menyimpan campaign"
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (lists.length === 0 || templates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-slate-600">
          Anda perlu membuat minimal satu list dan satu template terlebih dahulu.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Nama Campaign</Label>
        <Input
          id="name"
          name="name"
          defaultValue={campaign?.name}
          placeholder="Newsletter Juni 2026"
          required
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="listId">Subscriber List</Label>
          <Select value={listId} onValueChange={(v) => setListId(v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih list" />
            </SelectTrigger>
            <SelectContent>
              {lists.map((list) => (
                <SelectItem key={list.id} value={list.id}>
                  {list.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="templateId">Template Style</Label>
          <Select value={templateId} onValueChange={(v) => setTemplateId(v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500">Template menentukan layout & styling email.</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Subject Email</Label>
        <Input
          id="subject"
          name="subject"
          defaultValue={campaign?.subject}
          placeholder="Halo {{full_name}}, ada kabar menarik!"
          required
        />
        <p className="text-xs text-slate-500">
          Tersedia: {"{{"} full_name {"}}"}, {"{{"} first_name {"}}"}, {"{{"} last_name {"}}"}, {"{{"} email {"}}"}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fromName">From Name</Label>
          <Input
            id="fromName"
            name="fromName"
            defaultValue={campaign?.fromName}
            placeholder="JowMail Team"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fromEmail">From Email</Label>
          <Input
            id="fromEmail"
            name="fromEmail"
            type="email"
            defaultValue={campaign?.fromEmail}
            placeholder="admin@jowmail.com"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="replyTo">Reply To (opsional)</Label>
        <Input
          id="replyTo"
          name="replyTo"
          type="email"
          defaultValue={campaign?.replyTo || ""}
          placeholder="reply@jowmail.com"
        />
      </div>

      <div className="space-y-2">
        <Label>Konten Email</Label>
        <p className="text-xs text-slate-500">
          Tulis isi email. Konten ini akan dimasukkan ke dalam template yang dipilih.
          Shortcode: {"{{"} full_name {"}}"}, {"{{"} first_name {"}}"}, {"{{"} email {"}}"}, {"{{"} unsubscribe_url {"}}"}
        </p>
        <RichTextEditor
          value={htmlContent}
          onChange={setHtmlContent}
          placeholder="Halo {{full_name}}, terima kasih sudah berlangganan..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="scheduledAt">Jadwal Pengiriman (opsional)</Label>
        <Input
          id="scheduledAt"
          name="scheduledAt"
          type="datetime-local"
          defaultValue={defaultScheduledAt}
        />
        <p className="text-xs text-slate-500">
          Kosongkan untuk menyimpan sebagai draft. Isi untuk menjadwalkan pengiriman otomatis.
        </p>
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Menyimpan..." : isEditing ? "Perbarui Campaign" : "Simpan Campaign"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(isEditing ? `/campaigns/${campaign.id}` : "/campaigns")}
        >
          Batal
        </Button>
      </div>
    </form>
  );
}
