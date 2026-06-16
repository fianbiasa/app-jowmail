"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function AddSubscriberForm({ listId }: { listId: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;

    try {
      const response = await fetch("/api/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId, email, firstName, lastName }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add subscriber");
      }

      toast.success("Subscriber berhasil ditambahkan.");
      (event.target as HTMLFormElement).reset();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal menambahkan subscriber"
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">Nama Depan</Label>
          <Input id="firstName" name="firstName" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Nama Belakang</Label>
          <Input id="lastName" name="lastName" />
        </div>
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Menambahkan..." : "Tambah Subscriber"}
      </Button>
    </form>
  );
}
