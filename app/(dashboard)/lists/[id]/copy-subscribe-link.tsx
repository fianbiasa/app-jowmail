"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopySubscribeLink({ listId }: { listId: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/subscribe/${listId}`;

  async function copy() {
    await navigator.clipboard.writeText(
      `${window.location.origin}/subscribe/${listId}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="outline" size="sm" onClick={copy} className="gap-1.5 shrink-0">
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Tersalin!" : "Copy Link"}
    </Button>
  );
}
