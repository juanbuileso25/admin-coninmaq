import { useEffect, useState } from "react";
import { Search, ReceiptText, Mail, DollarSign, Download, Plus, ExternalLink, Wrench, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import StatCard from "../../components/StatCard";
import Select from "../../components/ui/Select";
import { api, type BotQuotationResponse, type BotMetrics, type BotLeadResponse } from "../../services/api";
import NuevoPresupuestoRepuestosDrawer from "../../components/agente/NuevoPresupuestoRepuestosDrawer";
import LeadDetailDrawer from "../../components/agente/LeadDetailDrawer";

const COP = (n: number) => `$${n.toLocaleString("es-CO")}`;

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

const DELIVERY_LABELS: Record<string, string> = {
  chat:  "Solo link",
  email: "Email",
  ambas: "Email + link",
};

const STATUS_COLORS: Record<string, string> = {
  generated: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  sent:      "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  generated: "Generada",
  sent:      "Enviada",
};

export default function CotizacionesRepuestosPage() {
  const [quotes, setQuotes]       = useState<BotQuotationResponse[]>([]);
  const [metrics, setMetrics]     = useState<BotMetrics | null>(null);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState("");
  const [drawerOpen, setDrawer]   = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(MONTH_OPTIONS[0].value);

  // Detalle de lead
  const [selectedLead, setSelectedLead]   = useState<BotLeadResponse | null>(null);
  const [loadingLeadId, setLoadingLeadId] = useState<number | null>(null);

  const openLeadDetail = async (leadId: number | null) => {
    if (!leadId) {
      toast.error("Esta cotización no está vinculada a un lead");
      return;
    }
    try {
      setLoadingLeadId(leadId);
      const lead = await api.bot.getLead(leadId);
      setSelectedLead(lead);
    } catch (e: any) {
      toast.error(e?.message || "No se pudo cargar el lead");
    } finally {
      setLoadingLeadId(null);
    }
  };

  const PAGE_SIZE = 20;

  const loadMetrics = (month: string) => {
    const [year, m] = month.split("-").map(Number);
    const date_from = `${year}-${String(m).padStart(2, "0")}-01`;
    const lastDay   = new Date(year, m, 0).getDate();
    const date_to   = `${year}-${String(m).padStart(2, "0")}-${lastDay}`;
    api.bot.metrics({ date_from, date_to, quotation_type: "repuestos" }).then(setMetrics).catch(() => null);
  };

  const load = async () => {
    setLoading(true);
    const [year, m] = selectedMonth.split("-").map(Number);
    const date_from = `${year}-${String(m).padStart(2, "0")}-01`;
    const lastDay   = new Date(year, m, 0).getDate();
    const date_to   = `${year}-${String(m).padStart(2, "0")}-${lastDay}`;
    try {
      const res = await api.bot.quotations({
        quotation_type: "repuestos",
        status: statusFilter || undefined,
        date_from,
        date_to,
        page,
        page_size: PAGE_SIZE,
      });
      setQuotes(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, statusFilter, selectedMonth]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadMetrics(selectedMonth); }, [selectedMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = search
    ? quotes.filter(q =>
        q.quotation_number.toLowerCase().includes(search.toLowerCase()) ||
        q.session_id?.includes(search) ||
        q.lead_name?.toLowerCase().includes(search.toLowerCase()) ||
        q.lead_email?.toLowerCase().includes(search.toLowerCase())
      )
    : quotes;

  const pages = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <>
      <NuevoPresupuestoRepuestosDrawer
        open={drawerOpen}
        onClose={() => setDrawer(false)}
        onCreated={() => { setPage(1); load(); loadMetrics(selectedMonth); }}
      />
      <LeadDetailDrawer
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onStageChanged={() => { load(); setSelectedLead(null); }}
      />
      <div className="space-y-5">

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-fg font-bold text-xl">Cotizaciones de Repuestos</h1>
            <p className="text-fg-5 text-sm mt-0.5">Generadas manualmente o desde solicitudes del bot</p>
          </div>
          <button
            onClick={() => setDrawer(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent text-black text-sm font-semibold hover:bg-accent/90 transition-colors shrink-0"
          >
            <Plus size={14} /> Nueva cotización
          </button>
        </div>

        {/* Stats + selector de período */}
        {metrics && (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="text-fg-5 text-xs uppercase tracking-wider font-medium">Métricas del período</p>
              <div className="w-44">
                <Select
                  value={selectedMonth}
                  onChange={setSelectedMonth}
                  options={MONTH_OPTIONS}
                  compact
                />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Total acumulado"    value={String(metrics.total_quotations)}  icon={ReceiptText} accent delay={0}   />
              <StatCard label="Del período"        value={String(metrics.quotations_period)} icon={ReceiptText}        delay={50}  />
              <StatCard label="Enviadas por email" value={String(metrics.email_sent_period)} icon={Mail}               delay={100} />
              <StatCard label="Revenue período"    value={COP(metrics.revenue_period)}       icon={DollarSign}         delay={150} />
            </div>
          </>
        )}

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-6 pointer-events-none" />
            <input
              className="w-full bg-surface-2 border border-border text-fg pl-9 pr-4 py-2.5 text-sm placeholder:text-fg-6 outline-none focus:border-accent"
              placeholder="Buscar por número, cliente o email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="bg-surface-2 border border-border text-fg-3 text-sm px-3 py-2.5 outline-none focus:border-accent"
            value={statusFilter}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
          >
            <option value="">Estado: todos</option>
            <option value="generated">Generada</option>
            <option value="sent">Enviada</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-surface-2 border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["N° Cotización", "Cliente", "Subtotal", "IVA", "Total", "Entrega", "Estado", "Vence", "Fecha", "PDF", "Web", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-fg-5 text-xs uppercase tracking-wider font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={12} className="px-4 py-8 text-center text-fg-5">Cargando...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={12} className="px-4 py-8 text-center text-fg-5">Sin cotizaciones de repuestos</td></tr>}
              {!loading && filtered.map(q => (
                <tr key={q.id} className="border-b border-border hover:bg-surface-3 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-accent">{q.quotation_number}</td>
                  <td className="px-4 py-3">
                    {q.lead_name
                      ? <span className="text-fg text-xs">{q.lead_name}</span>
                      : <span className="text-fg-6 text-xs">—</span>
                    }
                    {q.lead_email && <p className="text-fg-5 text-[11px]">{q.lead_email}</p>}
                    {q.items && q.items.length > 0 && (() => {
                      const its = q.items as Array<{ codigo?: string; producto?: string; cantidad?: number }>;
                      const first = its[0];
                      const extra = its.length - 1;
                      const code = first?.codigo || "";
                      const name = first?.producto || "";
                      const label = code && name ? `${code} · ${name}` : (code || name || "—");
                      const tooltip = its.map(i => `${i.codigo ?? ""} ${i.producto ?? ""}${i.cantidad && i.cantidad > 1 ? ` ×${i.cantidad}` : ""}`.trim()).join("\n");
                      return (
                        <div
                          className="flex items-center gap-1 text-fg-4 text-[11px] mt-1 pt-1 border-t border-border/40"
                          title={tooltip}
                        >
                          <Wrench size={10} className="shrink-0 text-fg-6" />
                          <span className="truncate max-w-[220px]">{label}</span>
                          {extra > 0 && (
                            <span className="text-fg-6 shrink-0">+{extra} {extra === 1 ? "repuesto más" : "repuestos más"}</span>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-fg-4">{COP(q.subtotal)}</td>
                  <td className="px-4 py-3 text-fg-4">{q.iva_total > 0 ? COP(q.iva_total) : <span className="text-fg-6">—</span>}</td>
                  <td className="px-4 py-3 text-fg font-semibold">{COP(q.total)}</td>
                  <td className="px-4 py-3 text-fg-4">{DELIVERY_LABELS[q.delivery_mode] ?? q.delivery_mode}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-[11px] font-medium border rounded-sm ${STATUS_COLORS[q.status] ?? "bg-surface-4 text-fg-5 border-border"}`}>
                      {STATUS_LABELS[q.status] ?? q.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-fg-5 text-xs whitespace-nowrap">
                    {q.expires_at ? new Date(q.expires_at).toLocaleDateString("es-CO") : "—"}
                  </td>
                  <td className="px-4 py-3 text-fg-5 text-xs whitespace-nowrap">
                    {new Date(q.created_at).toLocaleDateString("es-CO")}
                  </td>
                  <td className="px-4 py-3">
                    {q.pdf_url
                      ? <a href={q.pdf_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-accent hover:text-accent/80 text-xs transition-colors"><Download size={13} /> PDF</a>
                      : <span className="text-fg-6 text-xs">—</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    {q.page_url
                      ? <a href={q.page_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs transition-colors"><ExternalLink size={13} /> Ver</a>
                      : <span className="text-fg-6 text-xs">—</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openLeadDetail(q.lead_id)}
                      disabled={!q.lead_id || loadingLeadId === q.lead_id}
                      title={q.lead_id ? "Ver detalle del lead" : "Sin lead vinculado"}
                      className="p-2 sm:p-1.5 text-fg-5 hover:text-accent hover:bg-accent/10 rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {loadingLeadId === q.lead_id ? <Loader2 size={13} className="animate-spin" /> : <User size={13} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between text-sm text-fg-5">
            <span>{total} cotizaciones en total</span>
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
    </>
  );
}
