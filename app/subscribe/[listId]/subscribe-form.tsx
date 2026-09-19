"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Mail } from "lucide-react";

type State = "idle" | "loading" | "subscribed" | "already" | "error";

export function SubscribeForm({ listId }: { listId: string }) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("loading");
    setError("");

    const fd = new FormData(e.currentTarget);
    const body = {
      listId,
      email: fd.get("email") as string,
      firstName: fd.get("firstName") as string,
      lastName: fd.get("lastName") as string,
    };

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Terjadi kesalahan.");
        setState("error");
      } else {
        setState(data.status === "already" ? "already" : "subscribed");
      }
    } catch {
      setError("Koneksi gagal. Coba lagi.");
      setState("error");
    }
  }

  if (state === "subscribed") {
    return (
      <div className="text-center py-4 space-y-3">
        <div className="flex justify-center">
          <div className="bg-lime flex size-16 items-center justify-center border-3 border-foreground">
            <CheckCircle className="h-8 w-8" />
          </div>
        </div>
        <h2 className="text-xl">Terima kasih!</h2>
        <p className="text-muted-foreground text-sm font-semibold">
          Anda berhasil berlangganan. Kami akan segera mengirim email terbaru untuk Anda.
        </p>
      </div>
    );
  }

  if (state === "already") {
    return (
      <div className="text-center py-4 space-y-3">
        <div className="flex justify-center">
          <div className="bg-cyan flex size-16 items-center justify-center border-3 border-foreground">
            <Mail className="h-8 w-8" />
          </div>
        </div>
        <h2 className="text-xl">Sudah terdaftar!</h2>
        <p className="text-muted-foreground text-sm font-semibold">
          Email Anda sudah ada di daftar ini. Kami akan terus mengirimkan konten terbaru.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="firstName" className="text-sm">Nama Depan</Label>
          <Input id="firstName" name="firstName" placeholder="Budi" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName" className="text-sm">Nama Belakang</Label>
          <Input id="lastName" name="lastName" placeholder="Santoso" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-sm">Alamat Email <span className="text-red">*</span></Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="budi@example.com"
          required
        />
      </div>

      {state === "error" && (
        <p className="text-sm font-bold text-white bg-red border-2 border-foreground px-3 py-2">{error}</p>
      )}

      <Button type="submit" className="w-full" disabled={state === "loading"}>
        {state === "loading" ? "Mendaftarkan..." : "Berlangganan Sekarang"}
      </Button>
    </form>
  );
}
