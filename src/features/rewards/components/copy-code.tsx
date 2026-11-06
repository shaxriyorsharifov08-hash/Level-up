"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/** A redemption code with a copy-to-clipboard button. */
export function CopyCode({ code, className }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard may be unavailable (insecure context); the code is still visible.
        }
      }}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted px-3 py-1.5 font-mono text-sm font-semibold tracking-wider hover:bg-accent",
        className,
      )}
      aria-label={`Copy code ${code}`}
    >
      {code}
      {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5 text-muted-foreground" />}
    </button>
  );
}
