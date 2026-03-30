"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LogoCanvasProps {
  imageUrl: string | null;
  isLoading: boolean;
}

const LogoCanvas = ({ imageUrl, isLoading }: LogoCanvasProps) => {
  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `logo-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="relative flex flex-col items-center gap-4">
      <div className="relative w-full aspect-square max-w-md rounded-xl border border-border bg-card overflow-hidden flex items-center justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Gerando seu logo…</p>
          </div>
        ) : imageUrl ? (
          <img src={imageUrl} alt="Logo gerado" className="w-full h-full object-contain p-4" />
        ) : (
          <div className="text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-secondary mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">✦</span>
            </div>
            <p className="text-muted-foreground text-sm">Seu logo aparecerá aqui</p>
          </div>
        )}
      </div>
      {imageUrl && !isLoading && (
        <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
          <Download className="h-4 w-4" />
          Baixar PNG
        </Button>
      )}
    </div>
  );
};

export default LogoCanvas;
