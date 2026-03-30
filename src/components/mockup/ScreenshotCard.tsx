"use client";

import { useState } from "react";
import { X, ArrowUp, ArrowDown, Wand2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import type { ScreenshotItem } from "@/types/logo";

interface ScreenshotCardProps {
  screenshot: ScreenshotItem;
  onUpdate: (updates: Partial<ScreenshotItem>) => void;
  onRemove: () => void;
  disabled: boolean;
}

const ScreenshotCard = ({ screenshot, onUpdate, onRemove, disabled }: ScreenshotCardProps) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      className={`group relative rounded-xl border overflow-hidden transition-all ${
        isFocused ? "border-primary shadow-md shadow-primary/10" : "border-border hover:border-primary/30"
      } bg-card`}
    >
      {/* Remove button */}
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 z-10 h-5 w-5 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-3 w-3" />
      </button>

      {/* Screenshot image */}
      <div className="aspect-[9/16] max-h-[200px] bg-secondary/30 overflow-hidden">
        <img
          src={screenshot.imageData}
          alt="Screenshot"
          className="w-full h-full object-contain"
        />
      </div>

      {/* Caption editor */}
      <div className="p-2.5 space-y-2 border-t border-border">
        {/* Text position toggle */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onUpdate({ textPosition: "top" })}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              screenshot.textPosition === "top"
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowUp className="h-2.5 w-2.5" />
            Topo
          </button>
          <button
            onClick={() => onUpdate({ textPosition: "bottom" })}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              screenshot.textPosition === "bottom"
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowDown className="h-2.5 w-2.5" />
            Base
          </button>
        </div>

        {/* Caption input */}
        <Textarea
          value={screenshot.caption}
          onChange={(e) => onUpdate({ caption: e.target.value })}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Escreva a frase do mockup…"
          className="text-xs min-h-[48px] max-h-[80px] resize-none bg-background border-border"
          disabled={disabled}
        />

        {/* AI suggestion */}
        {screenshot.aiSuggestion && screenshot.aiSuggestion !== screenshot.caption && (
          <button
            onClick={() => onUpdate({ caption: screenshot.aiSuggestion })}
            className="flex items-start gap-1.5 w-full text-left px-2 py-1.5 rounded-md bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            <Wand2 className="h-3 w-3 text-primary shrink-0 mt-0.5" />
            <span className="text-[10px] text-primary/80 leading-tight">{screenshot.aiSuggestion}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ScreenshotCard;
