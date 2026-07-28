import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { api, type SparePartRequest } from "../../services/api";

const STATUSES = ["pendiente", "cotizado", "pedido", "entregado", "cancelado"] as const;

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pendiente:  "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    cotizado:   "bg-blue-500/15   text-blue-400   border-blue-500/30",
    pedido:     "bg-purple-500/15 text-purple-400 border-purple-500/30",
    entregado:  "bg-green-500/15  text-green-400  border-green-500/30",
    cancelado:  "bg-red-500/15    text-red-400    border-red-500/30",
  };
  return (
    <span className={`px-2 py-0.5 text-[11px] font-bold border rounded-sm capitalize ${styles[status] ?? "bg-surface-3 text-fg-5 border-border"}`}>
      {status}
    </span>
  );
}

export default function RepuestosPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<SparePartRequest[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const PAGE_SIZE = 20;

  const load = async () => {
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

  useEffect(() => { load(); }, [page, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Search with manual trigger on Enter / blur to avoid hammering on every keypress
  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { setPage(1); load(); }
  };

  const pages = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <div className="space-y-5">

      <div>
        <h1 className="text-fg font-bold text-xl">Solicitudes de Repuestos</h1>
        <p className="text-fg-5 text-sm mt-0.5">Solicitudes recibidas por el bot Coni</p>
      </div>

      {/* Filters */}
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
            <option key={s} value={s} className="capitalize">{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
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
    </div>
  );
}
