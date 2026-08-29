import { useRef, useState } from "react";
import { CheckCircle2, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { api, type VehicleOut } from "../../../services/api";

const VEHICLE_DOC_LABELS: Record<string, string> = {
  matricula:                    "Matrícula",
  soat:                         "SOAT vigente",
  revision_tecnico_mecanica:    "Revisión técnico-mecánica",
  poliza_seguros:               "Póliza de seguros",
  declaracion_importacion:      "Declaración de importación (si aplica)",
  hoja_de_vida:                 "Hoja de vida de la máquina",
  convenio_colaboracion:        "Convenio de colaboración (si aplica)",
  simit:                        "Certificado SIMIT",
  lista_chequeo_preoperacional: "Lista de chequeo preoperacional",
  cronograma_mantenimiento:     "Cronograma de mantenimiento",
  mantenimientos_realizados:    "Mantenimientos realizados",
  ficha_tecnica:                "Ficha técnica del equipo",
};

export const VEHICLE_DOC_TYPES_COUNT = Object.keys(VEHICLE_DOC_LABELS).length;

interface Props {
  vehicle: VehicleOut;
  onVehicleUpdated: (updated: VehicleOut) => void;
}

export default function DocumentosTab({ vehicle, onVehicleUpdated }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleUploadClick = (docType: string) => {
    setUploadType(docType);
    fileRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadType) return;
    e.target.value = "";
    const tid = toast.loading("Subiendo...");
    try {
      const updated = await api.companyDocs.uploadVehicleDoc(vehicle.id, uploadType, file);
      onVehicleUpdated(updated);
      toast.success("Documento subido", { id: tid });
    } catch (err: any) {
      toast.error(err.detail ?? "Error al subir", { id: tid });
    } finally {
      setUploadType(null);
    }
  };

  const handleDeleteDoc = async (docId: number) => {
    setDeletingId(docId);
    try {
      await api.companyDocs.deleteVehicleDoc(vehicle.id, docId);
      onVehicleUpdated({ ...vehicle, documents: vehicle.documents.filter(d => d.id !== docId) });
      toast.success("Documento eliminado");
    } catch (e: any) {
      toast.error(e.detail ?? "Error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} />

      <div className="space-y-2">
        {Object.entries(VEHICLE_DOC_LABELS).map(([docType, label]) => {
          const docs = vehicle.documents.filter(d => d.doc_type === docType);
          const hasAny = docs.length > 0;
          const isUp = uploadType === docType;
          return (
            <div key={docType} className="bg-surface-2 border border-border">
              <div className="flex items-center gap-3 px-3 md:px-4 py-3">
                {hasAny
                  ? <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
                  : <div className="w-[15px] h-[15px] rounded-full border-2 border-fg-6 flex-shrink-0" />
                }
                <span className="text-xs md:text-sm text-fg-3 flex-1 min-w-0 leading-snug">
                  {label}
                  {docs.length > 1 && (
                    <span className="ml-1.5 text-[10px] text-fg-6 bg-surface-3 px-1 py-0.5 rounded-sm">{docs.length}</span>
                  )}
                </span>
                <button
                  onClick={() => handleUploadClick(docType)} disabled={isUp}
                  className="flex-shrink-0 flex items-center gap-1.5 text-xs px-2 md:px-2.5 py-1.5 border border-dashed border-fg-6 text-fg-5 hover:border-accent hover:text-accent transition-colors whitespace-nowrap"
                >
                  {isUp ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                  {hasAny ? "Agregar" : "Subir"}
                </button>
              </div>
              {docs.map(doc => (
                <div key={doc.id} className="flex items-center gap-2 px-3 md:px-4 py-2 border-t border-border/50 bg-surface-3/30 pl-9 md:pl-11">
                  <span className="text-[11px] text-fg-5 flex-1 min-w-0 truncate" title={doc.file_name}>
                    {doc.file_name}
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <a
                      href={doc.file_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs px-2 py-1 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors whitespace-nowrap"
                    >
                      Ver
                    </a>
                    <button
                      onClick={() => handleDeleteDoc(doc.id)} disabled={deletingId === doc.id}
                      title="Eliminar"
                      className="p-1.5 text-fg-5 hover:text-red-400 border border-border hover:border-red-500/30 transition-colors"
                    >
                      {deletingId === doc.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
