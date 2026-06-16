"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { UploadCloud, FileText, X, CheckCircle } from "lucide-react";

interface ParsedRow {
  email: string;
  firstName?: string;
  lastName?: string;
}

function parseCsvText(text: string): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/);
  const rows: ParsedRow[] = [];
  const start = /^(email|e-?mail)/i.test(lines[0]?.split(",")[0] ?? "") ? 1 : 0;
  for (let i = start; i < lines.length; i++) {
    const [email, firstName, lastName] = lines[i]
      .split(",")
      .map((s) => s.trim().replace(/^["']|["']$/g, ""));
    if (email && email.includes("@"))
      rows.push({ email, firstName: firstName || undefined, lastName: lastName || undefined });
  }
  return rows;
}

export function ImportCsvForm({ listId }: { listId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  function handleFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      toast.error("File harus berformat .csv");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCsvText(text);
      setRows(parsed);
      if (parsed.length === 0)
        toast.error("Tidak ada email valid ditemukan di file CSV.");
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/subscribers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId, subscribers: rows }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal import");
      toast.success(
        `Berhasil import ${result.created} subscriber.` +
          (result.skipped > 0 ? ` ${result.skipped} dilewati (duplikat).` : "") +
          (result.truncated > 0 ? ` ${result.truncated} dipotong (kuota penuh).` : "")
      );
      setRows([]);
      setFileName("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal import");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed cursor-pointer py-10 transition-colors ${
          isDragging
            ? "border-indigo-500 bg-indigo-50"
            : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50"
        }`}
      >
        <UploadCloud className={`h-10 w-10 ${isDragging ? "text-indigo-500" : "text-slate-300"}`} />
        <p className="text-sm font-medium text-slate-700">
          Drag & drop file CSV, atau{" "}
          <span className="text-indigo-600">klik untuk pilih</span>
        </p>
        <p className="text-xs text-slate-400">
          Format: email, first_name, last_name (baris header opsional)
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>

      {rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <FileText className="h-4 w-4 text-indigo-500" />
              <span className="font-medium">{fileName}</span>
              <span className="text-slate-300">·</span>
              <span className="font-semibold text-indigo-600">
                {rows.length} email valid
              </span>
            </div>
            <button
              type="button"
              onClick={() => { setRows([]); setFileName(""); }}
              className="text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="rounded-lg border overflow-hidden text-sm">
            <table className="w-full">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2.5 text-left">Email</th>
                  <th className="px-4 py-2.5 text-left">Nama Depan</th>
                  <th className="px-4 py-2.5 text-left">Nama Belakang</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.slice(0, 5).map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-700">{r.email}</td>
                    <td className="px-4 py-2 text-slate-400">{r.firstName || "—"}</td>
                    <td className="px-4 py-2 text-slate-400">{r.lastName || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 5 && (
              <p className="px-4 py-2 bg-slate-50 text-xs text-slate-400 text-center border-t">
                + {rows.length - 5} baris lainnya tidak ditampilkan
              </p>
            )}
          </div>

          <Button onClick={handleImport} disabled={isLoading} className="w-full gap-2">
            <CheckCircle className="h-4 w-4" />
            {isLoading ? "Mengimport..." : `Import ${rows.length} Subscriber`}
          </Button>
        </div>
      )}
    </div>
  );
}
