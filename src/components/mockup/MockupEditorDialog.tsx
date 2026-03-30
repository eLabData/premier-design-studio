"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Loader2, Download, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  image?: string;
}

interface MockupEditorDialogProps {
  open: boolean;
  onClose: () => void;
  initialImage: string;
  onImageUpdate: (newImage: string) => void;
}

const SUGGESTIONS = [
  "Mude a cor do fundo para azul escuro",
  "Aumente o texto e deixe mais bold",
  "Troque o texto para português",
  "Coloque o celular mais centralizado",
  "Adicione um segundo dispositivo ao lado",
];

const MockupEditorDialog = ({ open, onClose, initialImage, onImageUpdate }: MockupEditorDialogProps) => {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState(initialImage);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setCurrentImage(initialImage);
    setMessages([]);
  }, [initialImage]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!open) return null;

  const sendEdit = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMsg = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const { supabase } = await import("@/lib/supabase");

      const history = [
        ...messages.map((m) => ({
          role: m.role,
          content: m.content,
          ...(m.image ? { imageData: m.image } : {}),
        })),
        { role: "user", content: text, imageData: currentImage },
      ];

      const { data, error } = await supabase.functions.invoke("generate-store-assets", {
        body: {
          conversationHistory: history,
          mode: "edit-mockup",
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const newImage = data?.image;
      const assistantText = data?.text || "Mockup atualizado!";

      const assistantMsg: ChatMsg = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: assistantText,
        image: newImage,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (newImage) {
        setCurrentImage(newImage);
        onImageUpdate(newImage);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Erro ao editar", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = currentImage;
    link.download = `mockup-edited-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendEdit(input);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Editar Mockup</h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={handleDownload}>
              <Download className="h-3 w-3" />
              Baixar
            </Button>
            <button
              onClick={onClose}
              className="h-7 w-7 rounded-full hover:bg-secondary flex items-center justify-center"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex min-h-0">
          {/* Image preview */}
          <div className="w-1/2 border-r border-border bg-secondary/20 flex items-center justify-center p-4">
            <img
              src={currentImage}
              alt="Mockup"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>

          {/* Chat panel */}
          <div className="w-1/2 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
              {messages.length === 0 && (
                <div className="text-center py-8 space-y-3">
                  <Wand2 className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                  <p className="text-xs text-muted-foreground">Descreva o que quer mudar no mockup</p>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {SUGGESTIONS.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => sendEdit(s)}
                        className="px-2.5 py-1 rounded-full text-[10px] bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-secondary rounded-xl px-3 py-2 flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">Editando mockup…</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border">
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ex: mude o fundo para roxo escuro…"
                  className="text-xs min-h-[40px] max-h-[80px] resize-none flex-1"
                  disabled={isLoading}
                />
                <Button
                  size="sm"
                  className="h-10 w-10 p-0 shrink-0"
                  onClick={() => sendEdit(input)}
                  disabled={!input.trim() || isLoading}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockupEditorDialog;
