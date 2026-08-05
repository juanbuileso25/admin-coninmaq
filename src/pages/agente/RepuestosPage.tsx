import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, LayoutList, Kanban } from "lucide-react";
import SparePartsKanbanBoard from "../../components/posventa/SparePartsKanbanBoard";
import { api, type SparePartRequest, SPARE_PART_STAGES } from "../../services/api";

const STATUSES = ["solicitudes_recibidas", "cotizado", "esperando_respuesta", "negociacion", "venta_ganada", "venta_perdida"] as const;

const STATUS_LABELS: Record<string, string> = {
  solicitudes_recibidas: "Solicitudes recibidas",
  cotizado:              "Cotizado",
  esperando_respuesta:   "Esperando respuesta",
  negociacion:           "Negociación",
  venta_ganada:          "Venta ganada",
  venta_perdida:         "Venta perdida",
  // legacy
  pendiente:  "Pendiente",
  pedido:     "Pedido",
  entregado:  "Entregado",
  cancelado:  "Cancelado",
};

const STATUS_STYLES: Record<string, string> = {
  solicitudes_recibidas: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  cotizado:              "bg-blue-500/15 text-blue-300 border-blue-500/30",
  esperando_respuesta:   "bg-amber-500/15 text-amber-300 border-amber-500/30",
  negociacion:           "bg-violet-500/15 text-violet-300 border-violet-500/30",
  venta_ganada:          "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  venta_perdida:         "bg-red-500/15 text-red-300 border-red-500/30",
  // legacy
  pendiente:  "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  pedido:     "bg-purple-500/15 text-purple-400 border-purple-500/30",
  entregado:  "bg-green-500/15 text-green-400 border-green-500/30",
  cancelado:  "bg-red-500/15 text-red-400 border-red-500/30",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 text-[11px] font-bold border rounded-sm ${STATUS_STYLES[status] ?? "bg-surface-3 text-fg-5 border-border"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

type ViewMode = "lista" | "pipeline";

export default function RepuestosPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("lista");

  // ── Lista state ────────────────────────────────────────────────────────────
  const [requests, setRequests]         = useState<SparePartRequest[]>([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // ── Pipeline state ─────────────────────────────────────────────────────────
  const [grouped, setGrouped]               = useState<Record<string, SparePartRequest[]>>(
    Object.fromEntries(SPARE_PART_STAGES.map(s => [s, []]))
  );
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [pipelineSearch, setPipelineSearch]   = useState("");

  const PAGE_SIZE = 20;

  const loadList = async () => {
    setLoading(true);
    try {
      const res = await api.spareParts.requests({
        status:    statusFilter || undefined,
        search:    search       || undefined,
        page,
        page_size: PAGE_SIZE,
      });
      setRequests(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  };

  const loadPipeline = useCallback(async () => {
    setPipelineLoading(true);
    try {
      const data = await api.spareParts.pipeline(pipelineSearch || undefined);
      setGrouped(data);
    } catch {
      // silencioso
    } finally {
      setPipelineLoading(false);
    }
  }, [pipelineSearch]);

  useEffect(() => {
    if (viewMode === "lista") loadList();
  }, [page, statusFilter, viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (viewMode === "pipeline") loadPipeline();
  }, [viewMode, loadPipeline]);

  // Debounce pipeline search
  useEffect(() => {
    if (viewMode !== "pipeline") return;
    const t = setTimeout(() => loadPipeline(), 400);
    return () => clearTimeout(t);
  }, [pipelineSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { setPage(1); loadList(); }
  };

  const pages = Math.ceil(total / PAGE_SIZE) || 1;

  const totalPipeline = SPARE_PART_STAGES.reduce((acc, s) => acc + (grouped[s]?.length ?? 0), 0);

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-fg font-bold text-xl">Solicitudes de Repuestos</h1>
          <p className="text-fg-5 text-sm mt-0.5">Solicitudes recibidas por el bot Coni</p>
        </div>
        <div className="flex bg-surface-2 border border-border p-0.5">
          <button
            onClick={() => setViewMode("lista")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "lista" ? "bg-accent text-black" : "text-fg-4 hover:text-fg"
            }`}
          >
            <LayoutList size={13} /> Lista
          </button>
          <button
            onClick={() => setViewMode("pipeline")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "pipeline" ? "bg-accent text-black" : "text-fg-4 hover:text-fg"
            }`}
          >
            <Kanban size={13} /> Pipeline
          </button>
        </div>
      </div>

      {/* ── VISTA LISTA ────────────────────────────────────────────────────────── */}
      {viewMode === "lista" && (
        <>
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-6 pointer-events-none" />
              <input
                className="w-full bg-surface-2 border border-border text-fg pl-9 pr-4 py-2.5 text-sm placeholder:text-fg-6 outline-none focus:border-accent"
                placeholder="Buscar por cliente, máquina o repuesto..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={handleSearchKey}
              />
            </div>
            <select
              className="bg-surface-2 border border-border text-fg-3 text-sm px-3 py-2.5 outline-none focus:border-accent"
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">Estado: todos</option>
              {STATUSES.map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          <div className="bg-surface-2 border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["N° Solicitud", "Cliente", "Teléfono", "Máquina", "Repuesto solicitado", "Cant.", "Foto", "Estado", "Fecha"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-fg-5 text-xs uppercase tracking-wider font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-fg-5">Cargando...</td></tr>
                )}
                {!loading && requests.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-fg-5">Sin solicitudes</td></tr>
                )}
                {!loading && requests.map(r => (
                  <tr
                    key={r.id}
                    className="border-b border-border hover:bg-surface-3 transition-colors cursor-pointer"
                    onClick={() => navigate(`/posventa/leads/${r.id}`)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-accent whitespace-nowrap">{r.request_number}</td>
                    <td className="px-4 py-3">
                      <span className="text-fg font-medium">{r.lead_name ?? "—"}</span>
                      {r.lead_company && <p className="text-fg-5 text-[11px]">{r.lead_company}</p>}
                    </td>
                    <td className="px-4 py-3 text-fg-4 font-mono text-xs">{r.lead_phone ?? "—"}</td>
                    <td className="px-4 py-3 text-fg-4">
                      {[r.machine_brand, r.machine_model].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-fg-4 max-w-[200px] truncate">{r.part_description ?? "—"}</td>
                    <td className="px-4 py-3 text-fg-4 text-center">{r.quantity ?? "—"}</td>
                    <td className="px-4 py-3">
                      {r.photo_url ? (
                        <a
                          href={r.photo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="inline-block"
                        >
                          <img src={r.photo_url} alt="foto" className="max-h-10 max-w-[60px] object-cover border border-border" />
                        </a>
                      ) : (
                        <span className="text-fg-6">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-fg-5 text-xs whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString("es-CO")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between text-sm text-fg-5">
              <span>{total} solicitudes en total</span>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 border border-border hover:bg-surface-3 disabled:opacity-40 transition-colors">
                  Anterior
                </button>
                <span className="px-3 py-1.5 bg-surface-3 border border-border text-fg">{page} / {pages}</span>
                <button disabled={page === pages} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 border border-border hover:bg-surface-3 disabled:opacity-40 transition-colors">
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── VISTA PIPELINE ─────────────────────────────────────────────────────── */}
      {viewMode === "pipeline" && (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="relative max-w-sm flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-6 pointer-events-none" />
              <input
                className="w-full bg-surface-2 border border-border text-fg pl-9 pr-4 py-2.5 text-sm placeholder:text-fg-6 outline-none focus:border-accent"
                placeholder="Buscar solicitud..."
                value={pipelineSearch}
                onChange={e => setPipelineSearch(e.target.value)}
              />
            </div>
            <span className="text-fg-5 text-sm">{totalPipeline} solicitudes</span>
          </div>

          {pipelineLoading ? (
            <div className="flex items-center justify-center py-20 text-fg-5 text-sm">
              Cargando pipeline...
            </div>
          ) : (
            <SparePartsKanbanBoard grouped={grouped} onRefresh={loadPipeline} />
          )}
        </>
      )}

    </div>
  );
}
