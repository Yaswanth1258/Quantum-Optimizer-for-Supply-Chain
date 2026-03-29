import Link from "next/link";
import { FiArrowRight, FiClock, FiDollarSign, FiShield } from "react-icons/fi";

import AppShell from "../components/AppShell";

const impacts = [
  {
    icon: FiDollarSign,
    title: "15-30% Cost Reduction",
    text: "Quantum optimization discovers globally optimal routes that classical heuristics often miss, reducing logistics spend."
  },
  {
    icon: FiClock,
    title: "10x Faster Decisions",
    text: "QAOA explores large decision spaces rapidly, enabling near real-time route adaptation as constraints change."
  },
  {
    icon: FiShield,
    title: "Disruption Resilience",
    text: "Instant re-optimization during route outages helps preserve service levels and improve recovery time."
  }
];

export default function PitchPage() {
  return (
    <AppShell
      title="The Future of Supply Chain"
      subtitle="Quantum-enhanced optimization for enterprise logistics"
    >
      <section className="card mb-4 p-8 text-center md:p-14">
        <div className="mx-auto mb-4 inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
          Quantum-Enhanced Platform
        </div>
        <h2 className="mx-auto max-w-3xl text-5xl font-black leading-tight tracking-tight text-slate-900 md:text-6xl">
          The Future of Supply Chain
          <span className="block text-brand-600">Is Quantum</span>
        </h2>
        <p className="mx-auto mt-4 max-w-3xl text-lg text-slate-500">
          QuantumFlow SCO uses QAOA-based optimization to solve global routing decisions that are difficult for classical systems,
          generating measurable savings and improved resilience.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard" className="primary-btn">
            View Live Demo
            <FiArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/compare" className="secondary-btn">
            See Comparison
          </Link>
        </div>
      </section>

      <section>
        <h3 className="text-center text-3xl font-black text-slate-900">Business Impact</h3>
        <p className="text-center text-sm text-slate-500">Real, measurable improvements for enterprise logistics</p>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {impacts.map((impact) => {
            const Icon = impact.icon;
            return (
              <article key={impact.title} className="card p-5">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <Icon className="h-5 w-5" />
                </div>
                <h4 className="text-lg font-bold text-slate-800">{impact.title}</h4>
                <p className="mt-2 text-sm text-slate-500">{impact.text}</p>
              </article>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
