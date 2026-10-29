import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ReceiptText, Mail, DollarSign, Download, Plus, Wrench, User, Paperclip, X } from "lucide-react";
import StatCard from "../../components/StatCard";
import Select from "../../components/ui/Select";
import { api, type BotQuotationResponse, type BotMetrics, SPARE_PART_STAGE_LABELS } from "../../services/api";
import NuevoPresupuestoRepuestosDrawer from "../../components/agente/NuevoPresupuestoRepuestosDrawer";

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

// Mismos colores del pipeline /posventa/leads para que la etapa sea consistente
const SPR_STAGE_COLORS: Record<string, string> = {
  solicitudes_recibidas: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  cotizado:              "bg-amber-500/15 text-amber-300 border-amber-500/30",
  venta_ganada:          "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  venta_perdida:         "bg-red-500/15 text-red-300 border-red-500/30",
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

  const navigate = useNavigate();

  const [attachmentsModal, setAttachmentsModal] = useState<BotQuotationResponse | null>(null);

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
                {["N° Cotización", "Cliente", "Subtotal", "IVA", "Total", "Etapa", "Vence", "Fecha", "PDF", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-fg-5 text-xs uppercase tracking-wider font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={10} className="px-4 py-8 text-center text-fg-5">Cargando...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={10} className="px-4 py-8 text-center text-fg-5">Sin cotizaciones de repuestos</td></tr>}
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
                  <td className="px-4 py-3">
                    {q.spare_part_request_status ? (
                      <span className={`px-2 py-0.5 text-[11px] font-medium border rounded-sm ${SPR_STAGE_COLORS[q.spare_part_request_status] ?? "bg-surface-4 text-fg-5 border-border"}`}>
                        {SPARE_PART_STAGE_LABELS[q.spare_part_request_status as keyof typeof SPARE_PART_STAGE_LABELS] ?? q.spare_part_request_status}
                      </span>
                    ) : (
                      <span className="text-fg-6 text-xs">—</span>
                    )}
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
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => q.spare_part_request_id && navigate(`/posventa/leads/${q.spare_part_request_id}`)}
                        disabled={!q.spare_part_request_id}
                        title={q.spare_part_request_id ? "Ver detalle de la solicitud en posventa" : "Sin solicitud vinculada"}
                        className="p-2 sm:p-1.5 text-fg-5 hover:text-accent hover:bg-accent/10 rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <User size={13} />
                      </button>
                      {q.email_attachments && q.email_attachments.length > 0 && (
                        <button
                          onClick={() => setAttachmentsModal(q)}
                          title={`Ver ${q.email_attachments.length} adjunto${q.email_attachments.length !== 1 ? "s" : ""} enviado${q.email_attachments.length !== 1 ? "s" : ""} por email`}
                          className="relative p-2 sm:p-1.5 text-fg-5 hover:text-accent hover:bg-accent/10 rounded-sm transition-colors"
                        >
                          <Paperclip size={13} />
                          <span className="absolute -top-0.5 -right-0.5 bg-accent text-black text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                            {q.email_attachments.length}
                          </span>
                        </button>
                      )}
                    </div>
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

      {attachmentsModal && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setAttachmentsModal(null)}
        >
          <div
            className="bg-surface-2 border border-border max-w-xl w-full max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b border-border flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-fg text-sm font-semibold flex items-center gap-2">
                  <Paperclip size={14} /> Adjuntos enviados por correo
                </h3>
                <p className="text-fg-5 text-xs mt-0.5 font-mono">
                  {attachmentsModal.quotation_number}
                </p>
              </div>
              <button className="text-fg-5 hover:text-fg p-1" onClick={() => setAttachmentsModal(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              {(!attachmentsModal.email_attachments || attachmentsModal.email_attachments.length === 0) ? (
                <p className="text-fg-5 text-sm text-center py-6">Sin adjuntos registrados.</p>
              ) : (
                <ul className="space-y-2">
                  {attachmentsModal.email_attachments.map((att, i) => (
                    <li key={att.url + i} className="bg-surface-3 border border-border px-3 py-2.5 flex items-center gap-3">
                      <Paperclip size={14} className="text-fg-5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-fg-2 hover:text-accent text-sm truncate block"
                        >
                          {att.filename}
                        </a>
                        <div className="text-fg-6 text-[11px] mt-0.5 flex items-center gap-2">
                          {att.content_type && <span>{att.content_type}</span>}
                          {att.size && <span>· {(att.size / 1024).toFixed(0)} KB</span>}
                          {att.attached_at && (
                            <span>· Enviado {new Date(att.attached_at).toLocaleString("es-CO")}</span>
                          )}
                        </div>
                      </div>
                      <a
                        href={att.url}
                        download={att.filename}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 text-fg-5 hover:text-accent"
                        title="Descargar"
                      >
                        <Download size={14} />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
