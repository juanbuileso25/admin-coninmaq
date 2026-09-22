import { useEffect, useState } from "react";
import { Plus, Trash2, Paperclip, Wrench, Shield } from "lucide-react";
import { api, type RentalMaintenanceResponse } from "../../services/api";
import MaintenanceModal from "./MaintenanceModal";
import MaintenanceAttachmentsPopover from "./MaintenanceAttachmentsPopover";

interface Props {
  machineId: string;
}

function formatDate(d: string): string {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function formatCOP(v: number | null): string {
  if (v == null) return "—";
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
}

export default function RentalMaintenancesTab({ machineId }: Props) {
  const [items, setItems] = useState<RentalMaintenanceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<RentalMaintenanceResponse | null>(null);
  const [openAttachments, setOpenAttachments] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setItems(await api.rental.listMaintenances(machineId));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [machineId]);

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este mantenimiento?")) return;
    await api.rental.deleteMaintenance(id);
    load();
  }

  return (
    <div className="space-y-4">

      <div className="flex items-center justify-between">
        <p className="text-fg-5 text-xs">Historial de intervenciones (preventivos cada 250h + correctivos según falla).</p>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-accent hover:bg-accent-light text-zinc-900 font-semibold
                     text-xs uppercase tracking-wider px-3 py-2 transition-all hover:shadow-glow"
        >
          <Plus size={14} /> Nueva intervención
        </button>
      </div>

      <div className="bg-surface-2 border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-border bg-surface-3 text-fg-5 text-[10px] uppercase tracking-wider">
                <th className="text-center px-3 py-2 font-medium">Tipo</th>
                <th className="text-left px-3 py-2 font-medium">Fecha</th>
                <th className="text-right px-3 py-2 font-medium">Horómetro</th>
                <th className="text-left px-3 py-2 font-medium">Ubicación</th>
                <th className="text-left px-3 py-2 font-medium">Falla</th>
                <th className="text-left px-3 py-2 font-medium">Servicio</th>
                <th className="text-left px-3 py-2 font-medium">Taller</th>
                <th className="text-right px-3 py-2 font-medium">Costo</th>
                <th className="text-right px-3 py-2 font-medium">Adj.</th>
                <th className="text-right px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr><td colSpan={10} className="text-center py-8 text-fg-6 text-sm">Cargando...</td></tr>
              )}
              {!loading && items.length === 0 && (
                <tr><td colSpan={10} className="text-center py-12 text-fg-6 text-sm">Sin mantenimientos</td></tr>
              )}
              {items.map(m => (
                <tr key={m.id} className="hover:bg-surface-3 transition-colors">
                  <td className="px-3 py-2 text-center">
                    {m.kind === "preventive"
                      ? <span title="Preventivo" className="inline-flex text-blue-300"><Shield size={13} /></span>
                      : <span title="Correctivo" className="inline-flex text-amber-300"><Wrench size={13} /></span>}
                  </td>
                  <td className="px-3 py-2 text-fg-3 text-xs whitespace-nowrap">{formatDate(m.date)}</td>
                  <td className="px-3 py-2 text-right text-fg-4 font-mono text-xs">
                    {m.horometer != null ? Number(m.horometer).toFixed(1) : "—"}
                  </td>
                  <td className="px-3 py-2 text-fg-4 text-xs">{m.location ?? "—"}</td>
                  <td className="px-3 py-2 text-fg-3 text-xs">{m.fault ?? "—"}</td>
                  <td className="px-3 py-2 text-fg-3 text-xs">{m.service ?? "—"}</td>
                  <td className="px-3 py-2 text-fg-4 text-xs">{m.workshop ?? "—"}</td>
                  <td className="px-3 py-2 text-right text-fg-3 font-mono text-xs">{formatCOP(m.cost)}</td>
                  <td className="px-3 py-2 text-right relative">
                    <button
                      onClick={() => setOpenAttachments(openAttachments === m.id ? null : m.id)}
                      className="inline-flex items-center gap-1 text-fg-4 hover:text-accent transition-colors text-xs"
                    >
                      <Paperclip size={12} />
                      {m.attachments.length}
                    </button>
                    {openAttachments === m.id && (
                      <MaintenanceAttachmentsPopover
                        maintenance={m}
                        onClose={() => setOpenAttachments(null)}
                        onChange={load}
                      />
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => handleDelete(m.id)} className="text-fg-5 hover:text-red-400 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <MaintenanceModal
          machineId={machineId}
          maintenance={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}
