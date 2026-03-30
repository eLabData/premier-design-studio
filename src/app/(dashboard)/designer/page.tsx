import Link from "next/link";
import { ArrowLeft, Square, Type, ImageIcon, Palette, Download } from "lucide-react";

const templates = [
  { name: "Feed 1:1", width: 1080, height: 1080 },
  { name: "Story 9:16", width: 1080, height: 1920 },
  { name: "YouTube 16:9", width: 1280, height: 720 },
  { name: "X Post", width: 1200, height: 675 },
];

export default function DesignerPage() {
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-zinc-800">
        <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-semibold">Designer de Posts</h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel - Tools */}
        <div className="w-16 border-r border-zinc-800 flex flex-col items-center gap-2 py-4">
          {[
            { icon: Type, label: "Texto" },
            { icon: ImageIcon, label: "Imagem" },
            { icon: Square, label: "Forma" },
            { icon: Palette, label: "Fundo" },
            { icon: Download, label: "Export" },
          ].map((tool) => (
            <button
              key={tool.label}
              className="w-12 h-12 rounded-lg flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title={tool.label}
            >
              <tool.icon className="w-5 h-5" />
              <span className="text-[10px]">{tool.label}</span>
            </button>
          ))}
        </div>

        {/* Canvas area */}
        <div className="flex-1 flex items-center justify-center bg-zinc-900/30 p-8">
          <div className="bg-white rounded-lg shadow-2xl" style={{ width: 400, height: 400 }}>
            <div className="w-full h-full flex items-center justify-center text-zinc-300">
              Canvas 1080x1080
            </div>
          </div>
        </div>

        {/* Right panel - Templates & Properties */}
        <div className="w-72 border-l border-zinc-800 p-4 overflow-y-auto">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
            Templates
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {templates.map((t) => (
              <button
                key={t.name}
                className="p-3 rounded-lg border border-zinc-800 hover:border-green-500/50 hover:bg-zinc-800/50 transition-colors text-left"
              >
                <div className="text-xs font-medium">{t.name}</div>
                <div className="text-[10px] text-zinc-500">
                  {t.width}x{t.height}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
