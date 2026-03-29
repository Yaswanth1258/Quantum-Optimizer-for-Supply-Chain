import { FiActivity, FiDollarSign, FiGitBranch, FiCpu, FiTrendingUp, FiZap } from "react-icons/fi";

const icons = {
  warehouses: FiActivity,
  routes: FiGitBranch,
  classical: FiDollarSign,
  quantum: FiCpu,
  saving: FiTrendingUp,
  speed: FiZap
};

export default function StatCards({ items }) {
  return (
    <section className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => {
        const Icon = icons[item.key];
        return (
          <article key={item.key} className="card p-4">
            <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <span>{item.label}</span>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="text-3xl font-bold tracking-tight text-slate-900">{item.value}</div>
          </article>
        );
      })}
    </section>
  );
}
