import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { api, type RentalAssignmentResponse } from "../../services/api";
import DatePicker from "../ui/DatePicker";
import ClientSearchSelect from "../ui/ClientSearchSelect";

interface Props {
  machineId: string;
  assignment: RentalAssignmentResponse | null;
  onClose: () => void;
  onSaved: () => void;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AssignmentModal({ machineId, assignment, onClose, onSaved }: Props) {
  const isEdit = !!assignment;
  const [clientId, setClientId] = useState<string | null>(assignment?.client_id ?? null);
  const [clientName, setClientName] = useState<string | null>(assignment?.client_name ?? null);
  const [obra, setObra] = useState(assignment?.obra ?? "");
  const [operator, setOperator] = useState(assignment?.operator ?? "");
  const [rate, setRate] = useState(assignment?.rate?.toString() ?? "");
  const [standbyHours, setStandbyHours] = useState(String(assignment?.standby_hours ?? 176));
  const [cutoffDay, setCutoffDay] = useState(String(assignment?.cutoff_day ?? 30));
  const [projection, setProjection] = useState(assignment?.monthly_projection?.toString() ?? "");
  const [conditions, setConditions] = useState(assignment?.conditions ?? "");
  const [startDate, setStartDate] = useState<string | null>(assignment?.start_date ?? todayISO());
  const [endDate, setEndDate] = useState<string | null>(assignment?.end_date ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!startDate) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        client_id: clientId,
        client_name_snapshot: clientName,
        obra,
        operator: operator.trim() || null,
        rate: rate ? Number(rate) : null,
        standby_hours: Number(standbyHours) || 176,
        cutoff_day: Number(cutoffDay) || 30,
        monthly_projection: projection ? Number(projection) : null,
        conditions: conditions.trim() || null,
        start_date: startDate,
        end_date: endDate || null,
      };
      if (isEdit && assignment) {
        await api.rental.updateAssignment(assignment.id, payload);
      } else {
        await api.rental.createAssignment(machineId, payload);
      }
      onSaved();
    } catch (e: any) {
      setError(e?.detail ?? "Error al guardar");
    } finally {
      setSaving(false);
    }
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
          <h2 className="text-fg font-semibold text-sm">{isEdit ? "Editar asignación" : "Nueva asignación"}</h2>
          <button onClick={onClose} className="text-fg-5 hover:text-fg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium">Cliente</label>
              <ClientSearchSelect
                value={clientId}
                displayValue={clientName}
                onSelect={(c) => {
                  setClientId(c?.id ?? null);
                  setClientName(c?.name ?? null);
                }}
                placeholder="Buscar cliente..."
                compact
              />
            </div>
            <Field label="Obra" value={obra} onChange={setObra} placeholder="Chinu, Vitrio..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Operador" value={operator} onChange={setOperator} />
            <Field label="Tarifa por hora" value={rate} onChange={setRate} type="number" placeholder="65000" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Standby (h mensuales)" value={standbyHours} onChange={setStandbyHours} type="number" />
            <Field label="Día de corte (1-31)" value={cutoffDay} onChange={setCutoffDay} type="number" />
            <Field label="Proyección mes" value={projection} onChange={setProjection} type="number" placeholder="11440000" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium">Fecha inicio</label>
              <DatePicker value={startDate} onChange={setStartDate} compact />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium">Fecha fin (opcional)</label>
              <DatePicker value={endDate} onChange={setEndDate} compact />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium">Condiciones / observaciones</label>
            <textarea
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              rows={2}
              className="bg-surface-3 border border-border text-sm text-fg-2 px-3 py-2 outline-none focus:border-accent resize-none"
            />
          </div>

          {error && (
            <div className="text-red-400 text-xs bg-red-950/30 border border-red-900/40 px-3 py-2">{error}</div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-xs text-fg-4 border border-border hover:border-border-light transition-all">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={saving || !startDate}
            className="px-4 py-2 text-xs font-semibold bg-accent hover:bg-accent-light text-zinc-900 transition-all hover:shadow-glow disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Field({
  label, value, onChange, type = "text", placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-surface-3 border border-border text-sm text-fg-2 px-3 py-2 outline-none focus:border-accent placeholder:text-fg-6"
      />
    </div>
  );
}
