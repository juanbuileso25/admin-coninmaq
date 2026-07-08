import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Search, Loader2, Package, ChevronRight,
  DollarSign, CircleDollarSign, AlertCircle, Boxes,
} from "lucide-react";
import { api, type MachineOrderListResponse, type SupplierResponse } from "../../services/api";
import PedidoDrawer from "../../components/pedidos/PedidoDrawer";
import Select from "../../components/ui/Select";


const PAYMENT_LABELS: Record<string, { label: string; color: string }> = {
  sin_anticipo:    { label: "Sin anticipo",    color: "text-fg-6"         },
  anticipo_pagado: { label: "Anticipo pagado", color: "text-yellow-400"   },
  saldo_parcial:   { label: "Saldo parcial",   color: "text-blue-400"     },
  pagado_completo: { label: "Pagado",          color: "text-green-400"    },
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function fmtUSD(n: number | string | null | undefined) {
  if (n == null) return "—";
  const num = Number(n);
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(num);
}

type StatCardProps = {
  icon:     React.ReactNode;
  label:    string;
  value:    string;
  sub?:     string;
  accent?:  boolean;
  active?:  boolean;
  onClick?: () => void;
};

function StatCard({ icon, label, value, sub, accent, active, onClick }: StatCardProps) {
  const clickable = !!onClick;
  return (
    <div
      onClick={onClick}
      className={`bg-surface-2 border px-4 py-3.5 flex items-center gap-3 transition-all
        ${clickable ? "cursor-pointer hover:bg-surface-3" : ""}
        ${active ? "border-yellow-500/60 bg-yellow-950/20" : "border-border"}`}
    >
      <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0 ${active ? "text-yellow-400" : accent ? "text-accent" : "text-fg-5"}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-fg-6 text-[10px] uppercase tracking-wider font-medium">{label}</p>
        <p className={`text-base font-semibold leading-tight ${active ? "text-yellow-400" : accent ? "text-accent" : "text-fg"}`}>{value}</p>
        {sub && <p className="text-fg-6 text-[10px] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function PedidosMaquinasPage() {
  const navigate = useNavigate();
  const [orders,    setOrders]    = useState<MachineOrderListResponse[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierResponse[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,       setSearch]       = useState("");
  const [yearFilter,   setYearFilter]   = useState(String(new Date().getFullYear()));
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [debtFilter,   setDebtFilter]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersData, suppliersData] = await Promise.all([
        api.machineOrders.list({
          search:  search       || undefined,
          year:    yearFilter   ? Number(yearFilter) : undefined,
        }),
        api.suppliers.list(),
      ]);
      setOrders(ordersData);
      setSuppliers(suppliersData);
    } finally {
      setLoading(false);
    }
  }, [search, yearFilter]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const totalFob      = orders.reduce((s, o) => s + Number(o.total_fob_usd ?? 0), 0);
    const totalMachines = orders.reduce((s, o) => s + o.items_count, 0);
    const pendingBalance = orders.filter(
      (o) => o.payment_status === "anticipo_pagado" || o.payment_status === "saldo_parcial"
    ).length;
    const remainingDebt = orders.reduce((s, o) => s + Number(o.remaining_debt_usd ?? 0), 0);
    return { totalFob, totalMachines, pendingBalance, remainingDebt };
  }, [orders]);

  const displayedOrders = useMemo(() =>
    debtFilter
      ? orders.filter((o) => Number(o.remaining_debt_usd ?? 0) > 0)
      : orders,
  [orders, debtFilter]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-fg-6 text-xs uppercase tracking-wider mb-1">Comercio exterior</p>
          <h1 className="text-fg text-xl font-semibold">Pedidos de máquinas</h1>
        </div>
        <button onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 bg-accent hover:bg-accent-light text-zinc-900 font-semibold
                     text-xs uppercase tracking-wider px-4 py-2.5 transition-all hover:shadow-glow hover:-translate-y-px flex-shrink-0">
          <Plus size={15} /> Nuevo pedido
        </button>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 animate-fade-up" style={{ animationDelay: "30ms", animationFillMode: "both" }}>
          <StatCard
            icon={<DollarSign size={18} />}
            label="FOB Total"
            value={fmtUSD(stats.totalFob)}
            sub={`${orders.length} pedidos`}
            accent
          />
          <StatCard
            icon={<Boxes size={18} />}
            label="Máquinas"
            value={String(stats.totalMachines)}
            sub="en los pedidos filtrados"
          />
          <StatCard
            icon={<AlertCircle size={18} />}
            label="Saldo por cobrar"
            value={String(stats.pendingBalance)}
            sub="pedidos con anticipo, saldo pendiente"
          />
          <StatCard
            icon={<CircleDollarSign size={18} />}
            label="Deuda restante"
            value={fmtUSD(stats.remainingDebt)}
            sub={debtFilter ? "▶ activo — click para quitar" : "click para ver pedidos"}
            active={debtFilter}
            onClick={() => setDebtFilter((v) => !v)}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 animate-fade-up" style={{ animationDelay: "60ms", animationFillMode: "both" }}>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-6" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="# pedido, cliente, # serie máquina, # serie motor, # factura..."
            className="input-dark w-full pl-9"
          />
        </div>
        <div className="min-w-[110px]">
          <Select
            value={yearFilter}
            onChange={setYearFilter}
            options={years.map((y) => ({ value: String(y), label: String(y) }))}
            placeholder="Año"
            clearable
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-2 border border-border animate-fade-up" style={{ animationDelay: "100ms", animationFillMode: "both" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium"># Pedido fábrica</th>
                <th className="text-left px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">Proveedor</th>
                <th className="text-left px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">Año</th>
                <th className="text-left px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">Fecha pedido</th>
                <th className="text-left px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">BL</th>
                <th className="text-right px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">Máquinas</th>
                <th className="text-right px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">FOB Total</th>
                <th className="text-right px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">Deuda restante</th>
                <th className="text-left px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">Pago</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr><td colSpan={10} className="text-center py-12 text-fg-6 text-sm">
                  <Loader2 size={16} className="animate-spin inline-block mr-2" />Cargando...
                </td></tr>
              )}
              {!loading && displayedOrders.length === 0 && (
                <tr><td colSpan={10} className="text-center py-12 text-fg-6 text-sm">
                  <Package size={24} className="mx-auto mb-2 opacity-40" />
                  {debtFilter ? "No hay pedidos con deuda pendiente" : "No hay pedidos registrados"}
                </td></tr>
              )}
              {!loading && displayedOrders.map((o) => {
                const pt = PAYMENT_LABELS[o.payment_status] ?? { label: o.payment_status, color: "text-fg-5" };
                return (
                  <tr
                    key={o.id}
                    className="hover:bg-surface-3 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/comercio-exterior/pedidos/${o.id}`)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-accent text-sm font-semibold">{o.factory_order_number}</span>
                    </td>
                    <td className="px-4 py-3 text-fg-4 text-xs">{o.supplier.name}</td>
                    <td className="px-4 py-3 text-fg-5 text-xs">{o.year ?? "—"}</td>
                    <td className="px-4 py-3 text-fg-5 text-xs">{fmtDate(o.order_date)}</td>
                    <td className="px-4 py-3 text-fg-5 text-xs font-mono">{o.bl_number ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-fg-3 text-sm font-medium">{o.items_count}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-fg-3 text-sm">{fmtUSD(o.total_fob_usd)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {o.remaining_debt_usd != null && Number(o.remaining_debt_usd) > 0
                        ? <span className="text-yellow-400 text-sm font-medium">{fmtUSD(Number(o.remaining_debt_usd))}</span>
                        : <span className="text-fg-6 text-xs">—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${pt.color}`}>{pt.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight size={14} className="text-fg-6 group-hover:text-fg-4 transition-colors ml-auto" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border bg-surface-3">
          <p className="text-fg-6 text-xs">
            <span className="text-fg-4">{displayedOrders.length}</span> pedidos
            {debtFilter && <span className="ml-2 text-yellow-500 font-medium">· Filtrando por deuda pendiente</span>}
          </p>
        </div>
      </div>

      {drawerOpen && (
        <PedidoDrawer
          suppliers={suppliers}
          onClose={() => setDrawerOpen(false)}
          onSaved={() => { setDrawerOpen(false); load(); }}
        />
      )}
    </div>
  );
}
