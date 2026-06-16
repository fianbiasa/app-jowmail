"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function CreateListForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    try {
      const response = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create list");
      }

      toast.success("List berhasil dibuat.");
      (event.target as HTMLFormElement).reset();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal membuat list"
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-2">
        <Label htmlFor="name">Nama List</Label>
        <Input
          id="name"
          name="name"
          placeholder="Newsletter Subscribers"
          required
        />
      </div>
      <div className="flex-[2] space-y-2">
        <Label htmlFor="description">Deskripsi</Label>
        <Input
          id="description"
          name="description"
          placeholder="Deskripsi singkat tentang list ini"
        />
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Membuat..." : "Buat List"}
      </Button>
    </form>
  );
}
