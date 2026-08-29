import { useEffect, useRef, useState } from "react";
import { X, Loader2, Save, CheckSquare, Square, Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, type InspectionItemsCatalog, type VehicleInspectionCreate, type VehicleInspectionItemIn, type VehicleInspectionOut, type VehicleOut } from "../../../services/api";
import SignaturePad, { type SignaturePadHandle } from "../../../components/SignaturePad";
import DatePicker from "../../../components/ui/DatePicker";
import { useAuth } from "../../../hooks/useAuth";

interface Props {
  vehicle: VehicleOut;
  previousInspection?: VehicleInspectionOut | null;
  onClose: () => void;
  onCreated: (inspection: VehicleInspectionOut) => void;
}

// Mapeo doc_type → item del checklist que debe pre-marcarse
const DOC_TO_ITEM: Record<string, [string, string]> = {
  matricula:                 ["documentos", "licencia_transito"],
  soat:                      ["documentos", "seguro_obligatorio"],
  revision_tecnico_mecanica: ["documentos", "revision_tecnico_mecanica"],
  poliza_seguros:            ["documentos", "seguro_terceros"],
};

const CATEGORY_LABELS: Record<string, string> = {
  documentos:          "Documentos",
  dotacion:            "Dotación",
  equipo_emergencias:  "Equipo emergencias",
  extintor:            "Extintor",
  herramientas:        "Herramientas",
  luces:               "Luces",
  vidrios_espejos:     "Vidrios / espejos",
  fluidos:             "Fluidos",
  otros:               "Otros",
  neumaticos_desgaste: "Neumáticos — desgaste/estructura",
  neumaticos_presion:  "Neumáticos — presión",
};

function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function weekOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = (d.getTime() - start.getTime()) / 86400000;
  return Math.ceil((diff + start.getDay() + 1) / 7);
}

const MONTHS = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

// Categorías oficiales de licencia de conducción en Colombia (Ley 769 de 2002 y Res. 1500 de 2005)
const LICENSE_CATEGORIES: { value: string; label: string }[] = [
  { value: "A1", label: "A1 — Motos hasta 125 cc" },
  { value: "A2", label: "A2 — Motos > 125 cc" },
  { value: "B1", label: "B1 — Automóviles particulares" },
  { value: "B2", label: "B2 — Camiones y busetas particulares" },
  { value: "B3", label: "B3 — Vehículos articulados particulares" },
  { value: "C1", label: "C1 — Automóviles servicio público" },
  { value: "C2", label: "C2 — Camiones y busetas servicio público" },
  { value: "C3", label: "C3 — Vehículos articulados servicio público" },
];

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default function NuevaInspeccionCarroDrawer({ vehicle, previousInspection, onClose, onCreated }: Props) {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState<InspectionItemsCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Cabecera
  const [inspectionDate, setInspectionDate] = useState(todayISO());
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [weekNumber, setWeekNumber] = useState<number>(weekOfYear(new Date()));

  const handleDateChange = (iso: string | null) => {
    const value = iso ?? todayISO();
    setInspectionDate(value);
    const d = parseISO(value);
    setMonth(MONTHS[d.getMonth()]);
    setWeekNumber(weekOfYear(d));
  };
  const [mileage, setMileage] = useState("");
  const [driverName, setDriverName] = useState(previousInspection?.driver_name ?? user?.name ?? "");
  const [licenseNumber, setLicenseNumber] = useState(previousInspection?.license_number ?? user?.license_number ?? "");
  const [licenseCategory, setLicenseCategory] = useState(previousInspection?.license_category ?? user?.license_category ?? "");

  // Placeholder de kilometraje = último reportado
  const lastMileagePlaceholder = previousInspection?.mileage
    ? `Último: ${previousInspection.mileage}`
    : "Ej: 125.000";

  // Checklist: { "category|item_key": true/false }
  // Prefill: docs cargados + valores de última inspección
  const initialChecked = (): Record<string, boolean> => {
    const c: Record<string, boolean> = {};
    // 1) Copiar de la inspección previa
    if (previousInspection) {
      for (const item of previousInspection.items) {
        c[`${item.category}|${item.item_key}`] = item.is_ok;
      }
    }
    // 2) Superponer: si el doc existe en company_docs, marcar como OK
    const uploadedTypes = new Set(vehicle.documents.map(d => d.doc_type));
    for (const [docType, [category, itemKey]] of Object.entries(DOC_TO_ITEM)) {
      if (uploadedTypes.has(docType)) {
        c[`${category}|${itemKey}`] = true;
      }
    }
    return c;
  };
  const [checked, setChecked] = useState<Record<string, boolean>>(initialChecked());

  // Textos
  const [damageDescription, setDamageDescription] = useState("");
  const [observations, setObservations] = useState("");

  // Fotos (se suben después de crear la inspección)
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  // Firma
  const signatureRef = useRef<SignaturePadHandle>(null);

  useEffect(() => {
    api.vehicleInspections.itemsCatalog()
      .then(setCatalog)
      .catch(e => toast.error(e.detail ?? "Error al cargar catálogo"))
      .finally(() => setLoading(false));
  }, []);

  const toggleItem = (cat: string, key: string) => {
    const k = `${cat}|${key}`;
    setChecked(prev => ({ ...prev, [k]: !prev[k] }));
  };

  const toggleAll = (cat: string, value: boolean) => {
    if (!catalog) return;
    const patch: Record<string, boolean> = {};
    Object.keys(catalog[cat] ?? {}).forEach(key => {
      patch[`${cat}|${key}`] = value;
    });
    setChecked(prev => ({ ...prev, ...patch }));
  };

  const handleAddPhotos = (files: FileList | null) => {
    if (!files) return;
    setPhotoFiles(prev => [...prev, ...Array.from(files)]);
  };

  const handleSubmit = async () => {
    if (!catalog) return;
    setSaving(true);

    let signatureUrl: string | null = null;
    try {
      const blob = await signatureRef.current?.getBlob();
      if (blob) {
        const up = await api.vehicleInspections.uploadSignature(blob, "signature.png");
        signatureUrl = up.url;
      }

      const items: VehicleInspectionItemIn[] = [];
      for (const [cat, itemsMap] of Object.entries(catalog)) {
        for (const key of Object.keys(itemsMap)) {
          items.push({
            category: cat,
            item_key: key,
            is_ok: !!checked[`${cat}|${key}`],
          });
        }
      }

      const payload: VehicleInspectionCreate = {
        vehicle_id: vehicle.id,
        inspection_date: inspectionDate,
        month: month || null,
        week_number: weekNumber || null,
        mileage: mileage || null,
        driver_name: driverName || null,
        license_number: licenseNumber || null,
        license_category: licenseCategory || null,
        damage_description: damageDescription || null,
        observations: observations || null,
        signature_url: signatureUrl,
        items,
      };

      const created = await api.vehicleInspections.create(payload);

      // Subir fotos si hay
      let finalInsp = created;
      for (const file of photoFiles) {
        try {
          const photo = await api.vehicleInspections.uploadPhoto(created.id, file);
          finalInsp = { ...finalInsp, photos: [...finalInsp.photos, photo] };
        } catch {
          toast.warning(`No se pudo subir ${file.name}`);
        }
      }

      // Notificar por email (con PDF ya con las fotos)
      try {
        await api.vehicleInspections.notifyEmail(created.id);
      } catch {
        // Falla silenciosa: la inspección ya está guardada
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
            <h2 className="text-sm font-semibold text-fg">Nueva inspección diaria</h2>
            <p className="text-[11px] text-fg-5">Vehículo {vehicle.plate} · Formato FOR-SST-006</p>
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
              {/* Cabecera */}
              <section>
                <h3 className="text-[11px] font-semibold text-fg-5 uppercase tracking-wider mb-3">Datos</h3>
                {vehicle.modelo && (
                  <p className="text-[11px] text-fg-6 mb-2">
                    Vehículo <span className="font-mono text-fg-3">{vehicle.plate}</span> · Modelo <span className="text-fg-3">{vehicle.modelo}</span>
                  </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Field label="Fecha *">
                    <DatePicker value={inspectionDate} onChange={handleDateChange} compact />
                  </Field>
                  <Field label="Mes">
                    <select value={month} onChange={e => setMonth(e.target.value)} className={inputCls}>
                      {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </Field>
                  <Field label="Semana">
                    <input type="number" min={1} max={53} value={weekNumber} onChange={e => setWeekNumber(Number(e.target.value))} className={inputCls} />
                  </Field>
                  <Field label="Kilometraje">
                    <input value={mileage} onChange={e => setMileage(e.target.value)} className={inputCls} placeholder={lastMileagePlaceholder} />
                  </Field>
                  <Field label="Conductor">
                    <input value={driverName} onChange={e => setDriverName(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="N° Licencia">
                    <input value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Categoría">
                    <select value={licenseCategory} onChange={e => setLicenseCategory(e.target.value)} className={inputCls}>
                      <option value="">Seleccione…</option>
                      {LICENSE_CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </section>

              {/* Checklist */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-semibold text-fg-5 uppercase tracking-wider">Checklist</h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const all: Record<string, boolean> = {};
                        for (const [cat, items] of Object.entries(catalog)) {
                          for (const key of Object.keys(items)) all[`${cat}|${key}`] = true;
                        }
                        setChecked(all);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                    >
                      <CheckSquare size={11} /> Marcar todo OK
                    </button>
                    <button
                      type="button"
                      onClick={() => setChecked({})}
                      className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold border border-border text-fg-5 hover:border-fg-4 transition-colors"
                    >
                      <Square size={11} /> Limpiar
                    </button>
                  </div>
                </div>
                {Object.entries(catalog).map(([cat, items]) => {
                  const allOk = Object.keys(items).every(k => checked[`${cat}|${k}`]);
                  return (
                    <div key={cat} className="border border-border">
                      <div className="flex items-center justify-between bg-surface-3 px-3 py-2 border-b border-border">
                        <span className="text-xs font-semibold text-fg-3">{CATEGORY_LABELS[cat] ?? cat}</span>
                        <button
                          type="button"
                          onClick={() => toggleAll(cat, !allOk)}
                          className="text-[11px] text-fg-5 hover:text-accent transition-colors flex items-center gap-1"
                        >
                          {allOk ? <CheckSquare size={11} /> : <Square size={11} />}
                          {allOk ? "Desmarcar todo" : "Todo OK"}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 p-3">
                        {Object.entries(items).map(([key, label]) => {
                          const k = `${cat}|${key}`;
                          const isOk = !!checked[k];
                          return (
                            <label key={key} className="flex items-center gap-2 py-1.5 cursor-pointer text-xs text-fg-3 hover:text-fg">
                              <input type="checkbox" checked={isOk} onChange={() => toggleItem(cat, key)} className="accent-accent" />
                              <span>{label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </section>

              {/* Descripción de daños */}
              <section>
                <Field label="Descripción de daños observados">
                  <textarea rows={3} value={damageDescription} onChange={e => setDamageDescription(e.target.value)} className={`${inputCls} resize-none`} />
                </Field>
              </section>

              {/* Fotos */}
              <section>
                <label className="text-xs text-fg-5 block mb-1.5">Fotos de daños (opcional)</label>
                <div className="border border-dashed border-fg-6 p-3">
                  <input type="file" accept="image/*" multiple capture="environment" onChange={e => handleAddPhotos(e.target.files)} className="hidden" id="photo-input-carro" />
                  <label htmlFor="photo-input-carro" className="flex items-center gap-2 cursor-pointer text-xs text-fg-5 hover:text-accent">
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
                <Field label="Observaciones (describa cualquier condición anormal con la fecha)">
                  <textarea rows={3} value={observations} onChange={e => setObservations(e.target.value)} className={`${inputCls} resize-none`} />
                </Field>
              </section>

              {/* Firma */}
              <section>
                <SignaturePad ref={signatureRef} label="Firma del conductor" />
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
