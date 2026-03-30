import Link from "next/link";
import { ArrowLeft, Video, Image, Plus, Search } from "lucide-react";

export default function LibraryPage() {
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">Biblioteca</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar projetos..."
              className="pl-9 pr-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm placeholder:text-zinc-500 focus:outline-none focus:border-green-500/50 w-64"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-sm font-medium hover:bg-green-700 transition-colors">
            <Plus className="w-4 h-4" />
            Novo
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
        {["Todos", "Videos", "Posts", "Carrosseis", "Publicados"].map((filter) => (
          <button
            key={filter}
            className="px-3 py-1.5 rounded-full text-sm border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors first:bg-zinc-800 first:text-white"
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Empty state */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-4">
            <Video className="w-12 h-12 text-zinc-700" />
            <Image className="w-12 h-12 text-zinc-700" />
          </div>
          <p className="text-zinc-500">Nenhum projeto ainda.</p>
          <p className="text-sm text-zinc-600">
            Crie um video ou post para comecar.
          </p>
        </div>
      </div>
    </div>
  );
}
