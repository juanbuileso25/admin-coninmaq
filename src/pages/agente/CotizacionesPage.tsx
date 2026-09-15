import { useEffect, useRef, useState } from "react";
import { Search, ReceiptText, Mail, DollarSign, Download, Plus, ExternalLink, MousePointerClick, X, Loader2, Send } from "lucide-react";
import StatCard from "../../components/StatCard";
import Select from "../../components/ui/Select";
import { api, type BotQuotationResponse, type BotMetrics, type EmailClickEvent, PIPELINE_STAGE_LABELS } from "../../services/api";
import NuevaCotizacionDrawer from "../../components/agente/NuevaCotizacionDrawer";
import { toast } from "sonner";

const COP = (n: number) => `$${n.toLocaleString("es-CO")}`;

const DELIVERY_LABELS: Record<string, string> = {
  chat:   "Solo link",
  email:  "Email",
  ambas:  "Email + link",
};

const PIPELINE_STAGE_COLORS: Record<string, string> = {
  interesado:           "bg-sky-500/15 text-sky-400 border-sky-500/30",
  contactado:           "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  calificado:           "bg-violet-500/15 text-violet-400 border-violet-500/30",
  cotizacion_propuesta: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  cerrado:              "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  perdido:              "bg-red-500/15 text-red-400 border-red-500/30",
  referido:             "bg-pink-500/15 text-pink-400 border-pink-500/30",
};

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

export default function CotizacionesPage() {
  const [quotes, setQuotes]           = useState<BotQuotationResponse[]>([]);
  const [metrics, setMetrics]         = useState<BotMetrics | null>(null);
  const [clicks, setClicks]           = useState<Map<string, EmailClickEvent>>(new Map());
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [loading, setLoading]         = useState(false);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatus]     = useState("");
  const [modeFilter, setMode]         = useState("");
  const [drawerOpen, setDrawer]       = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(MONTH_OPTIONS[0].value);

  // Modal reenvío de email
  const [sendModal,       setSendModal]       = useState<BotQuotationResponse | null>(null);
  const [sendEmails,      setSendEmails]      = useState<string[]>([]);
  const [sendInput,       setSendInput]       = useState("");
  const [sending,         setSending]         = useState(false);
  const sendInputRef = useRef<HTMLInputElement>(null);

  const openSendModal = (q: BotQuotationResponse) => {
    const initial = q.lead_email ? [q.lead_email] : [];
    setSendEmails(initial);
    setSendInput("");
    setSendModal(q);
    setTimeout(() => sendInputRef.current?.focus(), 50);
  };

  const closeSendModal = () => { setSendModal(null); setSendEmails([]); setSendInput(""); };

  const addSendEmail = (raw: string) => {
    const email = raw.trim().toLowerCase().replace(/,/g, "");
    if (!email || !email.includes("@")) return;
    if (!sendEmails.includes(email)) setSendEmails(prev => [...prev, email]);
    setSendInput("");
  };

  const handleSendEmail = async () => {
    if (!sendModal || sendEmails.length === 0) return;
    setSending(true);
    try {
      const res = await api.bot.sendQuotationEmail(sendModal.quotation_number, sendEmails);
      if (res.sent) {
        toast.success(`Cotización enviada a ${sendEmails.length} correo${sendEmails.length > 1 ? "s" : ""}`);
        closeSendModal();
        loadQuotations();
      } else {
        toast.error("No se pudo enviar el correo");
      }
    } catch {
      toast.error("Error al enviar");
    } finally {
      setSending(false);
    }
  };

  const PAGE_SIZE = 20;

  const loadMetrics = (month: string) => {
    const [year, m] = month.split("-").map(Number);
    const date_from = `${year}-${String(m).padStart(2, "0")}-01`;
    const lastDay   = new Date(year, m, 0).getDate();
    const date_to   = `${year}-${String(m).padStart(2, "0")}-${lastDay}`;
    api.bot.metrics({ date_from, date_to }).then(setMetrics).catch(() => null);
    api.track.clicks()
      .then(data => setClicks(new Map(data.map(e => [e.quotation_number, e]))))
      .catch(() => null);
  };

  const loadQuotations = async () => {
    setLoading(true);
    const [year, m] = selectedMonth.split("-").map(Number);
    const date_from = `${year}-${String(m).padStart(2, "0")}-01`;
    const lastDay   = new Date(year, m, 0).getDate();
    const date_to   = `${year}-${String(m).padStart(2, "0")}-${lastDay}`;
    try {
      const res = await api.bot.quotations({
        quotation_type: "maquinaria",
        status: statusFilter || undefined,
        delivery_mode: modeFilter || undefined,
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

  useEffect(() => { loadQuotations(); }, [page, statusFilter, modeFilter, selectedMonth]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadMetrics(selectedMonth); }, [selectedMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = search
    ? quotes.filter(q =>
        q.quotation_number.toLowerCase().includes(search.toLowerCase()) ||
        (q.lead_name ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : quotes;

  const pages = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <>
    <NuevaCotizacionDrawer
      open={drawerOpen}
      onClose={() => setDrawer(false)}
      onCreated={() => { loadQuotations(); loadMetrics(selectedMonth); }}
    />
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-fg font-bold text-xl">Cotizaciones</h1>
          <p className="text-fg-5 text-sm mt-0.5">Generadas manualmente o desde Coni</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setDrawer(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent text-black text-sm font-semibold hover:bg-accent/90 transition-colors">
            <Plus size={14} /> <span className="hidden sm:inline">Nueva cotización</span><span className="sm:hidden">Nueva</span>
          </button>
        </div>
      </div>

      {/* Stat cards */}
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Total acumulado"   value={String(metrics.total_quotations)}  icon={ReceiptText} accent delay={0}   />
            <StatCard label="Del período"        value={String(metrics.quotations_period)} icon={ReceiptText}        delay={50}  />
            <StatCard label="Enviadas por email" value={String(metrics.email_sent_period)} icon={Mail}               delay={100} />
            <StatCard label="Revenue período"    value={COP(metrics.revenue_period)}       icon={DollarSign}         delay={150} />
          </div>
        </>
      )}

      {/* ── Lista ────────────────────────────────────────────────────────────── */}
      <>
        <>
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-6 pointer-events-none" />
              <input
                className="w-full bg-surface-2 border border-border text-fg pl-9 pr-4 py-2.5 text-sm placeholder:text-fg-6 outline-none focus:border-accent"
                placeholder="Buscar por número o cliente..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="w-40">
              <Select
                value={statusFilter}
                onChange={v => { setStatus(v); setPage(1); }}
                placeholder="Estado: todos"
                clearable
                compact
                options={[
                  { value: "generated", label: "Generada" },
                  { value: "sent",      label: "Enviada"  },
                ]}
              />
            </div>
            <div className="w-40">
              <Select
                value={modeFilter}
                onChange={v => { setMode(v); setPage(1); }}
                placeholder="Entrega: todas"
                clearable
                compact
                options={[
                  { value: "chat",  label: "Solo link"    },
                  { value: "email", label: "Email"        },
                  { value: "ambas", label: "Email + link" },
                ]}
              />
            </div>
          </div>

          <div className="bg-surface-2 border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["N° Cotización", "Cliente", "Subtotal", "IVA", "Total", "Entrega", "Email env.", "Link visto", "Estado", "Vence", "Fecha", "PDF", "Web", ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-fg-5 text-xs uppercase tracking-wider font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={13} className="px-4 py-8 text-center text-fg-5">Cargando...</td></tr>}
                {!loading && filtered.length === 0 && <tr><td colSpan={13} className="px-4 py-8 text-center text-fg-5">Sin cotizaciones</td></tr>}
                {!loading && filtered.map(q => {
                  const clickEvent = clicks.get(q.quotation_number);
                  return (
                  <tr key={q.id} className="border-b border-border hover:bg-surface-3 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-accent">{q.quotation_number}</td>
                    <td className="px-4 py-3">
                      {q.lead_name
                        ? <span className="text-fg text-xs">{q.lead_name}</span>
                        : <span className="text-fg-6 text-xs">—</span>
                      }
                      {q.lead_email && <p className="text-fg-5 text-[11px]">{q.lead_email}</p>}
                    </td>
                    <td className="px-4 py-3 text-fg-4">{COP(q.subtotal)}</td>
                    <td className="px-4 py-3 text-fg-4">{q.iva_total > 0 ? COP(q.iva_total) : <span className="text-fg-6">—</span>}</td>
                    <td className="px-4 py-3 text-fg font-semibold">{COP(q.total)}</td>
                    <td className="px-4 py-3 text-fg-4">{DELIVERY_LABELS[q.delivery_mode] ?? q.delivery_mode}</td>
                    <td className="px-4 py-3 text-center">
                      {q.email_sent
                        ? <span className="text-emerald-400 text-xs">✓</span>
                        : <span className="text-fg-6 text-xs">—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      {clickEvent ? (
                        <div
                          className="flex items-center gap-1 text-accent text-xs cursor-default"
                          title={`${clickEvent.click_count} clic${clickEvent.click_count !== 1 ? "s" : ""} · Último: ${new Date(clickEvent.last_clicked_at).toLocaleString("es-CO")}`}
                        >
                          <MousePointerClick size={12} />
                          <span>{clickEvent.click_count}×</span>
                        </div>
                      ) : (
                        <span className="text-fg-6 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {q.lead_pipeline_stage ? (
                        <span className={`px-2 py-0.5 text-[11px] font-medium border rounded-sm ${PIPELINE_STAGE_COLORS[q.lead_pipeline_stage] ?? "bg-surface-4 text-fg-5 border-border"}`}>
                          {PIPELINE_STAGE_LABELS[q.lead_pipeline_stage] ?? q.lead_pipeline_stage}
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
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openSendModal(q)}
                        title="Enviar por correo"
                        className="p-1.5 text-fg-5 hover:text-accent hover:bg-accent/10 rounded-sm transition-colors"
                      >
                        <Send size={13} />
                      </button>
                    </td>
                  </tr>
                  );
                })}
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
        </>
      </>

    </div>

    {/* ── Modal reenvío de email ── */}
    {sendModal && (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && closeSendModal()}>
        <div className="bg-surface-2 border border-border w-full max-w-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-fg">Enviar cotización</h3>
              <p className="text-xs text-fg-5 mt-0.5 font-mono">{sendModal.quotation_number}</p>
            </div>
            <button onClick={closeSendModal} className="text-fg-5 hover:text-fg"><X size={16} /></button>
          </div>

          {/* Chips */}
          <label className="text-xs text-fg-4 block mb-2">Destinatarios</label>
          {sendEmails.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {sendEmails.map(em => (
                <span key={em} className="flex items-center gap-1 text-xs bg-surface-3 border border-border text-fg-3 px-2 py-1">
                  {em}
                  <button type="button" onClick={() => setSendEmails(prev => prev.filter(e => e !== em))} className="text-fg-6 hover:text-fg ml-0.5">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <input
            ref={sendInputRef}
            type="email"
            className="w-full bg-surface-3 border border-border text-fg px-3 py-2.5 text-sm placeholder:text-fg-6 outline-none focus:border-accent"
            placeholder="correo@empresa.com — Enter o coma para agregar"
            value={sendInput}
            onChange={e => setSendInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addSendEmail(sendInput); }
              if (e.key === "Backspace" && !sendInput && sendEmails.length > 0)
                setSendEmails(prev => prev.slice(0, -1));
            }}
            onBlur={() => { if (sendInput.trim()) addSendEmail(sendInput); }}
          />
          <p className="text-[11px] text-fg-6 mt-1.5">Presiona Enter o coma para agregar cada correo. Backspace elimina el último.</p>

          <button
            onClick={handleSendEmail}
            disabled={sending || sendEmails.length === 0}
            className="mt-4 w-full bg-accent text-black text-sm font-semibold py-2.5 hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
            {sending ? "Enviando..." : `Enviar a ${sendEmails.length} correo${sendEmails.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    )}
    </>
  );
}
