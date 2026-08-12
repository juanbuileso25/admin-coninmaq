import { useState, useEffect, useRef } from "react";
import { Plus, Upload, Trash2, X, Pencil, Users, ChevronRight, Loader2, Search, CheckCircle2, Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { api, type EmployeeOut } from "../../services/api";

const EMPLOYEE_DOC_LABELS: Record<string, string> = {
  cc:                    "Cédula de ciudadanía",
  certificado_salud:     "Certificado de Salud",
  certificado_cesantias: "Certificado de Cesantías",
  certificado_arl:       "Certificado de ARL",
  caja_compensacion:     "Caja de compensación",
  certificado_bancario:  "Certificado bancario",
  hoja_de_vida:          "Hoja de vida",
  contrato:              "Contrato",
  diplomas_estudio:      "Diplomas de estudio",
  examenes_medicos:      "Exámenes médicos",
  induccion_sst:         "Inducción SST",
};

const TOTAL_TYPES = Object.keys(EMPLOYEE_DOC_LABELS).length;

type InfoForm = {
  full_name: string; cc: string; phone: string; email: string;
  address: string; emergency_contact: string; emergency_phone: string;
};

const emptyForm = (): InfoForm => ({
  full_name: "", cc: "", phone: "", email: "", address: "", emergency_contact: "", emergency_phone: "",
});

export default function EmpleadosPage() {
  const [employees,  setEmployees]  = useState<EmployeeOut[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState<EmployeeOut | null>(null);
  const [search,     setSearch]     = useState("");

  // New employee modal
  const [showNew,    setShowNew]    = useState(false);
  const [newForm,    setNewForm]    = useState<InfoForm>(emptyForm());
  const [creating,   setCreating]   = useState(false);

  // Info editing
  const [editInfo,   setEditInfo]   = useState<InfoForm | null>(null);
  const [savingInfo, setSavingInfo] = useState(false);

  // Upload
  const fileRef        = useRef<HTMLInputElement>(null);
  const [uploadType,   setUploadType]   = useState<string | null>(null);
  const [deletingType, setDeletingType] = useState<string | null>(null);
  const [deletingEmp,  setDeletingEmp]  = useState(false);

  const load = async () => {
    try {
      const data = await api.companyDocs.listEmployees();
      setEmployees(data);
      setSelected(prev => prev ? (data.find(e => e.id === prev.id) ?? null) : null);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = employees.filter(e =>
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (e.cc ?? "").includes(search)
  );

  const handleCreate = async () => {
    if (!newForm.full_name.trim()) return;
    setCreating(true);
    try {
      const payload = {
        full_name:         newForm.full_name.trim(),
        cc:                newForm.cc.trim() || undefined,
        phone:             newForm.phone.trim() || undefined,
        email:             newForm.email.trim() || undefined,
        address:           newForm.address.trim() || undefined,
        emergency_contact: newForm.emergency_contact.trim() || undefined,
        emergency_phone:   newForm.emergency_phone.trim() || undefined,
      };
      const created = await api.companyDocs.createEmployee(payload);
      setEmployees(prev => [...prev, created].sort((a, b) => a.full_name.localeCompare(b.full_name)));
      setSelected(created);
      setShowNew(false); setNewForm(emptyForm());
      toast.success("Empleado creado");
    } catch (e: any) { toast.error(e.detail ?? "Error al crear"); }
    finally { setCreating(false); }
  };

  const startEdit = () => {
    if (!selected) return;
    setEditInfo({
      full_name:         selected.full_name,
      cc:                selected.cc ?? "",
      phone:             selected.phone ?? "",
      email:             selected.email ?? "",
      address:           selected.address ?? "",
      emergency_contact: selected.emergency_contact ?? "",
      emergency_phone:   selected.emergency_phone ?? "",
    });
  };

  const handleSaveInfo = async () => {
    if (!selected || !editInfo) return;
    setSavingInfo(true);
    try {
      const updated = await api.companyDocs.updateEmployee(selected.id, {
        full_name:         editInfo.full_name.trim() || undefined,
        cc:                editInfo.cc.trim() || undefined,
        phone:             editInfo.phone.trim() || undefined,
        email:             editInfo.email.trim() || undefined,
        address:           editInfo.address.trim() || undefined,
        emergency_contact: editInfo.emergency_contact.trim() || undefined,
        emergency_phone:   editInfo.emergency_phone.trim() || undefined,
      });
      setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
      setSelected(updated); setEditInfo(null);
      toast.success("Información actualizada");
    } catch (e: any) { toast.error(e.detail ?? "Error al guardar"); }
    finally { setSavingInfo(false); }
  };

  const handleUploadClick = (docType: string) => {
    setUploadType(docType);
    fileRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected || !uploadType) return;
    e.target.value = "";
    const tid = toast.loading("Subiendo...");
    try {
      const updated = await api.companyDocs.uploadEmployeeDoc(selected.id, uploadType, file);
      setEmployees(prev => prev.map(emp => emp.id === updated.id ? updated : emp));
      setSelected(updated);
      toast.success("Documento subido", { id: tid });
    } catch (err: any) { toast.error(err.detail ?? "Error al subir", { id: tid }); }
    finally { setUploadType(null); }
  };

  const handleDeleteDoc = async (docType: string) => {
    if (!selected) return;
    setDeletingType(docType);
    try {
      await api.companyDocs.deleteEmployeeDoc(selected.id, docType);
      const updated = { ...selected, documents: selected.documents.filter(d => d.doc_type !== docType) };
      setEmployees(prev => prev.map(e => e.id === selected.id ? updated : e));
      setSelected(updated);
      toast.success("Documento eliminado");
    } catch (e: any) { toast.error(e.detail ?? "Error"); }
    finally { setDeletingType(null); }
  };

  const handleDeleteEmployee = async () => {
    if (!selected || !confirm(`¿Eliminar a "${selected.full_name}"? Se eliminarán todos sus documentos.`)) return;
    setDeletingEmp(true);
    try {
      await api.companyDocs.deleteEmployee(selected.id);
      setEmployees(prev => prev.filter(e => e.id !== selected.id));
      setSelected(null);
      toast.success("Empleado eliminado");
    } catch (e: any) { toast.error(e.detail ?? "Error"); }
    finally { setDeletingEmp(false); }
  };

  const docsCount = selected?.documents.length ?? 0;

  const InfoField = ({ label, value, field, form, setForm }: {
    label: string; value: string | null; field: keyof InfoForm;
    form: InfoForm | null; setForm: (f: InfoForm) => void;
  }) => (
    <div className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
      <span className="text-xs text-fg-6 w-32 md:w-36 flex-shrink-0 pt-0.5">{label}</span>
      {form ? (
        <input
          className="flex-1 bg-surface-3 border border-border text-fg text-xs px-2.5 py-1.5 outline-none focus:border-accent placeholder:text-fg-6"
          value={form[field]}
          onChange={e => setForm({ ...form, [field]: e.target.value })}
        />
      ) : (
        <span className="text-xs text-fg-3 flex-1">{value || <span className="text-fg-6">—</span>}</span>
      )}
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden">
      <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} />

      {/* ── Lista izquierda — oculta en móvil cuando hay seleccionado ── */}
      <div className={`
        w-full md:w-72 flex-shrink-0 border-r border-border flex flex-col bg-surface-2
        ${selected ? "hidden md:flex" : "flex"}
      `}>
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-fg uppercase tracking-wider">Empleados</h2>
            <button onClick={() => setShowNew(true)} className="flex items-center gap-1 px-2.5 py-1.5 bg-accent text-black text-xs font-semibold hover:bg-accent/90 transition-colors">
              <Plus size={12} /> Nuevo
            </button>
          </div>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-6" />
            <input
              className="w-full bg-surface-3 border border-border text-fg text-xs px-2.5 py-2 pl-7 outline-none focus:border-accent placeholder:text-fg-6"
              placeholder="Buscar por nombre o CC..."
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 size={16} className="animate-spin text-fg-6" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-fg-6 text-xs py-10">Sin resultados</p>
          ) : filtered.map(emp => {
            const pct = (emp.documents.length / TOTAL_TYPES) * 100;
            const isSelected = selected?.id === emp.id;
            const initials = emp.full_name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
            return (
              <button
                key={emp.id}
                onClick={() => { setSelected(emp); setEditInfo(null); }}
                className={`w-full text-left px-4 py-3 border-b border-border transition-colors flex items-center gap-3 group ${
                  isSelected ? "bg-accent-muted border-l-2 border-l-accent pl-[14px]" : "hover:bg-surface-3"
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold ${isSelected ? "bg-accent/20 text-accent" : "bg-surface-3 text-fg-5"}`}>
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-fg truncate">{emp.full_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-fg-6">{emp.cc ?? "Sin CC"}</span>
                    <div className="flex-1 h-1 bg-surface-3 rounded-full overflow-hidden">
                      <div className="h-1 bg-accent/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-fg-6">{emp.documents.length}/{TOTAL_TYPES}</span>
                  </div>
                </div>
                <ChevronRight size={12} className="text-fg-6 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Panel derecho — ocupa todo en móvil ── */}
      {selected ? (
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 md:px-6 py-4 border-b border-border bg-surface-2 flex-shrink-0">
            {/* Botón volver — solo móvil */}
            <button onClick={() => setSelected(null)} className="md:hidden p-1.5 text-fg-5 hover:text-fg transition-colors flex-shrink-0">
              <ArrowLeft size={18} />
            </button>

            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-fg truncate">{selected.full_name}</h2>
              <p className="text-[11px] text-fg-5 mt-0.5">{selected.cc ?? "Sin cédula"}{selected.phone ? ` · ${selected.phone}` : ""}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-24 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                  <div className="h-1.5 bg-accent rounded-full transition-all" style={{ width: `${(docsCount / TOTAL_TYPES) * 100}%` }} />
                </div>
                <span className="text-xs text-fg-5">{docsCount}/{TOTAL_TYPES}</span>
              </div>
              <button onClick={handleDeleteEmployee} disabled={deletingEmp} className="p-2 text-fg-5 hover:text-red-400 hover:bg-red-950/20 rounded-sm transition-colors">
                {deletingEmp ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              </button>
            </div>
          </div>

          {/* Contenido scrollable */}
          <div className="flex-1 overflow-y-auto">
            {/* Sección Información */}
            <div className="p-4 md:p-6 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-fg uppercase tracking-wider">Información</h3>
                {editInfo ? (
                  <div className="flex items-center gap-2">
                    <button onClick={handleSaveInfo} disabled={savingInfo} className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-black text-xs font-semibold hover:bg-accent/90 disabled:opacity-50">
                      {savingInfo ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                      Guardar
                    </button>
                    <button onClick={() => setEditInfo(null)} className="text-fg-5 hover:text-fg p-1"><X size={14} /></button>
                  </div>
                ) : (
                  <button onClick={startEdit} className="flex items-center gap-1.5 text-xs text-fg-5 hover:text-fg transition-colors">
                    <Pencil size={12} /> Editar
                  </button>
                )}
              </div>
              <div className="bg-surface-2 border border-border px-4">
                <InfoField label="Nombre completo" value={selected.full_name} field="full_name" form={editInfo} setForm={f => setEditInfo(f)} />
                <InfoField label="Cédula (CC)" value={selected.cc} field="cc" form={editInfo} setForm={f => setEditInfo(f)} />
                <InfoField label="Celular" value={selected.phone} field="phone" form={editInfo} setForm={f => setEditInfo(f)} />
                <InfoField label="Correo electrónico" value={selected.email} field="email" form={editInfo} setForm={f => setEditInfo(f)} />
                <InfoField label="Dirección" value={selected.address} field="address" form={editInfo} setForm={f => setEditInfo(f)} />
                <InfoField label="Contacto emergencia" value={selected.emergency_contact} field="emergency_contact" form={editInfo} setForm={f => setEditInfo(f)} />
                <InfoField label="Celular emergencia" value={selected.emergency_phone} field="emergency_phone" form={editInfo} setForm={f => setEditInfo(f)} />
              </div>
            </div>

            {/* Sección Documentos */}
            <div className="p-4 md:p-6">
              <h3 className="text-xs font-semibold text-fg uppercase tracking-wider mb-4">Documentos</h3>
              <div className="space-y-2">
                {Object.entries(EMPLOYEE_DOC_LABELS).map(([docType, label]) => {
                  const doc = selected.documents.find(d => d.doc_type === docType);
                  const isUp = uploadType === docType;
                  const isDel = deletingType === docType;
                  return (
                    <div key={docType} className="flex items-center gap-3 px-3 md:px-4 py-3 bg-surface-2 border border-border">
                      {doc
                        ? <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
                        : <div className="w-[15px] h-[15px] rounded-full border-2 border-fg-6 flex-shrink-0" />
                      }
                      <span className="text-xs md:text-sm text-fg-3 flex-1 min-w-0 leading-snug">{label}</span>
                      {doc ? (
                        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs px-2 md:px-2.5 py-1.5 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors whitespace-nowrap">
                            Ver
                          </a>
                          <button onClick={() => handleUploadClick(docType)} disabled={isUp} title="Reemplazar archivo" className="p-2 text-fg-5 hover:text-fg border border-border hover:border-fg-4 transition-colors">
                            {isUp ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                          </button>
                          <button onClick={() => handleDeleteDoc(docType)} disabled={isDel} title="Eliminar" className="p-2 text-fg-5 hover:text-red-400 border border-border hover:border-red-500/30 transition-colors">
                            {isDel ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => handleUploadClick(docType)} disabled={isUp}
                          className="flex-shrink-0 flex items-center gap-1.5 text-xs px-2 md:px-2.5 py-1.5 border border-dashed border-fg-6 text-fg-5 hover:border-accent hover:text-accent transition-colors whitespace-nowrap">
                          {isUp ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                          Subir
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center gap-3 text-fg-6">
          <Users size={48} strokeWidth={1} />
          <p className="text-sm">Selecciona un empleado para ver su información</p>
          {!loading && employees.length === 0 && (
            <button onClick={() => setShowNew(true)} className="mt-2 flex items-center gap-2 px-4 py-2 border border-dashed border-fg-6 text-fg-5 hover:border-fg-4 hover:text-fg-4 transition-colors text-sm">
              <Plus size={14} /> Agregar primer empleado
            </button>
          )}
        </div>
      )}

      {/* ── Modal nuevo empleado ── */}
      {showNew && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowNew(false)}>
          <div className="bg-surface-2 border border-border w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-fg">Nuevo empleado</h3>
              <button onClick={() => setShowNew(false)} className="text-fg-5 hover:text-fg"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              {([
                ["Nombre completo *", "full_name", "text", "Juan Pérez"],
                ["Cédula de ciudadanía", "cc", "text", "123456789"],
                ["Celular", "phone", "tel", "3001234567"],
                ["Correo electrónico", "email", "email", "juan@ejemplo.com"],
                ["Dirección de residencia", "address", "text", "Calle 10 # 20-30"],
                ["Contacto en emergencia", "emergency_contact", "text", "María Pérez"],
                ["Celular emergencia", "emergency_phone", "tel", "3009876543"],
              ] as [string, keyof InfoForm, string, string][]).map(([label, field, type, placeholder]) => (
                <div key={field}>
                  <label className="text-xs text-fg-5 block mb-1.5">{label}</label>
                  <input
                    type={type}
                    className="w-full bg-surface-3 border border-border text-fg text-sm px-3 py-2 outline-none focus:border-accent placeholder:text-fg-6"
                    placeholder={placeholder}
                    value={newForm[field]}
                    onChange={e => setNewForm({ ...newForm, [field]: e.target.value })}
                    autoFocus={field === "full_name"}
                  />
                </div>
              ))}
            </div>
            <button
              onClick={handleCreate} disabled={creating || !newForm.full_name.trim()}
              className="mt-5 w-full bg-accent text-black text-sm font-semibold py-2.5 hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Crear empleado
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
