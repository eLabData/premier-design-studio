import Link from "next/link";
import {
  Video,
  Image,
  Calendar,
  FolderOpen,
  Plus,
  Sparkles,
  Palette,
  BarChart3,
} from "lucide-react";

const modules = [
  {
    title: "Editor de Video",
    description: "Corte, overlay, legendas, transicoes",
    icon: Video,
    href: "/editor",
    color: "from-green-500/20 to-green-600/5",
    borderColor: "border-green-500/30",
  },
  {
    title: "Designer de Posts",
    description: "Feed, stories, carrossel, thumbnails",
    icon: Image,
    href: "/designer",
    color: "from-purple-500/20 to-purple-600/5",
    borderColor: "border-purple-500/30",
  },
  {
    title: "Studio AI",
    description: "Logos, mockups, assets com IA",
    icon: Palette,
    href: "/studio",
    color: "from-pink-500/20 to-pink-600/5",
    borderColor: "border-pink-500/30",
  },
  {
    title: "Agendador",
    description: "Publique em todas as plataformas",
    icon: Calendar,
    href: "/scheduler",
    color: "from-blue-500/20 to-blue-600/5",
    borderColor: "border-blue-500/30",
  },
  {
    title: "Biblioteca",
    description: "Seus projetos, templates e midias",
    icon: FolderOpen,
    href: "/library",
    color: "from-amber-500/20 to-amber-600/5",
    borderColor: "border-amber-500/30",
  },
  {
    title: "Analytics",
    description: "Custos, uso de IA e métricas",
    icon: BarChart3,
    href: "/analytics",
    color: "from-cyan-500/20 to-cyan-600/5",
    borderColor: "border-cyan-500/30",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen p-8">
      <div className="w-full max-w-4xl space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Sparkles className="w-8 h-8 text-green-500" />
            <h1 className="text-4xl font-bold tracking-tight">
              Premier Design Studio
            </h1>
          </div>
          <p className="text-zinc-400 text-lg">
            Editor de video, designer de posts e publicacao automatica com AI
          </p>
        </div>

        {/* Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map((mod) => (
            <Link
              key={mod.href}
              href={mod.href}
              className={`group relative overflow-hidden rounded-xl border ${mod.borderColor} bg-gradient-to-br ${mod.color} p-6 transition-all hover:scale-[1.02] hover:shadow-lg`}
            >
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-zinc-800/50 p-3">
                  <mod.icon className="w-6 h-6 text-zinc-200" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{mod.title}</h2>
                  <p className="text-sm text-zinc-400 mt-1">
                    {mod.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Action */}
        <div className="flex justify-center">
          <Link
            href="/editor"
            className="flex items-center gap-2 rounded-full bg-green-600 px-6 py-3 font-medium text-white transition-colors hover:bg-green-700"
          >
            <Plus className="w-5 h-5" />
            Novo Projeto
          </Link>
        </div>
      </div>
    </div>
  );
}
