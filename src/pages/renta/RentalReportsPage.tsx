import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, Loader2, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { api, type RentalReportClientBucket } from "../../services/api";
import DatePicker from "../../components/ui/DatePicker";
import ReportPreviewModal from "../../components/renta/ReportPreviewModal";
import { toast } from "sonner";

function formatCOP(v: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(v);
}

// Devuelve [primerDiaMesAnterior, ultimoDiaMesAnterior] en YYYY-MM-DD
function lastMonthRange(): [string, string] {
  const now = new Date();
  const firstOfCurrent = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastPrev = new Date(firstOfCurrent.getTime() - 24 * 3600 * 1000);
  const firstPrev = new Date(lastPrev.getFullYear(), lastPrev.getMonth(), 1);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return [iso(firstPrev), iso(lastPrev)];
}

function currentMonthRange(): [string, string] {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return [iso(first), iso(last)];
}

export default function RentalReportsPage() {
  const nav = useNavigate();
  const initialRange = currentMonthRange();
  const [dateFrom, setDateFrom] = useState<string | null>(initialRange[0]);
  const [dateTo, setDateTo] = useState<string | null>(initialRange[1]);
  const [clients, setClients] = useState<RentalReportClientBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMachines, setSelectedMachines] = useState<Record<string, Set<string>>>({});
  const [preview, setPreview] = useState<{
    clientId: string | null;
    clientName: string;
    machineIds: string[];
    recipients: string[];
    cc: string[];
  } | null>(null);

  async function load(from = dateFrom, to = dateTo) {
    if (!from || !to) return;
    setLoading(true);
    try {
      const r = await api.rental.reportsOverview(from, to);
      setClients(r.clients);
      // Inicializar todas las máquinas seleccionadas por defecto
      const sel: Record<string, Set<string>> = {};
      for (const c of r.clients) {
        const key = c.client_id ?? c.client_name;
        sel[key] = new Set(c.machines.map(m => m.machine_id));
      }
      setSelectedMachines(sel);
    } catch (e: any) {
      toast.error(e?.detail ?? "Error al cargar el resumen");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // Auto-recargar cuando cambian las fechas
  useEffect(() => {
    if (!dateFrom || !dateTo) return;
    load(dateFrom, dateTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  function bucketKey(c: RentalReportClientBucket): string {
    return c.client_id ?? c.client_name;
  }

  function toggleMachine(c: RentalReportClientBucket, machineId: string) {
    const key = bucketKey(c);
    setSelectedMachines(prev => {
      const s = new Set(prev[key] ?? []);
      if (s.has(machineId)) s.delete(machineId); else s.add(machineId);
      return { ...prev, [key]: s };
    });
  }

  function isSelected(c: RentalReportClientBucket, machineId: string): boolean {
    const s = selectedMachines[bucketKey(c)];
    return !!s?.has(machineId);
  }

  function selectedIds(c: RentalReportClientBucket): string[] {
    const s = selectedMachines[bucketKey(c)];
    return s ? Array.from(s) : [];
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 animate-fade-up">
        <button
          onClick={() => nav("/renta/horometro")}
          className="mt-1 text-fg-5 hover:text-fg transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <p className="text-fg-6 text-xs uppercase tracking-wider mb-1">Renta</p>
          <h1 className="text-fg text-xl font-semibold">Reportes por cliente</h1>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3 animate-fade-up">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium block mb-1">Desde</label>
          <DatePicker value={dateFrom} onChange={setDateFrom} compact />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium block mb-1">Hasta</label>
          <DatePicker value={dateTo} onChange={setDateTo} compact />
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => {
              const [f, t] = lastMonthRange();
              setDateFrom(f); setDateTo(t);
            }}
            className="px-3 py-2 text-xs text-fg-4 border border-border hover:border-accent hover:text-accent transition-all"
          >
            Mes anterior
          </button>
          <button
            onClick={() => {
              const [f, t] = currentMonthRange();
              setDateFrom(f); setDateTo(t);
            }}
            className="px-3 py-2 text-xs text-fg-4 border border-border hover:border-accent hover:text-accent transition-all"
          >
            Mes actual
          </button>
        </div>
        <button
          onClick={() => load()}
          disabled={!dateFrom || !dateTo}
          className="flex items-center gap-2 bg-accent hover:bg-accent-light text-zinc-900 font-semibold
                     text-xs uppercase tracking-wider px-3 py-2 transition-all hover:shadow-glow ml-auto"
        >
          <RefreshCw size={13} /> Actualizar
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-fg-5 text-sm">
          <Loader2 size={14} className="animate-spin" /> Cargando...
        </div>
      )}

      {!loading && clients.length === 0 && (
        <div className="bg-surface-2 border border-border p-8 text-center text-fg-6 text-sm animate-fade-up">
          No hay registros en este periodo.
        </div>
      )}

      {!loading && clients.map(c => {
        const key = bucketKey(c);
        const machineIds = selectedIds(c);
        return (
          <ClientBlock
            key={key}
            client={c}
            isSelected={(mid) => isSelected(c, mid)}
            onToggle={(mid) => toggleMachine(c, mid)}
            onPreview={() => setPreview({
              clientId: c.client_id,
              clientName: c.client_name,
              machineIds,
              recipients: c.suggested_recipients,
              cc: c.suggested_cc,
            })}
          />
        );
      })}

      {preview && dateFrom && dateTo && (
        <ReportPreviewModal
          clientId={preview.clientId}
          clientName={preview.clientName}
          machineIds={preview.machineIds}
          dateFrom={dateFrom}
          dateTo={dateTo}
          suggestedRecipients={preview.recipients}
          suggestedCc={preview.cc}
          onClose={() => setPreview(null)}
          onSent={() => {
            toast.success("Reporte enviado");
            setPreview(null);
          }}
        />
      )}
    </div>
  );
}

function ClientBlock({
  client,
  isSelected,
  onToggle,
  onPreview,
}: {
  client: RentalReportClientBucket;
  isSelected: (machineId: string) => boolean;
  onToggle: (machineId: string) => void;
  onPreview: () => void;
}) {
  const [open, setOpen] = useState(true);
  const selectedIds = useMemo(
    () => client.machines.filter(m => isSelected(m.machine_id)).map(m => m.machine_id),
    [client.machines, isSelected]
  );
  const selectedTotal = useMemo(
    () => client.machines.filter(m => isSelected(m.machine_id)).reduce((s, m) => s + m.total_value, 0),
    [client.machines, isSelected]
  );

  return (
    <div className="bg-surface-2 border border-border animate-fade-up">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-border bg-surface-3 hover:bg-surface-4 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronDown size={14} className="text-fg-5" /> : <ChevronRight size={14} className="text-fg-5" />}
          <div>
            <div className="text-fg-2 text-sm font-semibold">{client.client_name}</div>
            <div className="text-fg-6 text-[11px]">
              {selectedIds.length}/{client.machines.length} máquinas seleccionadas · destinatarios: {client.suggested_recipients.join(", ") || "sin correo"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-fg-5">Horas: <span className="text-fg-3 font-mono">{client.total_hours.toFixed(1)}</span></span>
          <span className="text-accent font-semibold font-mono">{formatCOP(selectedTotal)}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onPreview(); }}
            disabled={selectedIds.length === 0}
            className="flex items-center gap-1.5 bg-accent hover:bg-accent-light text-zinc-900 font-semibold
                       text-xs uppercase tracking-wider px-3 py-1.5 transition-all hover:shadow-glow
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Eye size={11} /> Preview / Enviar
          </button>
        </div>
      </button>

      {open && (
        <div className="divide-y divide-border">
          {client.machines.map(m => (
            <label
              key={m.machine_id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-surface-3 transition-colors cursor-pointer"
            >
              <input
                type="checkbox"
                checked={isSelected(m.machine_id)}
                onChange={() => onToggle(m.machine_id)}
                className="accent-accent"
              />
              <div className="flex-1 min-w-0">
                <div className="text-fg-2 text-sm">
                  {m.machine_code} · {m.machine_plate}
                  {m.machine_nickname && <span className="text-accent ml-1.5">"{m.machine_nickname}"</span>}
                </div>
                <div className="text-fg-6 text-[11px]">
                  {m.obra || "sin obra"} · {m.readings_count} registros
                </div>
              </div>
              <div className="text-fg-5 text-xs">
                {m.total_hours.toFixed(1)}h
              </div>
              <div className="text-fg-3 text-sm font-mono">
                {formatCOP(m.total_value)}
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
