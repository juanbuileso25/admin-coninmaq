import { useEffect, useMemo, useState } from "react";
import { Loader2, Radio, Trophy, TrendingDown, DollarSign, Target } from "lucide-react";
import type { DashboardMetrics, ChannelMetricsResponse, ChannelMetricsRow } from "../../../services/api";
import { api } from "../../../services/api";

type Metric = "leads" | "quoted" | "won" | "value_quoted" | "value_won";

const METRIC_LABELS: Record<Metric, string> = {
  leads: "Leads",
  quoted: "Cotizaciones",
  won: "Ganados",
  value_quoted: "Valor cotizado",
  value_won: "Valor ganado",
};

const compactCOP = (n: number) => {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString("es-CO")}`;
};

interface Props {
  metrics: DashboardMetrics;
  showDevNotes?: boolean;
}

export default function DashboardCanalesTab({ metrics }: Props) {
  const [data, setData] = useState<ChannelMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState<number | null | "all">("all");
  const [metric, setMetric] = useState<Metric>("leads");

  useEffect(() => {
    setLoading(true);
    api.bot.channelMetrics({
      date_from: metrics.date_from,
      date_to: metrics.date_to,
      months: 6,
    }).then(d => {
      setData(d);
      setChannelFilter("all");
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, [metrics.date_from, metrics.date_to]);

  const filteredChannels = useMemo(() => {
    if (!data) return [];
    if (channelFilter === "all") return data.channels;
    return data.channels.filter(c => c.channel_id === channelFilter);
  }, [data, channelFilter]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-60">
        <Loader2 size={20} className="animate-spin text-accent" />
      </div>
    );
  }

  const h = data.highlights;

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Filtro de canal */}
      <div className="flex items-center gap-2 flex-wrap">
        <Radio size={14} className="text-fg-5" />
        <span className="text-fg-5 text-xs uppercase tracking-wider">Canal:</span>
        <button
          onClick={() => setChannelFilter("all")}
          className={`px-3 py-1.5 text-xs transition-all border ${
            channelFilter === "all"
              ? "bg-accent text-zinc-900 border-accent font-semibold"
              : "bg-surface-2 text-fg-3 border-border hover:border-border-light"
          }`}
        >
          Todos ({data.channels.length})
        </button>
        {data.channels.map(c => (
          <button
            key={c.channel_id ?? "none"}
            onClick={() => setChannelFilter(c.channel_id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all border ${
              channelFilter === c.channel_id
                ? "bg-accent text-zinc-900 border-accent font-semibold"
                : "bg-surface-2 text-fg-3 border-border hover:border-border-light"
            }`}
          >
            {c.color && <span className="inline-block w-2.5 h-2.5" style={{ background: c.color }} />}
            {c.label} ({c.totals.leads})
          </button>
        ))}
      </div>

      {/* Lectura rápida — 4 highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <HighlightCard
          label="Mejor % cotización"
          icon={<Trophy size={13} />}
          highlight={h.best_quote_rate}
          format={(v) => `${v.toFixed(1)}%`}
          accent="emerald"
        />
        <HighlightCard
          label="Mejor % cierre"
          icon={<Target size={13} />}
          highlight={h.best_close_rate}
          format={(v) => `${v.toFixed(1)}%`}
          accent="accent"
        />
        <HighlightCard
          label="Mayor valor ganado"
          icon={<DollarSign size={13} />}
          highlight={h.biggest_value_won}
          format={compactCOP}
          accent="sky"
        />
        <HighlightCard
          label="Peor % cotización"
          icon={<TrendingDown size={13} />}
          highlight={h.worst_quote_rate}
          format={(v) => `${v.toFixed(1)}%`}
          accent="rose"
        />
      </div>

      {/* Tabla por canal */}
      <div className="bg-surface-2 border border-border overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="text-accent text-xs uppercase tracking-wider font-bold">▸ Resultados por canal</h3>
          <span className="text-fg-6 text-[10px]">Período: {data.date_from} → {data.date_to}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-surface-3 text-fg-6 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="text-left py-2 px-3 font-medium">Canal</th>
                <th className="text-right py-2 px-3 font-medium">Leads</th>
                <th className="text-right py-2 px-3 font-medium">Cotizados</th>
                <th className="text-right py-2 px-3 font-medium">% Cot</th>
                <th className="text-right py-2 px-3 font-medium">Ganados</th>
                <th className="text-right py-2 px-3 font-medium">% Cierre</th>
                <th className="text-right py-2 px-3 font-medium">$ Cotizado</th>
                <th className="text-right py-2 px-3 font-medium">$ Ganado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredChannels.length === 0 ? (
                <tr><td colSpan={8} className="py-10 text-center text-fg-6">Sin datos para el filtro</td></tr>
              ) : filteredChannels.map(c => (
                <tr key={c.channel_id ?? "none"} className="hover:bg-surface-3 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      {c.color && <span className="inline-block w-2.5 h-2.5 shrink-0" style={{ background: c.color }} />}
                      <span className="text-fg-2">{c.label}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right text-fg font-semibold">{c.totals.leads}</td>
                  <td className="py-2.5 px-3 text-right text-fg-3">{c.totals.quoted}</td>
                  <td className="py-2.5 px-3 text-right text-accent font-bold">{c.totals.quote_rate.toFixed(1)}%</td>
                  <td className="py-2.5 px-3 text-right text-fg-3">{c.totals.won}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">{c.totals.close_rate.toFixed(1)}%</td>
                  <td className="py-2.5 px-3 text-right text-fg-3 font-mono">{compactCOP(c.totals.value_quoted)}</td>
                  <td className="py-2.5 px-3 text-right text-fg font-mono font-semibold">{compactCOP(c.totals.value_won)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gráfico mensual */}
      <div className="bg-surface-2 border border-border p-4">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-accent text-xs uppercase tracking-wider font-bold">▸ Serie mensual · últimos {data.months_in_series} meses</h3>
          <div className="flex gap-1 flex-wrap">
            {(Object.entries(METRIC_LABELS) as [Metric, string][]).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setMetric(k)}
                className={`px-2.5 py-1 text-[10px] uppercase tracking-wider border ${
                  metric === k
                    ? "bg-accent text-zinc-900 border-accent font-semibold"
                    : "bg-surface-3 text-fg-5 border-border hover:border-border-light"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <ChannelMonthlyChart
          channels={filteredChannels}
          metric={metric}
          monthsInSeries={data.months_in_series}
        />
      </div>
    </div>
  );
}

// ─── Highlight card ─────────────────────────────────────────────────────────

function HighlightCard({
  label, icon, highlight, format, accent = "accent",
}: {
  label: string;
  icon: React.ReactNode;
  highlight: { label: string | null; value: number } | null;
  format: (v: number) => string;
  accent?: "accent" | "emerald" | "sky" | "rose";
}) {
  const colorClasses: Record<string, string> = {
    accent: "text-accent",
    emerald: "text-emerald-400",
    sky: "text-sky-400",
    rose: "text-rose-400",
  };

  return (
    <div className="bg-surface-2 border border-border p-4">
      <div className="flex items-center gap-1.5 text-fg-6 text-[10px] uppercase tracking-wider mb-2">
        {icon}
        <span>{label}</span>
      </div>
      {highlight && highlight.label ? (
        <div>
          <div className={`text-lg font-bold ${colorClasses[accent]}`}>{highlight.label}</div>
          <div className="text-fg-3 text-xs mt-0.5">{format(highlight.value)}</div>
        </div>
      ) : (
        <div className="text-fg-6 text-xs italic">Sin datos</div>
      )}
    </div>
  );
}

// ─── Gráfico de barras agrupadas (SVG) ──────────────────────────────────────

function ChannelMonthlyChart({
  channels, metric, monthsInSeries,
}: {
  channels: ChannelMetricsRow[];
  metric: Metric;
  monthsInSeries: number;
}) {
  // Alinear series por mes
  const months: string[] = channels[0]?.monthly.map(m => m.month) ?? [];

  const chartData = useMemo(() => {
    return months.map((m, mIdx) => ({
      month: m,
      series: channels.map(c => ({
        channel_id: c.channel_id,
        label: c.label,
        color: c.color || "#999",
        value: c.monthly[mIdx]?.[metric] ?? 0,
      })),
    }));
  }, [channels, months, metric]);

  const maxValue = useMemo(() => {
    let max = 0;
    for (const col of chartData) {
      for (const s of col.series) {
        if (s.value > max) max = s.value;
      }
    }
    return max;
  }, [chartData]);

  if (channels.length === 0 || months.length === 0) {
    return <div className="h-60 flex items-center justify-center text-fg-6 text-xs">Sin series mensuales en el período</div>;
  }

  // Dimensiones
  const chartHeight = 220;
  const paddingTop = 16;
  const paddingBottom = 32;
  const paddingLeft = 50;
  const groupGap = 20;
  const barGap = 2;
  const groupWidth = 70 + Math.max(0, (channels.length - 2) * 10);
  const totalWidth = paddingLeft + (groupWidth + groupGap) * monthsInSeries + 20;
  const plotHeight = chartHeight - paddingTop - paddingBottom;
  const barWidth = (groupWidth - (channels.length - 1) * barGap) / channels.length;

  const yTicks = 4;
  const formatY = (v: number) => {
    if (metric === "value_quoted" || metric === "value_won") return compactCOP(v);
    return String(Math.round(v));
  };

  return (
    <div className="overflow-x-auto">
      <svg width={totalWidth} height={chartHeight} className="min-w-full">
        {/* Ejes Y (grid horizontal) */}
        {Array.from({ length: yTicks + 1 }).map((_, i) => {
          const y = paddingTop + (plotHeight * i) / yTicks;
          const val = maxValue * (1 - i / yTicks);
          return (
            <g key={i}>
              <line x1={paddingLeft} y1={y} x2={totalWidth - 10} y2={y}
                stroke="#2a2a2a" strokeWidth={1} strokeDasharray={i === yTicks ? "" : "2 2"} />
              <text x={paddingLeft - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#6b6b6b" fontFamily="monospace">
                {formatY(val)}
              </text>
            </g>
          );
        })}

        {/* Grupos (barras + labels) */}
        {chartData.map((col, gIdx) => {
          const gx = paddingLeft + gIdx * (groupWidth + groupGap);
          return (
            <g key={gIdx}>
              {col.series.map((s, bIdx) => {
                const h = maxValue > 0 ? (s.value / maxValue) * plotHeight : 0;
                const x = gx + bIdx * (barWidth + barGap);
                const y = paddingTop + plotHeight - h;
                return (
                  <g key={bIdx}>
                    <rect x={x} y={y} width={barWidth} height={h} fill={s.color} opacity={0.9}>
                      <title>{`${s.label} · ${col.month} · ${formatY(s.value)}`}</title>
                    </rect>
                  </g>
                );
              })}
              <text
                x={gx + groupWidth / 2}
                y={chartHeight - paddingBottom + 16}
                textAnchor="middle"
                fontSize="10"
                fill="#8b8b8b"
                fontFamily="monospace"
              >
                {col.month}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-border">
        {channels.map(c => (
          <div key={c.channel_id ?? "none"} className="flex items-center gap-1.5 text-[11px] text-fg-4">
            <span className="inline-block w-3 h-3" style={{ background: c.color || "#999" }} />
            {c.label}
          </div>
        ))}
      </div>
    </div>
  );
}
