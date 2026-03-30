"use client";

import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";

export function Toaster() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`rounded-lg border px-4 py-3 shadow-lg text-sm ${
            t.variant === "destructive"
              ? "bg-destructive text-destructive-foreground border-destructive/50"
              : "bg-card text-card-foreground border-border"
          }`}
        >
          {t.title && <p className="font-semibold">{t.title}</p>}
          {t.description && (
            <p className="text-muted-foreground text-xs mt-0.5">{t.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}
