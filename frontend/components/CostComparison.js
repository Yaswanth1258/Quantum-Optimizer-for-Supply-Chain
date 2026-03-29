import { motion } from "framer-motion";
import { BarChart, Bar, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export default function CostComparison({ classicalCost, quantumCost }) {
  const chartData = [
    { name: "Classical", cost: classicalCost ?? 0 },
    { name: "Quantum", cost: quantumCost ?? 0 },
  ];

  const diff = (classicalCost ?? 0) - (quantumCost ?? 0);
  const improvement = classicalCost ? (diff / classicalCost) * 100 : 0;

  return (
    <motion.section
      className="glass p-6 h-full flex flex-col"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.h2 className="heading-md mb-6" variants={itemVariants}>
        Cost Comparison
      </motion.h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {[
          { label: "Classical", value: classicalCost?.toFixed(2) || "0.00", color: "from-yellow-400 to-orange-500" },
          { label: "Quantum", value: quantumCost?.toFixed(2) || "0.00", color: "from-neon-blue to-neon-cyan" },
          { label: "Savings", value: diff.toFixed(2), color: "from-green-400 to-emerald-500" },
          { label: "Improvement", value: improvement.toFixed(1) + "%", color: "from-neon-purple to-neon-pink" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            variants={itemVariants}
            className={`glass p-4 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-10 border border-white border-opacity-5`}
            whileHover={{ scale: 1.05, borderColor: "rgba(255,255,255,0.2)" }}
          >
            <p className="text-gray-400 text-xs uppercase tracking-wide">{stat.label}</p>
            <p className="text-2xl font-bold text-white mt-2">${stat.value}</p>
          </motion.div>
        ))}
      </div>

      <motion.div variants={itemVariants} className="flex-1 min-h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,217,255,0.1)" />
            <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" />
            <YAxis stroke="rgba(255,255,255,0.3)" />
            <Tooltip
              contentStyle={{
                background: "rgba(2, 6, 23, 0.8)",
                border: "1px solid rgba(0, 217, 255, 0.3)",
                borderRadius: "8px",
                color: "#ffffff",
              }}
            />
            <Bar
              dataKey="cost"
              fill="#00d9ff"
              radius={[8, 8, 0, 0]}
              animationDuration={1000}
              isAnimationActive
            />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </motion.section>
  );
}
