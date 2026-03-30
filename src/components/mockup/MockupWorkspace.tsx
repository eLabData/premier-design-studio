"use client";

import { useState, useCallback } from "react";
import { Upload, ImagePlus, Sparkles, Wand2, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ScreenshotCard from "./ScreenshotCard";
import DeviceOptions from "./DeviceOptions";
import MockupGallery from "./MockupGallery";
import type { ScreenshotItem, MockupConfig } from "@/types/logo";

interface MockupWorkspaceProps {
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
}

const MockupWorkspace = ({ isLoading, setIsLoading }: MockupWorkspaceProps) => {
  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [config, setConfig] = useState<MockupConfig>({
    platform: "ios",
    devices: ["iphone"],
    layout: "single",
    bgStyle: "gradient",
  });
  const [generatedMockups, setGeneratedMockups] = useState<string[]>([]);
  const [suggestingCaptions, setSuggestingCaptions] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const { toast } = useToast();

  const updateMockup = (index: number, newImage: string) => {
    setGeneratedMockups((prev) => prev.map((img, i) => (i === index ? newImage : img)));
  };

  const resizeImage = (dataUrl: string, maxWidth = 1200, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w);
          w = maxWidth;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = dataUrl;
    });
  };

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (fileArray.length === 0) return;

      const oversized = fileArray.filter((f) => f.size > 10 * 1024 * 1024);
      if (oversized.length > 0) {
        toast({
          title: "Arquivo muito grande",
          description: `${oversized.length} arquivo(s) acima de 10MB`,
          variant: "destructive",
        });
      }

      const valid = fileArray.filter((f) => f.size <= 10 * 1024 * 1024);
      valid.forEach((file) => {
        const reader = new FileReader();
        reader.onload = async () => {
          const compressed = await resizeImage(reader.result as string);
          const newItem: ScreenshotItem = {
            id: crypto.randomUUID(),
            imageData: compressed,
            caption: "",
            textPosition: "top",
          };
          setScreenshots((prev) => [...prev, newItem]);
        };
        reader.readAsDataURL(file);
      });
    },
    [toast]
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
    e.target.value = "";
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  const updateScreenshot = (id: string, updates: Partial<ScreenshotItem>) => {
    setScreenshots((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const removeScreenshot = (id: string) => {
    setScreenshots((prev) => prev.filter((s) => s.id !== id));
  };

  const suggestCaptions = async () => {
    if (screenshots.length === 0) return;
    setSuggestingCaptions(true);

    try {
      const { supabase } = await import("@/lib/supabase");
      const { data, error } = await supabase.functions.invoke("generate-store-assets", {
        body: {
          conversationHistory: [
            {
              role: "user",
              content: `Analyze these ${screenshots.length} app screenshots and suggest a short, catchy marketing caption for each one. The captions should be in Portuguese (BR), bold and compelling — the kind that drives downloads on the App Store/Google Play. Number them 1 to ${screenshots.length}.`,
              imageData: screenshots[0].imageData,
            },
          ],
          mode: "suggest-captions",
          screenshotCount: screenshots.length,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const captions: string[] = data.captions || [];
      setScreenshots((prev) =>
        prev.map((s, i) => ({
          ...s,
          aiSuggestion: captions[i] || "",
          caption: s.caption || captions[i] || "",
        }))
      );

      toast({ title: "Sugestões prontas!", description: "Edite as frases como quiser." });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Erro ao sugerir", description: message, variant: "destructive" });
    } finally {
      setSuggestingCaptions(false);
    }
  };

  const generateMockups = async () => {
    if (screenshots.length === 0) return;
    setIsLoading(true);
    setGeneratedMockups([]);
    setProgress({ current: 0, total: screenshots.length });

    try {
      const { supabase } = await import("@/lib/supabase");
      const results: string[] = [];

      for (let i = 0; i < screenshots.length; i++) {
        const screenshot = screenshots[i];
        setProgress({ current: i + 1, total: screenshots.length });

        const { data, error } = await supabase.functions.invoke("generate-store-assets", {
          body: {
            conversationHistory: [
              {
                role: "user",
                content: `Create a professional store screenshot mockup with this configuration:
- Device: ${config.devices.join(", ")}
- EXACT caption to display (copy character by character, do NOT change spelling or capitalization): "${screenshot.caption}"
- Text position: ${screenshot.textPosition}
- Layout: ${config.layout}
- Background: vibrant gradient
CRITICAL: The caption text MUST be reproduced EXACTLY as written above — same spelling, same case, same words. Do NOT rephrase, translate, abbreviate, or convert to ALL CAPS.`,
                imageData: screenshot.imageData,
              },
            ],
            mode: "mockup",
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        if (data?.image) results.push(data.image);
      }

      setGeneratedMockups(results);
      toast({ title: "Mockups gerados!", description: `${results.length} mockup(s) criado(s)` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Erro ao gerar", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const batchRegenerate = async (instruction: string) => {
    if (generatedMockups.length === 0) return;
    setIsLoading(true);
    setProgress({ current: 0, total: generatedMockups.length });

    try {
      const { supabase } = await import("@/lib/supabase");
      const results: string[] = [];

      for (let i = 0; i < generatedMockups.length; i++) {
        setProgress({ current: i + 1, total: generatedMockups.length });
        const screenshot = screenshots[i];

        const { data, error } = await supabase.functions.invoke("generate-store-assets", {
          body: {
            conversationHistory: [
              {
                role: "user",
                content: `Edit this mockup with the following instruction: ${instruction}. Keep the app screenshot content EXACTLY the same, only change what was requested. Caption: "${screenshot?.caption || ""}"`,
                imageData: generatedMockups[i] || undefined,
              },
            ],
            mode: "edit-mockup",
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        results.push(data?.image || generatedMockups[i]);
      }

      setGeneratedMockups(results);
      toast({
        title: "Mockups atualizados!",
        description: `${results.length} mockup(s) editado(s) em lote`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Erro ao editar em lote", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload area */}
      {screenshots.length === 0 ? (
        <div
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer ${
            isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById("mockup-upload")?.click()}
        >
          <input
            id="mockup-upload"
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <div className="w-16 h-16 rounded-2xl bg-secondary mx-auto mb-4 flex items-center justify-center">
            <ImagePlus className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">
            Arraste screenshots aqui ou clique para selecionar
          </p>
          <p className="text-xs text-muted-foreground">
            Selecione múltiplas imagens do seu app para criar mockups profissionais
          </p>
        </div>
      ) : (
        <>
          {/* Screenshot grid with captions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Screenshots ({screenshots.length})
                </h3>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-secondary hover:bg-secondary/80 text-muted-foreground transition-colors">
                    <Upload className="h-2.5 w-2.5" />
                    Adicionar
                  </div>
                </label>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-7"
                onClick={suggestCaptions}
                disabled={suggestingCaptions || isLoading}
              >
                {suggestingCaptions ? (
                  <div className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                ) : (
                  <Wand2 className="h-3 w-3" />
                )}
                {suggestingCaptions ? "Sugerindo…" : "IA Sugerir Frases"}
              </Button>
            </div>

            <div
              className={`grid grid-cols-2 lg:grid-cols-3 gap-3 ${
                isDragging ? "ring-2 ring-primary rounded-xl" : ""
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {screenshots.map((screenshot) => (
                <ScreenshotCard
                  key={screenshot.id}
                  screenshot={screenshot}
                  onUpdate={(updates) => updateScreenshot(screenshot.id, updates)}
                  onRemove={() => removeScreenshot(screenshot.id)}
                  disabled={isLoading}
                />
              ))}
            </div>
          </div>

          {/* Device & layout options */}
          <DeviceOptions config={config} onChange={setConfig} />

          {/* Generate button + progress */}
          <div className="space-y-3">
            <div className="flex justify-center">
              <Button
                size="lg"
                className="gap-2 px-8"
                onClick={generateMockups}
                disabled={isLoading || screenshots.every((s) => !s.caption)}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {isLoading
                  ? "Gerando Mockups…"
                  : `Gerar ${screenshots.length} Mockup(s)`}
              </Button>
            </div>

            {isLoading && progress.total > 0 && (
              <div className="max-w-md mx-auto space-y-2">
                <Progress value={(progress.current / progress.total) * 100} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">
                  Processando screenshot {progress.current} de {progress.total}
                  {" · "}
                  {Math.round((progress.current / progress.total) * 100)}%
                  {progress.total > 1 && (
                    <span className="ml-1">
                      · ~{(progress.total - progress.current) * 20}s restantes
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Generated mockups gallery */}
          {generatedMockups.length > 0 && (
            <MockupGallery
              mockups={generatedMockups}
              onMockupUpdate={updateMockup}
              screenshots={screenshots}
              isLoading={isLoading}
              onBatchRegenerate={batchRegenerate}
            />
          )}
        </>
      )}
    </div>
  );
};

export default MockupWorkspace;
