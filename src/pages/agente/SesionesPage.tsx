import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare, Bot, BotOff, Search,
  Users, Activity, PauseCircle,
} from "lucide-react";
import StatCard from "../../components/StatCard";
import { api, type BotSessionListItem, type BotMetrics } from "../../services/api";

const PHASE_LABELS: Record<string, string> = {
  calificar:             "Calificando",
  buscar_producto:       "Buscando equipo",
  acumulando_productos:  "Acumulando equipos",
  pedir_datos:           "Pidiendo datos",
  confirmar:             "Confirmando",
  elegir_entrega:        "Eligiendo entrega",
  pedir_correo:          "Pidiendo correo",
  despedida:             "Despedida",
};

function PhaseTag({ phase }: { phase: string }) {
  const colors: Record<string, string> = {
    calificar:            "bg-sky-500/15 text-sky-400 border-sky-500/30",
    buscar_producto:      "bg-blue-500/15 text-blue-400 border-blue-500/30",
    acumulando_productos: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    pedir_datos:          "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    confirmar:            "bg-orange-500/15 text-orange-400 border-orange-500/30",
    elegir_entrega:       "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    pedir_correo:         "bg-teal-500/15 text-teal-400 border-teal-500/30",
    despedida:            "bg-surface-4 text-fg-5 border-border",
  };
  return (
    <span className={`px-2 py-0.5 text-[11px] font-medium border rounded-sm ${colors[phase] ?? "bg-surface-4 text-fg-5 border-border"}`}>
      {PHASE_LABELS[phase] ?? phase}
    </span>
  );
}

export default function SesionesPage() {
  const navigate = useNavigate();
  const [sessions, setSessions]   = useState<BotSessionListItem[]>([]);
  const [metrics, setMetrics]     = useState<BotMetrics | null>(null);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [phaseFilter, setPhase]   = useState("");
  const [botFilter, setBotFilter] = useState<"all" | "active" | "paused">("all");
  const [activeFilter, setActive] = useState<"all" | "active" | "closed">("all");

  const PAGE_SIZE = 20;

  const load = async () => {
    setLoading(true);
    try {
      const params: Parameters<typeof api.bot.sessions>[0] = { page, page_size: PAGE_SIZE };
      if (phaseFilter)            params.phase      = phaseFilter;
      if (botFilter === "active") params.bot_active = true;
      if (botFilter === "paused") params.bot_active = false;
      if (activeFilter === "active") params.is_active = true;
      if (activeFilter === "closed") params.is_active = false;

      const res = await api.bot.sessions(params);
      setSessions(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, phaseFilter, botFilter, activeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    api.bot.metrics().then(setMetrics).catch(() => null);
  }, []);

  const filtered = search
    ? sessions.filter(s =>
        s.phone_number?.includes(search) ||
        s.client_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.client_company?.toLowerCase().includes(search.toLowerCase()) ||
        s.session_id.includes(search)
      )
    : sessions;

  const pages = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-fg font-bold text-xl">Conversaciones del bot</h1>
        <p className="text-fg-5 text-sm mt-0.5">Sesiones de WhatsApp con Coni</p>
      </div>

      {/* Stats */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total sesiones"  value={String(metrics.total_sessions)}  icon={Users}        delay={0}   />
          <StatCard label="Activas"         value={String(metrics.active_sessions)} icon={Activity}     accent delay={50}  />
          <StatCard label="Bot pausado"     value={String(metrics.bot_paused_sessions)} icon={PauseCircle} delay={100} />
          <StatCard label="Leads capturados" value={String(metrics.total_leads)}    icon={MessageSquare} delay={150} />
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-6 pointer-events-none" />
          <input
            className="w-full bg-surface-2 border border-border text-fg pl-9 pr-4 py-2.5 text-sm placeholder:text-fg-6 outline-none focus:border-accent"
            placeholder="Buscar por teléfono, nombre o empresa..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          className="bg-surface-2 border border-border text-fg-3 text-sm px-3 py-2.5 outline-none focus:border-accent"
          value={phaseFilter}
          onChange={e => { setPhase(e.target.value); setPage(1); }}
        >
          <option value="">Todas las fases</option>
          {Object.entries(PHASE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <select
          className="bg-surface-2 border border-border text-fg-3 text-sm px-3 py-2.5 outline-none focus:border-accent"
          value={botFilter}
          onChange={e => { setBotFilter(e.target.value as typeof botFilter); setPage(1); }}
        >
          <option value="all">Bot: todos</option>
          <option value="active">Bot activo</option>
          <option value="paused">Bot pausado</option>
        </select>

        <select
          className="bg-surface-2 border border-border text-fg-3 text-sm px-3 py-2.5 outline-none focus:border-accent"
          value={activeFilter}
          onChange={e => { setActive(e.target.value as typeof activeFilter); setPage(1); }}
        >
          <option value="all">Estado: todos</option>
          <option value="active">Activas</option>
          <option value="closed">Cerradas</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface-2 border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-fg-5 text-xs uppercase tracking-wider font-medium">Cliente</th>
              <th className="text-left px-4 py-3 text-fg-5 text-xs uppercase tracking-wider font-medium">Teléfono</th>
              <th className="text-left px-4 py-3 text-fg-5 text-xs uppercase tracking-wider font-medium">Fase</th>
              <th className="text-left px-4 py-3 text-fg-5 text-xs uppercase tracking-wider font-medium">Equipos</th>
              <th className="text-left px-4 py-3 text-fg-5 text-xs uppercase tracking-wider font-medium">Bot</th>
              <th className="text-left px-4 py-3 text-fg-5 text-xs uppercase tracking-wider font-medium">Última actividad</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-fg-5">Cargando...</td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-fg-5">Sin sesiones</td>
              </tr>
            )}
            {!loading && filtered.map(s => (
              <tr
                key={s.id}
                onClick={() => navigate(`/agente/sesiones/${s.session_id}`)}
                className="border-b border-border hover:bg-surface-3 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <p className="text-fg font-medium">{s.client_name ?? <span className="text-fg-6 italic">Sin nombre</span>}</p>
                  {s.client_company && <p className="text-fg-5 text-xs">{s.client_company}</p>}
                </td>
                <td className="px-4 py-3 text-fg-4 font-mono text-xs">{s.phone_number ?? "—"}</td>
                <td className="px-4 py-3"><PhaseTag phase={s.phase} /></td>
                <td className="px-4 py-3 text-fg-4 text-center">{s.products_count}</td>
                <td className="px-4 py-3">
                  {s.bot_active
                    ? <span className="flex items-center gap-1 text-emerald-400 text-xs"><Bot size={13} />Activo</span>
                    : <span className="flex items-center gap-1 text-amber-400 text-xs"><BotOff size={13} />Pausado</span>
                  }
                </td>
                <td className="px-4 py-3 text-fg-5 text-xs">
                  {new Date(s.updated_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-fg-5">
          <span>{total} sesiones en total</span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 border border-border hover:bg-surface-3 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <span className="px-3 py-1.5 bg-surface-3 border border-border text-fg">{page} / {pages}</span>
            <button
              disabled={page === pages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 border border-border hover:bg-surface-3 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
