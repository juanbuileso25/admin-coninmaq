import { useEffect, useState } from "react";
import { Search, ReceiptText, Mail, DollarSign, FileText, Download, Plus, ExternalLink } from "lucide-react";
import StatCard from "../../components/StatCard";
import { api, type BotQuotationResponse, type BotMetrics } from "../../services/api";
import NuevaCotizacionDrawer from "../../components/agente/NuevaCotizacionDrawer";

const COP = (n: number) => `$${n.toLocaleString("es-CO")}`;

const DELIVERY_LABELS: Record<string, string> = {
  chat:   "Solo link",
  email:  "Email",
  ambas:  "Email + link",
};

const STATUS_COLORS: Record<string, string> = {
  generated: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  sent:      "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

export default function CotizacionesPage() {
  const [quotes, setQuotes]       = useState<BotQuotationResponse[]>([]);
  const [metrics, setMetrics]     = useState<BotMetrics | null>(null);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState("");
  const [modeFilter, setMode]     = useState("");
  const [drawerOpen, setDrawer]   = useState(false);

  const PAGE_SIZE = 20;

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.bot.quotations({
        status: statusFilter || undefined,
        delivery_mode: modeFilter || undefined,
        page,
        page_size: PAGE_SIZE,
      });
      setQuotes(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, statusFilter, modeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    api.bot.metrics().then(setMetrics).catch(() => null);
  }, []);

  const filtered = search
    ? quotes.filter(q =>
        q.quotation_number.toLowerCase().includes(search.toLowerCase()) ||
        q.session_id.includes(search)
      )
    : quotes;

  const pages = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <>
    <NuevaCotizacionDrawer
      open={drawerOpen}
      onClose={() => setDrawer(false)}
      onCreated={() => { setPage(1); load(); }}
    />
    <div className="space-y-5">

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-fg font-bold text-xl">Cotizaciones</h1>
          <p className="text-fg-5 text-sm mt-0.5">Generadas por Coni o manualmente</p>
        </div>
        <button
          onClick={() => setDrawer(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent text-black text-sm font-semibold hover:bg-accent/90 transition-colors shrink-0">
          <Plus size={14} /> Nueva cotización
        </button>
      </div>

      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total cotizaciones" value={String(metrics.total_quotations)}    icon={ReceiptText} accent delay={0}   />
          <StatCard label="Enviadas por email" value={String(metrics.quotations_email_sent)} icon={Mail}     delay={50}  />
          <StatCard label="Revenue total"      value={COP(metrics.total_revenue)}           icon={DollarSign} delay={100} />
          <StatCard label="Con PDF"            value={String(quotes.filter(q => q.pdf_url).length)} icon={FileText} delay={150} />
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-6 pointer-events-none" />
          <input
            className="w-full bg-surface-2 border border-border text-fg pl-9 pr-4 py-2.5 text-sm placeholder:text-fg-6 outline-none focus:border-accent"
            placeholder="Buscar por número de cotización..."
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
        <select
          className="bg-surface-2 border border-border text-fg-3 text-sm px-3 py-2.5 outline-none focus:border-accent"
          value={modeFilter}
          onChange={e => { setMode(e.target.value); setPage(1); }}
        >
          <option value="">Entrega: todas</option>
          <option value="chat">Chat</option>
          <option value="email">Email</option>
          <option value="ambas">Ambas</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface-2 border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {["N° Cotización", "Sesión", "Subtotal", "Total", "Entrega", "Email", "Estado", "Vence", "Fecha", "PDF", "Web"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-fg-5 text-xs uppercase tracking-wider font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={11} className="px-4 py-8 text-center text-fg-5">Cargando...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={11} className="px-4 py-8 text-center text-fg-5">Sin cotizaciones</td></tr>}
            {!loading && filtered.map(q => (
              <tr key={q.id} className="border-b border-border hover:bg-surface-3 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-accent">{q.quotation_number}</td>
                <td className="px-4 py-3 font-mono text-xs text-fg-5">{q.session_id.slice(0, 20)}…</td>
                <td className="px-4 py-3 text-fg-4">{COP(q.subtotal)}</td>
                <td className="px-4 py-3 text-fg font-semibold">{COP(q.total)}</td>
                <td className="px-4 py-3 text-fg-4">{DELIVERY_LABELS[q.delivery_mode] ?? q.delivery_mode}</td>
                <td className="px-4 py-3 text-center">
                  {q.email_sent
                    ? <span className="text-emerald-400 text-xs">✓</span>
                    : <span className="text-fg-6 text-xs">—</span>
                  }
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-[11px] font-medium border rounded-sm ${STATUS_COLORS[q.status] ?? "bg-surface-4 text-fg-5 border-border"}`}>
                    {q.status}
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
                    ? (
                      <a href={q.pdf_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-accent hover:text-accent/80 text-xs transition-colors"
                        title="Descargar PDF">
                        <Download size={13} /> PDF
                      </a>
                    )
                    : <span className="text-fg-6 text-xs">—</span>
                  }
                </td>
                <td className="px-4 py-3">
                  {q.page_url
                    ? (
                      <a href={q.page_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs transition-colors"
                        title="Ver cotización web">
                        <ExternalLink size={13} /> Ver
                      </a>
                    )
                    : <span className="text-fg-6 text-xs">—</span>
                  }
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
