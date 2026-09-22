import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Wrench, TrendingUp, AlertTriangle, ImageOff, Send } from "lucide-react";
import { api, type RentalMachineOverview } from "../../services/api";
import NewMachineModal from "../../components/renta/NewMachineModal";

const MONTH_LABELS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

function formatCOP(v: number | null | undefined): string {
  if (v == null) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP",
    maximumFractionDigits: 0,
  }).format(v);
}

function formatShortCOP(v: number | null | undefined): string {
  if (v == null || v === 0) return "—";
  return formatCOP(v);
}

function complianceStyle(pct: number | null): { bg: string; text: string; border: string } {
  if (pct == null) return { bg: "bg-surface-3", text: "text-fg-5", border: "border-border" };
  if (pct >= 91) return { bg: "bg-emerald-950/40", text: "text-emerald-300", border: "border-emerald-900/40" };
  if (pct >= 51) return { bg: "bg-amber-950/40", text: "text-amber-300", border: "border-amber-900/40" };
  return { bg: "bg-red-950/40", text: "text-red-300", border: "border-red-900/40" };
}

function nextMaintenanceStyle(remaining: number | null): { text: string; label: string } {
  if (remaining == null) return { text: "text-fg-6", label: "—" };
  if (remaining <= 0) return { text: "text-red-300", label: `Vencido ${Math.abs(remaining).toFixed(0)}h` };
  if (remaining <= 25) return { text: "text-amber-300", label: `En ${remaining.toFixed(0)}h` };
  return { text: "text-fg-4", label: `En ${remaining.toFixed(0)}h` };
}

export default function RentalOverviewPage() {
  const nav = useNavigate();
  const [rows, setRows] = useState<RentalMachineOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api.rental.overview({ months: 3, only_active: onlyActive });
      setRows(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [onlyActive]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.machine.code.toLowerCase().includes(q) ||
      r.machine.plate.toLowerCase().includes(q) ||
      (r.current_assignment?.client_name ?? "").toLowerCase().includes(q) ||
      (r.current_assignment?.obra ?? "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const monthHeaders = useMemo(() => {
    if (rows.length === 0) return [];
    return rows[0].months.map(m => `${MONTH_LABELS[m.month - 1]} ${String(m.year).slice(-2)}`);
  }, [rows]);

  const totals = useMemo(() => {
    const monthTotals = monthHeaders.map((_, i) =>
      filtered.reduce((sum, r) => sum + (r.months[i]?.total ?? 0), 0)
    );
    const projection = filtered.reduce((sum, r) => sum + (r.projection_current_month ?? 0), 0);
    return { monthTotals, projection };
  }, [filtered, monthHeaders]);

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-fg-6 text-xs uppercase tracking-wider mb-1">Renta</p>
          <h1 className="text-fg text-xl font-semibold">Cuadro general</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => nav("/renta/horometro/reportes")}
            className="flex items-center gap-2 border border-border text-fg-3 hover:border-accent hover:text-accent
                       text-xs uppercase tracking-wider px-4 py-2.5 transition-all"
          >
            <Send size={14} /> Enviar reportes
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 bg-accent hover:bg-accent-light text-zinc-900 font-semibold
                       text-xs uppercase tracking-wider px-4 py-2.5 transition-all hover:shadow-glow hover:-translate-y-px"
          >
            <Plus size={15} /> Nueva máquina
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 animate-fade-up">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-6" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, placa, cliente, obra..."
            className="w-full bg-surface-3 border border-border pl-9 pr-3 py-2 text-sm text-fg-2 outline-none focus:border-accent transition-all"
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-fg-4 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyActive}
            onChange={(e) => setOnlyActive(e.target.checked)}
            className="accent-accent"
          />
          Solo activas
        </label>
        <span className="text-xs text-fg-6 ml-auto">
          {filtered.length} {filtered.length === 1 ? "máquina" : "máquinas"}
        </span>
      </div>

      {/* Table */}
      <div
        className="bg-surface-2 border border-border overflow-hidden animate-fade-up"
        style={{ animationDelay: "80ms", animationFillMode: "both" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead>
              <tr className="border-b border-border bg-surface-3">
                <th className="text-left px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-semibold">Máquina</th>
                <th className="text-left px-3 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-semibold">Cliente</th>
                <th className="text-left px-3 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-semibold">Obra</th>
                <th className="text-right px-3 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-semibold">Tarifa</th>
                {monthHeaders.map(h => (
                  <th key={h} className="text-right px-3 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-semibold">{h}</th>
                ))}
                <th className="text-right px-3 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-semibold">Proyección</th>
                <th className="text-center px-3 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-semibold">% Cumpl.</th>
                <th className="text-right px-3 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-semibold">Próx. mant.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr><td colSpan={8 + monthHeaders.length} className="text-center py-12 text-fg-6 text-sm">Cargando...</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={8 + monthHeaders.length} className="text-center py-12 text-fg-6 text-sm">Sin máquinas</td></tr>
              )}
              {!loading && filtered.map((r, idx) => {
                const compliance = complianceStyle(r.compliance_pct);
                const nextMnt = nextMaintenanceStyle(r.next_maintenance_hours_remaining);
                return (
                  <tr
                    key={r.machine.id}
                    onClick={() => nav(`/renta/horometro/${r.machine.id}`)}
                    className="hover:bg-surface-3 transition-colors cursor-pointer"
                    style={{ animationDelay: `${idx * 20}ms` }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {r.machine.catalog?.image_url ? (
                          <img src={r.machine.catalog.image_url} alt="" className="w-9 h-9 object-cover border border-border flex-shrink-0" />
                        ) : (
                          <div className="w-9 h-9 bg-surface-4 border border-border flex items-center justify-center flex-shrink-0">
                            <ImageOff size={12} className="text-fg-6" />
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-fg-2 text-sm truncate">
                            {r.machine.code} · {r.machine.plate}
                            {r.machine.nickname && <span className="text-accent ml-1.5">"{r.machine.nickname}"</span>}
                          </span>
                          {r.machine.model && (
                            <span className="text-fg-6 text-[11px] truncate">{r.machine.model}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-fg-3 text-sm">
                      {r.current_assignment?.client_name ?? <span className="text-fg-6">—</span>}
                    </td>
                    <td className="px-3 py-3 text-fg-3 text-sm">
                      {r.current_assignment?.obra ?? <span className="text-fg-6">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right text-fg-3 text-sm font-mono">
                      {r.current_assignment?.rate != null ? formatCOP(r.current_assignment.rate) : <span className="text-fg-6">—</span>}
                    </td>
                    {r.months.map((m) => (
                      <td key={`${m.year}-${m.month}`} className="px-3 py-3 text-right text-fg-3 text-sm font-mono">
                        {formatShortCOP(m.total)}
                      </td>
                    ))}
                    <td className="px-3 py-3 text-right text-fg-2 text-sm font-mono">
                      {r.projection_current_month != null
                        ? formatShortCOP(r.projection_current_month)
                        : <span className="text-fg-6">—</span>}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {r.compliance_pct != null ? (
                        <span className={`inline-block px-2 py-0.5 text-xs font-semibold border ${compliance.bg} ${compliance.text} ${compliance.border}`}>
                          {r.compliance_pct.toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-fg-6 text-xs">—</span>
                      )}
                    </td>
                    <td className={`px-3 py-3 text-right text-xs font-medium ${nextMnt.text}`}>
                      <span className="inline-flex items-center gap-1">
                        {r.next_maintenance_hours_remaining != null && r.next_maintenance_hours_remaining <= 25 && (
                          <AlertTriangle size={11} />
                        )}
                        {nextMnt.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {!loading && filtered.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border bg-surface-3">
                  <td colSpan={4} className="px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-semibold">Totales</td>
                  {totals.monthTotals.map((t, i) => (
                    <td key={i} className="px-3 py-3 text-right text-accent text-sm font-mono font-semibold">
                      {formatShortCOP(t)}
                    </td>
                  ))}
                  <td className="px-3 py-3 text-right text-accent text-sm font-mono font-semibold">{formatShortCOP(totals.projection)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Summary cards */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-up" style={{ animationDelay: "150ms", animationFillMode: "both" }}>
          <SummaryCard icon={<TrendingUp size={15} />} label="Facturado mes actual" value={formatCOP(totals.monthTotals[totals.monthTotals.length - 1] ?? 0)} />
          <SummaryCard icon={<TrendingUp size={15} />} label="Proyección mes" value={formatCOP(totals.projection)} />
          <SummaryCard
            icon={<Wrench size={15} />}
            label="Mant. próximos (≤ 25h)"
            value={String(filtered.filter(r => r.next_maintenance_hours_remaining != null && r.next_maintenance_hours_remaining <= 25).length)}
          />
        </div>
      )}

      {showNewModal && (
        <NewMachineModal
          onClose={() => setShowNewModal(false)}
          onCreated={() => { setShowNewModal(false); load(); }}
        />
      )}
    </div>
  );
}


function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-surface-2 border border-border p-4">
      <div className="flex items-center gap-2 text-fg-5 text-[11px] uppercase tracking-wider font-medium">
        <span className="text-accent">{icon}</span>
        {label}
      </div>
      <div className="text-fg text-lg font-semibold mt-1.5">{value}</div>
    </div>
  );
}
