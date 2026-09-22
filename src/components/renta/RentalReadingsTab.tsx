import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Paperclip, FileText, CheckCircle2, XCircle, ChevronDown, ChevronRight, Send } from "lucide-react";
import {
  api,
  type RentalAssignmentResponse,
  type RentalReadingResponse,
} from "../../services/api";
import NewReadingModal from "./NewReadingModal";
import ReadingAttachmentsPopover from "./ReadingAttachmentsPopover";
import ReportPreviewModal from "./ReportPreviewModal";
import { toast } from "sonner";

interface Props {
  machineId: string;
  assignments: RentalAssignmentResponse[];
  currentAssignment: RentalAssignmentResponse | null;
  onChange: () => void;
}

const MONTH_LABELS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function formatCOP(v: number | null | undefined): string {
  if (v == null) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP",
    maximumFractionDigits: 0,
  }).format(v);
}

function formatDate(d: string): string {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function formatDateShort(d: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y.slice(-2)}`;
}

type MonthGroup = {
  key: string;
  year: number;
  month: number;
  label: string;
  items: RentalReadingResponse[];
  totalHours: number;
  totalValue: number;
};

type AssignmentGroup = {
  assignment: RentalAssignmentResponse;
  months: MonthGroup[];
  totalHours: number;
  totalValue: number;
  itemsCount: number;
};

export default function RentalReadingsTab({ machineId, assignments, currentAssignment, onChange }: Props) {
  const [readings, setReadings] = useState<RentalReadingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [openAttachments, setOpenAttachments] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [reportContext, setReportContext] = useState<{
    assignmentId: string;
    clientId: string | null;
    clientName: string;
    dateFrom: string;
    dateTo: string;
    recipients: string[];
  } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.rental.listReadings(machineId);
      setReadings(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [machineId]);

  // Agrupar por asignación → mes
  const groups = useMemo<AssignmentGroup[]>(() => {
    // 1. Buckets por asignación
    const byAssignment = new Map<string, RentalReadingResponse[]>();
    for (const a of assignments) byAssignment.set(a.id, []);
    for (const r of readings) {
      if (!byAssignment.has(r.assignment_id)) byAssignment.set(r.assignment_id, []);
      byAssignment.get(r.assignment_id)!.push(r);
    }

    // 2. Para cada asignación, sub-agrupar por mes
    const result: AssignmentGroup[] = [];
    for (const a of assignments) {
      const items = byAssignment.get(a.id) ?? [];
      if (items.length === 0) continue;

      const byMonth = new Map<string, RentalReadingResponse[]>();
      for (const r of items) {
        const [y, m] = r.date.split("-");
        const key = `${y}-${m}`;
        if (!byMonth.has(key)) byMonth.set(key, []);
        byMonth.get(key)!.push(r);
      }
      const months: MonthGroup[] = Array.from(byMonth.entries())
        .sort((x, y) => y[0].localeCompare(x[0]))
        .map(([key, monthItems]) => {
          const [y, m] = key.split("-").map(Number);
          const totalHours = monthItems.reduce((s, r) => s + (Number(r.hours) || 0), 0);
          const totalValue = monthItems.reduce((s, r) => s + (Number(r.total_value) || 0), 0);
          return {
            key,
            year: y,
            month: m,
            label: `${MONTH_LABELS[m - 1]} ${y}`,
            items: monthItems.sort((a, b) => a.date.localeCompare(b.date)),
            totalHours,
            totalValue,
          };
        });

      result.push({
        assignment: a,
        months,
        totalHours: months.reduce((s, m) => s + m.totalHours, 0),
        totalValue: months.reduce((s, m) => s + m.totalValue, 0),
        itemsCount: items.length,
      });
    }
    // Ordenar por start_date desc (más recientes primero)
    return result.sort((a, b) => b.assignment.start_date.localeCompare(a.assignment.start_date));
  }, [readings, assignments]);

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este registro?")) return;
    await api.rental.deleteReading(id);
    load();
    onChange();
  }

  function toggleCollapse(key: string) {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="space-y-4">

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="text-fg-5 text-xs">
          {currentAssignment
            ? <>Asignación actual: <span className="text-fg-3">{currentAssignment.client_name ?? "sin cliente"}</span> · <span className="text-fg-4">{currentAssignment.obra || "sin obra"}</span></>
            : assignments.length > 0
              ? <>Sin asignación vigente hoy — puedes registrar para asignaciones históricas</>
              : <span className="text-amber-300">Sin asignaciones — crea una en Configuración antes de registrar horas</span>}
        </div>
        <button
          onClick={() => setShowNew(true)}
          disabled={assignments.length === 0}
          className="flex items-center gap-2 bg-accent hover:bg-accent-light text-zinc-900 font-semibold
                     text-xs uppercase tracking-wider px-3 py-2 transition-all hover:shadow-glow
                     disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
        >
          <Plus size={14} /> Nuevo registro
        </button>
      </div>

      {loading && <div className="text-fg-6 text-sm">Cargando...</div>}

      {!loading && groups.length === 0 && (
        <div className="bg-surface-2 border border-border p-8 text-center text-fg-6 text-sm">
          Sin registros aún. Crea el primero con el botón arriba.
        </div>
      )}

      {!loading && groups.map(g => {
        const isCollapsed = collapsed[g.assignment.id];
        return (
        <div key={g.assignment.id} className="bg-surface-2 border border-border overflow-hidden">
          {/* Assignment header */}
          <button
            onClick={() => toggleCollapse(g.assignment.id)}
            className="w-full flex items-center justify-between px-4 py-3 border-b border-border bg-surface-3 hover:bg-surface-4 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              {isCollapsed ? <ChevronRight size={14} className="text-fg-5" /> : <ChevronDown size={14} className="text-fg-5" />}
              {g.assignment.is_active
                ? <CheckCircle2 size={13} className="text-emerald-400" />
                : <XCircle size={13} className="text-fg-6" />}
              <div>
                <div className="text-fg-2 text-sm font-semibold">
                  {g.assignment.client_name ?? "Sin cliente"} · {g.assignment.obra || "sin obra"}
                </div>
                <div className="text-fg-6 text-[11px]">
                  {formatDateShort(g.assignment.start_date)} → {g.assignment.end_date ? formatDateShort(g.assignment.end_date) : "hoy"}
                  {g.assignment.rate != null && <> · Tarifa {formatCOP(g.assignment.rate)}</>}
                  {" · "}{g.itemsCount} registros
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-fg-5">
                Horas: <span className="text-fg-3 font-mono">{g.totalHours.toFixed(1)}</span>
                <span className="text-fg-6"> / {g.assignment.standby_hours} stand-by</span>
              </span>
              <span className="text-accent font-semibold font-mono">{formatCOP(g.totalValue)}</span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  if (g.itemsCount === 0) return;
                  const allItems = g.months.flatMap(m => m.items);
                  const dates = allItems.map(r => r.date).sort();
                  setReportContext({
                    assignmentId: g.assignment.id,
                    clientId: g.assignment.client_id,
                    clientName: g.assignment.client_name ?? "Cliente",
                    dateFrom: dates[0],
                    dateTo: dates[dates.length - 1],
                    recipients: [],
                  });
                }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.click(); } }}
                className={`inline-flex items-center gap-1 border text-xs font-medium px-2 py-1 transition-all
                  ${g.itemsCount === 0
                    ? "border-border text-fg-6 cursor-not-allowed opacity-40"
                    : "border-accent/40 text-accent hover:bg-accent/10 cursor-pointer"}`}
              >
                <Send size={10} /> Enviar reporte
              </span>
            </div>
          </button>

          {/* Months */}
          {!isCollapsed && g.months.map((mg, idx) => (
            <div key={mg.key} className={idx > 0 ? "border-t border-border" : ""}>
              {/* Readings table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead>
                    <tr className="border-b border-border text-fg-5 text-[10px] uppercase tracking-wider">
                      <th className="text-left px-3 py-2 font-medium">Fecha</th>
                      <th className="text-left px-3 py-2 font-medium">Horómetro</th>
                      <th className="text-right px-3 py-2 font-medium">Horas</th>
                      <th className="text-right px-3 py-2 font-medium">Tarifa</th>
                      <th className="text-right px-3 py-2 font-medium">Total</th>
                      <th className="text-left px-3 py-2 font-medium">Recibo</th>
                      <th className="text-left px-3 py-2 font-medium">Observaciones</th>
                      <th className="text-center px-3 py-2 font-medium">Fact.</th>
                      <th className="text-right px-3 py-2 font-medium">Adj.</th>
                      <th className="text-right px-3 py-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {mg.items.map(r => (
                      <tr key={r.id} className="hover:bg-surface-3 transition-colors">
                        <td className="px-3 py-2 text-fg-3 text-xs whitespace-nowrap">{formatDate(r.date)}</td>
                        <td className="px-3 py-2 text-fg-4 text-xs font-mono">
                          {r.horometer_start != null && r.horometer_end != null
                            ? `${Number(r.horometer_start).toFixed(1)} → ${Number(r.horometer_end).toFixed(1)}`
                            : <span className="text-fg-6">—</span>}
                        </td>
                        <td className="px-3 py-2 text-right text-fg-3 text-xs font-mono">
                          {r.hours != null ? Number(r.hours).toFixed(1) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right text-fg-4 text-xs font-mono">
                          {r.unit_value != null ? formatCOP(r.unit_value) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right text-fg-2 text-xs font-mono font-semibold">
                          {r.total_value != null ? formatCOP(r.total_value) : "—"}
                        </td>
                        <td className="px-3 py-2 text-fg-4 text-xs font-mono">{r.receipt_number ?? "—"}</td>
                        <td className="px-3 py-2 text-fg-5 text-xs truncate max-w-[200px]">{r.observations ?? "—"}</td>
                        <td className="px-3 py-2 text-center">
                          {r.has_invoice
                            ? <FileText size={12} className="text-emerald-400 inline" />
                            : <span className="text-fg-6 text-xs">—</span>}
                        </td>
                        <td className="px-3 py-2 text-right relative">
                          <button
                            onClick={() => setOpenAttachments(openAttachments === r.id ? null : r.id)}
                            className="inline-flex items-center gap-1 text-fg-4 hover:text-accent transition-colors text-xs"
                          >
                            <Paperclip size={12} />
                            {r.attachments.length}
                          </button>
                          {openAttachments === r.id && (
                            <ReadingAttachmentsPopover
                              reading={r}
                              onClose={() => setOpenAttachments(null)}
                              onChange={load}
                            />
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="text-fg-5 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
        );
      })}

      {showNew && assignments.length > 0 && (
        <NewReadingModal
          assignments={assignments}
          initialAssignment={currentAssignment ?? assignments[0]}
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); load(); onChange(); }}
        />
      )}

      {reportContext && (
        <ReportPreviewModal
          clientId={reportContext.clientId}
          clientName={reportContext.clientName}
          machineIds={[machineId]}
          dateFrom={reportContext.dateFrom}
          dateTo={reportContext.dateTo}
          suggestedRecipients={reportContext.recipients}
          suggestedCc={[]}
          onClose={() => setReportContext(null)}
          onSent={() => {
            toast.success("Reporte enviado");
            setReportContext(null);
          }}
        />
      )}
    </div>
  );
}
