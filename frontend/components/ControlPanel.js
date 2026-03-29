import { motion } from "framer-motion";
import { useState } from "react";
import { FiChevronDown } from "react-icons/fi";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export default function ControlPanel({
  routes,
  disabledRoutes,
  setDisabledRoutes,
  onRunOptimization,
  onSimulate,
  loading,
}) {
  const [expanded, setExpanded] = useState(false);

  function toggleRoute(routeId) {
    setDisabledRoutes((prev) =>
      prev.includes(routeId)
        ? prev.filter((id) => id !== routeId)
        : [...prev, routeId]
    );
  }

  return (
    <motion.section
      className="glass p-6 h-full flex flex-col"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.h2 className="heading-md mb-4" variants={itemVariants}>
        Control Panel
      </motion.h2>

      {/* Button Grid */}
      <motion.div className="grid grid-cols-1 gap-3 mb-6" variants={itemVariants}>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRunOptimization}
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              >
                ⚛️
              </motion.div>
              Running...
            </span>
          ) : (
            "Run Optimization"
          )}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSimulate}
          disabled={loading}
          className="btn-secondary w-full"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              >
                ⚡
              </motion.div>
              Simulating...
            </span>
          ) : (
            "Simulate Disruption"
          )}
        </motion.button>
      </motion.div>

      {/* Route Picker */}
      <div className="flex-1">
        <motion.button
          variants={itemVariants}
          whileHover={{ backgroundColor: "rgba(0, 217, 255, 0.1)" }}
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between p-3 glass rounded-lg mb-3 hover:bg-opacity-10"
        >
          <span className="font-semibold text-neon-cyan">
            Disable Routes ({disabledRoutes.length})
          </span>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.3 }}>
            <FiChevronDown className="w-5 h-5" />
          </motion.div>
        </motion.button>

        <motion.div
          animate={{ height: expanded ? "auto" : 0, opacity: expanded ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <div className="space-y-2 p-3 glass rounded-lg max-h-56 overflow-y-auto">
            {routes.map((route, idx) => (
              <motion.label
                key={route.id}
                variants={itemVariants}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white hover:bg-opacity-5 cursor-pointer transition-colors"
                whileHover={{ paddingLeft: "12px" }}
              >
                <input
                  type="checkbox"
                  checked={disabledRoutes.includes(route.id)}
                  onChange={() => toggleRoute(route.id)}
                  className="w-4 h-4 accent-neon-blue rounded"
                />
                <span className="text-sm text-gray-300">
                  {route.id}: {route.source} → {route.destination}
                </span>
              </motion.label>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="mt-4 p-3 glass rounded-lg text-xs text-gray-400">
        <p>Routes: {routes.length}</p>
        <p>Disabled: {disabledRoutes.length}</p>
        <p>Active: {routes.length - disabledRoutes.length}</p>
      </motion.div>
    </motion.section>
  );
}
