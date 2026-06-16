"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { PLANS, type PlanKey } from "@/lib/plans";

interface OrgData {
  id: string;
  name: string;
  plan: string;
  quotaSubscribers: number;
  quotaEmailsPerMonth: number;
}

export function OrgEditDialog({ org }: { org: OrgData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState(org.plan);
  const [quotaSub, setQuotaSub] = useState(String(org.quotaSubscribers));
  const [quotaEmail, setQuotaEmail] = useState(String(org.quotaEmailsPerMonth));
  const [saving, setSaving] = useState(false);

  function applyPreset(key: PlanKey) {
    setPlan(key);
    setQuotaSub(String(PLANS[key].quotaSubscribers));
    setQuotaEmail(String(PLANS[key].quotaEmailsPerMonth));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/organizations/${org.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          quotaSubscribers: Number(quotaSub),
          quotaEmailsPerMonth: Number(quotaEmail),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Gagal menyimpan");
      toast.success(`Plan ${org.name} berhasil diupdate.`);
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" }) + " gap-1"}>
        <Pencil className="h-3 w-3" /> Edit
      </DialogTrigger>
      <DialogContent className="max-w-md space-y-5">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Edit Plan — {org.name}</DialogTitle>
        </DialogHeader>

          {/* Plan presets */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-500 uppercase tracking-wide">Preset Plan</Label>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(PLANS) as PlanKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold border transition-colors capitalize ${
                    plan === key
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "border-slate-200 text-slate-600 hover:border-indigo-400"
                  }`}
                >
                  {PLANS[key].label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="quotaSub" className="text-sm">
                Quota Subscriber <span className="text-slate-400">(-1 = unlimited)</span>
              </Label>
              <Input
                id="quotaSub"
                type="number"
                min={-1}
                value={quotaSub}
                onChange={(e) => setQuotaSub(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quotaEmail" className="text-sm">
                Quota Email/Bulan <span className="text-slate-400">(-1 = unlimited)</span>
              </Label>
              <Input
                id="quotaEmail"
                type="number"
                min={-1}
                value={quotaEmail}
                onChange={(e) => setQuotaEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
      </DialogContent>
    </Dialog>
  );
}
