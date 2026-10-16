import React from "react";
import { createPortal } from "react-dom";
import { Users, FileText, CheckCircle2, DollarSign, Minus, TrendingDown, Smile, Radio, MapPin, Factory, Hammer, X, Loader2 } from "lucide-react";
import { api } from "../../../services/api";
import type { DashboardMetrics, DistributionRow, MonthlyRevenueRow, TierFunnelRow } from "../../../services/api";

function copFull(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
}

// Para el gráfico: formato con separador de miles, sin "COP" y sin decimales
// Ej: 629900001 → "$629.900.001"
function copChart(n: number | null | undefined): string {
  if (n == null) return "—";
  const formatted = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Math.round(n));
  return `$${formatted}`;
}

const TIER_META: Record<string, { label: string; color: string; textColor: string; bg: string }> = {
  A:        { label: "Tier A",   color: "bg-green-500",  textColor: "text-green-400",  bg: "bg-green-500/10" },
  B:        { label: "Tier B",   color: "bg-yellow-500", textColor: "text-yellow-400", bg: "bg-yellow-500/10" },
  no_fit:   { label: "No Fit",   color: "bg-red-500",    textColor: "text-red-400",    bg: "bg-red-500/10" },
  unscored: { label: "Sin calificar", color: "bg-zinc-500", textColor: "text-zinc-400", bg: "bg-zinc-500/10" },
};

export default function DashboardPrincipalTab({ metrics }: { metrics: DashboardMetrics; loading?: boolean }) {
  const f = metrics.funnel;
  const [detailMonth, setDetailMonth] = React.useState<string | null>(null);

  return (
    <div className="space-y-4 animate-fade-up">

      {/* Fila 1: 6 Stat Cards principales (como en el PDF) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatBig label="Total leads"       value={String(f.total_leads)}         sub="Funnel general"       icon={<Users         size={14} />} />
        <StatBig label="Total cotizaciones" value={String(f.total_quotations)}    sub="Funnel general"       icon={<FileText      size={14} />} accent />
        <StatBig label="Total cerrados"    value={String(f.total_closed)}        sub="Funnel general"       icon={<CheckCircle2  size={14} />} accent />
        <StatBig label="Valor cotizaciones" value={copFull(f.quotation_value_total)} sub="Valores del funnel"   icon={<DollarSign    size={14} />} />
        <StatBig label="Valor cerrados"    value={copFull(f.closed_value_total)}  sub="Valores del funnel"   icon={<DollarSign    size={14} />} accent />
        <StatBig label="Diferencia"        value={copFull(f.pending_value)}       sub="Pendiente de conversión" icon={<Minus         size={14} />} danger />
      </div>

      {/* Fila 2: Funnel + Funnel por tier */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Funnel visual */}
        <Card title="Conversión del funnel" subtitle="% sobre la etapa anterior">
          <FunnelStep level={100} label="Total leads" countLabel={`${f.total_leads} leads`} pct={100} isTop />
          <DropLabel pct={100 - f.leads_to_quotations_rate} />
          <FunnelStep level={82} label="Leads → Cotizaciones" countLabel={`${f.total_quotations} cotizaciones`} pct={f.leads_to_quotations_rate} />
          <DropLabel pct={100 - f.quotations_to_closed_rate} />
          <FunnelStep level={64} label="Cotizaciones → Cerrados" countLabel={`${f.total_closed} cerrados`} pct={f.quotations_to_closed_rate} highlight />
        </Card>

        {/* Funnel por tier */}
        <Card title="Funnel por tier" subtitle="Cotizaciones y cierre por calidad" className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {metrics.tier_funnel.filter(t => t.tier !== "unscored" || t.total_leads > 0).map(t => (
              <TierCard key={t.tier} row={t} />
            ))}
          </div>

          {/* Barras de % Cot→Cerr */}
          <div className="mt-5 pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-fg-5 text-[11px] uppercase tracking-wider font-medium">% Cotizaciones → Cerrados por tier</span>
              <span className="text-fg-6 text-[10px]">Escala 0–50%</span>
            </div>
            <div className="space-y-2">
              {metrics.tier_funnel.filter(t => t.tier !== "unscored" || t.total_leads > 0).map(t => (
                <TierBar key={t.tier} row={t} max={50} />
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Fila 3: Canales + Satisfacción */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Distribución por canal" subtitle="% de leads · ordenado por cantidad" className="lg:col-span-2">
          <DistributionTable rows={metrics.sources_distribution} valueLabel="Leads" icon={<Radio size={11} />} emptyMessage="Sin datos de canal en el período" />
        </Card>

        <Card title="Satisfacción del cliente" subtitle={`${metrics.nps_summary.responses_count} respuestas`}>
          <div className="space-y-3">
            <NpsCard label="NPS relacional" value={metrics.nps_summary.nps_relational} />
            <NpsCard label="NPS" value={metrics.nps_summary.nps} />
          </div>
        </Card>
      </div>

      {/* Fila 4: Industrias + Equipos de interés */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Top industrias" subtitle="% de leads por industria">
          <DistributionTable rows={metrics.industries_distribution} valueLabel="Leads" icon={<Factory size={11} />} emptyMessage="Sin datos de industria" />
        </Card>
        <Card title="Equipos más consultados" subtitle="Leads del bot + items cotizados · todas las fuentes">
          <DistributionTable rows={metrics.equipment_distribution} valueLabel="Menciones" icon={<Hammer size={11} />} emptyMessage="Sin datos de equipos" />
        </Card>
      </div>

      {/* Fila 5: Revenue mensual */}
      <Card title="Revenue · valor cerrado por mes" subtitle="Últimos 10 meses · click en un punto para ver detalle">
        <MonthlyRevenueChart rows={metrics.monthly_revenue} onMonthClick={setDetailMonth} />
      </Card>

      {detailMonth && (
        <ClosedMonthDetailModal month={detailMonth} onClose={() => setDetailMonth(null)} />
      )}

      {/* Ciudades (placeholder si vacío) */}
      {metrics.cities_distribution.length > 0 && (
        <Card title="Distribución por ciudad" subtitle="% de leads por ciudad">
          <DistributionTable rows={metrics.cities_distribution} valueLabel="Leads" icon={<MapPin size={11} />} />
        </Card>
      )}
    </div>
  );
}

// ─── Pieces ────────────────────────────────────────────────────────────────

function Card({ title, subtitle, className = "", children }: {
  title: string; subtitle?: string; className?: string; children: React.ReactNode;
}) {
  return (
    <div className={`bg-surface-2 border border-border p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-accent text-xs uppercase tracking-wider font-bold">▸ {title}</h3>
          {subtitle && <p className="text-fg-6 text-[10px] mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function StatBig({ label, value, sub, icon, accent, danger }: {
  label: string; value: string; sub?: string; icon?: React.ReactNode;
  accent?: boolean; danger?: boolean;
}) {
  const color = danger ? "text-red-400" : accent ? "text-accent" : "text-fg";
  // Reduce el font-size cuando el valor es muy largo (ej. $629.900.001 COP)
  const valueLen = value.length;
  const valueSize = valueLen > 18 ? "text-sm" : valueLen > 14 ? "text-base" : valueLen > 10 ? "text-lg" : "text-2xl";
  return (
    <div className="bg-surface-2 border border-border p-4 relative overflow-hidden hover:border-border-light transition-colors">
      {accent && <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent" />}
      {danger && <div className="absolute top-0 left-0 right-0 h-[2px] bg-red-400" />}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-fg-5 text-[10px] uppercase tracking-wider font-medium">{label}</p>
          <p className={`${valueSize} font-extrabold tracking-tight mt-1 break-words ${color}`} title={value}>{value}</p>
          {sub && <p className="text-fg-6 text-[10px] mt-1">{sub}</p>}
        </div>
        {icon && <div className="text-fg-5 shrink-0">{icon}</div>}
      </div>
    </div>
  );
}

function FunnelStep({ level, label, countLabel, pct, isTop = false, highlight = false }: {
  level: number; label: string; countLabel: string; pct: number;
  isTop?: boolean; highlight?: boolean;
}) {
  const width = `${level}%`;
  const bg = highlight ? "bg-accent" : isTop ? "bg-fg" : "bg-surface-4";
  const textColor = highlight || isTop ? "text-zinc-900" : "text-fg";
  const subColor  = highlight || isTop ? "text-zinc-700" : "text-fg-5";
  return (
    <div className="flex justify-center my-1.5">
      <div
        style={{ width, minWidth: "min(100%, 180px)", maxWidth: "100%" }}
        className={`${bg} ${textColor} py-3 px-3 sm:px-4 flex items-center justify-between gap-2 sm:gap-3 min-h-[58px] rounded-sm border border-black/5`}
      >
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold leading-tight break-words">{label}</div>
          <div className={`text-[10px] ${subColor} mt-0.5 truncate`}>{countLabel}</div>
        </div>
        <div className="text-xl font-extrabold shrink-0">{Math.round(pct)}%</div>
      </div>
    </div>
  );
}

function DropLabel({ pct }: { pct: number }) {
  return (
    <div className="flex justify-center my-0.5">
      <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] px-2 py-0.5 flex items-center gap-1 rounded-sm">
        <TrendingDown size={9} /> −{Math.round(pct)}% se pierde aquí
      </div>
    </div>
  );
}

function TierCard({ row }: { row: TierFunnelRow }) {
  const meta = TIER_META[row.tier] ?? TIER_META.unscored;
  return (
    <div className={`border border-border p-3 ${meta.bg}`}>
      <div className={`text-[10px] uppercase tracking-wider font-bold mb-2 ${meta.textColor}`}>
        {meta.label}
      </div>
      <TierRow label="Total leads"       value={row.total_leads}       color={meta.color} isAccent={false} />
      <TierRow label="Total cotizaciones" value={row.total_quotations}  color={meta.color} isAccent={false} />
      <TierRow label="Total cerrados"    value={row.total_closed}      color={meta.color} isAccent={true} />
    </div>
  );
}

function TierRow({ label, value, color, isAccent }: { label: string; value: number; color: string; isAccent: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-border/50 last:border-b-0">
      <span className="text-fg-5 text-[11px]">{label}</span>
      <div className="flex items-center gap-2">
        {isAccent && <div className={`h-0.5 w-5 ${color}`} />}
        <span className="text-fg text-sm font-bold">{value}</span>
      </div>
    </div>
  );
}

function TierBar({ row, max }: { row: TierFunnelRow; max: number }) {
  const meta = TIER_META[row.tier] ?? TIER_META.unscored;
  const widthPct = Math.min(100, (row.conv_rate / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className={`text-[11px] font-medium w-16 ${meta.textColor}`}>{meta.label}</div>
      <div className="flex-1 h-2 bg-surface-3 relative">
        <div style={{ width: `${widthPct}%` }} className={`h-full ${meta.color} transition-all`} />
      </div>
      <div className="text-fg-2 text-xs font-bold w-10 text-right">{row.conv_rate}%</div>
    </div>
  );
}

function DistributionTable({ rows, valueLabel, icon, emptyMessage = "Sin datos" }: {
  rows: DistributionRow[]; valueLabel: string; icon?: React.ReactNode; emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return <div className="text-fg-6 text-xs text-center py-6 border border-dashed border-border">{emptyMessage}</div>;
  }
  // Encontrar el máximo pct para escalar las barras (si todas son chicas, la barra top llenaría al 100%)
  const maxPct = Math.max(1, ...rows.map(r => r.pct));

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[18px_80px_1fr_52px] sm:grid-cols-[22px_120px_1fr_70px] gap-2 sm:gap-3 text-fg-6 text-[9px] uppercase tracking-wider border-b border-border pb-1.5 font-semibold">
        <div>#</div>
        <div>{icon && <span className="inline-flex items-center gap-1">{icon}</span>} Nombre</div>
        <div className="text-right pr-2">%</div>
        <div className="text-right">{valueLabel}</div>
      </div>
      {rows.map((r, i) => {
        const widthPct = (r.pct / maxPct) * 100;
        return (
          <div key={r.label} className="grid grid-cols-[18px_80px_1fr_52px] sm:grid-cols-[22px_120px_1fr_70px] gap-2 sm:gap-3 items-center text-xs py-1 group hover:bg-surface-3/40 transition-colors">
            <div className="text-fg-6 font-mono text-[11px]">{i + 1}</div>
            <div className="text-fg-2 truncate" title={r.label}>{r.label}</div>
            {/* Barra con % dentro (al estilo del PDF) */}
            <div className="relative h-5 bg-surface-3">
              <div
                style={{ width: `${widthPct}%` }}
                className="h-full bg-accent flex items-center justify-end pr-2 min-w-[36px] transition-all"
              >
                <span className="text-zinc-900 text-[11px] font-extrabold">{r.pct}%</span>
              </div>
            </div>
            <div className="text-right text-fg-4 text-[11px]">{r.count} {valueLabel.toLowerCase()}</div>
          </div>
        );
      })}
    </div>
  );
}

function NpsCard({ label, value }: { label: string; value: number | null }) {
  const safe = value ?? 0;
  const widthPct = (safe / 10) * 100;
  return (
    <div className="bg-surface-3 border border-border p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-fg-5 text-[10px] uppercase tracking-wider font-medium">{label}</span>
        <Smile size={12} className="text-accent" />
      </div>
      {value == null ? (
        <div className="text-fg-6 text-xs">Sin respuestas</div>
      ) : (
        <>
          <div className="flex items-baseline gap-1">
            <span className="text-accent text-2xl font-extrabold">{value.toFixed(1)}</span>
            <span className="text-fg-5 text-xs">/ 10</span>
          </div>
          <div className="h-1.5 bg-surface-4 mt-2 relative">
            <div style={{ width: `${widthPct}%` }} className="h-full bg-accent" />
          </div>
        </>
      )}
    </div>
  );
}

function MonthlyRevenueChart({ rows, onMonthClick }: {
  rows: MonthlyRevenueRow[];
  onMonthClick?: (month: string) => void;
}) {
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);

  if (rows.length === 0) {
    return <div className="text-fg-6 text-xs text-center py-10">Sin datos del período</div>;
  }
  const maxVal = Math.max(1, ...rows.map(r => r.closed_value));
  const minVal = Math.min(0, ...rows.map(r => r.closed_value));
  const vbW = 1000;
  const vbH = 260;
  const padL = 110, padR = 20, padT = 30, padB = 36;  // padL amplio para etiquetas de valor completo
  const chartW = vbW - padL - padR;
  const chartH = vbH - padT - padB;

  // Calcular coordenadas de cada punto
  const points = rows.map((r, i) => {
    const x = padL + (chartW * i) / Math.max(1, rows.length - 1);
    const yRange = maxVal - minVal || 1;
    const y = padT + chartH - ((r.closed_value - minVal) / yRange) * chartH;
    return { x, y, row: r, idx: i };
  });

  // Línea polyline
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  // Área bajo la curva
  const areaD = `${pathD} L ${points[points.length - 1].x} ${padT + chartH} L ${padL} ${padT + chartH} Z`;

  // Líneas horizontales de guía
  const guideLines = [0, 0.5, 1].map(frac => padT + chartH * (1 - frac));
  const guideLabels = [0, 0.5, 1].map(frac => Math.round((minVal + (maxVal - minVal) * frac)));

  // Ancho de cada "zona" para captura de hover sobre el mes
  const zoneW = chartW / rows.length;

  const hovered = hoveredIdx !== null ? points[hoveredIdx] : null;

  // Convierte coordenadas del viewbox a pixels de la pantalla para posicionar tooltip HTML
  function toScreenX(vbX: number): string {
    return `${(vbX / vbW) * 100}%`;
  }

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${vbW} ${vbH}`}
        className="w-full h-48 sm:h-64"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Líneas guía */}
        {guideLines.map((y, i) => (
          <g key={i}>
            <line x1={padL} y1={y} x2={vbW - padR} y2={y}
              stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" className="text-border/60" />
            <text x={padL - 6} y={y + 3} textAnchor="end"
              className="fill-fg-6 text-[10px] font-medium" fontSize="10">
              {copChart(guideLabels[i])}
            </text>
          </g>
        ))}

        {/* Área bajo la curva */}
        <path d={areaD} fill="url(#revenue-grad)" />
        <defs>
          <linearGradient id="revenue-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#FFC837" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#FFC837" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Línea */}
        <path d={pathD} fill="none" stroke="#FFC837" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {/* Línea vertical del hover */}
        {hovered && (
          <line
            x1={hovered.x} y1={padT} x2={hovered.x} y2={padT + chartH}
            stroke="#FFC837" strokeWidth="1" strokeDasharray="3 3" opacity="0.5"
          />
        )}

        {/* Puntos + etiquetas */}
        {points.map((p, i) => (
          <g key={i}>
            {/* Etiqueta valor (ocultar en el hovered para que no choque con tooltip) */}
            {hoveredIdx !== i && (
              <text x={p.x} y={p.y - 10} textAnchor="middle"
                className="fill-fg text-[10px] font-bold" fontSize="10">
                {copChart(p.row.closed_value)}
              </text>
            )}
            {/* Punto */}
            <circle
              cx={p.x} cy={p.y}
              r={hoveredIdx === i ? "7" : "4"}
              fill={hoveredIdx === i ? "#FFC837" : "#0b0f17"}
              stroke="#FFC837"
              strokeWidth="2"
              className="transition-all"
            />
            {/* Label mes */}
            <text x={p.x} y={padT + chartH + 20} textAnchor="middle"
              className={`text-[10px] ${hoveredIdx === i ? "fill-accent font-bold" : "fill-fg-5"}`}
              fontSize="10">
              {p.row.label}
            </text>
            {/* Zona de hover invisible — captura mouse en una franja ancha para fácil interacción */}
            <rect
              x={p.x - zoneW / 2}
              y={padT}
              width={zoneW}
              height={chartH}
              fill="transparent"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => onMonthClick?.(p.row.month)}
              style={{ cursor: onMonthClick ? "pointer" : "default" }}
            />
          </g>
        ))}
      </svg>

      {/* Tooltip HTML (más control que SVG) */}
      {hovered && (
        <div
          className="absolute pointer-events-none bg-surface-3 border border-accent/50 shadow-xl p-3 min-w-[200px] z-10"
          style={{
            left: toScreenX(hovered.x),
            top: `${(hovered.y / vbH) * 100}%`,
            transform: hovered.idx > rows.length / 2
              ? "translate(calc(-100% - 10px), -50%)"
              : "translate(10px, -50%)",
          }}
        >
          <div className="text-fg-5 text-[10px] uppercase tracking-wider font-semibold mb-1">
            {hovered.row.label}
          </div>
          <div className="text-fg font-bold text-lg mb-2">
            {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(hovered.row.closed_value)}
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex items-center justify-between gap-3" title="Leads que pasaron a 'Cerrado' durante este mes (sin importar cuándo se crearon)">
              <span className="text-fg-5">Cerrados ese mes</span>
              <span className="text-accent font-bold">{hovered.row.closed_count}</span>
            </div>
            <div className="h-px bg-border my-1" />
            <div className="flex items-center justify-between gap-3" title="Cotizaciones creadas durante este mes">
              <span className="text-fg-5">Cotizaciones nuevas</span>
              <span className="text-fg-3">{hovered.row.quoted_count}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-fg-5">Valor cotizado</span>
              <span className="text-fg-3">{copChart(hovered.row.quoted_value)}</span>
            </div>
            {hovered.row.closed_count > 0 && hovered.row.quoted_value > 0 && (
              <div className="flex items-center justify-between gap-3 pt-1 border-t border-border"
                   title="Porcentaje del valor cotizado que efectivamente se cerró">
                <span className="text-fg-5">% valor cerrado</span>
                <span className="text-emerald-400 font-semibold">
                  {Math.min(100, Math.round((hovered.row.closed_value / hovered.row.quoted_value) * 100))}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Nota legend */}
      <div className="flex items-center justify-end mt-2 text-[10px] text-fg-5">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-accent"></div> Valor cerrado · Millones COP
        </div>
      </div>
    </div>
  );
}

// ─── Modal: detalle de leads cerrados en un mes específico ─────────────────

type ClosedLeadRow = {
  lead_id: number;
  name: string | null;
  email: string | null;
  company: string | null;
  phone: string | null;
  created_at: string;
  first_closed_at: string;
  close_value: number | null;
  latest_quotation_number: string | null;
  latest_quotation_total: number | null;
  value_used_in_chart: number | null;
  value_source: string | null;
};

function ClosedMonthDetailModal({ month, onClose }: { month: string; onClose: () => void }) {
  const [loading, setLoading] = React.useState(true);
  const [leads, setLeads] = React.useState<ClosedLeadRow[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLoading(true);
    api.bot.monthlyClosedDetail(month)
      .then(res => setLeads(res.leads))
      .catch(e => setError(e?.detail ?? "Error cargando detalle"))
      .finally(() => setLoading(false));
  }, [month]);

  const totalChart = leads.reduce((s, l) => s + (l.value_used_in_chart ?? 0), 0);
  const monthLabel = (() => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
  })();

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-2 border border-border w-full max-w-4xl max-h-[85vh] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <div>
            <h2 className="text-fg font-semibold text-sm">
              Leads cerrados — {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
            </h2>
            <p className="text-fg-6 text-xs mt-0.5">
              {leads.length} lead{leads.length === 1 ? "" : "s"} · Total: {copFull(totalChart)}
            </p>
          </div>
          <button onClick={onClose} className="text-fg-5 hover:text-fg">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center justify-center py-10 text-fg-6">
              <Loader2 size={18} className="animate-spin mr-2" /> Cargando...
            </div>
          )}
          {error && <div className="text-red-400 text-sm text-center py-6">{error}</div>}
          {!loading && !error && leads.length === 0 && (
            <div className="text-center py-10 text-fg-6 text-sm">
              Sin leads cerrados en este mes.
            </div>
          )}
          {!loading && !error && leads.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-fg-6 text-[10px] uppercase tracking-wider">
                    <th className="text-left px-3 py-2 font-medium">Lead</th>
                    <th className="text-left px-3 py-2 font-medium">Empresa</th>
                    <th className="text-left px-3 py-2 font-medium">Creado</th>
                    <th className="text-left px-3 py-2 font-medium">Cerrado</th>
                    <th className="text-right px-3 py-2 font-medium">Valor en gráfico</th>
                    <th className="text-left px-3 py-2 font-medium">Fuente del valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {leads.map(l => (
                    <tr key={l.lead_id} className="hover:bg-surface-3">
                      <td className="px-3 py-2">
                        <div className="text-fg-2">{l.name || <span className="italic text-fg-6">Sin nombre</span>}</div>
                        {l.email && <div className="text-fg-6 text-[10px]">{l.email}</div>}
                        {l.phone && <div className="text-fg-6 text-[10px]">{l.phone}</div>}
                      </td>
                      <td className="px-3 py-2 text-fg-3">{l.company || "—"}</td>
                      <td className="px-3 py-2 text-fg-5 text-[10px]">
                        {new Date(l.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-3 py-2 text-emerald-400 text-[10px] font-mono">
                        {new Date(l.first_closed_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-3 py-2 text-right text-fg font-mono text-xs">
                        {copFull(l.value_used_in_chart)}
                      </td>
                      <td className="px-3 py-2">
                        {l.value_source === "close_value" ? (
                          <span className="text-emerald-400 text-[10px]">close_value</span>
                        ) : l.value_source?.startsWith("quotation_") ? (
                          <span className="text-sky-400 text-[10px]">{l.value_source.replace("quotation_", "COT ")}</span>
                        ) : (
                          <span className="text-fg-6 text-[10px]">sin valor</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border text-[10px] text-fg-6">
          Nota: el gráfico cuenta solo la <strong>primera vez</strong> que el lead pasó a Cerrado.
          Si un lead fue cerrado antes y re-marcado, NO cuenta en este mes.
        </div>
      </div>
    </div>,
    document.body
  );
}
