"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface Campaign {
  id: string;
  status: string;
  fromName: string;
  fromEmail: string;
}

export function CampaignActions({ campaign }: { campaign: Campaign }) {
  const router = useRouter();
  const [isSending, setIsSending] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  async function handleSend() {
    if (!confirm("Yakin ingin mengirim campaign ini?")) return;

    setIsSending(true);
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/send`, {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send campaign");
      }

      toast.success(`Campaign dikirim ke ${result.queued} subscriber.`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal mengirim campaign"
      );
    } finally {
      setIsSending(false);
    }
  }

  async function handleTest() {
    if (!testEmail) {
      toast.error("Masukkan email tujuan test.");
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send test email");
      }

      toast.success("Email test berhasil dikirim.");
      setDialogOpen(false);
      setTestEmail("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal mengirim email test"
      );
    } finally {
      setIsTesting(false);
    }
  }

  const isDraft = campaign.status === "draft";

  return (
    <div className="flex flex-wrap gap-3">
      {isDraft && (
        <Button onClick={handleSend} disabled={isSending}>
          {isSending ? "Mengirim..." : "Kirim Campaign"}
        </Button>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger className={buttonVariants({ variant: "outline" })}>
          Kirim Test Email
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kirim Email Test</DialogTitle>
            <DialogDescription>
              Kirim satu email test ke alamat berikut untuk memastikan tampilan
              campaign sudah benar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="testEmail">Email Tujuan</Label>
              <Input
                id="testEmail"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <Button onClick={handleTest} disabled={isTesting}>
              {isTesting ? "Mengirim..." : "Kirim Test"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
