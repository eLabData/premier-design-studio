"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Smartphone, ImageIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/toaster";
import LogoChat from "@/components/logo/LogoChat";
import LogoCanvas from "@/components/logo/LogoCanvas";
import StoreAssetsChat from "@/components/store/StoreAssetsChat";
import StoreAssetsPreview from "@/components/store/StoreAssetsPreview";
import MockupWorkspace from "@/components/mockup/MockupWorkspace";
import type { ChatMessage } from "@/types/logo";
import type { StoreMessage, StoreMetadata } from "@/types/logo";

export default function StudioPage() {
  // Logo Studio state
  const [logoMessages, setLogoMessages] = useState<ChatMessage[]>([]);
  const [logoLoading, setLogoLoading] = useState(false);
  const [logoImageUrl, setLogoImageUrl] = useState<string | null>(null);

  // Store Assets state
  const [storeMessages, setStoreMessages] = useState<StoreMessage[]>([]);
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeImageUrl, setStoreImageUrl] = useState<string | null>(null);
  const [storeData, setStoreData] = useState<StoreMetadata>({});

  // Mockup workspace state
  const [mockupLoading, setMockupLoading] = useState(false);

  return (
    <>
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-zinc-800 shrink-0">
          <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold">Studio de Assets</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="logo" className="h-full flex flex-col">
            <div className="px-4 pt-4 shrink-0">
              <TabsList className="bg-zinc-900 border border-zinc-800">
                <TabsTrigger value="logo" className="gap-2 text-xs">
                  <Sparkles className="h-3.5 w-3.5" />
                  Logo Studio
                </TabsTrigger>
                <TabsTrigger value="store" className="gap-2 text-xs">
                  <Smartphone className="h-3.5 w-3.5" />
                  Store Assets
                </TabsTrigger>
                <TabsTrigger value="mockups" className="gap-2 text-xs">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Mockups
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Logo Studio tab */}
            <TabsContent value="logo" className="flex-1 overflow-y-auto p-4 mt-0">
              <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                <div className="min-h-[600px]">
                  <LogoChat
                    onNewImage={(url) => setLogoImageUrl(url || null)}
                    isLoading={logoLoading}
                    setIsLoading={setLogoLoading}
                    messages={logoMessages}
                    setMessages={setLogoMessages}
                  />
                </div>
                <div className="flex items-start pt-4">
                  <LogoCanvas imageUrl={logoImageUrl} isLoading={logoLoading} />
                </div>
              </div>
            </TabsContent>

            {/* Store Assets tab */}
            <TabsContent value="store" className="flex-1 overflow-y-auto p-4 mt-0">
              <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="min-h-[600px]">
                  <StoreAssetsChat
                    onNewImage={(url) => setStoreImageUrl(url || null)}
                    onStoreData={setStoreData}
                    isLoading={storeLoading}
                    setIsLoading={setStoreLoading}
                    messages={storeMessages}
                    setMessages={setStoreMessages}
                  />
                </div>
                <div>
                  <StoreAssetsPreview
                    imageUrl={storeImageUrl}
                    isLoading={storeLoading}
                    storeData={storeData}
                    onStoreDataChange={setStoreData}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Mockups tab */}
            <TabsContent value="mockups" className="flex-1 overflow-y-auto p-4 mt-0">
              <div className="max-w-5xl mx-auto">
                <MockupWorkspace isLoading={mockupLoading} setIsLoading={setMockupLoading} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Toaster />
    </>
  );
}
