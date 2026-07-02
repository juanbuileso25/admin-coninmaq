import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, UserCheck, TrendingUp, Hammer } from "lucide-react";
import StatCard from "../../components/StatCard";
import { api, type BotLeadResponse, type BotMetrics } from "../../services/api";

function TierBadge({ tier }: { tier?: string | null }) {
  if (!tier) return <span className="text-fg-6">—</span>;
  const styles = ({
    A:      "bg-green-500/15 text-green-400 border-green-500/30",
    B:      "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    no_fit: "bg-red-500/15 text-red-400 border-red-500/30",
  } as Record<string, string>)[tier] ?? "bg-surface-3 text-fg-5 border-border";
  const label = tier === "no_fit" ? "No Fit" : `Tier ${tier}`;
  return (
    <span className={`px-2 py-0.5 text-[11px] font-bold border rounded-sm ${styles}`}>
      {label}
    </span>
  );
}

const COP = (n: number) =>
  n ? `$${n.toLocaleString("es-CO")}` : "—";

export default function LeadsPage() {
  const navigate = useNavigate();
  const [leads, setLeads]         = useState<BotLeadResponse[]>([]);
  const [metrics, setMetrics]     = useState<BotMetrics | null>(null);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [industryFilter, setIndustry] = useState("");
  const [typeFilter, setType]     = useState("");
  const [tierFilter, setTier]     = useState("");

  const PAGE_SIZE = 20;

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.bot.leads({
        industry: industryFilter || undefined,
        client_type: typeFilter || undefined,
        tier: tierFilter || undefined,
        page,
        page_size: PAGE_SIZE,
      });
      setLeads(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, industryFilter, typeFilter, tierFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    api.bot.metrics().then(setMetrics).catch(() => null);
  }, []);

  const filtered = search
    ? leads.filter(l =>
        l.name?.toLowerCase().includes(search.toLowerCase()) ||
        l.email?.toLowerCase().includes(search.toLowerCase()) ||
        l.company?.toLowerCase().includes(search.toLowerCase()) ||
        l.phone_number?.includes(search)
      )
    : leads;

  const pages = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <div className="space-y-5">

      <div>
        <h1 className="text-fg font-bold text-xl">Leads</h1>
        <p className="text-fg-5 text-sm mt-0.5">Prospectos capturados por el bot Coni</p>
      </div>

      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total leads"         value={String(metrics.total_leads)}          icon={UserCheck}  accent delay={0}   />
          <StatCard label="Últimos 7 días"      value={String(metrics.leads_last_7_days)}    icon={TrendingUp} delay={50}  />
          <StatCard label="Top equipo"          value={metrics.top_equipment_interest[0]?.equipment ?? "—"} icon={Hammer} delay={100} />
          <StatCard label="Top industria"       value={metrics.top_industries[0]?.industry ?? "—"}          icon={UserCheck} delay={150} />
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-6 pointer-events-none" />
          <input
            className="w-full bg-surface-2 border border-border text-fg pl-9 pr-4 py-2.5 text-sm placeholder:text-fg-6 outline-none focus:border-accent"
            placeholder="Buscar por nombre, email o empresa..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <input
          className="bg-surface-2 border border-border text-fg-3 text-sm px-3 py-2.5 outline-none focus:border-accent w-40"
          placeholder="Industria..."
          value={industryFilter}
          onChange={e => { setIndustry(e.target.value); setPage(1); }}
        />
        <select
          className="bg-surface-2 border border-border text-fg-3 text-sm px-3 py-2.5 outline-none focus:border-accent"
          value={typeFilter}
          onChange={e => { setType(e.target.value); setPage(1); }}
        >
          <option value="">Tipo: todos</option>
          <option value="minorista">Minorista</option>
          <option value="mayorista">Mayorista</option>
        </select>
        <select
          className="bg-surface-2 border border-border text-fg-3 text-sm px-3 py-2.5 outline-none focus:border-accent"
          value={tierFilter}
          onChange={e => { setTier(e.target.value); setPage(1); }}
        >
          <option value="">Tier: todos</option>
          <option value="A">Tier A</option>
          <option value="B">Tier B</option>
          <option value="no_fit">No Fit</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface-2 border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {["Tier", "Nombre", "Empresa", "Teléfono", "Email", "Cotización", "Equipo de interés", "Presupuesto", "Industria", "Fecha"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-fg-5 text-xs uppercase tracking-wider font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9} className="px-4 py-8 text-center text-fg-5">Cargando...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-fg-5">Sin leads</td></tr>}
            {!loading && filtered.map(l => (
              <tr
                key={l.id}
                className="border-b border-border hover:bg-surface-3 transition-colors cursor-pointer"
                onClick={() => navigate(`/agente/leads/${l.id}/score`)}
              >
                <td className="px-4 py-3 whitespace-nowrap"><TierBadge tier={l.score?.tier_final} /></td>
                <td className="px-4 py-3 text-fg font-medium">{l.name ?? "—"}</td>
                <td className="px-4 py-3 text-fg-4">{l.company ?? "—"}</td>
                <td className="px-4 py-3 text-fg-4 font-mono text-xs">{l.phone_number ?? "—"}</td>
                <td className="px-4 py-3 text-fg-4">{l.email ?? "—"}</td>
                <td className="px-4 py-3">
                  {l.latest_quotation ? (
                    <a
                      href={l.latest_quotation.pdf_url ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-accent text-xs hover:underline font-mono"
                    >
                      {l.latest_quotation.quotation_number}
                    </a>
                  ) : (
                    <span className="text-fg-6">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-fg-4">{l.equipment_interest ?? "—"}</td>
                <td className="px-4 py-3 text-fg-4">{l.budget_text ? `${l.budget_text} (${COP(l.budget_value)})` : "—"}</td>
                <td className="px-4 py-3 text-fg-4">{l.industry ?? "—"}</td>
                <td className="px-4 py-3 text-fg-5 text-xs whitespace-nowrap">
                  {new Date(l.created_at).toLocaleDateString("es-CO")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-fg-5">
          <span>{total} leads en total</span>
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
