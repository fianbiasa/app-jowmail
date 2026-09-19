"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";
import { toast } from "sonner";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

interface Organization {
  id: string;
  name: string;
  slug: string;
  postalBaseUrl: string;
  postalApiKey: string | null;
  postalServer: string | null;
  plan: string;
  quotaSubscribers: number;
  quotaEmailsPerMonth: number;
  emailsSentThisMonth: number;
}

interface SettingsFormProps {
  organization: Organization;
  updateAction: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Menyimpan..." : "Simpan Pengaturan"}
    </Button>
  );
}

export function SettingsForm({ organization, updateAction }: SettingsFormProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [baseUrl, setBaseUrl] = useState(organization.postalBaseUrl);
  const [apiKey, setApiKey] = useState(organization.postalApiKey || "");

  async function handleSubmit(formData: FormData) {
    const result = await updateAction(formData);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Pengaturan berhasil disimpan.");
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/postal-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl, apiKey: apiKey || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult("success");
        toast.success(data.message || "Koneksi berhasil!");
      } else {
        setTestResult("error");
        toast.error(data.error || "Koneksi gagal");
      }
    } catch {
      setTestResult("error");
      toast.error("Tidak dapat terhubung ke Postal");
    } finally {
      setTesting(false);
    }
  }

  const planVariant: Record<string, VariantProps<typeof badgeVariants>["variant"]> = {
    free: "neutral",
    pro: "cyan",
    enterprise: "purple",
  };

  return (
    <div className="space-y-8">
      {/* Plan Info */}
      <div className="border-3 border-foreground p-4 bg-muted space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-black uppercase text-sm">Plan Saat Ini</h3>
          <Badge variant={planVariant[organization.plan] || "neutral"}>
            {organization.plan}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground font-semibold">Subscriber</p>
            <p className="font-bold">{organization.quotaSubscribers.toLocaleString()} maks.</p>
          </div>
          <div>
            <p className="text-muted-foreground font-semibold">Email / bulan</p>
            <p className="font-bold">
              {organization.emailsSentThisMonth.toLocaleString()} / {organization.quotaEmailsPerMonth.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Org & Postal Settings */}
      <form action={handleSubmit} className="space-y-4">
        <input type="hidden" name="organizationId" value={organization.id} />

        <div className="space-y-2">
          <Label htmlFor="name">Nama Organisasi</Label>
          <Input id="name" name="name" defaultValue={organization.name} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" value={organization.slug} disabled />
          <p className="text-xs text-muted-foreground font-semibold">Slug tidak dapat diubah.</p>
        </div>

        <hr className="border-t-2 border-foreground" />
        <h3 className="font-black uppercase text-sm">Konfigurasi Postal Mail Server</h3>

        <div className="space-y-2">
          <Label htmlFor="postalBaseUrl">Postal Base URL</Label>
          <Input
            id="postalBaseUrl"
            name="postalBaseUrl"
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://mail.jowmail.com"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="postalApiKey">Postal API Key</Label>
          <Input
            id="postalApiKey"
            name="postalApiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="X-Server-API-Key"
            required
          />
          <p className="text-xs text-muted-foreground font-semibold">
            API key dari halaman Credentials di Postal. Disimpan terenkripsi (AES-256).
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="postalServer">Postal Server (opsional)</Label>
          <Input
            id="postalServer"
            name="postalServer"
            defaultValue={organization.postalServer || ""}
            placeholder="default"
          />
        </div>

        <div className="flex gap-3 items-center">
          <SubmitButton />
          <Button type="button" variant="outline" onClick={handleTestConnection} disabled={testing}>
            {testing ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Testing...</>
            ) : (
              "Test Koneksi"
            )}
          </Button>
          {testResult === "success" && <CheckCircle className="h-5 w-5 text-lime" />}
          {testResult === "error" && <XCircle className="h-5 w-5 text-red" />}
        </div>
      </form>
    </div>
  );
}
