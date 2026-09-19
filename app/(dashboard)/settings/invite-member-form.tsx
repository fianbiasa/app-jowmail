"use client";

import { useState } from "react";
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

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  token: string;
}

export function InviteMemberForm({
  organizationId,
  pendingInvites,
}: {
  organizationId: string;
  pendingInvites: PendingInvite[];
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(false);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, email, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengirim undangan");
      toast.success(`Undangan dikirim ke ${email}`);
      setEmail("");
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-black uppercase tracking-wide">Undang Anggota Baru</h4>
      <form onSubmit={handleInvite} className="flex gap-2 items-end">
        <div className="flex-1 space-y-1">
          <Label htmlFor="inviteEmail">Email</Label>
          <Input
            id="inviteEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="rekan@contoh.com"
            required
          />
        </div>
        <div className="space-y-1">
          <Label>Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v ?? role)}>
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Mengirim..." : "Undang"}
        </Button>
      </form>

      {pendingInvites.length > 0 && (
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-muted-foreground mb-2">Undangan Tertunda</p>
          <div className="border-3 border-foreground">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-3 py-2 border-b-2 border-dashed border-foreground/20 last:border-b-0">
                <div>
                  <p className="text-sm font-bold">{inv.email}</p>
                  <p className="text-xs text-muted-foreground capitalize font-semibold">{inv.role}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${appUrl}/auth/invite/${inv.token}`
                    );
                    toast.success("Link undangan disalin");
                  }}
                  className="text-xs font-bold underline decoration-2"
                >
                  Salin link
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
