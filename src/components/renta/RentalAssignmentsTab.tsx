import { useState } from "react";
import { Plus, Pencil, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { api, type RentalAssignmentResponse } from "../../services/api";
import AssignmentModal from "./AssignmentModal";

interface Props {
  machineId: string;
  assignments: RentalAssignmentResponse[];
  onChange: () => void;
}

function formatCOP(v: number | null): string {
  if (v == null) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(v);
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default function RentalAssignmentsTab({ machineId, assignments, onChange }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<RentalAssignmentResponse | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("¿Desactivar esta asignación? Si no tiene fecha fin, se marcará con la fecha de hoy.")) return;
    await api.rental.deleteAssignment(id);
    onChange();
  }

  return (
    <div className="space-y-4">

      <div className="flex items-center justify-between">
        <p className="text-fg-5 text-xs">
          Cada asignación define cliente, obra, tarifa y proyección durante un rango de fechas.
        </p>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-accent hover:bg-accent-light text-zinc-900 font-semibold
                     text-xs uppercase tracking-wider px-3 py-2 transition-all hover:shadow-glow"
        >
          <Plus size={14} /> Nueva asignación
        </button>
      </div>

      <div className="bg-surface-2 border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-border bg-surface-3 text-fg-5 text-[10px] uppercase tracking-wider">
                <th className="text-center px-3 py-2 font-medium">Estado</th>
                <th className="text-left px-3 py-2 font-medium">Cliente</th>
                <th className="text-left px-3 py-2 font-medium">Obra</th>
                <th className="text-left px-3 py-2 font-medium">Operador</th>
                <th className="text-right px-3 py-2 font-medium">Tarifa</th>
                <th className="text-right px-3 py-2 font-medium">Standby h</th>
                <th className="text-center px-3 py-2 font-medium">Corte</th>
                <th className="text-right px-3 py-2 font-medium">Proyección</th>
                <th className="text-center px-3 py-2 font-medium">Inicio</th>
                <th className="text-center px-3 py-2 font-medium">Fin</th>
                <th className="text-right px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assignments.length === 0 && (
                <tr><td colSpan={11} className="text-center py-12 text-fg-6 text-sm">Sin asignaciones</td></tr>
              )}
              {assignments.map(a => (
                <tr key={a.id} className="hover:bg-surface-3 transition-colors">
                  <td className="px-3 py-2 text-center">
                    {a.is_active
                      ? <CheckCircle2 size={13} className="text-emerald-400 inline" />
                      : <XCircle size={13} className="text-fg-6 inline" />}
                  </td>
                  <td className="px-3 py-2 text-fg-3">{a.client_name ?? "—"}</td>
                  <td className="px-3 py-2 text-fg-3">{a.obra || "—"}</td>
                  <td className="px-3 py-2 text-fg-4 text-xs">{a.operator ?? "—"}</td>
                  <td className="px-3 py-2 text-right text-fg-3 font-mono text-xs">{formatCOP(a.rate)}</td>
                  <td className="px-3 py-2 text-right text-fg-4 font-mono text-xs">{a.standby_hours}</td>
                  <td className="px-3 py-2 text-center text-fg-4 text-xs">Día {a.cutoff_day}</td>
                  <td className="px-3 py-2 text-right text-fg-3 font-mono text-xs">{formatCOP(a.monthly_projection)}</td>
                  <td className="px-3 py-2 text-center text-fg-4 text-xs whitespace-nowrap">{formatDate(a.start_date)}</td>
                  <td className="px-3 py-2 text-center text-fg-4 text-xs whitespace-nowrap">{formatDate(a.end_date)}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => { setEditing(a); setShowModal(true); }}
                        className="text-fg-5 hover:text-accent transition-colors p-1"
                      >
                        <Pencil size={12} />
                      </button>
                      {a.is_active && (
                        <button
                          onClick={() => handleDelete(a.id)}
                          className="text-fg-5 hover:text-red-400 transition-colors p-1"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <AssignmentModal
          machineId={machineId}
          assignment={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); onChange(); }}
        />
      )}
    </div>
  );
}
