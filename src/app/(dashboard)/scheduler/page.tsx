import Link from "next/link";
import { ArrowLeft, Camera, Globe, Tv, Music, AtSign } from "lucide-react";

const platforms = [
  { name: "Instagram", icon: Camera, color: "text-pink-500" },
  { name: "Facebook", icon: Globe, color: "text-blue-500" },
  { name: "YouTube", icon: Tv, color: "text-red-500" },
  { name: "TikTok", icon: Music, color: "text-cyan-400" },
  { name: "X", icon: AtSign, color: "text-white" },
];

export default function SchedulerPage() {
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-zinc-800">
        <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-semibold">Agendador</h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Platforms */}
        <div className="w-64 border-r border-zinc-800 p-4">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
            Plataformas
          </h2>
          <div className="space-y-2">
            {platforms.map((p) => (
              <label
                key={p.name}
                className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-colors"
              >
                <input type="checkbox" className="accent-green-500" />
                <p.icon className={`w-5 h-5 ${p.color}`} />
                <span className="text-sm">{p.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Calendar area */}
        <div className="flex-1 p-8">
          <div className="border border-zinc-800 rounded-xl p-6 h-full flex items-center justify-center">
            <div className="text-center space-y-4 text-zinc-500">
              <Calendar className="w-16 h-16 mx-auto text-zinc-600" />
              <p className="text-lg">Calendario de publicacoes</p>
              <p className="text-sm">Arraste projetos prontos para agendar publicacao automatica</p>
            </div>
          </div>
        </div>

        {/* Queue */}
        <div className="w-72 border-l border-zinc-800 p-4 overflow-y-auto">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
            Fila de Publicacao
          </h2>
          <div className="text-sm text-zinc-500">
            Nenhuma publicacao agendada.
          </div>
        </div>
      </div>
    </div>
  );
}

function Calendar({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  );
}
