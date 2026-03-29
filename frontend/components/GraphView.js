import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { forceCenter, forceLink, forceManyBody, forceSimulation } from "d3-force";

const WIDTH = 800;
const HEIGHT = 400;

export default function GraphView({
  warehouses,
  routes,
  highlightedClassical,
  highlightedQuantum,
  disabledRoutes,
}) {
  const [layout, setLayout] = useState({ nodes: [], links: [] });

  const graphData = useMemo(() => {
    const nodes = warehouses.map((w) => ({ id: w.id }));
    const links = routes.map((r) => ({
      id: r.id,
      source: r.source,
      target: r.destination,
    }));
    return { nodes, links };
  }, [warehouses, routes]);

  useEffect(() => {
    const nodes = graphData.nodes.map((n) => ({ ...n }));
    const links = graphData.links.map((l) => ({ ...l }));

    const simulation = forceSimulation(nodes)
      .force("link", forceLink(links).id((d) => d.id).distance(120))
      .force("charge", forceManyBody().strength(-380))
      .force("center", forceCenter(WIDTH / 2, HEIGHT / 2))
      .stop();

    for (let i = 0; i < 240; i += 1) {
      simulation.tick();
    }

    setLayout({ nodes, links });
  }, [graphData]);

  function getLinkColor(routeId) {
    if (disabledRoutes.includes(routeId)) return "#ff006e";
    if (highlightedQuantum.includes(routeId)) return "#00d9ff";
    if (highlightedClassical.includes(routeId)) return "#fbbf24";
    return "#4b5563";
  }

  return (
    <motion.section
      className="glass p-6 h-full flex flex-col"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <h2 className="heading-md mb-4">Supply Chain Network</h2>
      <motion.svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full bg-dark-tertiary rounded-lg border border-neon-blue border-opacity-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {layout.links.map((link) => {
          const isDisabled = disabledRoutes.includes(link.id);
          const isQuantum = highlightedQuantum.includes(link.id);
          const isClassical = highlightedClassical.includes(link.id);

          return (
            <motion.g
              key={link.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              filter={isQuantum || isClassical ? "url(#glow)" : "none"}
            >
              <line
                x1={link.source.x}
                y1={link.source.y}
                x2={link.target.x}
                y2={link.target.y}
                stroke={getLinkColor(link.id)}
                strokeWidth={isDisabled ? 2 : isQuantum || isClassical ? 3 : 2}
                strokeDasharray={isDisabled ? "4 4" : "0"}
                opacity={isDisabled ? 0.5 : 0.8}
              />
              <text
                x={(link.source.x + link.target.x) / 2}
                y={(link.source.y + link.target.y) / 2 - 8}
                textAnchor="middle"
                className="text-xs font-mono fill-gray-400"
              >
                {link.id}
              </text>
            </motion.g>
          );
        })}

        {layout.nodes.map((node) => (
          <motion.g
            key={node.id}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
            whileHover={{ scale: 1.2 }}
          >
            <circle
              cx={node.x}
              cy={node.y}
              r="20"
              fill="#00d9ff"
              opacity="0.8"
              stroke="#00f0ff"
              strokeWidth="2"
            />
            <text
              x={node.x}
              y={node.y + 5}
              textAnchor="middle"
              className="text-sm font-bold fill-dark-bg"
            >
              {node.id}
            </text>
          </motion.g>
        ))}
      </motion.svg>

      <div className="mt-4 flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <span className="text-gray-400">Classical</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-neon-blue" />
          <span className="text-gray-400">Quantum</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border-2 border-neon-pink" />
          <span className="text-gray-400">Disabled</span>
        </div>
      </div>
    </motion.section>
  );
}
