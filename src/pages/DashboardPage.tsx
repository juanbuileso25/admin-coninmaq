import { useEffect, useState } from "react";
import {
  Package, MessageSquare, Users, DollarSign,
  Clock, CheckCircle2, XCircle, ArrowRight,
  AlertCircle, Star, Mail, Building2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import StatCard from "../components/StatCard";
import { useAuth } from "../hooks/useAuth";
import { api, type BotMetrics, type BotQuotationResponse } from "../services/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

const COP = (n: number) => {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n > 0)              return `$${n.toLocaleString("es-CO")}`;
  return "$0";
};

const toISO = (d: Date) => d.toISOString().slice(0, 10);

const STATUS_CONFIG = {
  generated: { label: "Generada", bg: "bg-amber-950/40",   text: "text-amber-400",   border: "border-amber-800/40",   icon: Clock        },
  sent:      { label: "Enviada",  bg: "bg-emerald-950/50", text: "text-emerald-400", border: "border-emerald-800/40", icon: CheckCircle2 },
  expired:   { label: "Expirada", bg: "bg-red-950/40",     text: "text-red-400",     border: "border-red-800/40",     icon: XCircle      },
};

const DELIVERY_LABELS: Record<string, string> = {
  email: "Email", chat: "Chat", ambas: "Email + Chat",
};

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)    return "Hace un momento";
  if (diff < 3600)  return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`;
  return `Hace ${Math.floor(diff / 86400)}d`;
}

// ── Presets ───────────────────────────────────────────────────────────────────

type Preset = "today" | "week" | "month" | "year" | "custom";

function getPresetRange(preset: Preset): { from: string; to: string } {
  const today = new Date();
  const to    = toISO(today);
  if (preset === "today") return { from: to, to };
  if (preset === "week") {
    const mon = new Date(today);
    mon.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
    return { from: toISO(mon), to };
  }
  if (preset === "month") return { from: toISO(new Date(today.getFullYear(), today.getMonth(), 1)), to };
  if (preset === "year")  return { from: `${today.getFullYear()}-01-01`, to };
  return { from: to, to };
}

const PRESET_LABELS: Record<Preset, string> = {
  today: "Hoy", week: "Esta semana", month: "Este mes", year: "Este año", custom: "Personalizado",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [preset, setPreset]     = useState<Preset>("month");
  const [customFrom, setFrom]   = useState("");
  const [customTo, setTo]       = useState("");
  const [metrics, setMetrics]   = useState<BotMetrics | null>(null);
  const [quotes, setQuotes]     = useState<BotQuotationResponse[]>([]);
  const [loading, setLoading]   = useState(true);

  const activeRange = preset === "custom"
    ? { from: customFrom, to: customTo }
    : getPresetRange(preset);

  useEffect(() => {
    if (preset === "custom" && (!customFrom || !customTo)) return;
    setLoading(true);
    Promise.all([
      api.bot.metrics({ date_from: activeRange.from, date_to: activeRange.to }),
      api.bot.quotations({ quotation_type: "maquinaria", page: 1, page_size: 5 }),
    ])
      .then(([m, q]) => { setMetrics(m); setQuotes(q.data); })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [preset, customFrom, customTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const now      = new Date();
  const hour     = now.getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches";

  const topProducts  = metrics?.top_equipment_interest.slice(0, 5) ?? [];
  const topIndustries = metrics?.top_industries.slice(0, 4) ?? [];
  const maxProd      = topProducts[0]?.count  ?? 1;
  const maxInd       = topIndustries[0]?.count ?? 1;

  const emailPct = metrics && metrics.quotations_period > 0
    ? Math.round((metrics.email_sent_period / metrics.quotations_period) * 100)
    : 0;

  return (
    <div className="space-y-6 max-w-[1280px]">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 animate-fade-up flex-wrap">
        <div>
          <p className="text-fg-5 text-xs uppercase tracking-wider mb-1">
            {now.toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
          <h1 className="text-fg text-2xl font-semibold">
            {greeting}, <span className="text-gradient-accent">{user?.name}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 bg-surface-2 border border-border px-4 py-2 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-fg-4 text-xs">Sistema activo</span>
        </div>
      </div>

      {/* Date filter */}
      <div className="animate-fade-up" style={{ animationDelay: "50ms", animationFillMode: "both" }}>
        <div className="flex items-center gap-2 flex-wrap">
          {(["today", "week", "month", "year", "custom"] as Preset[]).map(p => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`px-3 py-1.5 text-xs font-medium border transition-colors ${
                preset === p
                  ? "bg-accent text-black border-accent"
                  : "bg-surface-2 border-border text-fg-4 hover:border-accent/50 hover:text-fg"
              }`}
            >
              {PRESET_LABELS[p]}
            </button>
          ))}
          {metrics && preset !== "custom" && (
            <span className="text-fg-6 text-xs ml-1">{activeRange.from} → {activeRange.to}</span>
          )}
        </div>
        {preset === "custom" && (
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <input
              type="date"
              value={customFrom}
              onChange={e => setFrom(e.target.value)}
              className="bg-surface-2 border border-border text-fg text-xs px-2 py-1.5 outline-none focus:border-accent"
            />
            <span className="text-fg-5 text-xs">→</span>
            <input
              type="date"
              value={customTo}
              onChange={e => setTo(e.target.value)}
              className="bg-surface-2 border border-border text-fg text-xs px-2 py-1.5 outline-none focus:border-accent"
            />
          </div>
        )}
      </div>

      {/* KPI Cards — Row 1: período */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Cotizaciones"
          value={loading ? "—" : String(metrics?.quotations_period ?? 0)}
          sub={metrics ? `${metrics.total_quotations} en total` : undefined}
          icon={MessageSquare}
          accent
          delay={0}
        />
        <StatCard
          label="Revenue"
          value={loading ? "—" : COP(metrics?.revenue_period ?? 0)}
          sub={metrics ? `Total: ${COP(metrics.total_revenue)}` : undefined}
          icon={DollarSign}
          delay={60}
        />
        <StatCard
          label="Leads captados"
          value={loading ? "—" : String(metrics?.leads_period ?? 0)}
          sub={metrics ? `${metrics.leads_tier_a_period} Tier A` : undefined}
          icon={Users}
          delay={120}
        />
        <StatCard
          label="Emails enviados"
          value={loading ? "—" : String(metrics?.email_sent_period ?? 0)}
          sub={metrics?.quotations_period ? `${emailPct}% de las cotizaciones` : undefined}
          icon={Mail}
          delay={180}
        />
      </div>

      {/* KPI Cards — Row 2: estado actual */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Catálogo"
          value={loading ? "—" : String(metrics?.total_machines ?? 0)}
          sub={metrics ? `${metrics.machines_visible_web} visibles en web` : undefined}
          icon={Package}
          delay={0}
        />
        <StatCard
          label="Clientes CRM"
          value={loading ? "—" : String(metrics?.total_clients ?? 0)}
          icon={Building2}
          delay={60}
        />
        <StatCard
          label="Conversaciones"
          value={loading ? "—" : String(metrics?.active_sessions ?? 0)}
          sub={metrics ? `${metrics.bot_paused_sessions} pausadas` : undefined}
          icon={MessageSquare}
          delay={120}
        />
        {(metrics?.payments_pending ?? 0) > 0 ? (
          <StatCard
            label="Comprobantes"
            value={loading ? "—" : String(metrics?.payments_pending ?? 0)}
            sub="Pendientes de revisar"
            icon={AlertCircle}
            delay={180}
          />
        ) : (
          <StatCard
            label="Leads totales"
            value={loading ? "—" : String(metrics?.total_leads ?? 0)}
            sub={metrics ? `${metrics.total_quotations} cotizaciones` : undefined}
            icon={Star}
            delay={180}
          />
        )}
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Cotizaciones recientes */}
        <div className="xl:col-span-2 bg-surface-2 border border-border animate-fade-up" style={{ animationDelay: "320ms", animationFillMode: "both" }}>
          <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-border">
            <div>
              <h2 className="text-fg text-sm font-semibold">Cotizaciones recientes</h2>
              <p className="text-fg-6 text-xs mt-0.5">Últimas generadas</p>
            </div>
            <button onClick={() => navigate("/comercial/cotizaciones")}
              className="flex items-center gap-1 text-accent text-xs hover:text-accent/80 transition-colors shrink-0 ml-2">
              Ver todas <ArrowRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-border">
            {loading && <div className="px-4 py-8 text-center text-fg-5 text-sm">Cargando...</div>}
            {!loading && quotes.length === 0 && <div className="px-4 py-8 text-center text-fg-5 text-sm">Sin cotizaciones aún</div>}
            {!loading && quotes.map(q => {
              const cfg = STATUS_CONFIG[q.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.generated;
              const Icon = cfg.icon;
              return (
                <div key={q.id} className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 hover:bg-surface-3 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-fg-5 text-[10px] font-mono">{q.quotation_number}</span>
                      <span className="text-fg-7 text-[10px]">·</span>
                      <span className="text-fg-5 text-[10px]">{timeAgo(q.created_at)}</span>
                    </div>
                    <p className="text-fg-2 text-sm font-medium truncate">{q.lead_name ?? q.lead_email ?? "Sin nombre"}</p>
                    <p className="text-fg-5 text-xs truncate">{(q.items as { producto: string }[])?.[0]?.producto ?? "—"}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-fg text-sm font-semibold">{COP(q.total)}</p>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 mt-1 border rounded-full ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                      <Icon size={9} /> {cfg.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel derecho */}
        <div className="space-y-4">

          {/* Equipos más consultados */}
          <div className="bg-surface-2 border border-border animate-fade-up" style={{ animationDelay: "400ms", animationFillMode: "both" }}>
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-fg text-sm font-semibold">Equipos más consultados</h2>
              <p className="text-fg-6 text-xs mt-0.5">Por interés en leads del período</p>
            </div>
            <div className="p-5 space-y-3">
              {loading && <p className="text-fg-5 text-sm text-center py-2">Cargando...</p>}
              {!loading && topProducts.length === 0 && <p className="text-fg-5 text-xs text-center py-2">Sin datos en el período</p>}
              {!loading && topProducts.map((p, i) => (
                <div key={p.equipment}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-fg-7 text-[10px] font-mono w-4">{i + 1}</span>
                      <span className="text-fg-3 text-xs font-medium truncate max-w-[130px]">{p.equipment}</span>
                    </div>
                    <span className="text-fg-5 text-[10px] shrink-0">{p.count}</span>
                  </div>
                  <div className="h-1 bg-surface-4 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-accent-dark to-accent rounded-full transition-all duration-700"
                      style={{ width: `${Math.round((p.count / maxProd) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Industrias */}
          {topIndustries.length > 0 && (
            <div className="bg-surface-2 border border-border animate-fade-up" style={{ animationDelay: "480ms", animationFillMode: "both" }}>
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-fg text-sm font-semibold">Top industrias</h2>
                <p className="text-fg-6 text-xs mt-0.5">Sectores de los leads</p>
              </div>
              <div className="p-5 space-y-3">
                {topIndustries.map((ind, i) => (
                  <div key={ind.industry}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-fg-7 text-[10px] font-mono w-4">{i + 1}</span>
                        <span className="text-fg-3 text-xs font-medium truncate max-w-[130px]">{ind.industry}</span>
                      </div>
                      <span className="text-fg-5 text-[10px] shrink-0">{ind.count}</span>
                    </div>
                    <div className="h-1 bg-surface-4 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-700 to-blue-400 rounded-full transition-all duration-700"
                        style={{ width: `${Math.round((ind.count / maxInd) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Canales de entrega */}
          {(metrics?.quotations_by_delivery.length ?? 0) > 0 && (
            <div className="bg-surface-2 border border-border animate-fade-up" style={{ animationDelay: "560ms", animationFillMode: "both" }}>
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-fg text-sm font-semibold">Por canal</h2>
                <p className="text-fg-6 text-xs mt-0.5">Distribución de cotizaciones</p>
              </div>
              <div className="p-5 space-y-2">
                {metrics!.quotations_by_delivery.map(d => (
                  <div key={d.mode} className="flex items-center justify-between">
                    <span className="text-fg-4 text-xs">{DELIVERY_LABELS[d.mode] ?? d.mode}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-surface-4 rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full"
                          style={{ width: `${Math.round((d.count / (metrics?.quotations_period || 1)) * 100)}%` }} />
                      </div>
                      <span className="text-fg-5 text-[10px] w-6 text-right">{d.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Agente */}
          <div className="bg-surface-2 border border-border p-4 animate-fade-up" style={{ animationDelay: "640ms", animationFillMode: "both" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-fg-4 text-xs font-medium">Agente Coni</span>
              </div>
              <span className="text-emerald-400 text-[10px] font-medium">En línea</span>
            </div>
            <p className="text-fg-6 text-[10px] mt-1.5 ml-3.5">
              {loading ? "..." : `${metrics?.active_sessions ?? 0} conversaciones activas · ${metrics?.bot_paused_sessions ?? 0} pausadas`}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
