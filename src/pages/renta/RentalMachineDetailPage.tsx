import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ClipboardList, Settings, Wrench, Paperclip, ImageOff, ExternalLink } from "lucide-react";
import { api, type RentalMachineDetail } from "../../services/api";
import RentalReadingsTab from "../../components/renta/RentalReadingsTab";
import RentalAssignmentsTab from "../../components/renta/RentalAssignmentsTab";
import RentalMaintenancesTab from "../../components/renta/RentalMaintenancesTab";
import RentalAttachmentsTab from "../../components/renta/RentalAttachmentsTab";

type TabKey = "readings" | "config" | "maintenance" | "attachments";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "readings",     label: "Facturación",  icon: <ClipboardList size={14} /> },
  { key: "config",       label: "Configuración", icon: <Settings size={14} /> },
  { key: "maintenance",  label: "Hoja de vida",  icon: <Wrench size={14} /> },
  { key: "attachments",  label: "Adjuntos",      icon: <Paperclip size={14} /> },
];

export default function RentalMachineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [data, setData] = useState<RentalMachineDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("readings");

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const d = await api.rental.getMachine(id);
      setData(d);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  if (loading) return <div className="text-fg-6 text-sm">Cargando...</div>;
  if (!data) return <div className="text-fg-6 text-sm">Máquina no encontrada</div>;

  const m = data.machine;
  const cur = data.current_assignment;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start gap-3 animate-fade-up">
        <button
          onClick={() => nav("/renta/horometro")}
          className="mt-1 text-fg-5 hover:text-fg transition-colors"
        >
          <ArrowLeft size={16} />
        </button>

        {m.catalog?.image_url ? (
          <img src={m.catalog.image_url} alt="" className="w-16 h-16 object-cover border border-border flex-shrink-0" />
        ) : (
          <div className="w-16 h-16 bg-surface-4 border border-border flex items-center justify-center flex-shrink-0">
            <ImageOff size={18} className="text-fg-6" />
          </div>
        )}

        <div className="flex-1">
          <p className="text-fg-6 text-xs uppercase tracking-wider mb-1">
            Unidad
            {m.catalog && (
              <a
                href={`/inventario/renta`}
                className="text-accent hover:underline ml-2 normal-case inline-flex items-center gap-1"
              >
                ver en catálogo <ExternalLink size={9} />
              </a>
            )}
          </p>
          <h1 className="text-fg text-xl font-semibold">
            {m.code} · {m.plate}
            {m.nickname && <span className="text-accent ml-2 text-lg">"{m.nickname}"</span>}
          </h1>
          <div className="text-fg-5 text-xs mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {m.model && <span>{m.model}</span>}
            {m.brand && <span>{m.brand}</span>}
            {m.catalog?.category && <span>{m.catalog.category}</span>}
            {m.year && <span>Año {m.year}</span>}
            {m.engine_serial && <span>Motor {m.engine_serial}</span>}
          </div>
        </div>
        {cur && (
          <div className="bg-surface-2 border border-border px-4 py-2.5 text-right">
            <div className="text-fg-6 text-[10px] uppercase tracking-wider">Asignación actual</div>
            <div className="text-fg-2 text-sm font-medium">{cur.client_name ?? "Sin cliente"}</div>
            <div className="text-fg-5 text-xs">{cur.obra || "Sin obra"}</div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border animate-fade-up">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs uppercase tracking-wider font-medium border-b-2 -mb-px transition-colors
              ${tab === t.key
                ? "text-accent border-accent"
                : "text-fg-5 border-transparent hover:text-fg-3"}`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-fade-up" style={{ animationDelay: "60ms", animationFillMode: "both" }}>
        {tab === "readings"    && <RentalReadingsTab machineId={m.id} assignments={data.assignments} currentAssignment={cur} onChange={load} />}
        {tab === "config"      && <RentalAssignmentsTab machineId={m.id} assignments={data.assignments} onChange={load} />}
        {tab === "maintenance" && <RentalMaintenancesTab machineId={m.id} />}
        {tab === "attachments" && <RentalAttachmentsTab machineId={m.id} />}
      </div>
    </div>
  );
}
