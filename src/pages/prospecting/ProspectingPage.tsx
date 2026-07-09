import { useEffect, useState } from "react";
import { Search, Play, Users, TrendingUp, Mail, RefreshCw, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useAbility } from "../../context/AbilityContext";
import { api, type ProspectResponse, type RunLogResponse, type ProspectStatus } from "../../services/api";
import StatCard from "../../components/StatCard";
import ProspectDrawer from "./ProspectDrawer";

const STATUS_STYLES: Record<string, string> = {
  nuevo:          "bg-blue-500/15 text-blue-400 border-blue-500/30",
  contactado:     "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  interesado:     "bg-purple-500/15 text-purple-400 border-purple-500/30",
  negociacion:    "bg-orange-500/15 text-orange-400 border-orange-500/30",
  cerrado_ganado: "bg-green-500/15 text-green-400 border-green-500/30",
  cerrado_perdido:"bg-red-500/15 text-red-400 border-red-500/30",
  descartado:     "bg-surface-3 text-fg-5 border-border",
};

const STATUS_LABELS: Record<string, string> = {
  nuevo:          "Nuevo",
  contactado:     "Contactado",
  interesado:     "Interesado",
  negociacion:    "Negociación",
  cerrado_ganado: "Ganado",
  cerrado_perdido:"Perdido",
  descartado:     "Descartado",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 text-[11px] font-bold border rounded-sm ${STATUS_STYLES[status] ?? "bg-surface-3 text-fg-5 border-border"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-fg-6">—</span>;
  const color = score >= 80 ? "text-green-400" : score >= 60 ? "text-yellow-400" : "text-red-400";
  return <span className={`font-bold text-sm ${color}`}>{score}</span>;
}

export default function ProspectingPage() {
  const ability = useAbility();
  const canCreate = ability.can("create", "Prospecting");

  const [prospects, setProspects]   = useState<ProspectResponse[]>([]);
  const [logs, setLogs]             = useState<RunLogResponse[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState<ProspectStatus | "">("");
  const [minScore, setMinScore]     = useState(0);
  const [offset, setOffset]         = useState(0);
  const [hasMore, setHasMore]       = useState(false);
  const [running, setRunning]       = useState<"scrape" | "followup" | null>(null);
  const [selected, setSelected]     = useState<ProspectResponse | null>(null);

  const LIMIT = 50;

  const load = async (reset = false) => {
    setLoading(true);
    try {
      const off = reset ? 0 : offset;
      const data = await api.prospecting.prospects({
        status:    statusFilter || undefined,
        min_score: minScore || undefined,
        limit:     LIMIT + 1,
        offset:    off,
      });
      const items = data.slice(0, LIMIT);
      setHasMore(data.length > LIMIT);
      if (reset) {
        setProspects(items);
        setOffset(0);
      } else {
        setProspects(prev => [...prev, ...items]);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = () => api.prospecting.logs(5).then(setLogs).catch(() => null);

  useEffect(() => { load(true); loadLogs(); }, [statusFilter, minScore]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = () => {
    const next = offset + LIMIT;
    setOffset(next);
  };

  useEffect(() => {
    if (offset > 0) load();
  }, [offset]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = search
    ? prospects.filter(p =>
        p.company_name.toLowerCase().includes(search.toLowerCase()) ||
        p.city?.toLowerCase().includes(search.toLowerCase()) ||
        p.email?.toLowerCase().includes(search.toLowerCase()) ||
        p.equipment?.toLowerCase().includes(search.toLowerCase())
      )
    : prospects;

  const handleRun = async (type: "scrape" | "followup") => {
    if (!canCreate) return;
    setRunning(type);
    try {
      const res = type === "scrape"
        ? await api.prospecting.runScrape()
        : await api.prospecting.runFollowups();
      toast.success(
        type === "scrape"
          ? `Scraping completo — ${res.prospects_accepted} aceptados, ${res.messages_sent} emails`
          : `Seguimientos — ${res.messages_sent} emails enviados`
      );
      load(true);
      loadLogs();
    } catch {
      toast.error("Error al ejecutar el job");
    } finally {
      setRunning(null);
    }
  };

  const handleUpdated = (updated: ProspectResponse) => {
    setProspects(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelected(updated);
  };

  const totals = {
    total:      prospects.length,
    activos:    prospects.filter(p => ["contactado", "interesado", "negociacion"].includes(p.status)).length,
    ganados:    prospects.filter(p => p.status === "cerrado_ganado").length,
    emails:     logs.reduce((s, l) => s + l.messages_sent, 0),
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-fg font-bold text-xl">Prospección</h1>
          <p className="text-fg-5 text-sm mt-0.5">Prospectos B2B generados automáticamente</p>
        </div>
        {canCreate && (
          <div className="flex gap-2">
            <button
              onClick={() => handleRun("followup")}
              disabled={!!running}
              className="flex items-center gap-2 px-3 py-2 bg-surface-2 border border-border text-fg-3 text-sm hover:bg-surface-3 disabled:opacity-50 transition-colors"
            >
              {running === "followup" ? <RefreshCw size={14} className="animate-spin" /> : <Mail size={14} />}
              Seguimientos
            </button>
            <button
              onClick={() => handleRun("scrape")}
              disabled={!!running}
              className="flex items-center gap-2 px-4 py-2 bg-accent-muted border border-accent/30 text-accent text-sm font-semibold hover:bg-accent/20 disabled:opacity-50 transition-colors"
            >
              {running === "scrape" ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
              Ejecutar scraping
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total prospectos" value={String(totals.total)}   icon={Users}      accent delay={0}   />
        <StatCard label="En pipeline"       value={String(totals.activos)} icon={TrendingUp} delay={50}  />
        <StatCard label="Ganados"           value={String(totals.ganados)} icon={Users}      delay={100} />
        <StatCard label="Emails (5 runs)"   value={String(totals.emails)}  icon={Mail}       delay={150} />
      </div>

      {/* Últimos runs */}
      {logs.length > 0 && (
        <div className="bg-surface-2 border border-border p-4">
          <p className="text-xs font-semibold text-fg-5 uppercase tracking-wider mb-3">Últimas ejecuciones</p>
          <div className="space-y-1.5">
            {logs.map(log => (
              <div key={log.id} className="flex items-center gap-4 text-xs text-fg-4">
                <span className="text-fg-5 w-32 shrink-0">{new Date(log.started_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}</span>
                <span className={`px-1.5 py-0.5 rounded-sm text-[10px] font-bold border ${log.run_type === "scraping" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-purple-500/10 text-purple-400 border-purple-500/20"}`}>
                  {log.run_type}
                </span>
                <span>encontrados <strong className="text-fg">{log.prospects_found}</strong></span>
                <span>aceptados <strong className="text-green-400">{log.prospects_accepted}</strong></span>
                <span>emails <strong className="text-fg">{log.messages_sent}</strong></span>
                {log.errors && <span className="text-red-400 truncate max-w-[200px]" title={log.errors}>⚠ error</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-6 pointer-events-none" />
          <input
            className="w-full bg-surface-2 border border-border text-fg pl-9 pr-4 py-2.5 text-sm placeholder:text-fg-6 outline-none focus:border-accent"
            placeholder="Empresa, ciudad, equipo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="bg-surface-2 border border-border text-fg-3 text-sm px-3 py-2.5 outline-none focus:border-accent"
          value={statusFilter}
          onChange={e => { setStatus(e.target.value as ProspectStatus | ""); }}
        >
          <option value="">Estado: todos</option>
          <option value="nuevo">Nuevo</option>
          <option value="contactado">Contactado</option>
          <option value="interesado">Interesado</option>
          <option value="negociacion">Negociación</option>
          <option value="cerrado_ganado">Ganado</option>
          <option value="cerrado_perdido">Perdido</option>
          <option value="descartado">Descartado</option>
        </select>
        <select
          className="bg-surface-2 border border-border text-fg-3 text-sm px-3 py-2.5 outline-none focus:border-accent"
          value={minScore}
          onChange={e => setMinScore(Number(e.target.value))}
        >
          <option value={0}>Score: todos</option>
          <option value={60}>Score ≥ 60</option>
          <option value={70}>Score ≥ 70</option>
          <option value={80}>Score ≥ 80</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface-2 border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {["Score", "Empresa", "Ciudad", "Equipo probable", "Tipo", "Estado", "Próx. seguimiento", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-fg-5 text-xs uppercase tracking-wider font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-fg-5">Cargando...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-fg-5">Sin prospectos</td></tr>
            )}
            {!loading && filtered.map(p => (
              <tr
                key={p.id}
                className="border-b border-border hover:bg-surface-3 transition-colors cursor-pointer"
                onClick={() => setSelected(p)}
              >
                <td className="px-4 py-3"><ScoreBadge score={p.fit_score} /></td>
                <td className="px-4 py-3">
                  <div className="font-medium text-fg">{p.company_name}</div>
                  {p.email && <div className="text-fg-5 text-xs">{p.email}</div>}
                </td>
                <td className="px-4 py-3 text-fg-4">{p.city ?? "—"}</td>
                <td className="px-4 py-3 text-fg-4 text-xs max-w-[160px] truncate">{p.equipment ?? "—"}</td>
                <td className="px-4 py-3 text-fg-4 text-xs">{p.deal_type ?? "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3 text-fg-5 text-xs whitespace-nowrap">
                  {p.next_followup ? new Date(p.next_followup).toLocaleDateString("es-CO") : "—"}
                </td>
                <td className="px-4 py-3">
                  <ChevronRight size={14} className="text-fg-6" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && !search && (
        <div className="flex justify-center">
          <button
            onClick={loadMore}
            className="px-4 py-2 border border-border text-fg-4 text-sm hover:bg-surface-3 transition-colors"
          >
            Cargar más
          </button>
        </div>
      )}

      {/* Drawer detalle */}
      {selected && (
        <ProspectDrawer
          prospect={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
