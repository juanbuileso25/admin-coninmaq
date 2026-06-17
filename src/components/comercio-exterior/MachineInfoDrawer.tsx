import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  X, Loader2, Upload, FileText, Image, Trash2, Download, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { api, type MachineInfoResponse, type MachineInfoDocumentResponse } from "../../services/api";
import { useAbility } from "../../context/AbilityContext";
import DatePicker from "../ui/DatePicker";

const DOCUMENT_SLOTS = [
  { key: "lonking_contract",    label: "Contrato Lonking",       icon: FileText, accept: ".pdf,.doc,.docx" },
  { key: "gps_certificate",     label: "Certificado GPS",        icon: FileText, accept: ".pdf,.doc,.docx" },
  { key: "runt_registration",   label: "Registro RUNT",          icon: FileText, accept: ".pdf,.doc,.docx" },
  { key: "machine_plate_photo", label: "Foto Plaqueta Máquina",  icon: Image,    accept: "image/*" },
  { key: "engine_plate_photo",  label: "Foto Plaqueta Motor",    icon: Image,    accept: "image/*" },
] as const;

const schema = yup.object({
  plate:              yup.string().required("Campo obligatorio").max(20),
  brand:              yup.string().required("Campo obligatorio").max(100),
  model:              yup.string().required("Campo obligatorio").max(100),
  machine_serial:     yup.string().required("Campo obligatorio").max(100),
  engine_serial:      yup.string().nullable().optional(),
  model_year:         yup.number().nullable().optional().min(1900).max(2100),
  import_declaration: yup.string().nullable().optional(),
  purchase_order:     yup.string().nullable().optional(),
});

type FormData = yup.InferType<typeof schema>;

interface Props {
  open:    boolean;
  machine: MachineInfoResponse | null;
  onClose: (changed: boolean) => void;
  onSaved: (m: MachineInfoResponse) => void;
}

export default function MachineInfoDrawer({ open, machine, onClose, onSaved }: Props) {
  const ability     = useAbility();
  const canWrite    = ability.can("update", "ForeignTrade");
  const isEditing   = !!machine;
  const changedRef  = useRef(false);
  const [saving, setSaving]               = useState(false);
  const [localMachine, setLocalMachine]   = useState<MachineInfoResponse | null>(null);
  const [uploadingKey, setUploadingKey]   = useState<string | null>(null);
  const [removingId, setRemovingId]       = useState<string | null>(null);
  const [clearanceDate, setClearanceDate] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(schema),
  });

  useEffect(() => {
    if (!open) return;
    changedRef.current = false;
    setLocalMachine(machine);
    if (machine) {
      reset({
        plate:              machine.plate,
        brand:              machine.brand,
        model:              machine.model,
        machine_serial:     machine.machine_serial,
        engine_serial:      machine.engine_serial ?? "",
        model_year:         machine.model_year ?? undefined,
        import_declaration: machine.import_declaration ?? "",
        purchase_order:     machine.purchase_order ?? "",
      });
      setClearanceDate(machine.clearance_date ?? null);
    } else {
      reset({
        plate: "", brand: "", model: "", machine_serial: "",
        engine_serial: "", model_year: undefined,
        import_declaration: "", purchase_order: "",
      });
      setClearanceDate(null);
    }
  }, [open, machine, reset]);

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const payload = {
        ...data,
        engine_serial:      data.engine_serial      || null,
        import_declaration: data.import_declaration || null,
        clearance_date:     clearanceDate           || null,
        purchase_order:     data.purchase_order     || null,
        model_year:         data.model_year         || null,
      };
      const saved = isEditing
        ? await api.foreignTrade.update(machine!.id, payload)
        : await api.foreignTrade.create(payload);
      changedRef.current = true;
      setLocalMachine(saved);
      onSaved(saved);
      toast.success(isEditing ? "Actualizado correctamente" : "Máquina creada correctamente");
      if (!isEditing) onClose(true);
    } catch (e: unknown) {
      toast.error((e as { detail?: string }).detail ?? "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (docKey: string, file: File) => {
    if (!localMachine) return;
    setUploadingKey(docKey);
    try {
      const updated = await api.foreignTrade.uploadDocument(localMachine.id, file, docKey);
      changedRef.current = true;
      setLocalMachine(updated);
      onSaved(updated);
      toast.success("Documento cargado");
    } catch (e: unknown) {
      toast.error((e as { detail?: string }).detail ?? "Error al subir archivo");
    } finally {
      setUploadingKey(null);
    }
  };

  const handleRemoveDoc = async (doc: MachineInfoDocumentResponse) => {
    if (!localMachine) return;
    setRemovingId(doc.id);
    try {
      const updated = await api.foreignTrade.removeDocument(localMachine.id, doc.id);
      changedRef.current = true;
      setLocalMachine(updated);
      onSaved(updated);
      toast.success("Documento eliminado");
    } catch (e: unknown) {
      toast.error((e as { detail?: string }).detail ?? "Error al eliminar");
    } finally {
      setRemovingId(null);
    }
  };

  if (!open) return null;

  const activeDocs = (localMachine?.documents ?? []).filter((d) => d.is_active);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60" onClick={() => onClose(changedRef.current)} />

      <div className="w-full max-w-2xl bg-surface-2 border-l border-border flex flex-col h-full">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-fg font-semibold text-base">
              {isEditing ? `${machine!.plate} — ${machine!.brand} ${machine!.model}` : "Nueva máquina"}
            </h2>
            {isEditing && (
              <p className="text-fg-5 text-xs mt-0.5">Comercio Exterior / Info Maquinas</p>
            )}
          </div>
          <button onClick={() => onClose(changedRef.current)} className="text-fg-5 hover:text-fg p-1">
            <X size={18} />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ── Info general ── */}
          <section>
            <p className="text-xs font-semibold text-fg-5 uppercase tracking-wider mb-3">
              Información general
            </p>
            <div className="grid grid-cols-2 gap-4">
              {/* Placa */}
              <div>
                <label className="block text-xs font-medium text-fg-4 mb-1.5">Placa *</label>
                <input
                  className="w-full bg-surface-3 border border-border text-fg px-3.5 py-2.5 text-sm uppercase placeholder:normal-case placeholder:text-fg-6"
                  placeholder="MC757973"
                  {...register("plate")}
                />
                {errors.plate && <p className="text-red-400 text-xs mt-1">{errors.plate.message}</p>}
              </div>
              {/* Marca */}
              <div>
                <label className="block text-xs font-medium text-fg-4 mb-1.5">Marca *</label>
                <input
                  className="w-full bg-surface-3 border border-border text-fg px-3.5 py-2.5 text-sm placeholder:text-fg-6"
                  placeholder="LONKING"
                  {...register("brand")}
                />
                {errors.brand && <p className="text-red-400 text-xs mt-1">{errors.brand.message}</p>}
              </div>
              {/* Modelo */}
              <div>
                <label className="block text-xs font-medium text-fg-4 mb-1.5">Modelo *</label>
                <input
                  className="w-full bg-surface-3 border border-border text-fg px-3.5 py-2.5 text-sm placeholder:text-fg-6"
                  placeholder="CDM312"
                  {...register("model")}
                />
                {errors.model && <p className="text-red-400 text-xs mt-1">{errors.model.message}</p>}
              </div>
              {/* Año modelo */}
              <div>
                <label className="block text-xs font-medium text-fg-4 mb-1.5">Año Modelo</label>
                <input
                  type="number"
                  className="w-full bg-surface-3 border border-border text-fg px-3.5 py-2.5 text-sm placeholder:text-fg-6"
                  placeholder="2025"
                  {...register("model_year")}
                />
                {errors.model_year && <p className="text-red-400 text-xs mt-1">{errors.model_year.message}</p>}
              </div>
            </div>
          </section>

          {/* ── Seriales ── */}
          <section>
            <p className="text-xs font-semibold text-fg-5 uppercase tracking-wider mb-3">Seriales</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-fg-4 mb-1.5">Serial Máquina *</label>
                <input
                  className="w-full bg-surface-3 border border-border text-fg px-3.5 py-2.5 text-sm font-mono text-xs placeholder:text-fg-6 placeholder:font-sans placeholder:text-sm"
                  placeholder="LSL00312PSA100096"
                  {...register("machine_serial")}
                />
                {errors.machine_serial && <p className="text-red-400 text-xs mt-1">{errors.machine_serial.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-4 mb-1.5">Serial Motor</label>
                <input
                  className="w-full bg-surface-3 border border-border text-fg px-3.5 py-2.5 text-sm font-mono text-xs placeholder:text-fg-6 placeholder:font-sans placeholder:text-sm"
                  placeholder="CRY0355"
                  {...register("engine_serial")}
                />
              </div>
            </div>
          </section>

          {/* ── Importación ── */}
          <section>
            <p className="text-xs font-semibold text-fg-5 uppercase tracking-wider mb-3">Importación</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-fg-4 mb-1.5">Declaración de Importación</label>
                <input
                  className="w-full bg-surface-3 border border-border text-fg px-3.5 py-2.5 text-sm font-mono text-xs placeholder:text-fg-6 placeholder:font-sans placeholder:text-sm"
                  placeholder="32025001726378"
                  {...register("import_declaration")}
                />
              </div>
              <div>
                <DatePicker
                  label="Fecha Levante"
                  value={clearanceDate}
                  onChange={setClearanceDate}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-4 mb-1.5">Pedido CONINMAQ</label>
                <input
                  className="w-full bg-surface-3 border border-border text-fg px-3.5 py-2.5 text-sm placeholder:text-fg-6"
                  placeholder="MAQ.2025-001"
                  {...register("purchase_order")}
                />
              </div>
            </div>
          </section>

          {/* ── Documentos (solo en edición) ── */}
          {isEditing && localMachine && (
            <section>
              <p className="text-xs font-semibold text-fg-5 uppercase tracking-wider mb-3">
                Documentos e imágenes
              </p>
              <div className="space-y-2">
                {DOCUMENT_SLOTS.map((slot) => {
                  const DocIcon   = slot.icon;
                  const uploaded  = activeDocs.find((d) => d.document_key === slot.key);
                  const isLoading = uploadingKey === slot.key;
                  const isRemoving = removingId === uploaded?.id;

                  return (
                    <div
                      key={slot.key}
                      className={`flex items-center gap-3 px-4 py-3 border ${
                        uploaded ? "border-accent/30 bg-accent/5" : "border-border bg-surface-3"
                      }`}
                    >
                      <DocIcon
                        size={16}
                        className={uploaded ? "text-accent flex-shrink-0" : "text-fg-6 flex-shrink-0"}
                      />
                      <span className={`flex-1 text-sm ${uploaded ? "text-fg" : "text-fg-5"}`}>
                        {slot.label}
                      </span>

                      {uploaded ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-fg-5 max-w-[140px] truncate">{uploaded.file_name}</span>
                          <a
                            href={uploaded.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-fg-5 hover:text-accent transition-colors"
                            title="Ver / Descargar"
                          >
                            <ExternalLink size={13} />
                          </a>
                          <a
                            href={uploaded.file_url}
                            download={uploaded.file_name}
                            className="p-1.5 text-fg-5 hover:text-accent transition-colors"
                            title="Descargar"
                          >
                            <Download size={13} />
                          </a>
                          {canWrite && (
                            <button
                              onClick={() => handleRemoveDoc(uploaded)}
                              disabled={isRemoving}
                              className="p-1.5 text-fg-6 hover:text-red-400 transition-colors disabled:opacity-50"
                              title="Eliminar"
                            >
                              {isRemoving
                                ? <Loader2 size={13} className="animate-spin" />
                                : <Trash2 size={13} />
                              }
                            </button>
                          )}
                        </div>
                      ) : canWrite ? (
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept={slot.accept}
                            className="hidden"
                            disabled={isLoading}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleUpload(slot.key, f);
                              e.target.value = "";
                            }}
                          />
                          <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 border border-border text-fg-4 hover:text-fg hover:border-fg-5 transition-colors ${isLoading ? "opacity-50 pointer-events-none" : ""}`}>
                            {isLoading
                              ? <Loader2 size={12} className="animate-spin" />
                              : <Upload size={12} />
                            }
                            {isLoading ? "Subiendo..." : "Cargar"}
                          </span>
                        </label>
                      ) : (
                        <span className="text-xs text-fg-6">Sin archivo</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {!isEditing && (
            <p className="text-xs text-fg-6 bg-surface-3 border border-border px-4 py-3">
              Los documentos e imágenes se podrán cargar después de crear la máquina.
            </p>
          )}
        </div>

        {/* Footer */}
        {canWrite && (
          <footer className="px-6 py-4 border-t border-border flex gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => onClose(changedRef.current)}
              className="flex-1 py-2.5 text-sm text-fg-4 border border-border hover:bg-surface-3 transition-colors"
            >
              {isEditing ? "Cerrar" : "Cancelar"}
            </button>
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={saving}
              className="flex-1 py-2.5 text-sm bg-accent text-black font-semibold hover:bg-accent/90 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear máquina"}
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
