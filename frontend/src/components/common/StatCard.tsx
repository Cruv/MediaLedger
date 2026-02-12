interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  trend?: "up" | "down";
}

export default function StatCard({ label, value, sublabel, trend }: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-800/80 bg-gray-900/80 p-5 backdrop-blur-sm transition-colors hover:border-gray-700/80">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        {trend && (
          <span className={trend === "up" ? "text-xs text-green-400" : "text-xs text-red-400"}>
            {trend === "up" ? "\u2191" : "\u2193"}
          </span>
        )}
      </div>
      {sublabel && <p className="mt-1.5 text-xs text-gray-500">{sublabel}</p>}
    </div>
  );
}
