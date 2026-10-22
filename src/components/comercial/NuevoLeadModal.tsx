import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, UserPlus, Radio } from "lucide-react";
import { toast } from "sonner";
import { api, type LeadChannelResponse } from "../../services/api";

interface Props {
  onClose: () => void;
  onCreated: (leadId: number) => void;
}

export default function NuevoLeadModal({ onClose, onCreated }: Props) {
  const [channels, setChannels] = useState<LeadChannelResponse[]>([]);
  const [channelId, setChannelId] = useState<string>("");

  const [name, setName]           = useState("");
  const [phone, setPhone]         = useState("");
  const [email, setEmail]         = useState("");
  const [company, setCompany]     = useState("");
  const [interest, setInterest]   = useState("");
  const [notes, setNotes]         = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.leadChannels.list(true).then(cs => {
      setChannels(cs);
      // Default: Oficina presencial (si existe), si no el primero disponible
      const office = cs.find(c => c.code === "oficina_presencial");
      if (office) setChannelId(String(office.id));
      else if (cs.length > 0) setChannelId(String(cs[0].id));
    }).catch(() => {});
  }, []);

  const submit = async () => {
    if (!channelId) { toast.error("Elegí un canal de origen"); return; }
    if (!name.trim() && !phone.trim() && !email.trim() && !company.trim()) {
      toast.error("Agregá al menos nombre, teléfono, email o empresa");
      return;
    }
    setSaving(true);
    try {
      const lead = await api.bot.createManualLead({
        channel_id: parseInt(channelId, 10),
        name: name.trim() || undefined,
        phone_number: phone.trim() || undefined,
        email: email.trim() || undefined,
        company: company.trim() || undefined,
        equipment_interest: interest.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success("Lead creado");
      onCreated(lead.id);
    } catch (e: any) {
      toast.error(e?.detail ?? "No se pudo crear el lead");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={saving ? undefined : onClose} />
      <div className="relative bg-surface-2 border border-border w-full max-w-xl max-h-[92vh] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <h2 className="text-fg font-semibold text-sm flex items-center gap-2">
            <UserPlus size={15} className="text-accent" /> Nuevo lead
          </h2>
          <button onClick={onClose} disabled={saving} className="text-fg-5 hover:text-fg disabled:opacity-40">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Canal obligatorio */}
          <Field label="Canal de origen *" help="Obligatorio para que entre a las métricas correctas.">
            <div className="flex items-center gap-2">
              <Radio size={14} className="text-accent shrink-0" />
              <select
                value={channelId}
                onChange={e => setChannelId(e.target.value)}
                className="flex-1 bg-surface-3 border border-border text-fg px-2 py-2 text-sm outline-none focus:border-accent"
              >
                <option value="">— Elegí un canal —</option>
                {channels.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </Field>

          {/* Datos del contacto */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre">
              <Input value={name} onChange={setName} placeholder="Juan Pérez" />
            </Field>
            <Field label="Teléfono">
              <Input value={phone} onChange={setPhone} placeholder="300 123 4567" />
            </Field>
            <Field label="Email">
              <Input value={email} onChange={setEmail} placeholder="juan@empresa.com" type="email" />
            </Field>
            <Field label="Empresa">
              <Input value={company} onChange={setCompany} placeholder="Constructora SAS" />
            </Field>
          </div>

          <Field label="Equipo de interés (opcional)">
            <Input value={interest} onChange={setInterest} placeholder="Excavadora, retroexcavadora..." />
          </Field>

          <Field label="Notas (opcional)">
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Contexto del contacto, mensaje recibido, etc."
              className="w-full bg-surface-3 border border-border text-fg px-2 py-2 text-sm outline-none focus:border-accent resize-none"
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border shrink-0 bg-surface-2">
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2 text-xs text-fg-4 border border-border hover:border-border-light disabled:opacity-40">
            Cancelar
          </button>
          <button onClick={submit} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-accent hover:bg-accent-light text-zinc-900 disabled:opacity-40">
            {saving ? <Loader2 size={11} className="animate-spin" /> : <UserPlus size={11} />}
            Crear lead
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Field({ label, children, help }: { label: string; children: React.ReactNode; help?: string }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-fg-5 font-medium mb-1">{label}</label>
      {children}
      {help && <p className="text-fg-6 text-[10px] mt-1">{help}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-surface-3 border border-border text-fg px-2 py-2 text-sm outline-none focus:border-accent"
    />
  );
}
