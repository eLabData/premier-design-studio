"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Upload, Sparkles, RotateCcw, Lightbulb, X, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { ChatMessage } from "@/types/logo";

export type { ChatMessage };

interface LogoChatProps {
  onNewImage: (url: string) => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

const LogoChat = ({ onNewImage, isLoading, setIsLoading, messages, setMessages }: LogoChatProps) => {
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (fileArray.length === 0) return;

      const oversized = fileArray.filter((f) => f.size > 4 * 1024 * 1024);
      if (oversized.length > 0) {
        toast({
          title: "Arquivo muito grande",
          description: `${oversized.length} arquivo(s) acima de 4MB ignorado(s)`,
          variant: "destructive",
        });
      }

      const valid = fileArray.filter((f) => f.size <= 4 * 1024 * 1024);
      valid.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => setPendingImages((prev) => [...prev, reader.result as string]);
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
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  const removePendingImage = (index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async (wantsAnalysis = false) => {
    const text = input.trim();
    if (!text && pendingImages.length === 0) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content:
        text ||
        (wantsAnalysis ? "Analyze this logo and suggest improvements" : "Generate a logo based on this image"),
      imageData: pendingImages[0] || undefined,
      wantsAnalysis,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setPendingImages([]);
    setIsLoading(true);

    try {
      const { supabase } = await import("@/lib/supabase");

      const conversationHistory = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
        imageData: m.imageData,
        wantsAnalysis: m.wantsAnalysis,
      }));

      const { data, error } = await supabase.functions.invoke("generate-logo", {
        body: {
          conversationHistory,
          mode: wantsAnalysis ? "suggest" : "create",
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.text || data.suggestions || "Here's your updated logo!",
        generatedImage: data.image,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (data.image) onNewImage(data.image);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast({
        title: "Falha ao gerar",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetConversation = () => {
    setMessages([]);
    setPendingImages([]);
    setInput("");
    onNewImage("");
  };

  return (
    <div
      ref={dropRef}
      className={`relative flex flex-col h-full border rounded-xl bg-card overflow-hidden transition-colors ${
        isDragging ? "border-primary border-2 bg-primary/5" : "border-border"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Logo Chat</span>
          {messages.length > 0 && (
            <span className="text-xs text-muted-foreground">({messages.length} mensagens)</span>
          )}
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={resetConversation} className="gap-1 text-xs h-7">
            <RotateCcw className="h-3 w-3" />
            Novo
          </Button>
        )}
      </div>

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-sm rounded-xl pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-primary">
            <ImagePlus className="h-10 w-10" />
            <span className="text-sm font-medium">Solte as imagens aqui</span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[500px]">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-2xl bg-secondary mx-auto mb-3 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">Inicie uma conversa</p>
            <p className="text-xs text-muted-foreground/70">
              Descreva um logo ou arraste imagens aqui. A IA mantém o contexto entre mensagens.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground"
              }`}
            >
              {msg.imageData && (
                <img src={msg.imageData} alt="Enviado" className="max-h-24 rounded-lg mb-2" />
              )}
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.generatedImage && (
                <img
                  src={msg.generatedImage}
                  alt="Gerado"
                  className="max-h-40 rounded-lg mt-2 cursor-pointer"
                  onClick={() => onNewImage(msg.generatedImage!)}
                />
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span className="text-xs text-muted-foreground">Gerando…</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pending images preview */}
      {pendingImages.length > 0 && (
        <div className="px-4 py-2 border-t border-border bg-secondary/20">
          <div className="flex items-center gap-2 overflow-x-auto">
            {pendingImages.map((img, i) => (
              <div key={i} className="relative group shrink-0">
                <img src={img} alt={`Upload ${i + 1}`} className="h-12 w-12 rounded-lg object-cover" />
                <button
                  onClick={() => removePendingImage(i)}
                  className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
            <span className="text-xs text-muted-foreground shrink-0">
              {pendingImages.length} imagem(ns)
            </span>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-border p-3 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Descreva um logo, ou peça alterações…"
              className="min-h-[44px] max-h-[120px] resize-none pr-10 bg-background border-border text-sm"
              disabled={isLoading}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              disabled={isLoading}
            />
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground transition-colors">
              <Upload className="h-3 w-3" />
              Upload
            </div>
          </label>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs h-7"
            onClick={() => sendMessage(true)}
            disabled={isLoading || (!input.trim() && pendingImages.length === 0)}
          >
            <Lightbulb className="h-3 w-3" />
            Sugerir
          </Button>
          <div className="flex-1" />
          <Button
            size="sm"
            className="gap-1 h-8"
            onClick={() => sendMessage(false)}
            disabled={isLoading || (!input.trim() && pendingImages.length === 0)}
          >
            <Send className="h-3 w-3" />
            Gerar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LogoChat;
