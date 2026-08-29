import { useEffect, useState } from "react";
import { X, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { api, type MotoInspectionOut } from "../../../services/api";

const SECTION_LABELS: Record<string, string> = {
  mecanica:   "Condiciones mecánicas",
  proteccion: "Equipo de protección",
};

interface Props {
  id: number;
  onClose: () => void;
}

export default function InspeccionMotoDetail({ id, onClose }: Props) {
  const [insp, setInsp] = useState<MotoInspectionOut | null>(null);
  const [catalog, setCatalog] = useState<Record<string, Record<string, string>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.motoInspections.get(id),
      api.motoInspections.itemsCatalog(),
    ])
      .then(([i, c]) => { setInsp(i); setCatalog(c); })
      .catch(e => toast.error(e.detail ?? "Error al cargar inspección"))
      .finally(() => setLoading(false));
  }, [id]);

  const grouped = insp?.items.reduce<Record<string, { key: string; label: string; status: string | null; accion: string | null; obs: string | null }[]>>((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    const label = catalog?.[item.section]?.[item.item_key] ?? item.item_key;
    acc[item.section].push({
      key: item.item_key,
      label,
      status: item.status ?? null,
      accion: item.accion_correctiva ?? null,
      obs: item.observaciones ?? null,
    });
    return acc;
  }, {}) ?? {};

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-end" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface-2 border-l border-border w-full max-w-3xl h-full flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-fg">Inspección de moto</h2>
            {insp && <p className="text-[11px] text-fg-5">{insp.inspection_date} · {insp.driver_name ?? "Sin conductor"}</p>}
          </div>
          <div className="flex items-center gap-2">
            {insp && (
              <button
                onClick={async () => {
                  try { await api.motoInspections.downloadPdf(insp.id); }
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

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 size={16} className="animate-spin text-fg-6" /></div>
          ) : !insp ? (
            <p className="text-center text-fg-6 text-xs">No se pudo cargar la inspección</p>
          ) : (
            <>
              {/* Datos */}
              <section>
                <h3 className="text-[11px] font-semibold text-fg-5 uppercase tracking-wider mb-2">Datos</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <Info label="Cédula">{insp.cedula ?? "—"}</Info>
                  <Info label="Marca">{insp.marca ?? "—"}</Info>
                  <Info label="Modelo">{insp.modelo ?? "—"}</Info>
                  <Info label="Cilindraje">{insp.cilindraje ?? "—"}</Info>
                </div>
              </section>

              {/* Documentos */}
              <section>
                <h3 className="text-[11px] font-semibold text-fg-5 uppercase tracking-wider mb-2">Documentos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <Info label="Seguro obligatorio">
                    {yesNoText(insp.seguro_obligatorio_has)}
                    {insp.seguro_obligatorio_vencimiento && <span className="text-fg-5"> · Venc: {insp.seguro_obligatorio_vencimiento}</span>}
                  </Info>
                  <Info label="Licencia de tránsito">
                    {yesNoText(insp.licencia_transito_has)}
                    {insp.licencia_transito_original !== null && <span className="text-fg-5"> · Original: {yesNoText(insp.licencia_transito_original)}</span>}
                  </Info>
                  <Info label="Licencia de conducción">
                    {yesNoText(insp.licencia_conduccion_has)}
                    {insp.licencia_conduccion_expedicion && <span className="text-fg-5"> · Exp: {insp.licencia_conduccion_expedicion}</span>}
                  </Info>
                  <Info label="Papeles a nombre del candidato">
                    {yesNoText(insp.papeles_a_nombre_candidato)}
                    {insp.papeles_a_nombre_de && <span className="text-fg-5"> · {insp.papeles_a_nombre_de}</span>}
                  </Info>
                </div>
              </section>

              {/* Secciones */}
              {Object.entries(grouped).map(([section, list]) => (
                <section key={section}>
                  <h3 className="text-[11px] font-semibold text-fg-5 uppercase tracking-wider mb-2">{SECTION_LABELS[section] ?? section}</h3>
                  <div className="border border-border">
                    <div className="grid grid-cols-[1fr_80px_1fr_1fr] gap-2 bg-surface-3 px-3 py-2 border-b border-border">
                      <div className="text-[10px] font-semibold text-fg-5 uppercase">Descripción</div>
                      <div className="text-[10px] font-semibold text-fg-5 uppercase text-center">Estado</div>
                      <div className="text-[10px] font-semibold text-fg-5 uppercase">Acción</div>
                      <div className="text-[10px] font-semibold text-fg-5 uppercase">Observaciones</div>
                    </div>
                    {list.map(it => (
                      <div key={it.key} className="grid grid-cols-[1fr_80px_1fr_1fr] gap-2 items-center px-3 py-2 border-b border-border last:border-b-0 text-xs">
                        <span className="text-fg-3">{it.label}</span>
                        <div className="text-center">
                          {it.status === "bueno" && <span className="text-[10px] font-semibold text-emerald-400">BUENO</span>}
                          {it.status === "malo" && <span className="text-[10px] font-semibold text-red-400">MALO</span>}
                          {!it.status && <span className="text-[10px] text-fg-6">—</span>}
                        </div>
                        <span className="text-fg-4 text-[11px]">{it.accion ?? <span className="text-fg-6">—</span>}</span>
                        <span className="text-fg-4 text-[11px]">{it.obs ?? <span className="text-fg-6">—</span>}</span>
                      </div>
                    ))}
                  </div>
                </section>
              ))}

              {insp.photos.length > 0 && (
                <section>
                  <h3 className="text-[11px] font-semibold text-fg-5 uppercase tracking-wider mb-2">Fotos</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {insp.photos.map(p => (
                      <a key={p.id} href={p.photo_url} target="_blank" rel="noopener noreferrer">
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

              {insp.commitment_accepted && (
                <p className="text-[11px] text-emerald-400 italic">✓ Compromiso aceptado por el conductor</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function yesNoText(v: boolean | null) {
  if (v === true) return <span className="text-emerald-400 font-semibold">SÍ</span>;
  if (v === false) return <span className="text-red-400 font-semibold">NO</span>;
  return <span className="text-fg-6">—</span>;
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] text-fg-6 uppercase tracking-wider block mb-0.5">{label}</label>
      <div className="text-xs text-fg-3">{children}</div>
    </div>
  );
}
