import { useEffect, useRef, useState } from "react";
import { X, Loader2, Save, Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, type InspectionItemsCatalog, type MotoInspectionCreate, type MotoInspectionItemIn, type MotoInspectionOut, type VehicleOut } from "../../../services/api";
import SignaturePad, { type SignaturePadHandle } from "../../../components/SignaturePad";
import DatePicker from "../../../components/ui/DatePicker";
import { useAuth } from "../../../hooks/useAuth";

interface Props {
  vehicle: VehicleOut;
  previousInspection?: MotoInspectionOut | null;
  onClose: () => void;
  onCreated: (inspection: MotoInspectionOut) => void;
}

const SECTION_LABELS: Record<string, string> = {
  mecanica:   "Revisión de condiciones mecánicas",
  proteccion: "Equipo de protección y seguridad",
};

function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

type ItemState = {
  status: "bueno" | "malo" | null;
  accion_correctiva: string;
  observaciones: string;
};

export default function NuevaInspeccionMotoDrawer({ vehicle, previousInspection, onClose, onCreated }: Props) {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState<InspectionItemsCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Detectar docs cargados
  const uploadedTypes = new Set(vehicle.documents.map(d => d.doc_type));
  const hasSoat = uploadedTypes.has("soat");
  const hasMatricula = uploadedTypes.has("matricula");

  // Cabecera
  const [inspectionDate, setInspectionDate] = useState(todayISO());
  const [driverName, setDriverName] = useState(previousInspection?.driver_name ?? user?.name ?? "");
  const [cedula, setCedula] = useState(previousInspection?.cedula ?? "");
  const [cilindraje, setCilindraje] = useState(vehicle.cilindraje ?? "");
  const [modelo, setModelo] = useState(vehicle.modelo ?? "");
  const [color, setColor] = useState(vehicle.color ?? "");
  const [marca, setMarca] = useState(vehicle.marca ?? "");

  // Documentos: pre-marcar SÍ si el doc está cargado o si la inspección anterior lo tenía
  const [seguroHas, setSeguroHas] = useState<boolean | null>(hasSoat ? true : previousInspection?.seguro_obligatorio_has ?? null);
  const [seguroVenc, setSeguroVenc] = useState(previousInspection?.seguro_obligatorio_vencimiento ?? "");
  const [licTransitoHas, setLicTransitoHas] = useState<boolean | null>(hasMatricula ? true : previousInspection?.licencia_transito_has ?? null);
  const [licTransitoOrig, setLicTransitoOrig] = useState<boolean | null>(previousInspection?.licencia_transito_original ?? null);
  const [licConducHas, setLicConducHas] = useState<boolean | null>(previousInspection?.licencia_conduccion_has ?? null);
  const [licConducExp, setLicConducExp] = useState(previousInspection?.licencia_conduccion_expedicion ?? "");
  const [papelesNombre, setPapelesNombre] = useState<boolean | null>(previousInspection?.papeles_a_nombre_candidato ?? null);
  const [papelesANombreDe, setPapelesANombreDe] = useState(previousInspection?.papeles_a_nombre_de ?? "");

  // Items { "section|key": {status, accion, obs} } — pre-cargar de inspección anterior
  const initialItems = (): Record<string, ItemState> => {
    const map: Record<string, ItemState> = {};
    if (previousInspection) {
      for (const it of previousInspection.items) {
        map[`${it.section}|${it.item_key}`] = {
          status: (it.status as "bueno" | "malo" | null) ?? null,
          accion_correctiva: it.accion_correctiva ?? "",
          observaciones: it.observaciones ?? "",
        };
      }
    }
    return map;
  };
  const [items, setItems] = useState<Record<string, ItemState>>(initialItems());
  const [observations, setObservations] = useState("");
  const [commitment, setCommitment] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  const signatureRef = useRef<SignaturePadHandle>(null);

  useEffect(() => {
    api.motoInspections.itemsCatalog()
      .then(setCatalog)
      .catch(e => toast.error(e.detail ?? "Error al cargar catálogo"))
      .finally(() => setLoading(false));
  }, []);

  const getItem = (section: string, key: string): ItemState =>
    items[`${section}|${key}`] ?? { status: null, accion_correctiva: "", observaciones: "" };

  const updateItem = (section: string, key: string, patch: Partial<ItemState>) => {
    const k = `${section}|${key}`;
    setItems(prev => ({ ...prev, [k]: { ...getItem(section, key), ...patch } }));
  };

  const handleAddPhotos = (files: FileList | null) => {
    if (!files) return;
    setPhotoFiles(prev => [...prev, ...Array.from(files)]);
  };

  const handleSubmit = async () => {
    if (!catalog) return;
    if (!commitment) {
      toast.error("Debe aceptar el compromiso al final del formulario");
      return;
    }
    setSaving(true);

    let signatureUrl: string | null = null;
    try {
      const blob = await signatureRef.current?.getBlob();
      if (blob) {
        const up = await api.motoInspections.uploadSignature(blob, "signature.png");
        signatureUrl = up.url;
      }

      const itemsPayload: MotoInspectionItemIn[] = [];
      for (const [section, itemsMap] of Object.entries(catalog)) {
        for (const key of Object.keys(itemsMap)) {
          const st = getItem(section, key);
          itemsPayload.push({
            section: section as "mecanica" | "proteccion",
            item_key: key,
            status: st.status,
            accion_correctiva: st.accion_correctiva || null,
            observaciones: st.observaciones || null,
          });
        }
      }

      const payload: MotoInspectionCreate = {
        vehicle_id: vehicle.id,
        inspection_date: inspectionDate,
        driver_name: driverName || null,
        cedula: cedula || null,
        cilindraje: cilindraje || null,
        modelo: modelo || null,
        color: color || null,
        marca: marca || null,
        seguro_obligatorio_has: seguroHas,
        seguro_obligatorio_vencimiento: seguroVenc || null,
        licencia_transito_has: licTransitoHas,
        licencia_transito_original: licTransitoOrig,
        licencia_conduccion_has: licConducHas,
        licencia_conduccion_expedicion: licConducExp || null,
        papeles_a_nombre_candidato: papelesNombre,
        papeles_a_nombre_de: papelesANombreDe || null,
        signature_url: signatureUrl,
        commitment_accepted: commitment,
        observations: observations || null,
        items: itemsPayload,
      };

      const created = await api.motoInspections.create(payload);

      let finalInsp = created;
      for (const file of photoFiles) {
        try {
          const photo = await api.motoInspections.uploadPhoto(created.id, file);
          finalInsp = { ...finalInsp, photos: [...finalInsp.photos, photo] };
        } catch {
          toast.warning(`No se pudo subir ${file.name}`);
        }
      }

      try {
        await api.motoInspections.notifyEmail(created.id);
      } catch {
        // Falla silenciosa
      }

      toast.success("Inspección registrada");
      onCreated(finalInsp);
    } catch (e: any) {
      toast.error(e.detail ?? "Error al guardar la inspección");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-end" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface-2 border-l border-border w-full max-w-3xl h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-fg">Nueva inspección de moto</h2>
            <p className="text-[11px] text-fg-5">Vehículo {vehicle.plate} · Formato FOR-SST-005</p>
          </div>
          <button onClick={onClose} className="text-fg-5 hover:text-fg p-1"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 size={16} className="animate-spin text-fg-6" /></div>
          ) : !catalog ? (
            <p className="text-center text-fg-6 text-xs">No se pudo cargar el catálogo</p>
          ) : (
            <>
              {/* Datos generales */}
              <section>
                <h3 className="text-[11px] font-semibold text-fg-5 uppercase tracking-wider mb-3">Datos del conductor</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Field label="Fecha *">
                    <DatePicker value={inspectionDate} onChange={v => setInspectionDate(v ?? todayISO())} compact />
                  </Field>
                  <Field label="Nombre">
                    <input value={driverName} onChange={e => setDriverName(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Cédula">
                    <input value={cedula} onChange={e => setCedula(e.target.value)} className={inputCls} />
                  </Field>
                </div>
              </section>

              <section>
                <h3 className="text-[11px] font-semibold text-fg-5 uppercase tracking-wider mb-3">Datos del vehículo</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Field label="Marca"><input value={marca} onChange={e => setMarca(e.target.value)} className={inputCls} /></Field>
                  <Field label="Cilindraje"><input value={cilindraje} onChange={e => setCilindraje(e.target.value)} className={inputCls} /></Field>
                  <Field label="Modelo"><input value={modelo} onChange={e => setModelo(e.target.value)} className={inputCls} /></Field>
                  <Field label="Color"><input value={color} onChange={e => setColor(e.target.value)} className={inputCls} /></Field>
                </div>
              </section>

              {/* Documentos */}
              <section>
                <h3 className="text-[11px] font-semibold text-fg-5 uppercase tracking-wider mb-3">Revisión de documentos</h3>
                <div className="space-y-2.5">
                  <DocRow label="Seguro obligatorio">
                    <YesNo value={seguroHas} onChange={setSeguroHas} />
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-fg-5 whitespace-nowrap">Vencimiento:</label>
                      <div className="w-44"><DatePicker value={seguroVenc || null} onChange={v => setSeguroVenc(v ?? "")} placeholder="dd/mm/aaaa" compact /></div>
                    </div>
                  </DocRow>
                  <DocRow label="Licencia de tránsito">
                    <YesNo value={licTransitoHas} onChange={setLicTransitoHas} />
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-fg-5">Original:</label>
                      <YesNo value={licTransitoOrig} onChange={setLicTransitoOrig} />
                    </div>
                  </DocRow>
                  <DocRow label="Licencia de conducción">
                    <YesNo value={licConducHas} onChange={setLicConducHas} />
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-fg-5 whitespace-nowrap">Fecha exp.:</label>
                      <div className="w-44"><DatePicker value={licConducExp || null} onChange={v => setLicConducExp(v ?? "")} placeholder="dd/mm/aaaa" compact /></div>
                    </div>
                  </DocRow>
                  <DocRow label="Papeles a nombre del candidato">
                    <YesNo value={papelesNombre} onChange={setPapelesNombre} />
                    <div className="flex items-center gap-2 flex-1">
                      <label className="text-[11px] text-fg-5 whitespace-nowrap">A nombre de:</label>
                      <input value={papelesANombreDe} onChange={e => setPapelesANombreDe(e.target.value)} className={inputCls} />
                    </div>
                  </DocRow>
                </div>
              </section>

              {/* Secciones */}
              {Object.entries(catalog).map(([section, itemsMap]) => (
                <section key={section}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[11px] font-semibold text-fg-5 uppercase tracking-wider">{SECTION_LABELS[section] ?? section}</h3>
                    <button
                      type="button"
                      onClick={() => {
                        const patch: Record<string, ItemState> = {};
                        for (const key of Object.keys(itemsMap)) {
                          const cur = getItem(section, key);
                          patch[`${section}|${key}`] = { ...cur, status: "bueno" };
                        }
                        setItems(prev => ({ ...prev, ...patch }));
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                    >
                      Todo bueno
                    </button>
                  </div>
                  <div className="border border-border">
                    <div className="grid grid-cols-[1fr_140px_1fr_1fr] gap-2 bg-surface-3 px-3 py-2 border-b border-border">
                      <div className="text-[10px] font-semibold text-fg-5 uppercase">Descripción</div>
                      <div className="text-[10px] font-semibold text-fg-5 uppercase text-center">Estado</div>
                      <div className="text-[10px] font-semibold text-fg-5 uppercase">Acción correctiva</div>
                      <div className="text-[10px] font-semibold text-fg-5 uppercase">Observaciones</div>
                    </div>
                    {Object.entries(itemsMap).map(([key, label]) => {
                      const st = getItem(section, key);
                      return (
                        <div key={key} className="grid grid-cols-[1fr_140px_1fr_1fr] gap-2 items-center px-3 py-2 border-b border-border last:border-b-0">
                          <span className="text-xs text-fg-3">{label}</span>
                          <div className="flex justify-center">
                            <BuenoMalo value={st.status} onChange={s => updateItem(section, key, { status: s })} />
                          </div>
                          <input
                            value={st.accion_correctiva}
                            onChange={e => updateItem(section, key, { accion_correctiva: e.target.value })}
                            className={inputCls} placeholder="—"
                          />
                          <input
                            value={st.observaciones}
                            onChange={e => updateItem(section, key, { observaciones: e.target.value })}
                            className={inputCls} placeholder="—"
                          />
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}

              {/* Fotos */}
              <section>
                <label className="text-xs text-fg-5 block mb-1.5">Fotos (opcional)</label>
                <div className="border border-dashed border-fg-6 p-3">
                  <input type="file" accept="image/*" multiple capture="environment" onChange={e => handleAddPhotos(e.target.files)} className="hidden" id="photo-input-moto" />
                  <label htmlFor="photo-input-moto" className="flex items-center gap-2 cursor-pointer text-xs text-fg-5 hover:text-accent">
                    <Camera size={14} /> Agregar fotos
                  </label>
                  {photoFiles.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {photoFiles.map((f, i) => (
                        <div key={i} className="relative group">
                          <img src={URL.createObjectURL(f)} alt="" className="w-full h-20 object-cover border border-border" />
                          <button
                            onClick={() => setPhotoFiles(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute top-1 right-1 bg-red-500/80 text-white p-0.5 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Observaciones */}
              <section>
                <Field label="Observaciones adicionales">
                  <textarea rows={3} value={observations} onChange={e => setObservations(e.target.value)} className={`${inputCls} resize-none`} />
                </Field>
              </section>

              {/* Firma + compromiso */}
              <section>
                <SignaturePad ref={signatureRef} label="Firma del conductor" />
              </section>

              <section>
                <label className="flex items-start gap-2 text-xs text-fg-3 cursor-pointer p-3 border border-border bg-surface-2">
                  <input
                    type="checkbox"
                    checked={commitment}
                    onChange={e => setCommitment(e.target.checked)}
                    className="mt-0.5 accent-accent"
                  />
                  <span className="leading-relaxed">
                    Me comprometo a realizar las acciones correctivas y los cambios necesarios en los tiempos
                    establecidos en esta inspección, buscando el beneficio propio, de la operación y de la organización.
                  </span>
                </label>
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-xs text-fg-5 hover:text-fg transition-colors">Cancelar</button>
          <button
            onClick={handleSubmit}
            disabled={saving || loading}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-black text-xs font-semibold hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Guardar inspección
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers UI ────────────────────────────────────────────────────────────────

const inputCls =
  "w-full bg-surface-3 border border-border text-fg text-xs px-2.5 py-2 outline-none focus:border-accent placeholder:text-fg-6";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] text-fg-5 block mb-1">{label}</label>
      {children}
    </div>
  );
}

function DocRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3 border border-border p-2.5">
      <div className="text-xs text-fg-3 md:w-56 flex-shrink-0">{label}</div>
      <div className="flex flex-wrap items-center gap-3 flex-1">{children}</div>
    </div>
  );
}

function YesNo({ value, onChange }: { value: boolean | null; onChange: (v: boolean | null) => void }) {
  const btn = (v: boolean, label: string) => (
    <button
      type="button"
      onClick={() => onChange(value === v ? null : v)}
      className={`px-2.5 py-1 text-[11px] font-semibold border transition-colors ${
        value === v
          ? (v ? "bg-emerald-500/20 border-emerald-400 text-emerald-300" : "bg-red-500/20 border-red-400 text-red-300")
          : "border-border text-fg-5 hover:border-fg-4"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="flex gap-1">
      {btn(true, "SÍ")}
      {btn(false, "NO")}
    </div>
  );
}

function BuenoMalo({ value, onChange }: { value: "bueno" | "malo" | null; onChange: (v: "bueno" | "malo" | null) => void }) {
  const btn = (v: "bueno" | "malo", label: string) => (
    <button
      type="button"
      onClick={() => onChange(value === v ? null : v)}
      className={`px-2 py-1 text-[10px] font-semibold border transition-colors ${
        value === v
          ? (v === "bueno" ? "bg-emerald-500/20 border-emerald-400 text-emerald-300" : "bg-red-500/20 border-red-400 text-red-300")
          : "border-border text-fg-6 hover:border-fg-4"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="flex gap-1">
      {btn("bueno", "Bueno")}
      {btn("malo", "Malo")}
    </div>
  );
}
