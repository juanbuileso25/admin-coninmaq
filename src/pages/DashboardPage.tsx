import {
  Package,
  MessageSquare,
  Eye,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react";
import StatCard from "../components/StatCard";
import { useAuth } from "../hooks/useAuth";

const RECENT_QUOTES = [
  { id: "COT-0041", client: "Constructora Andes S.A.S",   product: "Excavadora CDM6225",        status: "enviada",   value: "$605.0M", time: "Hace 12 min" },
  { id: "COT-0040", client: "Inversiones del Sur",        product: "Minicargador CDM312",        status: "pendiente", value: "$180.9M", time: "Hace 35 min" },
  { id: "COT-0039", client: "Grupo Constructor Bogotá",   product: "Cargador CDM835H",           status: "enviada",   value: "$209.5M", time: "Hace 1h" },
  { id: "COT-0038", client: "Obras Viales Colombia",      product: "Retrocargadora 83D",         status: "expirada",  value: "$310.9M", time: "Hace 3h" },
  { id: "COT-0037", client: "Ingeniería Civil del Meta",  product: "Excavadora CDM6060",         status: "enviada",   value: "$201.6M", time: "Hace 5h" },
];

const STATUS_CONFIG = {
  enviada:   { label: "Enviada",   bg: "bg-emerald-950/50", text: "text-emerald-400", border: "border-emerald-800/40", icon: CheckCircle2 },
  pendiente: { label: "Pendiente", bg: "bg-amber-950/40",   text: "text-amber-400",   border: "border-amber-800/40",   icon: Clock        },
  expirada:  { label: "Expirada",  bg: "bg-red-950/40",     text: "text-red-400",     border: "border-red-800/40",     icon: XCircle      },
};

const TOP_PRODUCTS = [
  { name: "Excavadora CDM6225", queries: 38, pct: 82 },
  { name: "Minicargador CDM312", queries: 29, pct: 63 },
  { name: "Retrocargadora 83D",  queries: 21, pct: 46 },
  { name: "Excavadora CDM6060",  queries: 18, pct: 39 },
  { name: "Cargador CDM835H",    queries: 12, pct: 26 },
];

export default function DashboardPage() {
  const { user } = useAuth();

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="space-y-7 max-w-[1200px]">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-fg-5 text-xs uppercase tracking-wider mb-1">
            {now.toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
          <h1 className="text-fg text-2xl font-semibold">
            {greeting},{" "}
            <span className="text-gradient-accent">{user?.name}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 bg-surface-2 border border-border px-4 py-2 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-fg-4 text-xs">Sistema activo</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Productos en catálogo"
          value="8"
          sub="6 visibles en la web"
          icon={Package}
          accent
          trend={0}
          delay={0}
        />
        <StatCard
          label="Cotizaciones hoy"
          value="14"
          sub="vía WhatsApp + Web"
          icon={MessageSquare}
          trend={12}
          delay={80}
        />
        <StatCard
          label="Visitas al catálogo"
          value="341"
          sub="Últimas 24 horas"
          icon={Eye}
          trend={7}
          delay={160}
        />
        <StatCard
          label="Valor cotizado hoy"
          value="$2.1B"
          sub="COP — 14 cotizaciones"
          icon={DollarSign}
          trend={-3}
          delay={240}
        />
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Recent quotes */}
        <div
          className="xl:col-span-2 bg-surface-2 border border-border animate-fade-up"
          style={{ animationDelay: "300ms", animationFillMode: "both" }}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h2 className="text-fg text-sm font-semibold">Cotizaciones recientes</h2>
              <p className="text-fg-6 text-xs mt-0.5">Generadas por Coni (agente IA)</p>
            </div>
            <button className="flex items-center gap-1 text-accent text-xs hover:text-accent-light transition-colors">
              Ver todas <ArrowRight size={12} />
            </button>
          </div>

          <div className="divide-y divide-border">
            {RECENT_QUOTES.map((q) => {
              const cfg = STATUS_CONFIG[q.status as keyof typeof STATUS_CONFIG];
              const StatusIcon = cfg.icon;
              return (
                <div
                  key={q.id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-3 transition-colors duration-150 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-fg-5 text-[10px] font-mono">{q.id}</span>
                      <span className="text-fg-7 text-[10px]">·</span>
                      <span className="text-fg-5 text-[10px]">{q.time}</span>
                    </div>
                    <p className="text-fg-2 text-sm font-medium truncate">{q.client}</p>
                    <p className="text-fg-5 text-xs truncate">{q.product}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-fg text-sm font-semibold">{q.value}</p>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 mt-1
                                  border rounded-full ${cfg.bg} ${cfg.text} ${cfg.border}`}
                    >
                      <StatusIcon size={9} />
                      {cfg.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top products */}
        <div
          className="bg-surface-2 border border-border animate-fade-up"
          style={{ animationDelay: "380ms", animationFillMode: "both" }}
        >
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-fg text-sm font-semibold">Productos más consultados</h2>
            <p className="text-fg-6 text-xs mt-0.5">Últimos 30 días</p>
          </div>

          <div className="p-5 space-y-4">
            {TOP_PRODUCTS.map((p, i) => (
              <div key={p.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-fg-7 text-[10px] font-mono w-4">{i + 1}</span>
                    <span className="text-fg-3 text-xs font-medium">{p.name}</span>
                  </div>
                  <span className="text-fg-5 text-[10px]">{p.queries} consultas</span>
                </div>
                <div className="h-1 bg-surface-4 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-accent-dark to-accent rounded-full"
                    style={{ width: `${p.pct}%`, transition: "width 0.8s ease" }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Mini status indicator */}
          <div className="mx-5 mb-5 p-3 bg-surface-3 border border-border rounded-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-fg-4 text-[11px]">Agente Coni</span>
              </div>
              <span className="text-emerald-400 text-[10px] font-medium">En línea</span>
            </div>
            <p className="text-fg-6 text-[10px] mt-1 ml-3.5">
              14 conversaciones activas hoy
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
