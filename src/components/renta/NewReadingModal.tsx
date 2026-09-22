import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Upload, Trash2, Paperclip } from "lucide-react";
import {
  api,
  type RentalAssignmentResponse,
  type RentalReadingPrefill,
} from "../../services/api";
import DatePicker from "../ui/DatePicker";
import Select from "../ui/Select";

type QueuedFile = { file: File; kind: string };

const KIND_OPTIONS = [
  { value: "horometer_photo", label: "Foto horómetro" },
  { value: "receipt",         label: "Recibo" },
  { value: "invoice",         label: "Factura" },
  { value: "other",           label: "Otro" },
];

const KIND_LABELS: Record<string, string> = Object.fromEntries(
  KIND_OPTIONS.map(o => [o.value, o.label])
);

interface Props {
  assignments: RentalAssignmentResponse[];
  initialAssignment: RentalAssignmentResponse;
  onClose: () => void;
  onCreated: () => void;
}

function formatNum(v: number): string {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(v);
}

function formatDateShort(d: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y.slice(-2)}`;
}

// Devuelve la asignación cuyo rango contiene `date`, o null
function findAssignmentForDate(
  assignments: RentalAssignmentResponse[],
  date: string,
): RentalAssignmentResponse | null {
  return assignments.find(a => {
    if (a.start_date > date) return false;
    if (a.end_date && a.end_date < date) return false;
    return true;
  }) ?? null;
}

export default function NewReadingModal({ assignments, initialAssignment, onClose, onCreated }: Props) {
  const [assignmentId, setAssignmentId] = useState<string>(initialAssignment.id);
  const [prefill, setPrefill] = useState<RentalReadingPrefill | null>(null);
  const [loadingPrefill, setLoadingPrefill] = useState(true);
  const [date, setDate] = useState<string | null>(null);
  const [dateManuallyChanged, setDateManuallyChanged] = useState(false);
  const [assignmentManuallyChanged, setAssignmentManuallyChanged] = useState(false);
  const [horometerStart, setHorometerStart] = useState("");
  const [horometerEnd, setHorometerEnd] = useState("");
  const [unitValue, setUnitValue] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [observations, setObservations] = useState("");
  const [hasInvoice, setHasInvoice] = useState(false);
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [nextKind, setNextKind] = useState<string>("horometer_photo");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const assignment = useMemo(
    () => assignments.find(a => a.id === assignmentId) ?? initialAssignment,
    [assignments, assignmentId, initialAssignment],
  );

  const assignmentOptions = useMemo(
    () => assignments.map(a => ({
      value: a.id,
      label: `${a.client_name ?? "Sin cliente"} · ${a.obra || "Sin obra"} (${formatDateShort(a.start_date)} → ${a.end_date ? formatDateShort(a.end_date) : "hoy"})${a.is_active ? "" : " · inactiva"}`,
    })),
    [assignments],
  );

  // Cargar prefill cada vez que cambia la asignación
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingPrefill(true);
      try {
        const p = await api.rental.readingPrefill(assignmentId);
        if (cancelled) return;
        setPrefill(p);
        // Solo sobrescribir fecha si el usuario no la ha tocado
        if (!dateManuallyChanged) setDate(p.suggested_date);
        setHorometerStart(p.suggested_horometer_start != null ? String(p.suggested_horometer_start) : "");
        setUnitValue(p.suggested_unit_value != null ? String(p.suggested_unit_value) : "");
      } finally {
        if (!cancelled) setLoadingPrefill(false);
      }
    })();
    return () => { cancelled = true; };
  }, [assignmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cuando cambia la fecha, auto-seleccionar asignación que la contenga (a menos que el usuario la haya cambiado manualmente)
  useEffect(() => {
    if (!date) return;
    if (assignmentManuallyChanged) return;
    const match = findAssignmentForDate(assignments, date);
    if (match && match.id !== assignmentId) {
      setAssignmentId(match.id);
    }
  }, [date, assignments, assignmentId, assignmentManuallyChanged]);

  const computedHours: number | null = (() => {
    const s = Number(horometerStart);
    const e = Number(horometerEnd);
    if (horometerStart && horometerEnd && !isNaN(s) && !isNaN(e) && e >= s) return e - s;
    return null;
  })();

  const computedTotal: number | null = (() => {
    if (computedHours == null || !unitValue) return null;
    return computedHours * Number(unitValue);
  })();

  // Advertencia: la fecha no cae dentro del rango de la asignación seleccionada
  const dateOutOfRange = (() => {
    if (!date) return false;
    if (date < assignment.start_date) return true;
    if (assignment.end_date && date > assignment.end_date) return true;
    return false;
  })();

  async function handleSave() {
    if (!date) return;
    setSaving(true);
    setError(null);
    try {
      const created = await api.rental.createReading({
        assignment_id: assignmentId,
        date,
        horometer_start: horometerStart ? Number(horometerStart) : null,
        horometer_end: horometerEnd ? Number(horometerEnd) : null,
        hours: computedHours,
        unit_value: unitValue ? Number(unitValue) : null,
        receipt_number: receiptNumber.trim() || null,
        observations: observations.trim() || null,
        has_invoice: hasInvoice,
      });
      // Subir adjuntos encolados
      for (const q of queuedFiles) {
        try {
          await api.rental.uploadReadingAttachment(created.id, q.file, q.kind);
        } catch (err) {
          console.error("[Rental] Error subiendo adjunto", q.file.name, err);
        }
      }
      onCreated();
    } catch (e: any) {
      setError(e?.detail ?? "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  function addFile(file: File) {
    setQueuedFiles(prev => [...prev, { file, kind: nextKind }]);
  }
  function removeFile(idx: number) {
    setQueuedFiles(prev => prev.filter((_, i) => i !== idx));
  }
  function updateFileKind(idx: number, kind: string) {
    setQueuedFiles(prev => prev.map((q, i) => i === idx ? { ...q, kind } : q));
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-surface-2 border border-border w-full max-w-2xl animate-fade-up max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-fg font-semibold text-sm">Nuevo registro</h2>
            <p className="text-fg-6 text-xs">Selecciona la fecha y la asignación (cliente/obra) a la que aplica</p>
          </div>
          <button onClick={onClose} className="text-fg-5 hover:text-fg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Fecha + Asignación */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium">Fecha</label>
              <DatePicker
                value={date}
                onChange={(v) => { setDate(v); setDateManuallyChanged(true); }}
                compact
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium">Asignación (cliente / obra)</label>
              <Select
                value={assignmentId}
                onChange={(v) => { setAssignmentId(v); setAssignmentManuallyChanged(true); }}
                options={assignmentOptions}
                compact
              />
            </div>
          </div>

          {dateOutOfRange && (
            <div className="text-amber-300 text-xs bg-amber-950/30 border border-amber-900/40 px-3 py-2">
              ⚠ La fecha no cae dentro del rango de esta asignación ({formatDateShort(assignment.start_date)} → {assignment.end_date ? formatDateShort(assignment.end_date) : "hoy"}).
            </div>
          )}

          {/* Tarifa + N° recibo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium">
                Tarifa por hora {prefill?.suggested_unit_value != null && <span className="text-fg-6 normal-case ml-1">(sugerido {formatNum(prefill.suggested_unit_value)})</span>}
              </label>
              <input
                type="number"
                step="0.01"
                value={unitValue}
                onChange={(e) => setUnitValue(e.target.value)}
                className="bg-surface-3 border border-border text-sm text-fg-2 px-3 py-2 outline-none focus:border-accent"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium">
                N° recibo {prefill?.last_receipt_number && <span className="text-fg-6 normal-case ml-1">(último {prefill.last_receipt_number})</span>}
              </label>
              <input
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                className="bg-surface-3 border border-border text-sm text-fg-2 px-3 py-2 outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Horómetro */}
          <div className="border border-border">
            <div className="grid grid-cols-3 border-b border-border bg-surface-3">
              <div className="px-3 py-2 text-[10px] font-semibold text-fg-4 uppercase tracking-wide border-r border-border">
                Horómetro inicial
                {prefill?.suggested_horometer_start != null && <span className="block text-fg-6 normal-case font-normal">sugerido {prefill.suggested_horometer_start}</span>}
              </div>
              <div className="px-3 py-2 text-[10px] font-semibold text-fg-4 uppercase tracking-wide border-r border-border">Horómetro final</div>
              <div className="px-3 py-2 text-[10px] font-semibold text-fg-4 uppercase tracking-wide">Horas</div>
            </div>
            <div className="grid grid-cols-3">
              <input
                type="number" step="0.1" value={horometerStart}
                onChange={(e) => setHorometerStart(e.target.value)}
                className="w-full bg-transparent text-sm text-fg-2 px-3 py-2 outline-none focus:bg-surface-3 border-r border-border"
              />
              <input
                type="number" step="0.1" value={horometerEnd}
                onChange={(e) => setHorometerEnd(e.target.value)}
                className="w-full bg-transparent text-sm text-fg-2 px-3 py-2 outline-none focus:bg-surface-3 border-r border-border"
              />
              <div className="px-3 py-2 text-sm font-semibold text-accent">
                {computedHours != null ? computedHours.toFixed(1) : <span className="text-fg-6">—</span>}
              </div>
            </div>
          </div>

          {/* Factura */}
          <label className="flex items-center gap-2 text-xs text-fg-4 cursor-pointer">
            <input
              type="checkbox"
              checked={hasInvoice}
              onChange={(e) => setHasInvoice(e.target.checked)}
              className="accent-accent"
            />
            Ya tiene factura
          </label>

          {/* Observaciones */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium">Observaciones</label>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={2}
              className="bg-surface-3 border border-border text-sm text-fg-2 px-3 py-2 outline-none focus:border-accent resize-none"
            />
          </div>

          {/* Adjuntos */}
          <div className="border border-border">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface-3">
              <div className="flex items-center gap-2 text-fg-4 text-xs font-medium">
                <Paperclip size={12} />
                Adjuntos ({queuedFiles.length})
              </div>
              <div className="flex items-center gap-2">
                <div className="w-40">
                  <Select value={nextKind} onChange={setNextKind} options={KIND_OPTIONS} compact />
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) addFile(f);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 bg-accent/10 border border-accent/40 text-accent text-xs font-semibold px-2.5 py-1.5 hover:bg-accent/20 transition-all"
                >
                  <Upload size={11} /> Subir
                </button>
              </div>
            </div>
            {queuedFiles.length === 0 ? (
              <div className="px-3 py-4 text-center text-fg-6 text-xs">
                Sin adjuntos. Puedes subir foto del horómetro, recibo o factura.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {queuedFiles.map((q, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-2 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="text-fg-2 truncate">{q.file.name}</div>
                      <div className="text-fg-6 text-[10px]">
                        {(q.file.size / 1024).toFixed(1)} KB · {KIND_LABELS[q.kind]}
                      </div>
                    </div>
                    <div className="w-32">
                      <Select value={q.kind} onChange={(v) => updateFileKind(idx, v)} options={KIND_OPTIONS} compact />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-fg-5 hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total previsualizado */}
          {computedTotal != null && (
            <div className="bg-surface-3 border border-border px-4 py-3 flex items-center justify-between">
              <span className="text-fg-5 text-xs uppercase tracking-wider">Total</span>
              <span className="text-accent text-lg font-semibold font-mono">
                {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(computedTotal)}
              </span>
            </div>
          )}

          {loadingPrefill && (
            <div className="flex items-center gap-2 text-fg-6 text-xs">
              <Loader2 size={12} className="animate-spin" /> Actualizando sugerencias...
            </div>
          )}

          {error && (
            <div className="text-red-400 text-xs bg-red-950/30 border border-red-900/40 px-3 py-2">{error}</div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-fg-4 border border-border hover:border-border-light transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !date}
            className="px-4 py-2 text-xs font-semibold bg-accent hover:bg-accent-light text-zinc-900 transition-all hover:shadow-glow disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Guardando..." : "Guardar registro"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
