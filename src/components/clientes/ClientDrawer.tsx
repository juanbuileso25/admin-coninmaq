import { useEffect, useRef, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { X, Loader2, Plus, Trash2, UserCheck, Briefcase, Users, ShieldAlert, FileText, Download, Upload, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { api, type ClientResponse, type DocumentTypeResponse, type ClientDocumentResponse } from "../../services/api";
import SearchSelect from "../ui/SearchSelect";

// ── Constants ──────────────────────────────────────────────────────────────────

const INPUT_CLS  = "w-full bg-surface-3 border border-border-light text-fg px-3.5 py-2.5 text-sm placeholder:text-fg-6 outline-none focus:border-accent focus:shadow-glow-xs";
const SELECT_CLS = `${INPUT_CLS} cursor-pointer`;

// ── Schemas ────────────────────────────────────────────────────────────────────

const mainSchema = yup.object({
  name:               yup.string().required("Campo obligatorio"),
  document:           yup.string().required("Campo obligatorio"),
  document_type:      yup.string().nullable().default(null),
  address:            yup.string().nullable().default(null),
  phone:              yup.string().nullable().default(null),
  mobile:             yup.string().nullable().default(null),
  billing_email:      yup.string().email("Email inválido").nullable().default(null),
  info_email:         yup.string().email("Email inválido").nullable().default(null),
  treasury_contact:   yup.string().nullable().default(null),
  treasury_mobile:    yup.string().nullable().default(null),
  treasury_email:     yup.string().email("Email inválido").nullable().default(null),
  purchasing_contact: yup.string().nullable().default(null),
  purchasing_mobile:  yup.string().nullable().default(null),
  purchasing_email:   yup.string().email("Email inválido").nullable().default(null),
  obra_contact:       yup.string().nullable().default(null),
  obra_mobile:        yup.string().nullable().default(null),
  obra_email:         yup.string().email("Email inválido").nullable().default(null),
});

const refSchema = yup.object({
  name:    yup.string().required("Campo obligatorio"),
  address: yup.string().nullable().default(null),
  phone:   yup.string().nullable().default(null),
  email:   yup.string().email("Email inválido").nullable().default(null),
});

const repSchema = yup.object({
  first_name:      yup.string().required("Campo obligatorio"),
  last_name:       yup.string().required("Campo obligatorio"),
  document_type:   yup.string().nullable().default(null),
  document_number: yup.string().required("Campo obligatorio"),
  phone:           yup.string().nullable().default(null),
  email:           yup.string().email("Email inválido").nullable().default(null),
});

const partnerSchema = yup.object({
  first_name:               yup.string().required("Campo obligatorio"),
  last_name:                yup.string().required("Campo obligatorio"),
  document_type:            yup.string().nullable().default(null),
  document_number:          yup.string().required("Campo obligatorio"),
  phone:                    yup.string().nullable().default(null),
  participation_percentage: yup.number().min(0).max(100).nullable().default(null),
});

const pepSchema = yup.object({
  first_name:      yup.string().required("Campo obligatorio"),
  last_name:       yup.string().required("Campo obligatorio"),
  document_type:   yup.string().nullable().default(null),
  document_number: yup.string().required("Campo obligatorio"),
  phone:           yup.string().nullable().default(null),
  position:        yup.string().nullable().default(null),
  email:           yup.string().email("Email inválido").nullable().default(null),
});

type MainForm    = yup.InferType<typeof mainSchema>;
type RefForm     = yup.InferType<typeof refSchema>;
type RepForm     = yup.InferType<typeof repSchema>;
type PartnerForm = yup.InferType<typeof partnerSchema>;
type PepForm     = yup.InferType<typeof pepSchema>;

// ── Small helpers ──────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-fg-4 mb-1.5">{children}</label>;
}

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="text-red-400 text-xs mt-1">{msg}</p> : null;
}

// ── Tabs ───────────────────────────────────────────────────────────────────────

type Tab = "info" | "contactos" | "referencias" | "representantes" | "socios" | "pep" | "documentos";

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  open:    boolean;
  client:  ClientResponse | null;
  onClose: (changed: boolean) => void;
  onSaved: (client: ClientResponse) => void;
}

export default function ClientDrawer({ open, client, onClose, onSaved }: Props) {
  const isEditing  = !!client;
  const changedRef = useRef(false);

  const [tab,         setTab]         = useState<Tab>("info");
  const [saving,      setSaving]      = useState(false);
  const [localClient, setLocalClient] = useState<ClientResponse | null>(null);
  const [sendingLink, setSendingLink] = useState(false);

  const [docTypes,      setDocTypes]      = useState<DocumentTypeResponse[]>([]);
  const [cityId,        setCityId]        = useState<number | null>(null);
  const [cityLabel,     setCityLabel]     = useState("");
  const [activityId,    setActivityId]    = useState<number | null>(null);
  const [activityLabel, setActivityLabel] = useState("");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<MainForm>({
    resolver: yupResolver(mainSchema),
  });

  const loadDocTypes = useCallback(async () => {
    try { setDocTypes(await api.documentTypes.list()); } catch { /* silencioso */ }
  }, []);

  useEffect(() => { loadDocTypes(); }, [loadDocTypes]);

  useEffect(() => {
    if (!open) return;
    changedRef.current = false;
    setTab("info");
    setLocalClient(client);

    if (client) {
      reset({
        name:               client.name,
        document:           client.document,
        document_type:      client.document_type ?? null,
        address:            client.address ?? null,
        phone:              client.phone ?? null,
        mobile:             client.mobile ?? null,
        billing_email:      client.billing_email ?? null,
        info_email:         client.info_email ?? null,
        treasury_contact:   client.treasury_contact ?? null,
        treasury_mobile:    client.treasury_mobile ?? null,
        treasury_email:     client.treasury_email ?? null,
        purchasing_contact: client.purchasing_contact ?? null,
        purchasing_mobile:  client.purchasing_mobile ?? null,
        purchasing_email:   client.purchasing_email ?? null,
      });
      setCityId(client.city_id);
      setCityLabel(client.city?.name ?? "");
      setActivityId(client.economic_activity_id);
      setActivityLabel(
        client.economic_activity
          ? `${client.economic_activity.code} — ${client.economic_activity.description}`
          : ""
      );
    } else {
      reset({});
      setCityId(null); setCityLabel("");
      setActivityId(null); setActivityLabel("");
    }
  }, [open, client, reset]);

  const onSubmit = async (data: MainForm) => {
    setSaving(true);
    try {
      const payload = { ...data, city_id: cityId, economic_activity_id: activityId };
      const saved = isEditing
        ? await api.clients.update(client!.id, payload)
        : await api.clients.create(payload);
      changedRef.current = true;
      setLocalClient(saved);
      onSaved(saved);
      toast.success(isEditing ? "Cliente actualizado" : "Cliente creado");
      if (!isEditing) onClose(true);
    } catch (e: unknown) {
      toast.error((e as { detail?: string }).detail ?? "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const ALL_TABS: { id: Tab; label: string; icon: React.ElementType; editOnly?: boolean }[] = [
    { id: "info",           label: "Información",    icon: Briefcase    },
    { id: "contactos",      label: "Contactos",      icon: Users        },
    { id: "documentos",     label: "Documentos",     icon: FileText,    editOnly: true },
    { id: "referencias",    label: "Referencias",    icon: UserCheck,   editOnly: true },
    { id: "representantes", label: "Representantes", icon: UserCheck,   editOnly: true },
    { id: "socios",         label: "Socios",         icon: Users,       editOnly: true },
    { id: "pep",            label: "PEP",            icon: ShieldAlert, editOnly: true },
  ];
  const TABS = ALL_TABS.filter(t => !t.editOnly || isEditing);

  const showFooter = tab === "info" || tab === "contactos";

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => onClose(changedRef.current)} />

      <div className="w-full max-w-2xl bg-surface-2 border-l border-border flex flex-col h-full animate-slide-in">

        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-fg font-semibold text-base">
              {isEditing ? "Editar cliente" : "Nuevo cliente"}
            </h2>
            {isEditing && <p className="text-fg-5 text-xs mt-0.5">{client!.name}</p>}
          </div>
          <div className="flex items-center gap-2">
            {isEditing && (() => {
              const completed = localClient?.onboarding_completed_at;
              const sendOnboarding = async () => {
                if (!localClient) return;
                setSendingLink(true);
                try {
                  const res = await api.onboarding.send(localClient.id);
                  toast.success(res.message);
                } catch (e: unknown) {
                  toast.error((e as { detail?: string }).detail ?? "Error al enviar");
                } finally {
                  setSendingLink(false);
                }
              };
              return (
                <div className="flex items-center gap-2">
                  {completed && (
                    <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-2.5 py-1">
                      <CheckCircle2 size={12} /> Vinculado
                    </span>
                  )}
                  <button
                    disabled={sendingLink}
                    onClick={sendOnboarding}
                    className="flex items-center gap-1.5 text-xs text-accent border border-accent/30 hover:bg-accent/10 px-2.5 py-1 transition-colors disabled:opacity-50"
                  >
                    {sendingLink ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    {sendingLink ? "Enviando..." : completed ? "Reenviar" : "Enviar formulario"}
                  </button>
                </div>
              );
            })()}
            <button onClick={() => onClose(changedRef.current)} className="text-fg-5 hover:text-fg p-1 transition-colors">
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex border-b border-border flex-shrink-0 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2
                ${tab === t.id ? "border-accent text-accent" : "border-transparent text-fg-5 hover:text-fg-2"}`}
            >
              <t.icon size={13} />{t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Tab: Información */}
          {tab === "info" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nombre o razón social *</Label>
                <input className={INPUT_CLS} placeholder="EMPRESA S.A.S." {...register("name")} />
                <FieldError msg={errors.name?.message} />
              </div>

              <div>
                <Label>Tipo de documento</Label>
                <select className={SELECT_CLS} {...register("document_type")}>
                  <option value="">Seleccionar</option>
                  {docTypes.map(t => <option key={t.code} value={t.code}>{t.code} — {t.description}</option>)}
                </select>
              </div>

              <div>
                <Label>Número de documento *</Label>
                <input className={INPUT_CLS} placeholder="900123456-7" {...register("document")} />
                <FieldError msg={errors.document?.message} />
              </div>

              <div className="col-span-2">
                <Label>Actividad económica (CIIU)</Label>
                <SearchSelect
                  value={activityId}
                  displayValue={activityLabel}
                  placeholder="Buscar por código o descripción..."
                  onSelect={(id, label) => { setActivityId(id); setActivityLabel(label); }}
                  onSearch={async (q) => {
                    const res = await api.economicActivities.search(q || undefined, 20);
                    return res.map(r => ({ id: r.id, label: `${r.code} — ${r.description}` }));
                  }}
                />
              </div>

              <div className="col-span-2">
                <Label>Ciudad</Label>
                <SearchSelect
                  value={cityId}
                  displayValue={cityLabel}
                  placeholder="Buscar ciudad..."
                  onSelect={(id, label) => { setCityId(id); setCityLabel(label); }}
                  onSearch={async (q) => {
                    const res = await api.locations.cities(q || undefined, undefined, 20);
                    return res.map(r => ({ id: r.id, label: r.name }));
                  }}
                />
              </div>

              <div className="col-span-2">
                <Label>Dirección</Label>
                <input className={INPUT_CLS} placeholder="Calle 123 # 45-67" {...register("address")} />
              </div>
            </div>
          )}

          {/* Tab: Contactos */}
          {tab === "contactos" && (
            <div className="space-y-5">
              <Section label="General">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Teléfono</Label>
                    <input className={INPUT_CLS} placeholder="601 234 5678" {...register("phone")} />
                  </div>
                  <div>
                    <Label>Celular</Label>
                    <input className={INPUT_CLS} placeholder="300 123 4567" {...register("mobile")} />
                  </div>
                  <div>
                    <Label>Correo facturación</Label>
                    <input className={INPUT_CLS} placeholder="facturacion@empresa.com" {...register("billing_email")} />
                    <FieldError msg={errors.billing_email?.message} />
                  </div>
                  <div>
                    <Label>Correo información</Label>
                    <input className={INPUT_CLS} placeholder="info@empresa.com" {...register("info_email")} />
                    <FieldError msg={errors.info_email?.message} />
                  </div>
                </div>
              </Section>

              <Section label="Tesorería">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Contacto</Label>
                    <input className={INPUT_CLS} placeholder="Nombre del contacto" {...register("treasury_contact")} />
                  </div>
                  <div>
                    <Label>Celular</Label>
                    <input className={INPUT_CLS} placeholder="300 000 0000" {...register("treasury_mobile")} />
                  </div>
                  <div>
                    <Label>Correo</Label>
                    <input className={INPUT_CLS} placeholder="tesoreria@empresa.com" {...register("treasury_email")} />
                    <FieldError msg={errors.treasury_email?.message} />
                  </div>
                </div>
              </Section>

              <Section label="Compras">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Contacto</Label>
                    <input className={INPUT_CLS} placeholder="Nombre del contacto" {...register("purchasing_contact")} />
                  </div>
                  <div>
                    <Label>Celular</Label>
                    <input className={INPUT_CLS} placeholder="300 000 0000" {...register("purchasing_mobile")} />
                  </div>
                  <div>
                    <Label>Correo</Label>
                    <input className={INPUT_CLS} placeholder="compras@empresa.com" {...register("purchasing_email")} />
                    <FieldError msg={errors.purchasing_email?.message} />
                  </div>
                </div>
              </Section>

              <Section label="Obra">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Contacto</Label>
                    <input className={INPUT_CLS} placeholder="Nombre del contacto" {...register("obra_contact" as any)} />
                  </div>
                  <div>
                    <Label>Celular</Label>
                    <input className={INPUT_CLS} placeholder="300 000 0000" {...register("obra_mobile" as any)} />
                  </div>
                  <div>
                    <Label>Correo</Label>
                    <input className={INPUT_CLS} placeholder="obra@empresa.com" {...register("obra_email" as any)} />
                  </div>
                </div>
              </Section>
            </div>
          )}

          {/* Tab: Referencias comerciales */}
          {tab === "referencias" && localClient && (
            <SubTab
              items={localClient.commercial_references.filter(r => r.is_active)}
              renderItem={(r) => (
                <>
                  <p className="text-sm font-medium text-fg">{r.name}</p>
                  <p className="text-xs text-fg-5">{[r.phone, r.email].filter(Boolean).join(" · ")}</p>
                </>
              )}
              onRemove={async (id) => {
                const updated = await api.clients.removeReference(localClient.id, id);
                setLocalClient(updated); changedRef.current = true;
              }}
            >
              <AddRefForm onAdd={async (data) => {
                const updated = await api.clients.addReference(localClient.id, data);
                setLocalClient(updated); changedRef.current = true;
              }} />
            </SubTab>
          )}

          {/* Tab: Representantes legales */}
          {tab === "representantes" && localClient && (
            <SubTab
              items={localClient.legal_representatives.filter(r => r.is_active)}
              renderItem={(r) => (
                <>
                  <p className="text-sm font-medium text-fg">{r.first_name} {r.last_name}</p>
                  <p className="text-xs text-fg-5">{[r.document_type, r.document_number, r.email].filter(Boolean).join(" · ")}</p>
                </>
              )}
              onRemove={async (id) => {
                const updated = await api.clients.removeLegalRep(localClient.id, id);
                setLocalClient(updated); changedRef.current = true;
              }}
            >
              <AddRepForm docTypes={docTypes} onAdd={async (data) => {
                const updated = await api.clients.addLegalRep(localClient.id, data);
                setLocalClient(updated); changedRef.current = true;
              }} />
            </SubTab>
          )}

          {/* Tab: Socios y beneficiarios */}
          {tab === "socios" && localClient && (
            <SubTab
              items={localClient.partners.filter(p => p.is_active)}
              renderItem={(p) => (
                <>
                  <p className="text-sm font-medium text-fg">{p.first_name} {p.last_name}</p>
                  <p className="text-xs text-fg-5">
                    {[p.document_type, p.document_number, p.participation_percentage != null ? `${p.participation_percentage}%` : null].filter(Boolean).join(" · ")}
                  </p>
                </>
              )}
              onRemove={async (id) => {
                const updated = await api.clients.removePartner(localClient.id, id);
                setLocalClient(updated); changedRef.current = true;
              }}
            >
              <AddPartnerForm docTypes={docTypes} onAdd={async (data) => {
                const updated = await api.clients.addPartner(localClient.id, data);
                setLocalClient(updated); changedRef.current = true;
              }} />
            </SubTab>
          )}

          {/* Tab: Documentos */}
          {tab === "documentos" && localClient && (
            <DocumentsTab
              client={localClient}
              onUpdated={(updated) => { setLocalClient(updated); changedRef.current = true; }}
            />
          )}

          {/* Tab: PEP */}
          {tab === "pep" && localClient && (
            <SubTab
              items={localClient.pep.filter(p => p.is_active)}
              renderItem={(p) => (
                <>
                  <p className="text-sm font-medium text-fg">{p.first_name} {p.last_name}</p>
                  <p className="text-xs text-fg-5">{[p.position, p.email].filter(Boolean).join(" · ")}</p>
                </>
              )}
              onRemove={async (id) => {
                const updated = await api.clients.removePep(localClient.id, id);
                setLocalClient(updated); changedRef.current = true;
              }}
            >
              <AddPepForm docTypes={docTypes} onAdd={async (data) => {
                const updated = await api.clients.addPep(localClient.id, data);
                setLocalClient(updated); changedRef.current = true;
              }} />
            </SubTab>
          )}
        </div>

        {/* Footer */}
        {showFooter && (
          <footer className="px-6 py-4 border-t border-border flex gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => onClose(changedRef.current)}
              className="flex-1 py-2.5 text-sm text-fg-4 border border-border hover:border-fg-5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={saving}
              className="flex-1 py-2.5 text-sm bg-accent text-black font-semibold hover:bg-accent/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear cliente"}
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-fg-5 font-medium mb-3">{label}</p>
      {children}
    </div>
  );
}

// ── Generic sub-resource tab ───────────────────────────────────────────────────

function SubTab<T extends { id: string }>({
  items, renderItem, onRemove, children
}: {
  items:       T[];
  renderItem:  (item: T) => React.ReactNode;
  onRemove:    (id: string) => Promise<void>;
  children:    React.ReactNode;
}) {
  const [removing, setRemoving] = useState<string | null>(null);

  const handleRemove = async (id: string) => {
    setRemoving(id);
    try {
      await onRemove(id);
      toast.success("Registro desactivado");
    } catch (e: unknown) {
      toast.error((e as { detail?: string }).detail ?? "Error");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        {items.length === 0 && (
          <p className="text-fg-5 text-sm py-6 text-center">Sin registros</p>
        )}
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-3 bg-surface-3 border border-border px-3 py-2.5">
            <div className="flex-1">{renderItem(item)}</div>
            <button
              onClick={() => handleRemove(item.id)}
              disabled={removing === item.id}
              className="text-fg-6 hover:text-red-400 transition-colors p-1 disabled:opacity-50"
            >
              {removing === item.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          </div>
        ))}
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-xs uppercase tracking-wider text-fg-5 font-medium mb-3 flex items-center gap-1.5">
          <Plus size={12} /> Agregar
        </p>
        {children}
      </div>
    </div>
  );
}

// ── Add forms ──────────────────────────────────────────────────────────────────

// ── Add forms ──────────────────────────────────────────────────────────────────
// docTypes passed as prop so forms don't fetch independently

function AddRefForm({ onAdd }: { onAdd: (data: RefForm) => Promise<void> }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<RefForm>({ resolver: yupResolver(refSchema) });
  return (
    <form onSubmit={handleSubmit(async (d) => { await onAdd(d); reset(); toast.success("Referencia agregada"); })} className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <input className={INPUT_CLS} placeholder="Nombre o empresa *" {...register("name")} />
        <FieldError msg={errors.name?.message} />
      </div>
      <input className={INPUT_CLS} placeholder="Teléfono" {...register("phone")} />
      <input className={INPUT_CLS} placeholder="Correo" {...register("email")} />
      <div className="col-span-2"><input className={INPUT_CLS} placeholder="Dirección" {...register("address")} /></div>
      <SubmitBtn isSubmitting={isSubmitting} label="Agregar referencia" />
    </form>
  );
}

function AddRepForm({ onAdd, docTypes }: { onAdd: (data: RepForm) => Promise<void>; docTypes: DocumentTypeResponse[] }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<RepForm>({ resolver: yupResolver(repSchema) });
  return (
    <form onSubmit={handleSubmit(async (d) => { await onAdd(d); reset(); toast.success("Representante agregado"); })} className="grid grid-cols-2 gap-3">
      <div><input className={INPUT_CLS} placeholder="Nombre *" {...register("first_name")} /><FieldError msg={errors.first_name?.message} /></div>
      <div><input className={INPUT_CLS} placeholder="Apellido *" {...register("last_name")} /><FieldError msg={errors.last_name?.message} /></div>
      <select className={SELECT_CLS} {...register("document_type")}><option value="">Tipo doc.</option>{docTypes.map(t => <option key={t.code} value={t.code}>{t.code} — {t.description}</option>)}</select>
      <div><input className={INPUT_CLS} placeholder="Número doc. *" {...register("document_number")} /><FieldError msg={errors.document_number?.message} /></div>
      <input className={INPUT_CLS} placeholder="Teléfono" {...register("phone")} />
      <input className={INPUT_CLS} placeholder="Correo" {...register("email")} />
      <SubmitBtn isSubmitting={isSubmitting} label="Agregar representante" />
    </form>
  );
}

function AddPartnerForm({ onAdd, docTypes }: { onAdd: (data: PartnerForm) => Promise<void>; docTypes: DocumentTypeResponse[] }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PartnerForm>({ resolver: yupResolver(partnerSchema) });
  return (
    <form onSubmit={handleSubmit(async (d) => { await onAdd(d); reset(); toast.success("Socio agregado"); })} className="grid grid-cols-2 gap-3">
      <div><input className={INPUT_CLS} placeholder="Nombre *" {...register("first_name")} /><FieldError msg={errors.first_name?.message} /></div>
      <div><input className={INPUT_CLS} placeholder="Apellido *" {...register("last_name")} /><FieldError msg={errors.last_name?.message} /></div>
      <select className={SELECT_CLS} {...register("document_type")}><option value="">Tipo doc.</option>{docTypes.map(t => <option key={t.code} value={t.code}>{t.code} — {t.description}</option>)}</select>
      <div><input className={INPUT_CLS} placeholder="Número doc. *" {...register("document_number")} /><FieldError msg={errors.document_number?.message} /></div>
      <input className={INPUT_CLS} placeholder="Teléfono" {...register("phone")} />
      <input className={INPUT_CLS} type="number" placeholder="% Participación" {...register("participation_percentage")} />
      <SubmitBtn isSubmitting={isSubmitting} label="Agregar socio" />
    </form>
  );
}

function AddPepForm({ onAdd, docTypes }: { onAdd: (data: PepForm) => Promise<void>; docTypes: DocumentTypeResponse[] }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PepForm>({ resolver: yupResolver(pepSchema) });
  return (
    <form onSubmit={handleSubmit(async (d) => { await onAdd(d); reset(); toast.success("PEP agregado"); })} className="grid grid-cols-2 gap-3">
      <div><input className={INPUT_CLS} placeholder="Nombre *" {...register("first_name")} /><FieldError msg={errors.first_name?.message} /></div>
      <div><input className={INPUT_CLS} placeholder="Apellido *" {...register("last_name")} /><FieldError msg={errors.last_name?.message} /></div>
      <select className={SELECT_CLS} {...register("document_type")}><option value="">Tipo doc.</option>{docTypes.map(t => <option key={t.code} value={t.code}>{t.code} — {t.description}</option>)}</select>
      <div><input className={INPUT_CLS} placeholder="Número doc. *" {...register("document_number")} /><FieldError msg={errors.document_number?.message} /></div>
      <input className={INPUT_CLS} placeholder="Teléfono" {...register("phone")} />
      <input className={INPUT_CLS} placeholder="Cargo" {...register("position")} />
      <input className={INPUT_CLS} placeholder="Correo" {...register("email")} />
      <SubmitBtn isSubmitting={isSubmitting} label="Agregar PEP" />
    </form>
  );
}

// ── Documents tab ──────────────────────────────────────────────────────────────

function DocumentsTab({ client, onUpdated }: { client: ClientResponse; onUpdated: (c: ClientResponse) => void }) {
  const [label,     setLabel]     = useState("");
  const [file,      setFile]      = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing,  setRemoving]  = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const docs = client.documents.filter(d => d.is_active);

  const handleUpload = async () => {
    if (!file || !label.trim()) { toast.error("Ingresa un nombre y selecciona un archivo"); return; }
    setUploading(true);
    try {
      const updated = await api.clients.uploadDocument(client.id, file, label.trim());
      onUpdated(updated);
      setLabel(""); setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      toast.success("Documento subido");
    } catch (e: unknown) {
      toast.error((e as { detail?: string }).detail ?? "Error al subir");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (doc: ClientDocumentResponse) => {
    setRemoving(doc.id);
    try {
      const updated = await api.clients.removeDocument(client.id, doc.id);
      onUpdated(updated);
      toast.success("Documento eliminado");
    } catch (e: unknown) {
      toast.error((e as { detail?: string }).detail ?? "Error");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Lista */}
      <div className="space-y-2">
        {docs.length === 0 && (
          <p className="text-fg-5 text-sm py-6 text-center">Sin documentos</p>
        )}
        {docs.map(doc => (
          <div key={doc.id} className="flex items-center gap-3 bg-surface-3 border border-border px-3 py-2.5">
            <FileText size={16} className="text-fg-5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-fg truncate">{doc.label}</p>
              <p className="text-xs text-fg-5 truncate">{doc.file_name}</p>
            </div>
            <a
              href={doc.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-fg-5 hover:text-accent transition-colors"
              title="Descargar"
            >
              <Download size={14} />
            </a>
            <button
              onClick={() => handleRemove(doc)}
              disabled={removing === doc.id}
              className="p-1.5 text-fg-5 hover:text-red-400 transition-colors disabled:opacity-50"
              title="Eliminar"
            >
              {removing === doc.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          </div>
        ))}
      </div>

      {/* Upload form */}
      <div className="border-t border-border pt-4 space-y-3">
        <p className="text-xs uppercase tracking-wider text-fg-5 font-medium flex items-center gap-1.5">
          <Upload size={12} /> Subir documento
        </p>
        <input
          className={INPUT_CLS}
          placeholder="Nombre del documento (ej: RUT, Cámara de Comercio...)"
          value={label}
          onChange={e => setLabel(e.target.value)}
        />
        <div
          className="border border-dashed border-border hover:border-accent transition-colors cursor-pointer px-4 py-3 text-center"
          onClick={() => inputRef.current?.click()}
        >
          {file ? (
            <p className="text-sm text-fg-2">{file.name}</p>
          ) : (
            <p className="text-sm text-fg-5">Haz clic para seleccionar archivo</p>
          )}
          <input ref={inputRef} type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <button
          onClick={handleUpload}
          disabled={uploading || !file || !label.trim()}
          className="w-full py-2.5 bg-surface-3 border border-border text-accent text-sm font-medium hover:border-accent transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          {uploading ? "Subiendo..." : "Subir documento"}
        </button>
      </div>
    </div>
  );
}

function SubmitBtn({ isSubmitting, label }: { isSubmitting: boolean; label: string }) {
  return (
    <button type="submit" disabled={isSubmitting} className="col-span-2 py-2 bg-surface-3 border border-border text-accent text-sm font-medium hover:border-accent transition-colors flex items-center justify-center gap-2">
      {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
      {label}
    </button>
  );
}
