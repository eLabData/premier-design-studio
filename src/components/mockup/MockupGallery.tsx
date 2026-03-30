"use client";

import { useState } from "react";
import { Download, Wand2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MockupEditorDialog from "./MockupEditorDialog";
import type { ScreenshotItem } from "@/types/logo";

interface MockupGalleryProps {
  mockups: string[];
  onMockupUpdate?: (index: number, newImage: string) => void;
  screenshots?: ScreenshotItem[];
  isLoading?: boolean;
  onBatchRegenerate?: (instruction: string) => Promise<void>;
}

const batchPresets = [
  {
    label: "iPhone 16 Pro Max",
    instruction:
      "Change the device frame to an iPhone 16 Pro Max with thin bezels and Dynamic Island",
  },
  {
    label: "iPhone 15 Pro",
    instruction: "Change the device frame to an iPhone 15 Pro with titanium frame",
  },
  {
    label: "Samsung Galaxy S24",
    instruction: "Change the device frame to a Samsung Galaxy S24 Ultra",
  },
  {
    label: "Pixel 9 Pro",
    instruction: "Change the device frame to a Google Pixel 9 Pro",
  },
  {
    label: "Fundo escuro",
    instruction:
      "Change the background to a dark, elegant gradient while keeping everything else the same",
  },
  {
    label: "Fundo claro",
    instruction:
      "Change the background to a bright, clean white/light gradient while keeping everything else the same",
  },
];

const MockupGallery = ({
  mockups,
  onMockupUpdate,
  isLoading,
  onBatchRegenerate,
}: MockupGalleryProps) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showBatchEdit, setShowBatchEdit] = useState(false);
  const [customInstruction, setCustomInstruction] = useState("");

  const handleDownload = (imageUrl: string, index: number) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `mockup-${index + 1}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    mockups.forEach((url, i) => {
      setTimeout(() => handleDownload(url, i), i * 300);
    });
  };

  const handleBatchEdit = (instruction: string) => {
    if (!instruction.trim() || !onBatchRegenerate) return;
    onBatchRegenerate(instruction);
    setShowBatchEdit(false);
    setCustomInstruction("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Mockups Gerados ({mockups.length})
        </h3>
        <div className="flex gap-1.5">
          {onBatchRegenerate && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-7"
              onClick={() => setShowBatchEdit(!showBatchEdit)}
              disabled={isLoading}
            >
              <Wand2 className="h-3 w-3" />
              Editar em Lote
            </Button>
          )}
          {mockups.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-7"
              onClick={handleDownloadAll}
            >
              <Download className="h-3 w-3" />
              Baixar Todos
            </Button>
          )}
        </div>
      </div>

      {/* Batch edit panel */}
      {showBatchEdit && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Aplique uma alteração a todos os mockups de uma vez:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {batchPresets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handleBatchEdit(preset.instruction)}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground hover:bg-accent/15 hover:text-accent transition-colors border border-transparent hover:border-accent/30 disabled:opacity-50"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder="Ou digite uma instrução personalizada..."
              className="text-xs h-8"
              onKeyDown={(e) => e.key === "Enter" && handleBatchEdit(customInstruction)}
              disabled={isLoading}
            />
            <Button
              size="sm"
              className="h-8 px-3"
              onClick={() => handleBatchEdit(customInstruction)}
              disabled={isLoading || !customInstruction.trim()}
            >
              {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {mockups.map((url, i) => (
          <div
            key={i}
            className="group relative rounded-xl border border-border overflow-hidden bg-card cursor-pointer hover:border-primary/40 transition-colors"
            onClick={() => setEditingIndex(i)}
          >
            <div className="aspect-[9/16] bg-secondary/30">
              <img src={url} alt={`Mockup ${i + 1}`} className="w-full h-full object-contain" />
            </div>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <span className="text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 px-3 py-1.5 rounded-full">
                Clique para editar
              </span>
            </div>
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="secondary"
                className="h-7 gap-1 text-xs shadow-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(url, i);
                }}
              >
                <Download className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {editingIndex !== null && (
        <MockupEditorDialog
          open={true}
          onClose={() => setEditingIndex(null)}
          initialImage={mockups[editingIndex]}
          onImageUpdate={(newImage) => onMockupUpdate?.(editingIndex, newImage)}
        />
      )}
    </div>
  );
};

export default MockupGallery;
