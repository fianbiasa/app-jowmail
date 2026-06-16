"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface SubscriberRowActionsProps {
  subscriberId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
}

export function SubscriberRowActions({
  subscriberId,
  email,
  firstName,
  lastName,
  status,
}: SubscriberRowActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState({ email, firstName: firstName || "", lastName: lastName || "", status });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/subscribers/${subscriberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menyimpan");
      }
      toast.success("Subscriber berhasil diperbarui.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Hapus subscriber ${email}?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/subscribers/${subscriberId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menghapus");
      }
      toast.success("Subscriber dihapus.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
          Edit
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subscriber</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={fields.email}
                onChange={(e) => setFields({ ...fields, email: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nama Depan</Label>
                <Input
                  value={fields.firstName}
                  onChange={(e) => setFields({ ...fields, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Nama Belakang</Label>
                <Input
                  value={fields.lastName}
                  onChange={(e) => setFields({ ...fields, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select
                value={fields.status}
                onChange={(e) => setFields({ ...fields, status: e.target.value })}
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              >
                <option value="subscribed">Subscribed</option>
                <option value="unsubscribed">Unsubscribed</option>
                <option value="bounced">Bounced</option>
                <option value="complained">Complained</option>
              </select>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Button
        variant="outline"
        size="sm"
        onClick={handleDelete}
        disabled={deleting}
        className="text-red-600 hover:text-red-700 hover:border-red-300"
      >
        {deleting ? "..." : "Hapus"}
      </Button>
    </div>
  );
}
