import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Search, MessageSquareWarning, Paperclip } from "lucide-react";
import { toast } from "sonner";
import {
  api,
  PQRS_TYPES,
  PQRS_STATUSES,
  PQRS_TYPE_LABELS,
  PQRS_STATUS_LABELS,
  type PqrsListItem,
  type PqrsMetrics,
  type PqrsType,
  type PqrsStatus,
} from "../../services/api";


const STATUS_COLORS: Record<PqrsStatus, string> = {
  recibida:    "bg-slate-500/15 text-slate-300 border-slate-500/30",
  en_revision: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  respondida:  "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  cerrada:     "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
};

const TYPE_COLORS: Record<PqrsType, string> = {
  queja:      "bg-red-500/15 text-red-300 border-red-500/30",
  reclamo:    "bg-orange-500/15 text-orange-300 border-orange-500/30",
  sugerencia: "bg-sky-500/15 text-sky-300 border-sky-500/30",
};


export default function PqrsPage() {
  const nav = useNavigate();
  const [items, setItems]     = useState<PqrsListItem[]>([]);
  const [metrics, setMetrics] = useState<PqrsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | PqrsStatus>("");
  const [typeFilter, setTypeFilter]     = useState<"" | PqrsType>("");

  const load = async () => {
    setLoading(true);
    try {
      const [list, m] = await Promise.all([
        api.pqrs.list({
          search: search || undefined,
          status: statusFilter || undefined,
          type:   typeFilter   || undefined,
        }),
        api.pqrs.metrics(),
      ]);
      setItems(list);
      setMetrics(m);
    } catch (e: any) {
      toast.error(e?.detail ?? "Error cargando PQRS");
    } finally {
      setLoading(false);
    }
  };

  // Recargar cuando cambian filtros discretos.
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter]);

  // Debounced search.
  useEffect(() => {
    const t = setTimeout(() => load(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const metricCards = useMemo(() => {
    if (!metrics) return [];
    return [
      { label: "Total",       value: metrics.total },
      { label: "Recibidas",   value: metrics.by_status["recibida"]    ?? 0, tone: "slate" },
      { label: "En revisión", value: metrics.by_status["en_revision"] ?? 0, tone: "amber" },
      { label: "Respondidas", value: metrics.by_status["respondida"]  ?? 0, tone: "emerald" },
      { label: "Cerradas",    value: metrics.by_status["cerrada"]     ?? 0, tone: "zinc" },
    ];
  }, [metrics]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-fg text-xl font-semibold flex items-center gap-2">
            <MessageSquareWarning size={18} className="text-accent" /> PQRS
          </h1>
          <p className="text-fg-5 text-xs mt-1">
            Quejas, reclamos y sugerencias capturadas por Ivonne. Responde,
            cambia el estado y deja notas internas desde el detalle.
          </p>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {metricCards.map(card => (
          <div key={card.label} className="bg-surface-2 border border-border px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-fg-5">{card.label}</div>
            <div className="text-fg text-xl font-semibold tabular-nums">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-fg-6" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar número, descripción o motivo…"
            className="w-full bg-surface-3 border border-border text-fg px-7 py-1.5 text-xs outline-none focus:border-accent"
          />
        </div>

        <FilterSelect
          value={statusFilter}
          onChange={v => setStatusFilter(v as PqrsStatus | "")}
          options={[
            { value: "", label: "Todos los estados" },
            ...PQRS_STATUSES.map(s => ({ value: s, label: PQRS_STATUS_LABELS[s] })),
          ]}
        />

        <FilterSelect
          value={typeFilter}
          onChange={v => setTypeFilter(v as PqrsType | "")}
          options={[
            { value: "", label: "Todos los tipos" },
            ...PQRS_TYPES.map(t => ({ value: t, label: PQRS_TYPE_LABELS[t] })),
          ]}
        />
      </div>

      {/* Tabla */}
      <div className="bg-surface-2 border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-3">
              <tr>
                <Th>Número</Th>
                <Th>Tipo</Th>
                <Th>Motivo</Th>
                <Th>Descripción</Th>
                <Th>Estado</Th>
                <Th>Fecha</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="py-10 text-center text-fg-5">
                  <Loader2 size={18} className="animate-spin inline text-accent" />
                </td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-fg-6 text-sm">
                  Sin PQRS que coincidan con el filtro.
                </td></tr>
              ) : items.map(p => (
                <tr
                  key={p.id}
                  onClick={() => nav(`/posventa/pqrs/${p.id}`)}
                  className="hover:bg-surface-3 transition-colors cursor-pointer"
                >
                  <td className="py-3 px-4 text-fg font-mono text-xs">{p.pqrs_number}</td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] uppercase tracking-wider border px-2 py-0.5 ${TYPE_COLORS[p.type]}`}>
                      {PQRS_TYPE_LABELS[p.type]}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-fg-4 text-xs">{p.motivo}</td>
                  <td className="py-3 px-4">
                    <div className="text-fg-3 text-sm max-w-[32ch] truncate">
                      {p.description_preview}
                    </div>
                    {p.attachments_count > 0 && (
                      <div className="text-fg-6 text-[10px] flex items-center gap-1 mt-0.5">
                        <Paperclip size={10} /> {p.attachments_count} adjunto(s)
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] uppercase tracking-wider border px-2 py-0.5 ${STATUS_COLORS[p.status]}`}>
                      {PQRS_STATUS_LABELS[p.status]}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-fg-5 text-xs tabular-nums">
                    {new Date(p.created_at).toLocaleDateString("es-CO")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


function Th({ children }: { children: React.ReactNode }) {
  return <th className="py-2 px-4 text-left text-[10px] uppercase tracking-wider text-fg-5 font-semibold">{children}</th>;
}


function FilterSelect({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="bg-surface-3 border border-border text-fg px-2 py-1.5 text-xs outline-none focus:border-accent"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
