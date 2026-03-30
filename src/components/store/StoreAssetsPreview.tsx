"use client";

import { useState } from "react";
import { Download, Apple, Play, Edit2, Check, X, Smartphone, Sparkles, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { StoreMetadata } from "@/types/logo";

interface StoreAssetsPreviewProps {
  imageUrl: string | null;
  isLoading: boolean;
  storeData: StoreMetadata;
  onStoreDataChange: (data: StoreMetadata) => void;
}

type EditableStringField = Exclude<keyof StoreMetadata, "screenshotCaptions">;

const StoreAssetsPreview = ({
  imageUrl,
  isLoading,
  storeData,
  onStoreDataChange,
}: StoreAssetsPreviewProps) => {
  const [platform, setPlatform] = useState<"ios" | "android">("ios");
  const [editingField, setEditingField] = useState<EditableStringField | null>(null);
  const [editValue, setEditValue] = useState("");
  const { toast } = useToast();

  const startEdit = (field: EditableStringField) => {
    setEditingField(field);
    setEditValue((storeData[field] as string) || "");
  };

  const saveEdit = () => {
    if (editingField) {
      onStoreDataChange({ ...storeData, [editingField]: editValue });
      setEditingField(null);
    }
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `store-mockup-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyCaption = (caption: string) => {
    navigator.clipboard.writeText(caption);
    toast({ title: "Copiado!", description: caption });
  };

  const renderField = (
    label: string,
    field: EditableStringField,
    multiline = false,
    maxChars?: number
  ) => {
    const value = storeData[field] as string | undefined;
    const isEditing = editingField === field;

    return (
      <div className="group">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            {label}
            {maxChars && <span className="ml-1 opacity-60">({maxChars} max)</span>}
          </span>
          {!isEditing && value && (
            <button
              onClick={() => startEdit(field)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Edit2 className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="flex gap-1.5 items-start">
            {multiline ? (
              <Textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="text-xs min-h-[60px] bg-background"
                maxLength={maxChars}
                autoFocus
              />
            ) : (
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="text-xs h-7 bg-background"
                maxLength={maxChars}
                autoFocus
              />
            )}
            <div className="flex flex-col gap-1">
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={saveEdit}>
                <Check className="h-3 w-3 text-accent" />
              </Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={cancelEdit}>
                <X className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          </div>
        ) : value ? (
          <p
            className="text-xs text-foreground cursor-pointer hover:bg-secondary/50 rounded px-1.5 py-1 -mx-1.5 transition-colors"
            onClick={() => startEdit(field)}
          >
            {value}
          </p>
        ) : (
          <p
            className="text-xs text-muted-foreground/50 italic cursor-pointer hover:bg-secondary/50 rounded px-1.5 py-1 -mx-1.5 transition-colors"
            onClick={() => startEdit(field)}
          >
            Clique para adicionar ou gere com IA…
          </p>
        )}
      </div>
    );
  };

  const hasAnyData = Object.values(storeData).some((v) => v && (Array.isArray(v) ? v.length > 0 : true));
  const captions = storeData.screenshotCaptions || [];

  return (
    <div className="flex flex-col gap-4">
      {/* Platform toggle */}
      <div className="flex items-center gap-1 p-0.5 rounded-lg bg-secondary w-fit">
        <button
          onClick={() => setPlatform("ios")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            platform === "ios"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Apple className="h-3 w-3" />
          App Store
        </button>
        <button
          onClick={() => setPlatform("android")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            platform === "android"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Play className="h-3 w-3" />
          Google Play
        </button>
      </div>

      {/* Screenshot captions */}
      {captions.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Frases para Screenshots
            </span>
          </div>
          <div className="space-y-2">
            {captions.map((caption, i) => (
              <div
                key={i}
                className="group flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
                onClick={() => copyCaption(caption)}
              >
                <span className="text-xs font-bold text-primary/60 shrink-0 w-5">{i + 1}.</span>
                <span className="text-sm font-medium text-foreground flex-1">{caption}</span>
                <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Clique em uma frase para copiar. Use como títulos nas imagens do store.
          </p>
        </div>
      )}

      {/* Preview card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Screenshot area */}
        <div className="relative aspect-[9/16] max-h-[280px] bg-secondary/50 flex items-center justify-center overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              <p className="text-xs text-muted-foreground">Gerando mockup…</p>
            </div>
          ) : imageUrl ? (
            <img src={imageUrl} alt="Store mockup" className="w-full h-full object-contain p-2" />
          ) : (
            <div className="text-center p-6">
              <div className="w-12 h-12 rounded-2xl bg-secondary mx-auto mb-3 flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">Envie um screenshot ou gere um mockup</p>
            </div>
          )}
        </div>

        {/* Metadata fields */}
        <div className="p-4 space-y-3 border-t border-border">
          {renderField(platform === "ios" ? "App Name" : "Title", "appName", false, 30)}
          {renderField(
            platform === "ios" ? "Subtitle" : "Short Description",
            "subtitle",
            false,
            platform === "ios" ? 30 : 80
          )}
          {renderField("Description", "description", true, 4000)}
          {renderField(
            platform === "ios" ? "Promotional Text" : "Promo Text",
            "promotionalText",
            true,
            170
          )}
          {renderField("Keywords", "keywords", false, 100)}
          {renderField("What's New", "whatsNew", true, 4000)}
          {renderField("Category", "category", false)}
        </div>
      </div>

      {/* Actions */}
      {(imageUrl || hasAnyData) && !isLoading && (
        <div className="flex gap-2">
          {imageUrl && (
            <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2 text-xs">
              <Download className="h-3 w-3" />
              Baixar Mockup
            </Button>
          )}
          {hasAnyData && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs"
              onClick={() => {
                const text = Object.entries(storeData)
                  .filter(([k, v]) => v && k !== "screenshotCaptions")
                  .map(([k, v]) => `${k}: ${v}`)
                  .join("\n\n");
                const captionsText =
                  captions.length > 0
                    ? "\n\nScreenshot Captions:\n" + captions.map((c, i) => `${i + 1}. ${c}`).join("\n")
                    : "";
                navigator.clipboard.writeText(text + captionsText);
                toast({ title: "Metadata copiado!" });
              }}
            >
              <Copy className="h-3 w-3" />
              Copiar Metadata
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default StoreAssetsPreview;
