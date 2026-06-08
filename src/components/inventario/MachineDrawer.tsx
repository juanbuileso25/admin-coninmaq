import { useEffect, useRef, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  X, Plus, Trash2, Upload, ImageOff, GripVertical, ChevronDown,
} from "lucide-react";
import type { Machine } from "../../types/machine";
import { CATEGORIES } from "../../types/machine";

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
  visible_web: yup.boolean().default(true),
  featured:    yup.boolean().default(false),
});

type FormValues = yup.InferType<typeof schema>;

/* ── Props ── */
interface Props {
  open:    boolean;
  machine: Machine | null;
  onClose: () => void;
  onSave:  (data: Omit<Machine, "id" | "created_at" | "updated_at">) => Promise<void>;
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
export default function MachineDrawer({ open, machine, onClose, onSave }: Props) {
  const [imagePreview, setImagePreview] = useState<string>("");
  const [saving,       setSaving]       = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!machine;

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

  /* Populate form when editing */
  useEffect(() => {
    if (open && machine) {
      reset({
        code:          machine.code,
        brand:         machine.brand,
        category:      machine.category,
        model:         machine.model,
        description:   machine.description,
        price:         machine.price,
        show_price:    machine.show_price,
        warranty:      machine.warranty,
        delivery_time: machine.delivery_time,
        specs:         machine.specs.map(({ label, value, icon }) => ({ label, value, icon: icon ?? "" })),
        highlights:    machine.highlights.map(({ text }) => ({ text })),
        visible_web:   machine.visible_web,
        featured:      machine.featured,
      });
      setImagePreview(machine.image_url);
    } else if (open && !machine) {
      reset({ specs: [], highlights: [], visible_web: true, featured: false, price: 0 });
      setImagePreview("");
    }
  }, [open, machine, reset]);

  /* Image file handler */
  const handleImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  /* Submit */
  const onSubmit = async (data: FormValues) => {
    const slug = data.model.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    setSaving(true);
    try {
      await onSave({
        ...data,
        category:      data.category as Machine["category"],
        price:         data.price ?? 0,
        specs:         data.specs ?? [],
        highlights:    (data.highlights ?? []).map((h, i) => ({ text: h.text, order: i })),
        image_url:     imagePreview || machine?.image_url || "",
        pdf_url:       machine?.pdf_url || "",
        slug:          machine?.slug || slug,
        is_new:        machine?.is_new ?? true,
      });
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
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-xl bg-surface-2 border-l border-border flex flex-col h-full shadow-[−8px_0_40px_rgba(0,0,0,0.5)] animate-slide-in">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-fg font-semibold text-base">
              {isEditing ? "Editar máquina" : "Nueva máquina"}
            </h2>
            <p className="text-fg-5 text-xs mt-0.5">
              {isEditing ? machine.model : "Completa los campos del producto"}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-fg-5 hover:text-fg-2 hover:bg-surface-4 transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Form — scrollable */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ── IMAGEN ── */}
          <div>
            <Label>Imagen del producto</Label>
            <div
              className="relative h-40 bg-surface-3 border border-border-light flex items-center justify-center cursor-pointer
                         hover:border-accent/50 transition-colors group overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="preview" className="h-full w-full object-contain p-2" onError={() => setImagePreview("")} />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Upload size={18} className="text-white" />
                    <span className="text-white text-sm font-medium">Cambiar imagen</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-fg-6 group-hover:text-fg-4 transition-colors">
                  <ImageOff size={28} />
                  <span className="text-xs">Click para subir imagen</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleImageFile(e.target.files[0]); }}
            />
          </div>

          {/* ── INFORMACIÓN GENERAL ── */}
          <SectionTitle>Información general</SectionTitle>

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

        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border flex-shrink-0 bg-surface-2">
          <button
            type="button" onClick={onClose}
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
            {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear producto"}
          </button>
        </div>
      </div>
    </div>
  );
}
