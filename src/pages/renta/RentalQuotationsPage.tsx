import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Plus, FileText, CheckCircle2, Clock, AlertCircle, ArrowRight,
  Loader2, Search, Trash2, LayoutList, Kanban, Check, ReceiptText, Mail, DollarSign, Percent, Send, Ghost, XCircle,
  ChevronDown, Pencil,
} from "lucide-react";
import { api, type RentalQuotationListItem, type RentalQuotationStatus } from "../../services/api";
import { toast } from "sonner";
import RentalQuotationModal from "../../components/renta/RentalQuotationModal";
import LostQuotationModal from "../../components/renta/LostQuotationModal";
import StatCard from "../../components/StatCard";
import Select from "../../components/ui/Select";
import DatePicker from "../../components/ui/DatePicker";

function formatCOP(v: number | null | undefined): string {
  if (v == null) return "—";
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_META: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  draft:     { label: "Borrador",   color: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",    icon: FileText },
  sent:      { label: "Enviada",    color: "bg-sky-500/15 text-sky-300 border-sky-500/30",       icon: Clock },
  approved:  { label: "Aprobada",   color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", icon: CheckCircle2 },
  lost:      { label: "Perdida",    color: "bg-rose-500/15 text-rose-300 border-rose-500/30",    icon: Ghost },
  converted: { label: "Convertida", color: "bg-violet-500/15 text-violet-300 border-violet-500/30", icon: ArrowRight },
  // Mantenemos rejected/expired en el meta para registros históricos (badges), pero no se exponen en filtros ni pipeline
  rejected:  { label: "Rechazada",  color: "bg-red-500/15 text-red-300 border-red-500/30",       icon: XCircle },
  expired:   { label: "Expirada",   color: "bg-amber-500/15 text-amber-300 border-amber-500/30", icon: AlertCircle },
};

const STATUS_TABS: Array<{ value: "" | RentalQuotationStatus; label: string }> = [
  { value: "",          label: "Todas" },
  { value: "draft",     label: "Borradores" },
  { value: "sent",      label: "Enviadas" },
  { value: "approved",  label: "Aprobadas" },
  { value: "converted", label: "Convertidas" },
  { value: "lost",      label: "Perdidas" },
];

const STATUS_SELECT_OPTS = [
  { value: "draft",     label: "Borrador" },
  { value: "sent",      label: "Enviada" },
  { value: "approved",  label: "Aprobada" },
  { value: "converted", label: "Convertida" },
  { value: "lost",      label: "Perdida" },
];

function buildMonthOptions() {
  const options: { label: string; value: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("es-CO", { month: "long", year: "numeric" });
    options.push({ label: label.charAt(0).toUpperCase() + label.slice(1), value });
  }
  return options;
}
const MONTH_OPTIONS = buildMonthOptions();

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function monthStart(month: string) {
  return `${month}-01`;
}
function monthEnd(month: string) {
  const [y, m] = month.split("-").map(Number);
  return `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
}

type ViewMode = "lista" | "pipeline";

export default function RentalQuotationsPage() {
  const nav = useNavigate();

  // ── Vista ──────────────────────────────────────────────────────────────────
  const [view, setView] = useState<ViewMode>(() =>
    (localStorage.getItem("rentalQuotationsView") as ViewMode) || "lista"
  );
  function changeView(v: ViewMode) {
    setView(v);
    localStorage.setItem("rentalQuotationsView", v);
  }

  // ── Rango de fechas — fuente de verdad única ───────────────────────────────
  const [dateFrom, setDateFrom] = useState(() => monthStart(MONTH_OPTIONS[0].value));
  const [dateTo,   setDateTo]   = useState(() => todayStr());

  const monthPreset = (() => {
    if (!dateFrom) return "";
    const parts = dateFrom.split("-");
    if (parts[2] !== "01") return "";
    const val = `${parts[0]}-${parts[1]}`;
    return MONTH_OPTIONS.find(o => o.value === val)?.value ?? "";
  })();
  const applyMonthPreset = (month: string) => {
    setDateFrom(monthStart(month));
    setDateTo(monthEnd(month));
  };

  // ── Lista state ────────────────────────────────────────────────────────────
  const [items, setItems] = useState<RentalQuotationListItem[]>([]);
  const [totalAccumulated, setTotalAccumulated] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState<"" | RentalQuotationStatus>("");
  const [search, setSearch] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [lostModalId, setLostModalId] = useState<string | null>(null);
  // Filtro de etapas en el pipeline (toggle para ocultar/mostrar columnas)
  const [hiddenStages, setHiddenStages] = useState<Set<string>>(() => {
    const stored = localStorage.getItem("rentalQuotationsHiddenStages");
    if (!stored) return new Set();
    try { return new Set(JSON.parse(stored)); } catch { return new Set(); }
  });
  function toggleStage(stage: string) {
    setHiddenStages(prev => {
      const next = new Set(prev);
      next.has(stage) ? next.delete(stage) : next.add(stage);
      localStorage.setItem("rentalQuotationsHiddenStages", JSON.stringify([...next]));
      return next;
    });
  }

  async function load() {
    setLoading(true);
    try {
      const data = await api.rental.listQuotations({
        status: status || undefined,
        search: search.trim() || undefined,
        date_from: dateFrom || undefined,
        date_to:   dateTo   || undefined,
      });
      setItems(data);
    } catch {
      toast.error("Error al cargar cotizaciones");
    } finally {
      setLoading(false);
    }
  }

  async function loadAccumulated() {
    try {
      const data = await api.rental.listQuotations({ limit: 1000 });
      setTotalAccumulated(data.length);
    } catch { /* noop */ }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status, dateFrom, dateTo]);
  useEffect(() => { loadAccumulated(); }, []);

  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
    /* eslint-disable-next-line */
  }, [search]);

  const stats = useMemo(() => {
    const sentPeriod = items.filter(i => i.sent_at).length;
    const approvedCount = items.filter(i => i.status === "approved").length;
    const convertedCount = items.filter(i => i.status === "converted").length;
    const pipelineValue = items
      .filter(i => i.status === "sent" || i.status === "approved")
      .reduce((acc, i) => acc + (i.total_estimated ?? 0), 0);
    const approvedValue = items
      .filter(i => i.status === "approved")
      .reduce((acc, i) => acc + (i.total_estimated ?? 0), 0);
    const convertedValue = items
      .filter(i => i.status === "converted")
      .reduce((acc, i) => acc + (i.total_estimated ?? 0), 0);
    // Tasa de conversión: de las que fueron enviadas, cuántas aprobaron/convirtieron
    const closedWins = approvedCount + convertedCount;
    const tasaCierre = sentPeriod > 0 ? Math.round((closedWins / sentPeriod) * 100) : 0;
    return {
      quotationsPeriod: items.length,
      sentPeriod,
      approvedCount,
      approvedValue,
      convertedCount,
      convertedValue,
      pipelineValue,
      closedWins,
      tasaCierre,
      pending: items.filter(i => i.status === "sent" && !i.is_expired).length,
      approved: approvedCount,
      converted: convertedCount,
    };
  }, [items]);

  function openCreate() {
    setEditingId(null);
    setShowModal(true);
  }

  function openEdit(id: string) {
    setEditingId(id);
    setShowModal(true);
  }

  async function handleDelete(id: string, number: string) {
    if (!confirm(`¿Eliminar la cotización ${number}? Esta acción no se puede deshacer visualmente.`)) return;
    try {
      await api.rental.deleteQuotation(id);
      toast.success("Cotización eliminada");
      load();
    } catch {
      toast.error("No se pudo eliminar");
    }
  }

  async function quickApprove(id: string) {
    setActing(id);
    try {
      await api.rental.approveQuotation(id);
      let undone = false;
      toast.success("Cotización aprobada", {
        duration: 5000,
        action: {
          label: "Deshacer",
          onClick: async () => {
            undone = true;
            try {
              await api.rental.revertApproval(id);
              toast.message("Aprobación revertida");
            } catch (e: any) {
              toast.error(e?.detail ?? "No se pudo deshacer");
            } finally {
              load();
            }
          },
        },
      });
      // No esperamos el undo: recargamos ya para reflejar el estado
      if (!undone) load();
    } catch (e: any) {
      toast.error(e?.detail ?? "Error");
    } finally { setActing(null); }
  }

  function quickLose(id: string) {
    setLostModalId(id);
  }

  function clearDateFilter() {
    setDateFrom("");
    setDateTo("");
  }
  const hasDateFilter = !!dateFrom || !!dateTo;

  // ── Drag & drop ────────────────────────────────────────────────────────────
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [draggedFrom, setDraggedFrom] = useState<string | null>(null);

  function allowedTargets(from: string): string[] {
    switch (from) {
      case "sent":     return ["approved", "lost"];
      case "approved": return ["lost"];
      case "lost":     return ["approved"];   // recuperar: cliente volvió interesado
      default:         return [];
    }
  }

  async function handleDrop(targetStatus: string) {
    if (!draggedId || !draggedFrom) return;
    const id = draggedId;
    const from = draggedFrom;
    setDraggedId(null);
    setDraggedFrom(null);

    if (targetStatus === from) return;
    const allowed = allowedTargets(from);
    if (!allowed.includes(targetStatus)) {
      toast.error(
        from === "draft"    ? "Los borradores se envían desde el modal de edición." :
        from === "approved" && targetStatus === "converted"
                            ? "Para convertir, abre la cotización y usa 'Convertir en asignación'." :
        `No se puede mover de ${STATUS_META[from]?.label} a ${STATUS_META[targetStatus]?.label}.`
      );
      return;
    }

    try {
      if (targetStatus === "approved") {
        await api.rental.approveQuotation(id);
        toast.success("Cotización aprobada", {
          duration: 5000,
          action: {
            label: "Deshacer",
            onClick: async () => {
              try {
                await api.rental.revertApproval(id);
                toast.message("Aprobación revertida");
              } catch (e: any) {
                toast.error(e?.detail ?? "No se pudo deshacer");
              } finally {
                load();
              }
            },
          },
        });
        load();
      } else if (targetStatus === "lost") {
        // Abrir modal reutilizable para capturar el motivo
        setLostModalId(id);
      }
    } catch (e: any) {
      toast.error(e?.detail ?? "Error al cambiar estado");
    }
  }

  // Agrupación para la vista pipeline (respeta el filtro de búsqueda/fechas pero ignora el status para mostrar todas las columnas)
  const grouped = useMemo(() => {
    const g: Record<string, RentalQuotationListItem[]> = {
      draft: [], sent: [], approved: [], converted: [], lost: [],
    };
    for (const it of items) {
      // rejected/expired históricos caen en "lost" para mantenerlos visibles en el pipeline
      let key: string = it.status;
      if (it.status === "rejected" || (it.is_expired && it.status === "sent")) key = "lost";
      if (g[key]) g[key].push(it);
    }
    return g;
  }, [items]);

  return (
    <div className="space-y-5">
      {/* Header con toggle de vista */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-fg font-bold text-xl">Cotizaciones de renta</h1>
          <p className="text-fg-5 text-sm mt-0.5">
            Genera cotizaciones de alquiler y conviértelas en asignaciones activas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-surface-2 border border-border p-0.5">
            <button onClick={() => changeView("lista")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                view === "lista" ? "bg-accent text-black" : "text-fg-4 hover:text-fg"
              }`}>
              <LayoutList size={13} /> Lista
            </button>
            <button onClick={() => changeView("pipeline")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                view === "pipeline" ? "bg-accent text-black" : "text-fg-4 hover:text-fg"
              }`}>
              <Kanban size={13} /> Pipeline
            </button>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent text-black text-sm font-semibold hover:bg-accent/90 transition-colors"
          >
            <Plus size={14} /> <span className="hidden sm:inline">Nueva cotización</span><span className="sm:hidden">Nueva</span>
          </button>
        </div>
      </div>

      {/* Selector de período — fuente de verdad única */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-fg-5 text-xs uppercase tracking-wider font-medium">Métricas del período</p>
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <div className="flex-1 min-w-[140px] sm:w-36 sm:flex-initial">
            <DatePicker value={dateFrom} onChange={v => setDateFrom(v ?? "")} placeholder="Desde" compact />
          </div>
          <span className="hidden sm:inline text-fg-6 text-xs">—</span>
          <div className="flex-1 min-w-[140px] sm:w-36 sm:flex-initial">
            <DatePicker value={dateTo} onChange={v => setDateTo(v ?? "")} placeholder="Hasta" compact />
          </div>
          <div className="w-full sm:w-44">
            <Select value={monthPreset} onChange={applyMonthPreset} options={MONTH_OPTIONS} placeholder="Mes rápido..." compact />
          </div>
        </div>
      </div>

      {/* Stat cards (cambian según vista) */}
      {view === "lista" ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-up">
          <StatCard label="Total acumulado"   value={String(totalAccumulated)}         icon={ReceiptText} accent delay={0}   />
          <StatCard label="Del período"       value={String(stats.quotationsPeriod)}   icon={ReceiptText}         delay={50}  />
          <StatCard label="Enviadas"          value={String(stats.sentPeriod)}         icon={Mail}                delay={100} sub={stats.pending ? `${stats.pending} pendientes` : undefined} />
          <StatCard label="Valor pipeline"    value={formatCOP(stats.pipelineValue)}   icon={DollarSign}          delay={150} />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-up">
          <StatCard label="Total período"     value={String(stats.quotationsPeriod)}   icon={ReceiptText} accent delay={0}   />
          <StatCard label="Enviadas"          value={formatCOP(stats.pipelineValue)}   icon={Send}                delay={50}  sub={`${stats.sentPeriod} cotizaciones`} />
          <StatCard label="Convertidas"       value={formatCOP(stats.convertedValue)}  icon={CheckCircle2}        delay={100} sub={`${stats.convertedCount} asignaciones`} />
          <StatCard label="Tasa de cierre"    value={`${stats.tasaCierre}%`}           icon={Percent}             delay={150} sub={`${stats.closedWins} de ${stats.sentPeriod}`} />
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-6 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por número, cliente o proyecto..."
            className="w-full bg-surface-2 border border-border text-fg pl-9 pr-4 py-2.5 text-sm placeholder:text-fg-6 outline-none focus:border-accent"
          />
        </div>
        {view === "lista" && (
          <div className="w-44">
            <Select
              value={status}
              onChange={(v) => setStatus(v as "" | RentalQuotationStatus)}
              placeholder="Estado: todos"
              clearable
              compact
              options={STATUS_SELECT_OPTS}
            />
          </div>
        )}
      </div>

      {/* Chips de estado (solo lista, redundante con el select pero más visual) */}
      {view === "lista" && (
        <div className="flex flex-wrap items-center gap-2 animate-fade-up">
          {STATUS_TABS.map(t => (
            <button
              key={t.value}
              onClick={() => setStatus(t.value)}
              className={`text-[11px] uppercase tracking-wider px-3 py-1.5 border transition-colors
                ${status === t.value
                  ? "bg-accent text-zinc-900 border-accent font-semibold"
                  : "bg-surface-3 text-fg-4 border-border hover:border-border-light"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* ─── Pipeline (kanban) ─── */}
      {view === "pipeline" && !loading && (
        <div className="animate-fade-up space-y-3">
          <p className="text-fg-5 text-xs">
            Haz clic en una tarjeta para ver el detalle · Arrastra entre columnas para cambiar de estado · Click en los chips para ocultar etapas.
          </p>

          {/* Chips de filtro de etapas */}
          <div className="flex flex-wrap gap-1.5">
            {(["draft", "sent", "approved", "converted", "lost"] as const).map(stage => {
              const meta = STATUS_META[stage];
              const Icon = meta.icon;
              const active = !hiddenStages.has(stage);
              const count = grouped[stage]?.length ?? 0;
              return (
                <button
                  key={stage}
                  type="button"
                  onClick={() => toggleStage(stage)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs border rounded-sm transition-all
                    ${active
                      ? meta.color
                      : "bg-transparent text-fg-6 border-border/40 opacity-40 hover:opacity-60"}`}
                >
                  <Icon size={11} className="shrink-0" />
                  {meta.label}
                  {active && count > 0 && (
                    <span className="font-bold ml-0.5">{count}</span>
                  )}
                </button>
              );
            })}
            {hiddenStages.size > 0 && (
              <button
                type="button"
                onClick={() => { setHiddenStages(new Set()); localStorage.removeItem("rentalQuotationsHiddenStages"); }}
                className="text-[11px] text-fg-5 hover:text-accent px-2 py-1 transition-colors"
                title="Mostrar todas las etapas"
              >
                Mostrar todas
              </button>
            )}
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {(["draft", "sent", "approved", "converted", "lost"] as const).map(stage => {
              if (hiddenStages.has(stage)) return null;
              return (
                <PipelineColumn
                  key={stage}
                  status={stage}
                  items={grouped[stage] ?? []}
                  onCardClick={id => nav(`/renta/cotizaciones/${id}`)}
                  onEdit={id => { setEditingId(id); setShowModal(true); }}
                  onDelete={handleDelete}
                  onApprove={quickApprove}
                  onLose={quickLose}
                  acting={acting}
                  draggedFrom={draggedFrom}
                  allowedTargets={draggedFrom ? allowedTargets(draggedFrom) : []}
                  onCardDragStart={(id, from) => { setDraggedId(id); setDraggedFrom(from); }}
                  onCardDragEnd={() => { setDraggedId(null); setDraggedFrom(null); }}
                  onDropOnColumn={handleDrop}
                  isDragging={!!draggedId}
                />
              );
            })}
            {hiddenStages.size === 5 && (
              <div className="w-full text-center py-10 text-fg-6 text-xs">
                Todas las etapas están ocultas. Haz click en un chip arriba para mostrarla.
              </div>
            )}
          </div>
        </div>
      )}

      {view === "pipeline" && loading && (
        <div className="text-center py-12 text-fg-6 text-sm animate-fade-up">
          <Loader2 size={16} className="inline animate-spin mr-2" /> Cargando pipeline...
        </div>
      )}

      {/* ─── Lista (tabla) ─── */}
      {view === "lista" && (
      <div className="bg-surface-2 border border-border overflow-hidden animate-fade-up">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1000px]">
            <thead>
              <tr className="border-b border-border bg-surface-3 text-fg-5 text-[10px] uppercase tracking-wider">
                <th className="text-left px-3 py-2 font-medium">Nº</th>
                <th className="text-left px-3 py-2 font-medium">Cliente</th>
                <th className="text-left px-3 py-2 font-medium">Proyecto</th>
                <th className="text-left px-3 py-2 font-medium">Equipos</th>
                <th className="text-right px-3 py-2 font-medium">Valor mensual</th>
                <th className="text-center px-3 py-2 font-medium">Estado</th>
                <th className="text-left px-3 py-2 font-medium">Enviada / válida</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr><td colSpan={8} className="text-center py-10 text-fg-6 text-sm">
                  <Loader2 size={14} className="inline animate-spin mr-2" /> Cargando...
                </td></tr>
              )}
              {!loading && items.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-fg-6 text-sm">
                  {hasDateFilter ? (
                    <>
                      No hay cotizaciones en el período seleccionado.
                      <button onClick={clearDateFilter}
                        className="ml-2 text-accent hover:underline font-medium">
                        Ver todas
                      </button>
                    </>
                  ) : (
                    "Sin cotizaciones. Crea la primera con el botón arriba."
                  )}
                </td></tr>
              )}
              {!loading && items.map(it => {
                const effectiveStatus = it.is_expired && it.status === "sent" ? "expired" : it.status;
                const meta = STATUS_META[effectiveStatus] ?? STATUS_META.draft;
                const StatusIcon = meta.icon;
                return (
                  <tr key={it.id} className="hover:bg-surface-3 transition-colors cursor-pointer"
                      onClick={() => nav(`/renta/cotizaciones/${it.id}`)}>
                    <td className="px-3 py-3 text-fg font-mono text-xs">{it.number}</td>
                    <td className="px-3 py-3">
                      <div className="text-fg-2 text-sm font-medium truncate max-w-[200px]">{it.client_name ?? "—"}</div>
                      <div className="text-fg-6 text-[11px]">{fmtDate(it.issued_date)}</div>
                    </td>
                    <td className="px-3 py-3 text-fg-4 text-xs truncate max-w-[160px]">{it.project_name ?? "—"}</td>
                    <td className="px-3 py-3">
                      <div className="text-fg-3 text-xs font-mono">{it.machines_summary || "—"}</div>
                      <div className="text-fg-6 text-[10px]">{it.items_count} equipo{it.items_count === 1 ? "" : "s"}</div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="text-fg-2 font-semibold text-sm">{formatCOP(it.total_estimated)}</div>
                      {it.extras_total ? (
                        <div className="text-fg-6 text-[10px]">+ {formatCOP(it.extras_total)} extras</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 border text-[10px] font-bold px-2 py-0.5 rounded-sm ${meta.color}`}>
                        <StatusIcon size={10} /> {meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {it.sent_at ? (
                        <>
                          <div className="text-fg-3 text-xs">{fmtDate(it.sent_at)}</div>
                          {it.valid_until && (
                            <div className={`text-[10px] ${it.is_expired ? "text-amber-400" : "text-fg-6"}`}>
                              Vence: {fmtDate(it.valid_until)}
                            </div>
                          )}
                        </>
                      ) : <span className="text-fg-6 text-xs">Sin enviar</span>}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {it.status === "draft" && (
                          <button
                            onClick={() => openEdit(it.id)}
                            className="text-fg-5 hover:text-accent transition-colors p-1 text-xs"
                            title="Editar"
                          >
                            Editar
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(it.id, it.number)}
                          className="text-fg-5 hover:text-red-400 transition-colors p-1"
                          title="Eliminar"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {showModal && (
        <RentalQuotationModal
          quotationId={editingId}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
      {lostModalId && (
        <LostQuotationModal
          quotationId={lostModalId}
          onClose={() => setLostModalId(null)}
          onDone={() => { setLostModalId(null); load(); }}
        />
      )}
    </div>
  );
}

// ─── Pipeline column ────────────────────────────────────────────────────────

function PipelineColumn({
  status, items, onCardClick, onEdit, onDelete, onApprove, onLose, acting,
  draggedFrom, allowedTargets, onCardDragStart, onCardDragEnd, onDropOnColumn, isDragging,
}: {
  status: keyof typeof STATUS_META;
  items: RentalQuotationListItem[];
  onCardClick: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string, number: string) => void;
  onApprove: (id: string) => void;
  onLose: (id: string) => void;
  acting: string | null;
  draggedFrom: string | null;
  allowedTargets: string[];
  onCardDragStart: (id: string, from: string) => void;
  onCardDragEnd: () => void;
  onDropOnColumn: (targetStatus: string) => void;
  isDragging: boolean;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  const total = items.reduce((acc, i) => acc + (i.total_estimated ?? 0), 0);

  const [isOver, setIsOver] = useState(false);
  const isTargetAllowed = isDragging && draggedFrom !== status && allowedTargets.includes(status);
  const isTargetBlocked = isDragging && draggedFrom !== status && !allowedTargets.includes(status);
  const isSourceCol     = isDragging && draggedFrom === status;

  return (
    <div
      onDragOver={(e) => {
        if (!isDragging) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = isTargetAllowed ? "move" : "none";
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        if (isTargetAllowed) onDropOnColumn(status);
      }}
      className={`shrink-0 w-72 bg-surface-2 border flex flex-col transition-all
        ${isTargetAllowed && isOver ? "border-emerald-400 ring-2 ring-emerald-400/40 scale-[1.02]" :
          isTargetAllowed            ? "border-emerald-500/40" :
          isTargetBlocked            ? "border-border opacity-40" :
          isSourceCol                ? "border-accent/50" :
                                       "border-border"}`}
      style={{ maxHeight: "min(calc(100vh - 320px), 70vh)" }}
    >
      <div className={`px-3 py-2 border-b border-border ${meta.color.split(" ")[0]}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Icon size={13} className={meta.color.split(" ")[1]} />
            <span className="text-xs font-semibold uppercase tracking-wider text-fg">{meta.label}</span>
          </div>
          <span className="bg-black/30 text-fg text-[10px] font-bold px-1.5 py-0.5">{items.length}</span>
        </div>
        {total > 0 && (
          <div className="text-[10px] text-fg-4 mt-0.5">
            Total: <strong>{formatCOP(total)}</strong>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {items.length === 0 ? (
          <div className={`text-center py-6 text-[11px] border border-dashed rounded transition-colors
            ${isTargetAllowed && isOver ? "border-emerald-400 text-emerald-300 bg-emerald-500/5" :
              isTargetAllowed            ? "border-emerald-500/40 text-emerald-400/70" :
                                           "border-border text-fg-6"}`}>
            {isTargetAllowed ? "Soltar aquí" : "Sin cotizaciones"}
          </div>
        ) : items.map(it => (
          <PipelineCard
            key={it.id} item={it} status={status}
            onClick={() => onCardClick(it.id)}
            onEdit={() => onEdit(it.id)}
            onDelete={() => onDelete(it.id, it.number)}
            onApprove={() => onApprove(it.id)}
            onLose={() => onLose(it.id)}
            acting={acting === it.id}
            onDragStart={() => onCardDragStart(it.id, status)}
            onDragEnd={onCardDragEnd}
          />
        ))}
      </div>
    </div>
  );
}

// Etapas disponibles para mover según el estado origen (incluye instrucción si requiere ir al detalle)
type StageMove = {
  to: string;              // etapa destino
  label: string;           // etiqueta visible
  dot: string;             // color del punto
  action: "approve" | "lose" | "goto_detail";
  hint?: string;           // tooltip opcional
};

function getStagesForStatus(status: string): StageMove[] {
  // El orden refleja el flujo natural: borrador → enviada → aprobada → convertida; perdida como fuera-de-flujo
  switch (status) {
    case "draft":
      return [
        { to: "sent",      label: "Enviada",    dot: "bg-sky-400",     action: "goto_detail", hint: "Abre el detalle para enviar por email" },
        { to: "lost",      label: "Perdida",    dot: "bg-rose-400",    action: "lose" },
      ];
    case "sent":
      return [
        { to: "approved",  label: "Aprobada",   dot: "bg-emerald-400", action: "approve" },
        { to: "lost",      label: "Perdida",    dot: "bg-rose-400",    action: "lose" },
      ];
    case "approved":
      return [
        { to: "converted", label: "Convertida", dot: "bg-violet-400",  action: "goto_detail", hint: "Abre el detalle para convertir en asignación" },
        { to: "lost",      label: "Perdida",    dot: "bg-rose-400",    action: "lose" },
      ];
    case "lost":
      return [
        { to: "approved",  label: "Aprobada",   dot: "bg-emerald-400", action: "approve", hint: "Recuperar: el cliente volvió interesado" },
      ];
    case "converted":
      return [];  // no hay movimientos permitidos desde convertida
    default:
      return [];
  }
}

function PipelineCard({
  item, status, onClick, onEdit, onDelete, onApprove, onLose, acting,
  onDragStart, onDragEnd,
}: {
  item: RentalQuotationListItem;
  status: keyof typeof STATUS_META;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onApprove: () => void;
  onLose: () => void;
  acting: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const canDrag = status === "sent" || status === "approved" || status === "lost";
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const btnRef  = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.right });
    setMenuOpen(v => !v);
  };

  const handleStageClick = (move: StageMove, e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (move.action === "approve")           onApprove();
    else if (move.action === "lose")         onLose();
    else if (move.action === "goto_detail")  onClick();
  };

  const availableStages = getStagesForStatus(status);
  // Mantener onEdit disponible por si lo expone otra parte del UI en el futuro
  void onEdit;

  return (
    <div
      draggable={canDrag}
      onDragStart={(e) => {
        if (!canDrag) { e.preventDefault(); return; }
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", item.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`bg-surface-3 border border-border p-2.5 hover:border-accent/50 transition-colors group relative
        ${canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
      title={canDrag ? "Arrastra para cambiar de estado" : undefined}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-fg font-mono text-[11px] font-bold">{item.number}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-fg-6 text-[10px]">
            {new Date(item.issued_date).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
          </span>
          <button
            type="button"
            title="Eliminar cotización"
            draggable={false}
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="text-fg-6 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      <div className="text-fg-2 text-xs font-medium truncate" title={item.client_name ?? ""}>
        {item.client_name ?? "—"}
      </div>
      {item.project_name && (
        <div className="text-fg-5 text-[10px] truncate">{item.project_name}</div>
      )}

      {/* Mini preview de equipos */}
      {item.machines_preview && item.machines_preview.length > 0 ? (
        <div className="mt-2 space-y-1">
          {item.machines_preview.map((mp, i) => (
            <div key={i} className="flex items-center gap-2 bg-surface-2 border border-border p-1.5">
              {mp.image_url ? (
                <img src={mp.image_url} alt="" className="w-9 h-9 object-contain bg-surface-3 shrink-0" />
              ) : (
                <div className="w-9 h-9 bg-surface-3 border border-border shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-fg-2 text-[11px] font-mono font-bold truncate">{mp.code}</div>
                <div className="text-fg-6 text-[9px] truncate">
                  {[mp.brand, mp.model].filter(Boolean).join(" · ")}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-accent text-[10px] font-semibold">{formatCOP(mp.rate_hour)}/h</div>
                <div className="text-fg-6 text-[9px]">{mp.standby_hours}h · {formatCOP(mp.standby_amount)}</div>
              </div>
            </div>
          ))}
          {item.items_count > item.machines_preview.length && (
            <div className="text-fg-6 text-[9px] text-center">
              + {item.items_count - item.machines_preview.length} equipo{item.items_count - item.machines_preview.length === 1 ? "" : "s"} más
            </div>
          )}
        </div>
      ) : (
        <div className="text-fg-4 text-[10px] mt-1 font-mono truncate">{item.machines_summary || "—"}</div>
      )}

      <div className="mt-2 pt-2 border-t border-border flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-fg-6 text-[9px] uppercase tracking-wider">Total mensual</div>
          <span className="text-accent font-bold text-sm">{formatCOP(item.total_estimated)}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {status === "sent" && item.valid_until && (
            <span className={`text-[10px] ${item.is_expired ? "text-amber-400" : "text-fg-6"}`}>
              {item.is_expired ? "Expirada" : `${Math.max(0, Math.ceil((new Date(item.valid_until).getTime() - Date.now()) / 86400000))} d`}
            </span>
          )}
          {/* Menú Mover */}
          <button
            ref={btnRef}
            type="button"
            draggable={false}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={openMenu}
            disabled={acting}
            className="flex items-center gap-1 text-[11px] text-fg-3 hover:text-accent transition-colors px-2 py-1 border border-border hover:border-accent/40 disabled:opacity-40 bg-surface-2"
            title="Mover de estado o acciones"
          >
            {acting ? <Loader2 size={10} className="animate-spin" /> : <>Mover <ChevronDown size={10} /></>}
          </button>
        </div>
      </div>

      {menuOpen && createPortal(
        <div
          ref={menuRef}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          style={{
            position: "fixed",
            top: menuPos.top,
            left: Math.max(8, Math.min(window.innerWidth - 220, menuPos.left - 200)),
          }}
          className="z-[9999] bg-surface-3 border border-border shadow-xl min-w-[200px]"
        >
          {/* Encabezado */}
          <div className="px-3 py-1.5 text-[9px] uppercase tracking-wider text-fg-6 border-b border-border bg-surface-4">
            Mover a
          </div>

          {/* Etapas disponibles */}
          {availableStages.length === 0 ? (
            <div className="px-3 py-3 text-xs text-fg-6 text-center">Esta etapa no permite movimientos</div>
          ) : availableStages.map(s => (
            <button
              key={s.to}
              type="button"
              onClick={(e) => handleStageClick(s, e)}
              title={s.hint}
              className="w-full text-left px-3 py-2 text-xs text-fg-2 hover:bg-surface-4 transition-colors flex items-center gap-2"
            >
              <span className={`w-2 h-2 rounded-full ${s.dot} shrink-0`} />
              <span className="flex-1">{s.label}</span>
              {s.action === "goto_detail" && (
                <ArrowRight size={10} className="text-fg-6" />
              )}
            </button>
          ))}

        </div>,
        document.body
      )}
    </div>
  );
}

