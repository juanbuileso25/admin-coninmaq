import React from "react";
import { Users, FileText, CheckCircle2, DollarSign, Minus, TrendingDown, Smile, Radio, MapPin, Factory, Hammer } from "lucide-react";
import type { DashboardMetrics, DistributionRow, MonthlyRevenueRow, TierFunnelRow } from "../../../services/api";

function copShort(n: number | null | undefined): string {
  if (n == null) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2).replace(".00", "")} MM`;
  if (abs >= 1_000_000)     return `$${(n / 1_000_000).toFixed(0)} M`;
  if (abs >= 1_000)         return `$${(n / 1_000).toFixed(0)} K`;
  return `$${n.toFixed(0)}`;
}

function copFull(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
}

const TIER_META: Record<string, { label: string; color: string; textColor: string; bg: string }> = {
  A:        { label: "Tier A",   color: "bg-green-500",  textColor: "text-green-400",  bg: "bg-green-500/10" },
  B:        { label: "Tier B",   color: "bg-yellow-500", textColor: "text-yellow-400", bg: "bg-yellow-500/10" },
  no_fit:   { label: "No Fit",   color: "bg-red-500",    textColor: "text-red-400",    bg: "bg-red-500/10" },
  unscored: { label: "Sin calificar", color: "bg-zinc-500", textColor: "text-zinc-400", bg: "bg-zinc-500/10" },
};

export default function DashboardPrincipalTab({ metrics }: { metrics: DashboardMetrics; loading?: boolean }) {
  const f = metrics.funnel;

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
        <Card title="Equipos más consultados" subtitle="% de leads por equipo de interés">
          <DistributionTable rows={metrics.equipment_distribution} valueLabel="Leads" icon={<Hammer size={11} />} emptyMessage="Sin datos de equipos" />
        </Card>
      </div>

      {/* Fila 5: Revenue mensual */}
      <Card title="Revenue · valor cerrado por mes" subtitle="Millones COP">
        <MonthlyRevenueChart rows={metrics.monthly_revenue} />
      </Card>

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
  return (
    <div className="bg-surface-2 border border-border p-4 relative overflow-hidden hover:border-border-light transition-colors">
      {accent && <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent" />}
      {danger && <div className="absolute top-0 left-0 right-0 h-[2px] bg-red-400" />}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-fg-5 text-[10px] uppercase tracking-wider font-medium">{label}</p>
          <p className={`text-2xl font-extrabold tracking-tight mt-1 truncate ${color}`}>{value}</p>
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

function MonthlyRevenueChart({ rows }: { rows: MonthlyRevenueRow[] }) {
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);

  if (rows.length === 0) {
    return <div className="text-fg-6 text-xs text-center py-10">Sin datos del período</div>;
  }
  const maxVal = Math.max(1, ...rows.map(r => r.closed_value));
  const minVal = Math.min(0, ...rows.map(r => r.closed_value));
  const vbW = 1000;
  const vbH = 260;
  const padL = 30, padR = 20, padT = 30, padB = 36;
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
              {copShort(guideLabels[i])}
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
                className="fill-fg text-[11px] font-bold" fontSize="11">
                {copShort(p.row.closed_value)}
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
              style={{ cursor: "pointer" }}
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
            <div className="flex items-center justify-between gap-3">
              <span className="text-fg-5">Leads cerrados</span>
              <span className="text-accent font-bold">{hovered.row.closed_count}</span>
            </div>
            <div className="h-px bg-border my-1" />
            <div className="flex items-center justify-between gap-3">
              <span className="text-fg-5">Cotizaciones</span>
              <span className="text-fg-3">{hovered.row.quoted_count}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-fg-5">Valor cotizado</span>
              <span className="text-fg-3">{copShort(hovered.row.quoted_value)}</span>
            </div>
            {hovered.row.quoted_count > 0 && (
              <div className="flex items-center justify-between gap-3 pt-1 border-t border-border">
                <span className="text-fg-5">Tasa cierre</span>
                <span className="text-emerald-400 font-semibold">
                  {Math.round((hovered.row.closed_count / hovered.row.quoted_count) * 100)}%
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
