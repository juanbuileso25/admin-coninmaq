import { useEffect, useState } from "react";
import { X, Loader2, Download, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { api, type VehicleInspectionOut } from "../../../services/api";

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
  neumaticos_desgaste: "Neumáticos — desgaste",
  neumaticos_presion:  "Neumáticos — presión",
};

interface Props {
  id: number;
  onClose: () => void;
}

export default function InspeccionCarroDetail({ id, onClose }: Props) {
  const [insp, setInsp] = useState<VehicleInspectionOut | null>(null);
  const [catalog, setCatalog] = useState<Record<string, Record<string, string>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.vehicleInspections.get(id),
      api.vehicleInspections.itemsCatalog(),
    ])
      .then(([i, c]) => { setInsp(i); setCatalog(c); })
      .catch(e => toast.error(e.detail ?? "Error al cargar inspección"))
      .finally(() => setLoading(false));
  }, [id]);

  // Agrupar items por categoría
  const grouped = insp?.items.reduce<Record<string, { key: string; label: string; is_ok: boolean }[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    const label = catalog?.[item.category]?.[item.item_key] ?? item.item_key;
    acc[item.category].push({ key: item.item_key, label, is_ok: item.is_ok });
    return acc;
  }, {}) ?? {};

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-end" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface-2 border-l border-border w-full max-w-3xl h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-fg">Inspección de vehículo</h2>
            {insp && <p className="text-[11px] text-fg-5">{insp.inspection_date} · {insp.driver_name ?? "Sin conductor"}</p>}
          </div>
          <div className="flex items-center gap-2">
            {insp && (
              <button
                onClick={async () => {
                  try { await api.vehicleInspections.downloadPdf(insp.id); }
                  catch (e: any) { toast.error(e.detail ?? "No se pudo abrir el PDF"); }
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs border border-border text-fg-4 hover:text-accent hover:border-accent transition-colors"
              >
                <Download size={12} /> PDF
              </button>
            )}
            <button onClick={onClose} className="text-fg-5 hover:text-fg p-1"><X size={18} /></button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 size={16} className="animate-spin text-fg-6" /></div>
          ) : !insp ? (
            <p className="text-center text-fg-6 text-xs">No se pudo cargar la inspección</p>
          ) : (
            <>
              {/* Cabecera */}
              <section>
                <h3 className="text-[11px] font-semibold text-fg-5 uppercase tracking-wider mb-2">Datos</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <Info label="Mes">{insp.month ?? "—"}</Info>
                  <Info label="Semana">{insp.week_number ?? "—"}</Info>
                  <Info label="Kilometraje">{insp.mileage ?? "—"}</Info>
                  <Info label="N° Licencia">{insp.license_number ?? "—"}</Info>
                  <Info label="Categoría">{insp.license_category ?? "—"}</Info>
                </div>
              </section>

              {/* Checklist */}
              <section className="space-y-3">
                <h3 className="text-[11px] font-semibold text-fg-5 uppercase tracking-wider">Checklist</h3>
                {Object.entries(grouped).map(([cat, list]) => (
                  <div key={cat} className="border border-border">
                    <div className="bg-surface-3 px-3 py-2 border-b border-border text-xs font-semibold text-fg-3">
                      {CATEGORY_LABELS[cat] ?? cat}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 p-3">
                      {list.map(it => (
                        <div key={it.key} className="flex items-center gap-2 py-1 text-xs">
                          {it.is_ok
                            ? <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" />
                            : <XCircle size={12} className="text-red-400 flex-shrink-0" />
                          }
                          <span className={it.is_ok ? "text-fg-3" : "text-fg-5"}>{it.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </section>

              {insp.damage_description && (
                <Info label="Descripción de daños">
                  <p className="text-xs text-fg-3 whitespace-pre-wrap">{insp.damage_description}</p>
                </Info>
              )}

              {insp.photos.length > 0 && (
                <section>
                  <h3 className="text-[11px] font-semibold text-fg-5 uppercase tracking-wider mb-2">Fotos</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {insp.photos.map(p => (
                      <a key={p.id} href={p.photo_url} target="_blank" rel="noopener noreferrer" className="block">
                        <img src={p.photo_url} alt="" className="w-full h-24 object-cover border border-border hover:border-accent transition-colors" />
                      </a>
                    ))}
                  </div>
                </section>
              )}

              {insp.observations && (
                <Info label="Observaciones">
                  <p className="text-xs text-fg-3 whitespace-pre-wrap">{insp.observations}</p>
                </Info>
              )}

              {insp.signature_url && (
                <section>
                  <h3 className="text-[11px] font-semibold text-fg-5 uppercase tracking-wider mb-2">Firma</h3>
                  <img src={insp.signature_url} alt="Firma" className="max-h-32 border border-border bg-white p-2" />
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] text-fg-6 uppercase tracking-wider block mb-0.5">{label}</label>
      <div className="text-xs text-fg-3">{children}</div>
    </div>
  );
}
