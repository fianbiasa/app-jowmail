"use client";

import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Eye } from "lucide-react";

const PLACEHOLDER_CONTENT = `
<div style="padding:20px;background:#f3f4f6;border-radius:8px;color:#374151;">
  <p style="margin:0 0 8px;font-weight:600;color:#6b7280;font-size:13px;">[ Konten campaign akan muncul di sini ]</p>
  <p style="margin:0;">Halo <strong>Budi Santoso</strong>, ini adalah contoh konten email yang akan diinjeksikan ke dalam template saat pengiriman campaign.</p>
</div>`;

interface TemplatePreviewButtonProps {
  name: string;
  htmlContent: string;
}

export function TemplatePreviewButton({ name, htmlContent }: TemplatePreviewButtonProps) {
  const previewHtml = htmlContent
    .replace("{{content}}", PLACEHOLDER_CONTENT)
    .replace(/\{\{full_name\}\}/g, "Budi Santoso")
    .replace(/\{\{first_name\}\}/g, "Budi")
    .replace(/\{\{last_name\}\}/g, "Santoso")
    .replace(/\{\{email\}\}/g, "budi@example.com")
    .replace(/\{\{unsubscribe_url\}\}/g, "#");

  return (
    <Dialog>
      <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" }) + " gap-1"}>
        <Eye className="h-3.5 w-3.5" />
        Preview
      </DialogTrigger>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Preview: {name}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden bg-slate-100 p-4">
          <iframe
            srcDoc={previewHtml}
            className="w-full h-full rounded bg-white shadow"
            sandbox="allow-scripts"
            title={`Preview ${name}`}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
