import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Loader2, Wrench } from "lucide-react";
import { toast } from "sonner";
import {
  api,
  SERVICE_TYPE_LABELS,
  SERVICE_STATUS_LABELS,
  type ServiceOrderListItem,
  type ServiceOrderMetrics,
  type ServiceType,
  type ServiceStatus,
} from "../../services/api";
import NuevaOrdenServicioModal from "../../components/posventa/NuevaOrdenServicioModal";

const STATUS_COLORS: Record<ServiceStatus, string> = {
  solicitado:         "bg-slate-500/15 text-slate-300 border-slate-500/30",
  programado:         "bg-sky-500/15 text-sky-300 border-sky-500/30",
  en_camino:          "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  en_ejecucion:       "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  esperando_repuesto: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  finalizado:         "bg-blue-500/15 text-blue-300 border-blue-500/30",
  cerrado:            "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
};

const TYPE_FILTERS: Array<{ value: "" | ServiceType; label: string }> = [
  { value: "",              label: "Todos" },
  { value: "coninmaq_care", label: "Coninmaq Care" },
  { value: "preventivo",    label: "Preventivo" },
  { value: "garantia",      label: "Garantía" },
  { value: "correctivo",    label: "Correctivo" },
];

export default function ServicioTecnicoPage() {
  const nav = useNavigate();
  const [orders, setOrders] = useState<ServiceOrderListItem[]>([]);
  const [metrics, setMetrics] = useState<ServiceOrderMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | ServiceType>("");
  const [showNew, setShowNew] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [list, m] = await Promise.all([
        api.serviceOrders.list({
          search: search || undefined,
          service_type: typeFilter || undefined,
        }),
        api.serviceOrders.metrics(),
      ]);
      setOrders(list);
      setMetrics(m);
    } catch (e: any) {
      toast.error(e?.detail ?? "Error cargando órdenes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => load(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const formatMachineLabel = (o: ServiceOrderListItem) => {
    const mi = o.machine_info ?? {};
    const parts = [mi.brand, mi.model].filter(Boolean).join(" ");
    return parts || mi.description || "—";
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-fg text-xl font-semibold flex items-center gap-2">
            <Wrench size={18} className="text-accent" /> Servicio técnico
          </h1>
          <p className="text-fg-5 text-xs mt-1">Seguimiento de servicios en sitio y en taller</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 bg-accent hover:bg-accent-light text-zinc-900 font-semibold text-xs uppercase tracking-wider px-3 py-2 transition-all"
        >
          <Plus size={13} /> Nueva orden de servicio
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Servicios activos" value={metrics?.active_count ?? 0} accent="text-amber-400" />
        <KpiCard label="Programados semana" value={metrics?.scheduled_this_week ?? 0} />
        <KpiCard label="Esperando repuesto" value={metrics?.waiting_part_count ?? 0} />
        <KpiCard label="Atrasados" value={metrics?.overdue_count ?? 0} accent={metrics && metrics.overdue_count > 0 ? "text-rose-400" : undefined} />
      </div>

      {/* Buscador + filtros */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-6 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por orden, cliente o serie..."
            className="w-full bg-surface-2 border border-border text-fg text-sm pl-9 pr-3 py-2 outline-none focus:border-accent"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {TYPE_FILTERS.map(f => (
            <button
              key={f.value || "all"}
              onClick={() => setTypeFilter(f.value)}
              className={`px-3 py-2 text-xs transition-all border ${
                typeFilter === f.value
                  ? "bg-accent text-zinc-900 border-accent"
                  : "bg-surface-2 text-fg-3 border-border hover:border-border-light"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-surface-2 border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-3">
              <tr>
                <Th>Nº Orden</Th>
                <Th>Equipo / Cliente</Th>
                <Th>Tipo</Th>
                <Th>Técnico</Th>
                <Th>Estado</Th>
                <Th>Avance</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center text-fg-5">
                  <Loader2 size={20} className="animate-spin inline-block text-accent" />
                </td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-fg-6 text-sm">
                  No hay órdenes de servicio {search || typeFilter ? "con esos filtros" : "aún"}. Crea la primera con "Nueva orden de servicio".
                </td></tr>
              ) : orders.map(o => (
                <tr
                  key={o.id}
                  className="hover:bg-surface-3 cursor-pointer transition-colors"
                  onClick={() => nav(`/posventa/servicio-tecnico/${o.id}`)}
                >
                  <td className="py-3 px-4 text-sm font-mono text-accent">{o.order_number}</td>
                  <td className="py-3 px-4 text-sm">
                    <div className="text-fg">{formatMachineLabel(o)}</div>
                    <div className="text-fg-5 text-[11px]">
                      {o.client_name ?? "Sin cliente"}
                      {o.machine_info?.horometer != null && <> · {o.machine_info.horometer.toLocaleString("es-CO")} h</>}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-fg-3">{SERVICE_TYPE_LABELS[o.service_type] ?? o.service_type}</td>
                  <td className="py-3 px-4 text-sm text-fg-3">{o.technician_name ?? "—"}</td>
                  <td className="py-3 px-4">
                    {o.is_overdue ? (
                      <span className="inline-flex items-center text-[10px] uppercase tracking-wider px-1.5 py-0.5 border bg-rose-500/15 text-rose-300 border-rose-500/30">
                        Atrasado
                      </span>
                    ) : (
                      <span className={`inline-flex items-center text-[10px] uppercase tracking-wider px-1.5 py-0.5 border ${STATUS_COLORS[o.status] ?? "bg-surface-3 text-fg-5 border-border"}`}>
                        {SERVICE_STATUS_LABELS[o.status] ?? o.status}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <ProgressBar pct={o.progress_pct} overdue={o.is_overdue} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showNew && (
        <NuevaOrdenServicioModal
          onClose={() => setShowNew(false)}
          onCreated={(id) => { setShowNew(false); nav(`/posventa/servicio-tecnico/${id}`); }}
        />
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="py-2 px-4 text-left text-[10px] uppercase tracking-wider text-fg-5 font-semibold">{children}</th>;
}

function KpiCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="bg-surface-2 border border-border p-4">
      <div className="text-fg-6 text-[10px] uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${accent ?? "text-fg"}`}>{value}</div>
    </div>
  );
}

function ProgressBar({ pct, overdue }: { pct: number; overdue: boolean }) {
  const color = overdue ? "bg-rose-400" : pct >= 90 ? "bg-emerald-400" : "bg-amber-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-surface-3 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </div>
      <span className="text-[10px] text-fg-5 w-8 text-right">{pct}%</span>
    </div>
  );
}
