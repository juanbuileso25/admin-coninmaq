import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Wrench, Paperclip, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  api,
  SERVICE_TYPES, SERVICE_TYPE_LABELS,
  type RentalMachineResponse,
  type ServiceType,
} from "../../services/api";
import ClientSearchSelect from "../ui/ClientSearchSelect";
import DatePicker from "../ui/DatePicker";
import StringSearchSelect, { type StringOption } from "../ui/StringSearchSelect";

interface Props {
  onClose: () => void;
  onCreated: (id: number) => void;
}

export default function NuevaOrdenServicioModal({ onClose, onCreated }: Props) {
  const [submitting, setSubmitting] = useState(false);

  // Cliente / ubicación
  const [clientId, setClientId]     = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [location, setLocation]     = useState("");

  // Servicio
  const [serviceType, setServiceType] = useState<ServiceType>("correctivo");
  const [technicianId, setTechnicianId] = useState<string | null>(null);
  const [technicianOptions, setTechnicianOptions] = useState<StringOption[]>([]);

  // Equipo
  const [rentalMachineId, setRentalMachineId] = useState<string | null>(null);
  const [machines, setMachines] = useState<RentalMachineResponse[]>([]);
  const [brand, setBrand]         = useState("");
  const [model, setModel]         = useState("");
  const [serial, setSerial]       = useState("");
  const [horometer, setHorometer] = useState<string>("");

  // Detalle
  const [faultReported, setFaultReported] = useState("");
  const [scheduledDate, setScheduledDate] = useState<string | null>(null);   // YYYY-MM-DD
  const [scheduledTime, setScheduledTime] = useState<string>("08:00");       // HH:MM
  const [notes, setNotes] = useState("");

  // Archivos
  const [files, setFiles] = useState<Array<{ file: File; category: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar técnicos y máquinas
  useEffect(() => {
    api.users.list().then((users: any[]) => {
      setTechnicianOptions(users.map(u => ({
        id: String(u.id),
        label: `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.email,
        sublabel: u.email,
      })));
    }).catch(() => {});

    api.rental.listMachines(true).then(setMachines).catch(() => {});
  }, []);

  const machineOptions: StringOption[] = machines.map(m => ({
    id: m.id,
    label: `${m.brand ?? ""} ${m.model}`.trim() + (m.plate ? ` · ${m.plate}` : ""),
    sublabel: [m.code, m.engine_serial].filter(Boolean).join(" · ") || undefined,
  }));

  const onSelectMachine = (opt: StringOption | null) => {
    if (!opt) {
      setRentalMachineId(null);
      return;
    }
    setRentalMachineId(opt.id);
    const m = machines.find(x => x.id === opt.id);
    if (m) {
      if (m.brand) setBrand(m.brand);
      setModel(m.model || "");
      setSerial(m.engine_serial || "");
    }
  };

  const addFiles = (list: FileList | File[], category: string) => {
    const arr = Array.from(list).map(f => ({ file: f, category }));
    setFiles(prev => [...prev, ...arr]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    if (!clientId && !clientName.trim()) { toast.error("Selecciona o escribe un cliente"); return; }
    setSubmitting(true);
    try {
      const created = await api.serviceOrders.create({
        client_id: clientId,
        client_name: clientName || null,
        location: location || null,
        service_type: serviceType,
        technician_id: technicianId || null,
        rental_machine_id: rentalMachineId,
        machine_info: {
          brand: brand || null,
          model: model || null,
          serial: serial || null,
          horometer: horometer ? Number(horometer) : null,
          owned_or_rental: rentalMachineId ? "rental" : "owned",
          rental_machine_id: rentalMachineId || undefined,
        },
        fault_reported: faultReported || null,
        scheduled_at: scheduledDate
          ? new Date(`${scheduledDate}T${scheduledTime || "08:00"}:00`).toISOString()
          : null,
        notes: notes || null,
      });

      // Subir archivos (si hay) después de crear la orden
      if (files.length > 0) {
        for (const { file, category } of files) {
          try {
            await api.serviceOrders.uploadAttachment(created.id, file, category);
          } catch (e: any) {
            toast.error(`No se pudo subir ${file.name}: ${e?.detail ?? "error"}`);
          }
        }
      }

      toast.success(`Orden ${created.order_number} creada`);
      onCreated(created.id);
    } catch (e: any) {
      toast.error(e?.detail ?? "No se pudo crear la orden");
    } finally {
      setSubmitting(false);
    }
  };

  const fmtFileSize = (b: number) =>
    b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={submitting ? undefined : onClose} />
      <div className="relative bg-surface-2 border border-border w-full max-w-2xl max-h-[92vh] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <h2 className="text-fg font-semibold text-sm flex items-center gap-2">
            <Wrench size={15} className="text-accent" /> Nueva orden de servicio
          </h2>
          <button onClick={onClose} disabled={submitting} className="text-fg-5 hover:text-fg disabled:opacity-40">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Cliente y ubicación */}
          <Section title="Cliente y ubicación">
            <div className="space-y-3">
              <div>
                <Label>Cliente *</Label>
                <ClientSearchSelect
                  value={clientId}
                  displayValue={clientName || null}
                  onSelect={c => {
                    if (c) { setClientId(c.id); setClientName(c.name); }
                    else   { setClientId(null); setClientName(""); }
                  }}
                  placeholder="Buscar o crear cliente..."
                  compact
                />
              </div>
              <div>
                <Label>Ubicación del servicio</Label>
                <Input value={location} onChange={setLocation} placeholder="Dirección o lugar donde se hará el servicio" />
              </div>
            </div>
          </Section>

          {/* Equipo */}
          <Section title="Equipo">
            <div className="space-y-3">
              <div>
                <Label>Buscar máquina de renta (opcional)</Label>
                <StringSearchSelect
                  value={rentalMachineId}
                  options={machineOptions}
                  placeholder="Buscar por marca, modelo o placa..."
                  onSelect={onSelectMachine}
                  emptyText="No hay máquinas registradas"
                />
                <p className="text-fg-6 text-[10px] mt-1">
                  Si seleccionas una máquina, se auto-rellenan marca, modelo y serial. Puedes también escribirlos a mano.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Marca</Label>
                  <Input value={brand} onChange={setBrand} placeholder="Lonking" />
                </div>
                <div>
                  <Label>Modelo</Label>
                  <Input value={model} onChange={setModel} placeholder="CDM6225" />
                </div>
                <div>
                  <Label>Serial</Label>
                  <Input value={serial} onChange={setSerial} placeholder="SN-123456" />
                </div>
                <div>
                  <Label>Horómetro (h)</Label>
                  <Input value={horometer} onChange={setHorometer} placeholder="1500" type="number" />
                </div>
              </div>
            </div>
          </Section>

          {/* Servicio */}
          <Section title="Servicio">
            <div className="space-y-3">
              <div>
                <Label>Tipo *</Label>
                <div className="flex flex-wrap gap-1.5">
                  {SERVICE_TYPES.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setServiceType(t)}
                      className={`px-3 py-1.5 text-xs transition-all border ${
                        serviceType === t
                          ? "bg-accent text-zinc-900 border-accent font-semibold"
                          : "bg-surface-3 text-fg-3 border-border hover:border-border-light"
                      }`}
                    >
                      {SERVICE_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Técnico asignado</Label>
                  <StringSearchSelect
                    value={technicianId}
                    options={technicianOptions}
                    placeholder="Buscar técnico..."
                    onSelect={opt => setTechnicianId(opt?.id ?? null)}
                    emptyText="Sin técnicos"
                  />
                </div>
                <div>
                  <Label title="Fecha y hora para la que se agenda la visita del técnico">
                    Programación (opcional)
                  </Label>
                  <div className="grid grid-cols-[1fr_90px] gap-2">
                    <DatePicker
                      value={scheduledDate}
                      onChange={setScheduledDate}
                      placeholder="dd/mm/aaaa"
                      compact
                    />
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={e => setScheduledTime(e.target.value)}
                      disabled={!scheduledDate}
                      className="w-full bg-surface-3 border border-border rounded-sm text-fg px-2.5 py-2 text-xs outline-none focus:border-accent disabled:opacity-50"
                    />
                  </div>
                  <p className="text-fg-6 text-[10px] mt-1">
                    Cuándo se visita al cliente. Si queda pasado y no se cierra, aparece como "Atrasado".
                  </p>
                </div>
              </div>

              <div>
                <Label>Falla reportada por el cliente</Label>
                <textarea rows={3} value={faultReported} onChange={e => setFaultReported(e.target.value)}
                  placeholder="Describe lo que reporta el cliente..."
                  className="w-full bg-surface-3 border border-border text-fg px-2 py-2 text-sm outline-none focus:border-accent resize-none" />
              </div>
              <div>
                <Label>Notas internas</Label>
                <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                  className="w-full bg-surface-3 border border-border text-fg px-2 py-2 text-sm outline-none focus:border-accent resize-none" />
              </div>
            </div>
          </Section>

          {/* Archivos */}
          <Section title="Archivos (opcional)">
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={e => e.target.files && addFiles(e.target.files, "reporte_campo")}
              />
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs text-fg-3 border border-dashed border-fg-6 hover:border-accent hover:text-accent px-3 py-2"
                >
                  <Upload size={12} /> Subir archivos
                </button>
                <p className="text-fg-6 text-[10px] self-center">
                  Reportes de campo, fotos, facturas. Se adjuntan al crear la orden.
                </p>
              </div>

              {files.length > 0 && (
                <ul className="space-y-1">
                  {files.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 bg-surface-3 border border-border px-2 py-1.5 text-xs">
                      <Paperclip size={11} className="text-fg-5 shrink-0" />
                      <span className="flex-1 truncate text-fg-2">{f.file.name}</span>
                      <select
                        value={f.category}
                        onChange={e => setFiles(prev => prev.map((p, idx) => idx === i ? { ...p, category: e.target.value } : p))}
                        className="bg-surface-2 border border-border text-fg-3 text-[10px] px-1 py-0.5 outline-none"
                      >
                        <option value="reporte_campo">Reporte de campo</option>
                        <option value="foto">Foto</option>
                        <option value="factura">Factura</option>
                        <option value="otro">Otro</option>
                      </select>
                      <span className="text-fg-6 text-[10px]">{fmtFileSize(f.file.size)}</span>
                      <button type="button" onClick={() => removeFile(i)} className="text-fg-6 hover:text-red-400">
                        <Trash2 size={11} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border shrink-0 bg-surface-2">
          <button onClick={onClose} disabled={submitting}
            className="px-4 py-2 text-xs text-fg-4 border border-border hover:border-border-light disabled:opacity-40">
            Cancelar
          </button>
          <button onClick={submit} disabled={submitting}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-accent hover:bg-accent-light text-zinc-900 disabled:opacity-40">
            {submitting ? <Loader2 size={11} className="animate-spin" /> : <Wrench size={11} />}
            Crear orden
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-fg-5 text-[10px] uppercase tracking-wider font-semibold mb-2">{title}</h3>
      {children}
    </div>
  );
}

function Label({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <label title={title} className="block text-[10px] uppercase tracking-wider text-fg-5 font-medium mb-1">
      {children}
    </label>
  );
}

function Input({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full bg-surface-3 border border-border text-fg px-2 py-2 text-sm outline-none focus:border-accent" />
  );
}
