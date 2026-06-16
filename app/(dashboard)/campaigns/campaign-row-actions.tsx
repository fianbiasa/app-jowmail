"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";

interface CampaignRowActionsProps {
  campaignId: string;
  status: string;
}

export function CampaignRowActions({ campaignId, status }: CampaignRowActionsProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const canEdit = ["draft", "scheduled"].includes(status);
  const canDelete = !["sending", "queued"].includes(status);

  async function handleDelete() {
    if (!confirm("Hapus campaign ini? Tindakan tidak dapat dibatalkan.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menghapus");
      }
      toast.success("Campaign dihapus.");
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
        href={`/campaigns/${campaignId}`}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        Detail
      </Link>
      {canEdit && (
        <Link
          href={`/campaigns/${campaignId}/edit`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Edit
        </Link>
      )}
      {canDelete && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          disabled={deleting}
          className="text-red-600 hover:text-red-700 hover:border-red-300"
        >
          {deleting ? "..." : "Hapus"}
        </Button>
      )}
    </div>
  );
}
