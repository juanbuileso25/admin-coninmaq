import { useEffect, useRef, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  X, Plus, Trash2, Upload, GripVertical, ChevronDown, FileText, Star, Loader2, Film, ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { Machine, MachineImage, MachineMedia, MachineTypeOption } from "../../types/machine";
import { CATEGORIES, CONDITIONS } from "../../types/machine";
import { api } from "../../services/api";

/* ── Schema ── */
const schema = yup.object({
  code:          yup.string().required("Campo obligatorio"),
  brand:         yup.string().required("Campo obligatorio"),
  category:      yup.string().oneOf([...CATEGORIES]).required("Selecciona una categoría"),
  model:         yup.string().required("Campo obligatorio"),
  description:   yup.string().required("Campo obligatorio"),
  price:         yup.number().transform((v, o) => (o === "" ? 0 : v)).min(0).default(0),
  show_price:    yup.boolean().default(false),
  warranty:      yup.string().default(""),
  delivery_time: yup.string().default(""),
  specs: yup.array().of(
    yup.object({ label: yup.string().required(""), value: yup.string().required(""), icon: yup.string().default("") })
  ).default([]),
  highlights: yup.array().of(
    yup.object({ text: yup.string().required("") })
  ).default([]),
  visible_web:      yup.boolean().default(true),
  featured:         yup.boolean().default(false),
  machine_type_id:  yup.number().required("Selecciona un tipo"),
  // Used/rental machinery fields
  year:          yup.number().nullable().transform((_v, o) => (o === "" || o === null ? null : Number(o))).optional(),
  hours_used:    yup.string().default("").optional(),
  condition:     yup.string().default("").optional(),
  inspection:    yup.string().default("").optional(),
});

type FormValues = yup.InferType<typeof schema>;

/* ── Props ── */
interface Props {
  open:                    boolean;
  machine:                 Machine | null;
  duplicateFrom?:          Machine | null;
  defaultMachineTypeSlug?: string;
  onClose:                 (changed: boolean) => void;
  onSave:                  (data: Omit<Machine, "id" | "created_at" | "updated_at">) => Promise<Machine | undefined>;
}

/* ── Helpers ── */
const FIELD_CLASS =
  "w-full bg-surface-3 border border-border-light text-fg px-3.5 py-2.5 text-sm " +
  "placeholder:text-fg-6 outline-none transition-all duration-150 " +
  "focus:border-accent focus:shadow-glow-xs";

const ERROR_CLASS = "border-red-700 focus:border-red-600 focus:shadow-none";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-fg-4 text-[11px] font-medium uppercase tracking-wider mb-1.5">
      {children}
    </p>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-2 pb-1">
      <span className="text-fg-3 text-xs font-semibold uppercase tracking-wider">{children}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" onClick={onChange} className="flex items-center gap-3 group">
      <div className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${checked ? "bg-accent" : "bg-surface-5"}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${checked ? "left-4" : "left-0.5"}`} />
      </div>
      <span className={`text-xs transition-colors ${checked ? "text-fg-2" : "text-fg-5"} group-hover:text-fg-3`}>
        {label}
      </span>
    </button>
  );
}

/* ── Component ── */
export default function MachineDrawer({ open, machine, duplicateFrom, defaultMachineTypeSlug, onClose, onSave }: Props) {
  const [images,         setImages]         = useState<MachineImage[]>([]);
  const [pendingImages,  setPendingImages]  = useState<File[]>([]);
  const [pendingPdf,     setPendingPdf]     = useState<File | null>(null);
  const [pdfName,        setPdfName]        = useState<string>("");
  const [saving,           setSaving]           = useState(false);
  const [uploadingIdx,     setUploadingIdx]     = useState<number | null>(null);
  const [processingImgId,  setProcessingImgId]  = useState<string | null>(null);
  const [machineTypes,     setMachineTypes]     = useState<MachineTypeOption[]>([]);
  const [internalMedia,    setInternalMedia]    = useState<MachineMedia[]>([]);
  const [uploadingMedia,   setUploadingMedia]   = useState(false);
  const [deletingMediaId,  setDeletingMediaId]  = useState<string | null>(null);
  const fileInputRef    = useRef<HTMLInputElement>(null);
  const pdfInputRef     = useRef<HTMLInputElement>(null);
  const mediaInputRef   = useRef<HTMLInputElement>(null);
  const changedRef      = useRef(false);

  const isEditing = !!machine;
  const isDuplicating = !!duplicateFrom;

  /* Load machine types once */
  useEffect(() => {
    api.machineTypes.list().then((types) => setMachineTypes(types as unknown as MachineTypeOption[])).catch(() => {});
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: yupResolver(schema) as never,
    defaultValues: { specs: [], highlights: [], visible_web: true, featured: false },
  });

  const { fields: specFields, append: addSpec, remove: removeSpec } = useFieldArray({ control, name: "specs" });
  const { fields: hlFields,   append: addHl,   remove: removeHl   } = useFieldArray({ control, name: "highlights" });

  /* Populate form when editing or duplicating */
  useEffect(() => {
    const source = machine ?? (isDuplicating ? duplicateFrom : null);
    if (open && source) {
      reset({
        code:          isDuplicating ? "" : source.code,
        brand:         source.brand,
        category:      source.category,
        model:         source.model,
        description:   source.description,
        price:         source.price,
        show_price:    source.show_price,
        warranty:      source.warranty,
        delivery_time: source.delivery_time,
        specs:         source.specs.map(({ label, value, icon }) => ({ label, value, icon: icon ?? "" })),
        highlights:    source.highlights.map(({ text }) => ({ text })),
        visible_web:   source.visible_web,
        featured:      source.featured,
        machine_type_id: source.machine_type_id,
        year:          source.year ?? undefined,
        hours_used:    source.hours_used ?? "",
        condition:     source.condition ?? "",
        inspection:    source.inspection ?? "",
      });
      setImages(isDuplicating ? [] : source.images ?? []);
      setPdfName(isDuplicating ? "" : (source.pdf_url ? source.pdf_url.split("/").pop() ?? "" : ""));
    } else if (open && !source) {
      const defaultId = machineTypes.find((t) => t.slug === defaultMachineTypeSlug)?.id;
      reset({ specs: [], highlights: [], visible_web: true, featured: false, price: 0, machine_type_id: defaultId });
      setImages([]);
      setPdfName("");
    }
    setPendingImages([]);
    setPendingPdf(null);
    setInternalMedia([]);
    changedRef.current = false;

    // Load internal media for existing machines
    if (open && machine) {
      api.machines.listMedia(machine.id)
        .then((items) => setInternalMedia(items as unknown as MachineMedia[]))
        .catch(() => {});
    }
  }, [open, machine, machineTypes, reset]);

  /* Queue files for upload after save */
  const handleImageFiles = (files: File[]) => {
    setPendingImages((prev) => [...prev, ...files]);
  };

  /* Upload immediately if machine already exists (editing) */
  const handleUploadNow = async (files: File[]) => {
    if (!files.length || !machine) return;
    let uploaded = 0;
    for (let i = 0; i < files.length; i++) {
      setUploadingIdx(i);
      try {
        await api.machines.addImage(machine.id, files[i], images.length === 0 && i === 0);
        uploaded++;
      } catch {
        toast.error(`Error al subir imagen ${files[i].name}`);
      }
    }
    // Fetch fresco para reflejar el estado real del servidor
    if (uploaded > 0) {
      try {
        const fresh = await api.machines.get(machine.id);
        setImages(fresh.images ?? []);
      } catch { /* silencioso — las imágenes se verán al reabrir */ }
      changedRef.current = true;
      toast.success(uploaded === 1 ? "Imagen subida correctamente" : `${uploaded} imágenes subidas correctamente`);
    }
    setUploadingIdx(null);
  };

  const handleSetPrimary = async (imageId: string) => {
    if (!machine) return;
    setProcessingImgId(imageId);
    try {
      await api.machines.setPrimaryImage(machine.id, imageId);
      setImages((prev) => prev.map((img) => ({ ...img, is_primary: img.id === imageId })));
      changedRef.current = true;
      toast.success("Imagen principal actualizada");
    } catch {
      toast.error("Error al cambiar imagen principal");
    } finally {
      setProcessingImgId(null);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!machine) return;
    setProcessingImgId(imageId);
    try {
      await api.machines.deleteImage(machine.id, imageId);
      setImages((prev) => {
        const remaining = prev.filter((img) => img.id !== imageId);
        // Si era la principal, asignar principal a la primera restante (igual que el backend)
        const wasPrimary = prev.find((img) => img.id === imageId)?.is_primary ?? false;
        if (wasPrimary && remaining.length > 0) {
          remaining[0] = { ...remaining[0], is_primary: true };
        }
        return remaining;
      });
      changedRef.current = true;
      toast.success("Imagen eliminada");
    } catch {
      toast.error("Error al eliminar imagen");
    } finally {
      setProcessingImgId(null);
    }
  };

  const handleUploadMedia = async (files: File[]) => {
    if (!files.length || !machine) return;
    setUploadingMedia(true);
    let uploaded = 0;
    for (const file of files) {
      try {
        const item = await api.machines.uploadMedia(machine.id, file);
        setInternalMedia((prev) => [...prev, item as unknown as MachineMedia]);
        uploaded++;
      } catch (e: unknown) {
        const err = e as { status?: number; detail?: string };
        if (err.status === 415) {
          toast.error(`Tipo no permitido: ${file.name}`);
        } else if (err.status === 413) {
          toast.error(`Archivo demasiado grande: ${file.name}`);
        } else {
          toast.error(`Error al subir: ${file.name}`);
        }
      }
    }
    if (uploaded > 0) {
      changedRef.current = true;
      toast.success(uploaded === 1 ? "Archivo subido correctamente" : `${uploaded} archivos subidos`);
    }
    setUploadingMedia(false);
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (!machine) return;
    setDeletingMediaId(mediaId);
    try {
      await api.machines.deleteMedia(machine.id, mediaId);
      setInternalMedia((prev) => prev.filter((m) => m.id !== mediaId));
      changedRef.current = true;
      toast.success("Archivo eliminado");
    } catch {
      toast.error("Error al eliminar el archivo");
    } finally {
      setDeletingMediaId(null);
    }
  };

  const handlePdfFile = (file: File) => {
    setPendingPdf(file);
    setPdfName(file.name);
  };

  /* Submit: 1) save machine data  2) upload pending files if any */
  const onSubmit = async (data: FormValues) => {
    const slug = data.model.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    setSaving(true);
    try {
      const selectedType = machineTypes.find((t) => t.id === data.machine_type_id);
      const saved = await onSave({
        ...data,
        category:        data.category as Machine["category"],
        price:           data.price ?? 0,
        specs:           data.specs ?? [],
        highlights:      (data.highlights ?? []).map((h, i) => ({ text: h.text, order: i })),
        image_url:       isEditing ? (machine!.image_url || "") : "",
        pdf_url:         isEditing ? (machine!.pdf_url || "") : "",
        images:          isEditing ? (machine!.images || []) : [],
        media:           isEditing ? (machine!.media || []) : [],
        slug:            isEditing ? (machine!.slug) : slug,
        machine_type_id: data.machine_type_id!,
        machine_type:    selectedType ?? (machine ?? duplicateFrom)!.machine_type,
        year:            data.year ?? null,
        hours_used:      data.hours_used || null,
        condition:       data.condition || null,
        inspection:      data.inspection || null,
      });

      if (!saved) return; // handleSave mostró el error, no cerramos

      // Upload pending files after we have the machine ID
      if (saved.id) {
        for (let i = 0; i < pendingImages.length; i++) {
          try {
            const isFirst = images.length === 0 && i === 0;
            await api.machines.addImage(saved.id, pendingImages[i], isFirst);
          } catch {
            toast.error(`Error al subir imagen ${pendingImages[i].name}`);
          }
        }
        if (pendingImages.length > 0) toast.success("Imágenes subidas correctamente");

        if (pendingPdf) {
          try {
            await api.machines.uploadDocument(saved.id, pendingPdf);
            toast.success("PDF subido correctamente");
          } catch (e: unknown) {
            const err = e as { status?: number };
            if (err.status === 413) {
              toast.error("El archivo es demasiado grande (máx. 20 MB)");
            } else {
              toast.error("Error al subir el PDF");
            }
          }
        }
      }
      toast.success(isEditing ? "Máquina actualizada" : "Máquina creada");
      onClose(true);
    } catch (e: unknown) {
      const err = e as { detail?: string };
      toast.error(err.detail ?? "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  /* Prevent background scroll */
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => onClose(changedRef.current)} />

      {/* Panel */}
      <div className="w-full max-w-xl bg-surface-2 border-l border-border flex flex-col h-full shadow-[−8px_0_40px_rgba(0,0,0,0.5)] animate-slide-in">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-fg font-semibold text-base">
              {isEditing ? "Editar máquina" : isDuplicating ? "Duplicar máquina" : "Nueva máquina"}
            </h2>
            <p className="text-fg-5 text-xs mt-0.5">
              {isEditing ? machine.model : isDuplicating ? `Copia de ${duplicateFrom!.model}` : "Completa los campos del producto"}
            </p>
          </div>
          <button onClick={() => onClose(changedRef.current)} className="w-8 h-8 flex items-center justify-center text-fg-5 hover:text-fg-2 hover:bg-surface-4 transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Form — scrollable */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ── GALERÍA DE IMÁGENES ── */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label>Imágenes del producto</Label>
              <span className="text-fg-6 text-[10px]">{images.length} cargada{images.length !== 1 ? "s" : ""}</span>
            </div>

            {/* Grid de imágenes existentes */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {images.map((img) => (
                  <div key={img.id} className="relative group aspect-square bg-surface-3 border border-border overflow-hidden">
                    <img src={img.url} alt="" className="w-full h-full object-contain p-1" />

                    {/* Badge principal */}
                    {img.is_primary && processingImgId !== img.id && (
                      <span className="absolute top-1 left-1 bg-accent text-zinc-900 text-[9px] font-bold px-1.5 py-0.5 flex items-center gap-0.5">
                        <Star size={8} className="fill-zinc-900" /> Principal
                      </span>
                    )}

                    {/* Overlay — spinner si está procesando, acciones si no */}
                    {processingImgId === img.id ? (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <Loader2 size={20} className="animate-spin text-white" />
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
                        {!img.is_primary && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimary(img.id)}
                            className="text-[10px] font-semibold text-white bg-accent/80 hover:bg-accent px-2 py-1 transition-colors"
                          >
                            Hacer principal
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteImage(img.id)}
                          className="text-[10px] font-semibold text-white bg-red-700/80 hover:bg-red-600 px-2 py-1 transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Imágenes pendientes (nueva máquina) */}
            {pendingImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {pendingImages.map((f, i) => (
                  <div key={i} className="relative aspect-square bg-surface-3 border border-border overflow-hidden group">
                    <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-contain p-1" />
                    {i === 0 && images.length === 0 && (
                      <span className="absolute top-1 left-1 bg-accent text-zinc-900 text-[9px] font-bold px-1.5 py-0.5">
                        Principal
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => setPendingImages((prev) => prev.filter((_, j) => j !== i))}
                        className="text-[10px] font-semibold text-white bg-red-700/80 hover:bg-red-600 px-2 py-1"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Botón subir */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingIdx !== null}
              className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-border-light
                         text-fg-5 hover:text-accent hover:border-accent/40 text-xs transition-all disabled:opacity-50"
            >
              {uploadingIdx !== null
                ? <><Loader2 size={13} className="animate-spin" /> Subiendo...</>
                : <><Upload size={13} /> Agregar imágenes</>
              }
            </button>
            <input
              ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = "";
                if (isEditing) handleUploadNow(files);
                else handleImageFiles(files);
              }}
            />
          </div>

          {/* ── PDF / FICHA TÉCNICA ── */}
          <div>
            <Label>Ficha técnica (PDF)</Label>
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-3 bg-surface-3 border border-border-light px-4 py-3 cursor-pointer
                           hover:border-accent/50 transition-colors group flex-1 min-w-0"
                onClick={() => pdfInputRef.current?.click()}
              >
                <FileText size={18} className={pdfName ? "text-accent" : "text-fg-6 group-hover:text-fg-4"} />
                <span className={`text-sm truncate flex-1 ${pdfName ? "text-fg-2" : "text-fg-6 group-hover:text-fg-4"}`}>
                  {pdfName || "Click para subir PDF"}
                </span>
                <Upload size={14} className="text-fg-6 group-hover:text-fg-4 flex-shrink-0" />
              </div>
              {machine?.pdf_url && (
                <a
                  href={machine.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="w-10 h-10 flex items-center justify-center bg-surface-3 border border-border-light
                             text-fg-5 hover:text-accent hover:border-accent/50 transition-all flex-shrink-0"
                  title="Ver PDF"
                >
                  <FileText size={16} />
                </a>
              )}
            </div>
            <input
              ref={pdfInputRef} type="file" accept="application/pdf" className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handlePdfFile(e.target.files[0]); }}
            />
          </div>

          {/* ── INFORMACIÓN GENERAL ── */}
          <SectionTitle>Información general</SectionTitle>

          <div>
            <Label>Tipo de maquinaria *</Label>
            <div className="relative">
              <select
                {...register("machine_type_id", { valueAsNumber: true })}
                className={`${FIELD_CLASS} appearance-none pr-8 ${errors.machine_type_id ? ERROR_CLASS : ""}`}
              >
                <option value="">Seleccionar tipo...</option>
                {machineTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-5 pointer-events-none" />
            </div>
            {errors.machine_type_id && <p className="text-red-400 text-[10px] mt-1">{errors.machine_type_id.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Código / SKU *</Label>
              <input {...register("code")} placeholder="CDM6225" className={`${FIELD_CLASS} ${errors.code ? ERROR_CLASS : ""}`} />
              {errors.code && <p className="text-red-400 text-[10px] mt-1">{errors.code.message}</p>}
            </div>
            <div>
              <Label>Marca *</Label>
              <input {...register("brand")} placeholder="LONKING" className={`${FIELD_CLASS} ${errors.brand ? ERROR_CLASS : ""}`} />
              {errors.brand && <p className="text-red-400 text-[10px] mt-1">{errors.brand.message}</p>}
            </div>
          </div>

          <div>
            <Label>Categoría *</Label>
            <div className="relative">
              <select {...register("category")} className={`${FIELD_CLASS} appearance-none pr-8 ${errors.category ? ERROR_CLASS : ""}`}>
                <option value="">Seleccionar categoría...</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-5 pointer-events-none" />
            </div>
            {errors.category && <p className="text-red-400 text-[10px] mt-1">{errors.category.message}</p>}
          </div>

          <div>
            <Label>Nombre del modelo *</Label>
            <input {...register("model")} placeholder="Excavadora CDM6225" className={`${FIELD_CLASS} ${errors.model ? ERROR_CLASS : ""}`} />
            {errors.model && <p className="text-red-400 text-[10px] mt-1">{errors.model.message}</p>}
          </div>

          <div>
            <Label>Descripción corta *</Label>
            <textarea
              {...register("description")} rows={3}
              placeholder="Motor Cummins B6.7 de 129 kW (173 HP), peso operativo 21.8 ton..."
              className={`${FIELD_CLASS} resize-none ${errors.description ? ERROR_CLASS : ""}`}
            />
            {errors.description && <p className="text-red-400 text-[10px] mt-1">{errors.description.message}</p>}
          </div>

          {/* ── COMERCIAL ── */}
          <SectionTitle>Comercial</SectionTitle>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Precio (COP)</Label>
              <input
                type="number" {...register("price")} placeholder="0"
                className={`${FIELD_CLASS} ${errors.price ? ERROR_CLASS : ""}`}
              />
              {errors.price && <p className="text-red-400 text-[10px] mt-1">{errors.price.message}</p>}
            </div>
            <div>
              <Label>Garantía</Label>
              <input {...register("warranty")} placeholder="12 meses o 2.000 horas" className={FIELD_CLASS} />
            </div>
          </div>

          <div>
            <Label>Tiempo de entrega</Label>
            <input {...register("delivery_time")} placeholder="30 – 45 días hábiles" className={FIELD_CLASS} />
          </div>

          <div className="flex items-center gap-6">
            <Toggle
              checked={!!watch("show_price")}
              onChange={() => setValue("show_price", !watch("show_price"))}
              label="Mostrar precio en la web"
            />
          </div>

          {/* ── ESTADO DEL EQUIPO (maquinaria usada y renta) ── */}
          {machineTypes.find((t) => t.id === watch("machine_type_id"))?.slug !== "new" && watch("machine_type_id") && (
            <>
              <SectionTitle>Estado del equipo</SectionTitle>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Año de fabricación</Label>
                  <input
                    type="number" {...register("year")} placeholder="2019"
                    className={FIELD_CLASS}
                  />
                </div>
                <div>
                  <Label>Horas de uso</Label>
                  <input
                    {...register("hours_used")} placeholder="4.200 hrs"
                    className={FIELD_CLASS}
                  />
                </div>
              </div>

              <div>
                <Label>Condición</Label>
                <div className="relative">
                  <select {...register("condition")} className={`${FIELD_CLASS} appearance-none pr-8`}>
                    <option value="">Seleccionar condición...</option>
                    {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-5 pointer-events-none" />
                </div>
              </div>

              <div>
                <Label>Inspección técnica</Label>
                <input
                  {...register("inspection")}
                  placeholder="Inspección técnica certificada — Abril 2025"
                  className={FIELD_CLASS}
                />
              </div>
            </>
          )}

          {/* ── ESPECIFICACIONES TÉCNICAS ── */}
          <SectionTitle>Especificaciones técnicas</SectionTitle>

          <div className="space-y-2">
            {specFields.map((field, i) => (
              <div key={field.id} className="flex items-start gap-2 bg-surface-3 border border-border p-2.5">
                <GripVertical size={14} className="text-fg-6 mt-2.5 flex-shrink-0" />
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input
                    {...register(`specs.${i}.label`)} placeholder="Etiqueta (ej: Motor)"
                    className={`${FIELD_CLASS} text-xs py-2`}
                  />
                  <input
                    {...register(`specs.${i}.value`)} placeholder="Valor (ej: Cummins 173 HP)"
                    className={`${FIELD_CLASS} text-xs py-2`}
                  />
                </div>
                <button type="button" onClick={() => removeSpec(i)}
                  className="mt-1.5 text-fg-6 hover:text-red-400 transition-colors flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => addSpec({ label: "", value: "", icon: "" })}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-border-light
                         text-fg-5 hover:text-accent hover:border-accent/40 text-xs transition-all"
            >
              <Plus size={13} /> Agregar especificación
            </button>
          </div>

          {/* ── CARACTERÍSTICAS DESTACADAS ── */}
          <SectionTitle>Características destacadas</SectionTitle>

          <div className="space-y-2">
            {hlFields.map((field, i) => (
              <div key={field.id} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent/60 flex-shrink-0" />
                <input
                  {...register(`highlights.${i}.text`)}
                  placeholder="Característica del producto..."
                  className={`${FIELD_CLASS} flex-1 text-xs py-2`}
                />
                <button type="button" onClick={() => removeHl(i)}
                  className="text-fg-6 hover:text-red-400 transition-colors flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => addHl({ text: "" })}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-border-light
                         text-fg-5 hover:text-accent hover:border-accent/40 text-xs transition-all"
            >
              <Plus size={13} /> Agregar característica
            </button>
          </div>

          {/* ── PUBLICACIÓN ── */}
          <SectionTitle>Publicación</SectionTitle>

          <div className="flex flex-col gap-4 pb-2">
            <Toggle
              checked={!!watch("visible_web")}
              onChange={() => setValue("visible_web", !watch("visible_web"))}
              label="Visible en la página web"
            />
            <Toggle
              checked={!!watch("featured")}
              onChange={() => setValue("featured", !watch("featured"))}
              label="Producto destacado (aparece en inicio)"
            />
          </div>

          {/* ── RECURSOS ── */}
          <SectionTitle>Recursos</SectionTitle>

          {!isEditing ? (
            <p className="text-fg-6 text-xs py-2">Guarda la máquina primero para poder añadir recursos.</p>
          ) : (
            <div className="pb-2">
              {/* Grid de archivos subidos */}
              {internalMedia.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {internalMedia.map((item) => (
                    <div key={item.id} className="relative group bg-surface-3 border border-border overflow-hidden aspect-square">
                      {item.media_type === "image" ? (
                        <img src={item.url} alt={item.title ?? item.file_name} className="w-full h-full object-contain p-1" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-fg-5 p-2">
                          <Film size={28} className="text-accent/70" />
                          <span className="text-[9px] text-center truncate w-full px-1 text-fg-5">{item.file_name}</span>
                        </div>
                      )}

                      {/* Overlay */}
                      {deletingMediaId === item.id ? (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                          <Loader2 size={20} className="animate-spin text-white" />
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-semibold text-white bg-surface-4/80 hover:bg-surface-4 px-2 py-1 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {item.media_type === "video" ? "Ver / Descargar" : "Ver"}
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteMedia(item.id)}
                            className="text-[10px] font-semibold text-white bg-red-700/80 hover:bg-red-600 px-2 py-1 transition-colors"
                          >
                            Eliminar
                          </button>
                        </div>
                      )}

                      {/* Badge de tipo */}
                      <span className="absolute bottom-1 right-1 opacity-60">
                        {item.media_type === "video"
                          ? <Film size={10} className="text-white" />
                          : <ImageIcon size={10} className="text-white" />
                        }
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Botón subir */}
              <button
                type="button"
                onClick={() => mediaInputRef.current?.click()}
                disabled={uploadingMedia}
                className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-border-light
                           text-fg-5 hover:text-accent hover:border-accent/40 text-xs transition-all disabled:opacity-50"
              >
                {uploadingMedia
                  ? <><Loader2 size={13} className="animate-spin" /> Subiendo...</>
                  : <><Upload size={13} /> Agregar imágenes o videos</>
                }
              </button>
              <p className="text-fg-7 text-[10px] mt-1">
                Imágenes: jpg, png, webp (máx. 10 MB) · Videos: mp4, mov, avi (máx. 500 MB)
              </p>
              <input
                ref={mediaInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/x-msvideo"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.target.value = "";
                  handleUploadMedia(files);
                }}
              />
            </div>
          )}

        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border flex-shrink-0 bg-surface-2">
          <button
            type="button" onClick={() => onClose(changedRef.current)}
            className="px-5 py-2.5 text-sm text-fg-4 hover:text-fg-2 border border-border hover:border-border-light transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit" disabled={saving}
            onClick={handleSubmit(onSubmit)}
            className="px-6 py-2.5 text-sm font-semibold bg-accent hover:bg-accent-light text-zinc-900
                       hover:shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Guardando..." : isEditing ? "Guardar cambios" : isDuplicating ? "Crear copia" : "Crear producto"}
          </button>
        </div>
      </div>
    </div>
  );
}
