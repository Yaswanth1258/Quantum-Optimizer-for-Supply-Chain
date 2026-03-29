import Link from "next/link";
import { useRouter } from "next/router";
import { FiActivity, FiBarChart2, FiGlobe, FiMessageSquare, FiCpu } from "react-icons/fi";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: FiBarChart2 },
  { href: "/network", label: "Network", icon: FiGlobe },
  { href: "/compare", label: "Compare", icon: FiActivity },
  { href: "/pitch", label: "Pitch", icon: FiMessageSquare }
];

export default function AppShell({ title, subtitle, action, children }) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-app text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-4 md:px-6">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-900">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
              <FiCpu className="h-4 w-4" />
            </span>
            <span className="text-base">QuantumFlow</span>
            <span className="text-xs font-medium text-slate-400">SCO</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = router.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition ${
                    active
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold tracking-wide text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            QAOA READY
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1200px] px-4 py-7 md:px-6">
        <section className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">{title}</h1>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          {action}
        </section>
        {children}
      </main>
    </div>
  );
}
