"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ListRowActionsProps {
  listId: string;
  name: string;
  description: string | null;
}

export function ListRowActions({ listId, name, description }: ListRowActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editDesc, setEditDesc] = useState(description || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/lists/${listId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, description: editDesc }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menyimpan");
      }
      toast.success("List berhasil diperbarui.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Hapus list "${name}"? Semua subscriber di list ini juga akan dihapus.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/lists/${listId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menghapus");
      }
      toast.success("List dihapus.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/lists/${listId}`}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        Kelola
      </Link>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
          Edit
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit List</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor={`name-${listId}`}>Nama List</Label>
              <Input
                id={`name-${listId}`}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`desc-${listId}`}>Deskripsi</Label>
              <Textarea
                id={`desc-${listId}`}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
              />
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
