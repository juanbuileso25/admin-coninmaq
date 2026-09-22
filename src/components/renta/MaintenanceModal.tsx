import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Upload, Trash2, Paperclip, ExternalLink } from "lucide-react";
import { api, type RentalMaintenanceResponse } from "../../services/api";
import DatePicker from "../ui/DatePicker";

interface Props {
  machineId: string;
  maintenance: RentalMaintenanceResponse | null;
  onClose: () => void;
  onSaved: () => void;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function MaintenanceModal({ machineId, maintenance, onClose, onSaved }: Props) {
  const isEdit = !!maintenance;
  const [date, setDate] = useState<string | null>(maintenance?.date ?? todayISO());
  const [horometer, setHorometer] = useState(maintenance?.horometer?.toString() ?? "");
  const [location, setLocation] = useState(maintenance?.location ?? "");
  const [fault, setFault] = useState(maintenance?.fault ?? "");
  const [service, setService] = useState(maintenance?.service ?? "");
  const [workshop, setWorkshop] = useState(maintenance?.workshop ?? "");
  const [kind, setKind] = useState<"preventive" | "corrective">(
    (maintenance?.kind as "preventive" | "corrective") ?? "corrective"
  );
  const [cost, setCost] = useState(maintenance?.cost?.toString() ?? "");
  const [notes, setNotes] = useState(maintenance?.notes ?? "");
  const [existingAttachments, setExistingAttachments] = useState(maintenance?.attachments ?? []);
  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSave() {
    if (!date) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        date,
        horometer: horometer ? Number(horometer) : null,
        location: location.trim() || null,
        fault: fault.trim() || null,
        service: service.trim() || null,
        workshop: workshop.trim() || null,
        kind,
        cost: cost ? Number(cost) : null,
        notes: notes.trim() || null,
      };
      let targetId: string;
      if (isEdit && maintenance) {
        await api.rental.updateMaintenance(maintenance.id, payload);
        targetId = maintenance.id;
      } else {
        const created = await api.rental.createMaintenance(machineId, payload);
        targetId = created.id;
      }
      // Subir adjuntos encolados
      for (const f of queuedFiles) {
        try {
          await api.rental.uploadMaintenanceAttachment(targetId, f);
        } catch (err) {
          console.error("[Rental] Error subiendo adjunto", f.name, err);
        }
      }
      onSaved();
    } catch (e: any) {
      setError(e?.detail ?? "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteExisting(attachmentId: string) {
    if (!confirm("¿Eliminar este archivo?")) return;
    await api.rental.deleteMaintenanceAttachment(attachmentId);
    setExistingAttachments(prev => prev.filter(a => a.id !== attachmentId));
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
          <h2 className="text-fg font-semibold text-sm">{isEdit ? "Editar mantenimiento" : "Nueva intervención"}</h2>
          <button onClick={onClose} className="text-fg-5 hover:text-fg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            {(["preventive", "corrective"] as const).map(k => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`px-3 py-1.5 text-xs font-medium border transition-all
                  ${kind === k
                    ? "bg-accent/10 border-accent text-accent"
                    : "border-border text-fg-4 hover:border-border-light"}`}
              >
                {k === "preventive" ? "Preventivo" : "Correctivo"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium">Fecha</label>
              <DatePicker value={date} onChange={setDate} compact />
            </div>
            <Field label="Horómetro" value={horometer} onChange={setHorometer} type="number" placeholder="1426.1" />
            <Field label="Costo" value={cost} onChange={setCost} type="number" placeholder="0" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Ubicación" value={location} onChange={setLocation} placeholder="Copacabana, Porce..." />
            <Field label="Taller / Mecánico" value={workshop} onChange={setWorkshop} placeholder="CONINMAQ" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium">Falla detectada</label>
            <textarea
              value={fault}
              onChange={(e) => setFault(e.target.value)}
              rows={2}
              placeholder="Revisión inyección, cambio 4 llantas..."
              className="bg-surface-3 border border-border text-sm text-fg-2 px-3 py-2 outline-none focus:border-accent resize-none placeholder:text-fg-6"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium">Servicio realizado</label>
            <textarea
              value={service}
              onChange={(e) => setService(e.target.value)}
              rows={3}
              placeholder="Se cambia bomba de inyección, mtto preventivo 250h..."
              className="bg-surface-3 border border-border text-sm text-fg-2 px-3 py-2 outline-none focus:border-accent resize-none placeholder:text-fg-6"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium">Notas adicionales</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="bg-surface-3 border border-border text-sm text-fg-2 px-3 py-2 outline-none focus:border-accent resize-none"
            />
          </div>

          {/* Adjuntos */}
          <div className="border border-border">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface-3">
              <div className="flex items-center gap-2 text-fg-4 text-xs font-medium">
                <Paperclip size={12} />
                Adjuntos ({existingAttachments.length + queuedFiles.length})
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setQueuedFiles(prev => [...prev, f]);
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
            {existingAttachments.length === 0 && queuedFiles.length === 0 ? (
              <div className="px-3 py-4 text-center text-fg-6 text-xs">
                Sin adjuntos. Puedes subir fotos, cotizaciones, informes técnicos.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {existingAttachments.map(att => (
                  <div key={att.id} className="flex items-center gap-2 px-3 py-2 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="text-fg-2 truncate">{att.file_name}</div>
                      <div className="text-fg-6 text-[10px]">Ya subido</div>
                    </div>
                    <a href={att.file_url} target="_blank" rel="noreferrer" className="text-fg-5 hover:text-accent transition-colors p-1">
                      <ExternalLink size={12} />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDeleteExisting(att.id)}
                      className="text-fg-5 hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                {queuedFiles.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-2 text-xs bg-accent/5">
                    <div className="flex-1 min-w-0">
                      <div className="text-fg-2 truncate">{f.name}</div>
                      <div className="text-fg-6 text-[10px]">
                        {(f.size / 1024).toFixed(1)} KB · pendiente de subir
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQueuedFiles(prev => prev.filter((_, i) => i !== idx))}
                      className="text-fg-5 hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="text-red-400 text-xs bg-red-950/30 border border-red-900/40 px-3 py-2">{error}</div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-xs text-fg-4 border border-border hover:border-border-light transition-all">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={saving || !date}
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
