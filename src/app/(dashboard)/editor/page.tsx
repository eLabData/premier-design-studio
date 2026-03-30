import { VideoPreview } from "@/components/editor/VideoPreview";
import { Timeline } from "@/components/editor/Timeline";
import { Toolbar } from "@/components/editor/Toolbar";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function EditorPage() {
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-zinc-800">
        <Link
          href="/"
          className="text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-semibold">Editor de Video</h1>
      </div>

      {/* Toolbar */}
      <Toolbar />

      {/* Main area: Preview + Properties */}
      <div className="flex flex-1 overflow-hidden">
        {/* Preview */}
        <div className="flex-1 flex flex-col p-4">
          <VideoPreview />
        </div>

        {/* Properties panel */}
        <div className="w-72 border-l border-zinc-800 p-4 overflow-y-auto">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
            Propriedades
          </h2>
          <div className="space-y-4 text-sm text-zinc-500">
            <p>Selecione um clip na timeline para editar suas propriedades.</p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <Timeline />
    </div>
  );
}
