import { type LucideIcon, TrendingUp, TrendingDown, Info } from "lucide-react";

interface StatCardProps {
  label:     string;
  value:     string;
  sub?:      string;
  trend?:    number;
  icon:      LucideIcon;
  accent?:   boolean;
  delay?:    number;
  tooltip?:  string;
}

export default function StatCard({
  label, value, sub, trend, icon: Icon, accent = false, delay = 0, tooltip,
}: StatCardProps) {
  const isPositive = trend !== undefined && trend >= 0;

  return (
    <div
      className="animate-fade-up relative bg-surface-2 border border-border p-5 flex flex-col gap-4
                 hover:border-border-light transition-all duration-200 group"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      {/* Top accent line on hover */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-accent/0 to-transparent
                      group-hover:via-accent/50 transition-all duration-300" />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-1.5">
          <p className="text-fg-5 text-xs font-medium uppercase tracking-wider">{label}</p>
          {tooltip && (
            <span title={tooltip} className="text-fg-6 hover:text-fg-4 cursor-help transition-colors">
              <Info size={11} />
            </span>
          )}
        </div>
        <div
          className={`w-9 h-9 flex items-center justify-center rounded-sm flex-shrink-0
                      ${accent
                        ? "bg-accent/15 border border-accent/30"
                        : "bg-surface-4 border border-border-light"
                      }`}
        >
          <Icon size={16} className={accent ? "text-accent" : "text-fg-4"} />
        </div>
      </div>

      {/* Value */}
      <div>
        <p className={`text-2xl font-bold tracking-tight ${accent ? "text-gradient-accent" : "text-fg"}`}>
          {value}
        </p>
        {sub && (
          <p className="text-fg-4 text-xs mt-0.5">{sub}</p>
        )}
      </div>

      {/* Trend */}
      {trend !== undefined && (
        <div
          className={`flex items-center gap-1 text-xs font-medium
                      ${isPositive ? "text-emerald-400" : "text-red-400"}`}
        >
          {isPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          <span>{isPositive ? "+" : ""}{trend}% vs mes anterior</span>
        </div>
      )}
    </div>
  );
}
