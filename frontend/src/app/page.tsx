import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            <span className="text-emerald-500">ZORA</span> CORE
          </h1>
          <nav className="flex gap-4">
            <Link href="/dashboard" className="hover:text-emerald-500 transition-colors">
              Dashboard
            </Link>
            <Link href="/agents" className="hover:text-emerald-500 transition-colors">
              Agents
            </Link>
            <Link href="/climate" className="hover:text-emerald-500 transition-colors">
              Climate OS
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="mb-8">
            <h2 className="text-5xl font-bold mb-4">
              <span className="text-emerald-500">ZORA</span> CORE
            </h2>
            <p className="text-xl text-gray-400">
              Multi-agent, climate-first AI operating system
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="agent-card">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-lg font-semibold mb-2">6 Core Agents</h3>
              <p className="text-gray-400 text-sm">
                CONNOR, LUMINA, EIVOR, ORACLE, AEGIS, and SAM working together
              </p>
            </div>
            <div className="agent-card">
              <div className="text-4xl mb-4">🌍</div>
              <h3 className="text-lg font-semibold mb-2">Climate-First</h3>
              <p className="text-gray-400 text-sm">
                Every feature supports real climate action and awareness
              </p>
            </div>
            <div className="agent-card">
              <div className="text-4xl mb-4">🧠</div>
              <h3 className="text-lg font-semibold mb-2">Intelligent Memory</h3>
              <p className="text-gray-400 text-sm">
                Long-term learning from decisions, projects, and outcomes
              </p>
            </div>
          </div>

          <Link href="/dashboard" className="btn-primary inline-block">
            Open Dashboard
          </Link>
        </div>
      </main>

      <footer className="border-t border-zinc-800 p-4 text-center text-gray-500 text-sm">
        ZORA CORE v0.1 - Climate-first AI Operating System
      </footer>
    </div>
  );
}
