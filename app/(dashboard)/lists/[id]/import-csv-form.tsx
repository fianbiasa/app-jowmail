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

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i <= line.length) {
    if (line[i] === '"') {
      let field = "";
      i++;
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { field += '"'; i += 2; }
        else if (line[i] === '"') { i++; break; }
        else field += line[i++];
      }
      fields.push(field.trim());
      if (line[i] === ",") i++;
    } else {
      const end = line.indexOf(",", i);
      if (end === -1) { fields.push(line.slice(i).trim()); break; }
      fields.push(line.slice(i, end).trim());
      i = end + 1;
    }
  }
  return fields;
}

function parseCsvText(text: string): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];

  const firstFields = parseCsvLine(lines[0]);
  const hasHeader = firstFields.some((f) =>
    /^(email|name|first.?name|last.?name|status)/i.test(f)
  );

  let emailIdx = -1, nameIdx = -1, firstIdx = -1, lastIdx = -1, statusIdx = -1;
  let startRow = 0;

  if (hasHeader) {
    startRow = 1;
    firstFields.forEach((col, i) => {
      const c = col.toLowerCase().replace(/[_\s-]/g, "");
      if (c === "email") emailIdx = i;
      else if (c === "name") nameIdx = i;
      else if (c === "firstname") firstIdx = i;
      else if (c === "lastname") lastIdx = i;
      else if (c === "status") statusIdx = i;
    });
  } else {
    emailIdx = 0; firstIdx = 1; lastIdx = 2;
  }

  const rows: ParsedRow[] = [];
  for (let i = startRow; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    const status = statusIdx >= 0 ? fields[statusIdx]?.toLowerCase() : "";
    if (status === "unsubscribed" || status === "bounced") continue;

    const email = (emailIdx >= 0 ? fields[emailIdx] : "") ?? "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;

    let firstName: string | undefined;
    let lastName: string | undefined;

    if (nameIdx >= 0) {
      const full = fields[nameIdx]?.trim() ?? "";
      const sp = full.indexOf(" ");
      if (sp >= 0) { firstName = full.slice(0, sp); lastName = full.slice(sp + 1); }
      else firstName = full || undefined;
    } else {
      firstName = (firstIdx >= 0 ? fields[firstIdx] : undefined) || undefined;
      lastName = (lastIdx >= 0 ? fields[lastIdx] : undefined) || undefined;
    }

    rows.push({ email, firstName, lastName });
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
      if (!res.ok) throw new Error(typeof result.error === "string" ? result.error : "Gagal import");
      toast.success(
        `Berhasil import ${result.created} subscriber.` +
          (result.skipped > 0 ? ` ${result.skipped} dilewati (duplikat).` : "") +
          (result.truncated > 0 ? ` ${result.truncated} dipotong (kuota penuh).` : "") +
          (result.invalidCount > 0 ? ` ${result.invalidCount} email tidak valid dilewati.` : "")
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
          Mendukung kolom: email, name, first_name, last_name, status
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
