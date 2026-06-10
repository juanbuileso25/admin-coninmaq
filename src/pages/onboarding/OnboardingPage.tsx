import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  CheckCircle2, Loader2, ChevronRight, ChevronLeft,
  AlertTriangle, Plus, Trash2, Building2, FileText, PenLine,
} from "lucide-react";
import { api, type OnboardingPublicResponse, type OnboardingSubmit } from "../../services/api";
import SearchSelect from "../../components/ui/SearchSelect";

// ── Design tokens ─────────────────────────────────────────────────────────────

const INPUT =
  "w-full border border-gray-200 bg-white text-gray-900 px-3.5 py-2.5 text-sm rounded-lg outline-none " +
  "focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 placeholder:text-gray-400 transition-all";
const SELECT = `${INPUT} cursor-pointer`;
const LABEL = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";
const BTN_PRIMARY =
  "inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black " +
  "font-bold text-sm px-6 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none";
const BTN_SECONDARY =
  "inline-flex items-center gap-2 border border-gray-200 hover:border-gray-300 bg-white " +
  "text-gray-700 font-medium text-sm px-6 py-2.5 rounded-xl transition-all hover:bg-gray-50";
const BTN_GHOST =
  "inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors py-1";

// ── Signature Canvas ──────────────────────────────────────────────────────────

function SignaturePad({ onSigned }: { onSigned: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasSig, setHasSig] = useState(false);

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const src = "touches" in e ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * (canvas.width / rect.width),
      y: (src.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const start = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    drawing.current = true;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const p = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }, []);

  const move = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const p = getPos(e, canvas);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    setHasSig(true);
  }, []);

  const stop = useCallback(() => {
    drawing.current = false;
    if (hasSig && canvasRef.current) {
      onSigned(canvasRef.current.toDataURL());
    }
  }, [hasSig, onSigned]);

  const clear = () => {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setHasSig(false);
    onSigned("");
  };

  useEffect(() => {
    const canvas = canvasRef.current!;
    canvas.addEventListener("mousedown",  start  as EventListener);
    canvas.addEventListener("mousemove",  move   as EventListener);
    canvas.addEventListener("mouseup",    stop);
    canvas.addEventListener("mouseleave", stop);
    canvas.addEventListener("touchstart", start  as EventListener, { passive: false });
    canvas.addEventListener("touchmove",  move   as EventListener, { passive: false });
    canvas.addEventListener("touchend",   stop);
    return () => {
      canvas.removeEventListener("mousedown",  start  as EventListener);
      canvas.removeEventListener("mousemove",  move   as EventListener);
      canvas.removeEventListener("mouseup",    stop);
      canvas.removeEventListener("mouseleave", stop);
      canvas.removeEventListener("touchstart", start  as EventListener);
      canvas.removeEventListener("touchmove",  move   as EventListener);
      canvas.removeEventListener("touchend",   stop);
    };
  }, [start, move, stop]);

  return (
    <div className="space-y-2">
      <div className={`relative rounded-xl overflow-hidden border-2 transition-colors ${hasSig ? "border-amber-400 bg-white" : "border-dashed border-gray-200 bg-gray-50"}`}>
        <canvas
          ref={canvasRef}
          width={700}
          height={160}
          className="block w-full"
          style={{ height: 160, cursor: "crosshair", touchAction: "none" }}
        />
        {!hasSig && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
            <PenLine size={22} className="text-gray-300" />
            <p className="text-gray-400 text-sm">Firme aquí con el dedo o el mouse</p>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <button type="button" onClick={clear} className={BTN_GHOST}>
          <Trash2 size={12} /> Limpiar firma
        </button>
        {hasSig && (
          <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
            <CheckCircle2 size={12} /> Firma capturada
          </span>
        )}
      </div>
    </div>
  );
}

// ── Field helpers ─────────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={LABEL}>
        {label}
        {required && <span className="text-amber-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3;

const STEPS = [
  { n: 1 as Step, label: "Datos", icon: Building2 },
  { n: 2 as Step, label: "Declaración", icon: FileText },
  { n: 3 as Step, label: "Firma", icon: PenLine },
];

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const done = current > s.n;
        const active = current === s.n;
        return (
          <div key={s.n} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                done    ? "bg-amber-500 text-black" :
                active  ? "bg-amber-500 text-black ring-4 ring-amber-500/20" :
                          "bg-white/10 text-white/40"
              }`}>
                {done ? <CheckCircle2 size={18} /> : <Icon size={16} />}
              </div>
              <span className={`text-[10px] font-semibold tracking-wide hidden sm:block transition-colors ${
                active ? "text-amber-400" : done ? "text-amber-500/70" : "text-white/30"
              }`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-12 sm:w-20 h-0.5 mb-4 mx-1 transition-colors ${
                current > s.n ? "bg-amber-500" : "bg-white/10"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────

function Section({ title, action, children }: {
  title: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
        {action}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

// ── Contact row ───────────────────────────────────────────────────────────────

function ContactRow({ label, contact, mobile, email, onChange }: {
  label: string; contact: string; mobile: string; email: string;
  onChange: (field: "c" | "m" | "e", value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end py-3 border-b border-gray-50 last:border-0 last:pb-0 first:pt-0">
      <div className="flex items-center gap-2 sm:pt-5">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
        <span className="font-semibold text-sm text-gray-700">{label}</span>
      </div>
      <Field label="Nombre">
        <input className={INPUT} value={contact} onChange={e => onChange("c", e.target.value)} />
      </Field>
      <Field label="Teléfono / Celular">
        <input className={INPUT} value={mobile} onChange={e => onChange("m", e.target.value)} />
      </Field>
      <Field label="Correo">
        <input className={INPUT} type="email" value={email} onChange={e => onChange("e", e.target.value)} />
      </Field>
    </div>
  );
}

// ── Status screens ────────────────────────────────────────────────────────────

function StatusScreen({ icon, title, message }: { icon: "error" | "expired"; title: string; message: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-md max-w-md w-full p-10 text-center">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 ${
          icon === "expired" ? "bg-amber-50" : "bg-red-50"
        }`}>
          <AlertTriangle className={icon === "expired" ? "text-amber-500" : "text-red-400"} size={32} />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-500 text-sm leading-relaxed">{message}</p>
        <p className="mt-8 text-xs text-gray-400">
          CONINMAQ SAS ·{" "}
          <a href="mailto:ventas@coninmaqsas.com" className="text-amber-500 hover:underline">
            ventas@coninmaqsas.com
          </a>
        </p>
      </div>
    </div>
  );
}

// ── Empty state helper ────────────────────────────────────────────────────────

const EMPTY_REF   = () => ({ name: "", address: "", phone: "", email: "" });
const EMPTY_REP   = () => ({ first_name: "", last_name: "", document_type: "CC", document_number: "", phone: "", email: "" });
const EMPTY_PART  = () => ({ first_name: "", last_name: "", document_type: "CC", document_number: "", phone: "", participation_percentage: "" });
const EMPTY_PEP   = () => ({ first_name: "", last_name: "", document_type: "CC", document_number: "", phone: "", position: "", email: "" });

// ── Main component ────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { token } = useParams<{ token: string }>();
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [expired,    setExpired]    = useState(false);
  const [done,       setDone]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [onboarding, setOnboarding] = useState<OnboardingPublicResponse | null>(null);
  const [step,       setStep]       = useState<Step>(1);

  // Form state — Step 1
  const [name,         setName]         = useState("");
  const [docType,      setDocType]      = useState("NIT");
  const [doc,          setDoc]          = useState("");
  const [address,      setAddress]      = useState("");
  const [phone,        setPhone]        = useState("");
  const [mobile,       setMobile]       = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [infoEmail,    setInfoEmail]    = useState("");
  const [cityId,       setCityId]       = useState<number | null>(null);
  const [cityLabel,    setCityLabel]    = useState("");
  const [activityId,   setActivityId]   = useState<number | null>(null);
  const [activityLabel, setActivityLabel] = useState("");
  const [treasuryContact, setTreasuryContact] = useState("");
  const [treasuryMobile,  setTreasuryMobile]  = useState("");
  const [treasuryEmail,   setTreasuryEmail]   = useState("");
  const [purchasingContact, setPurchasingContact] = useState("");
  const [purchasingMobile,  setPurchasingMobile]  = useState("");
  const [purchasingEmail,   setPurchasingEmail]   = useState("");
  const [obraContact,  setObraContact]  = useState("");
  const [obraMobile,   setObraMobile]   = useState("");
  const [obraEmail,    setObraEmail]    = useState("");
  const [refs,         setRefs]         = useState([EMPTY_REF()]);
  const [reps,         setReps]         = useState([EMPTY_REP()]);
  const [partners,     setPartners]     = useState<ReturnType<typeof EMPTY_PART>[]>([]);
  const [peps,         setPeps]         = useState<ReturnType<typeof EMPTY_PEP>[]>([]);

  // Form state — Step 2
  const [origenFondos, setOrigenFondos] = useState("");

  // Form state — Step 3
  const [signerName,     setSignerName]     = useState("");
  const [signerDocument, setSignerDocument] = useState("");
  const [signature,      setSignature]      = useState("");

  // ── Load token ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) { setError("Enlace no válido"); setLoading(false); return; }

    api.onboarding.get(token)
      .then((data) => {
        setOnboarding(data);
        const c = data.client;
        setName(c.name || "");
        setDocType(c.document_type || "NIT");
        setDoc(c.document || "");
        setAddress(c.address || "");
        setPhone(c.phone || "");
        setMobile(c.mobile || "");
        setBillingEmail(c.billing_email || "");
        setInfoEmail(c.info_email || "");
        setCityId(c.city_id);
        setCityLabel(c.city?.name || "");
        setActivityId(c.economic_activity_id);
        setActivityLabel(c.economic_activity ? `${c.economic_activity.code} — ${c.economic_activity.description}` : "");
        setTreasuryContact(c.treasury_contact || "");
        setTreasuryMobile(c.treasury_mobile || "");
        setTreasuryEmail(c.treasury_email || "");
        setPurchasingContact(c.purchasing_contact || "");
        setPurchasingMobile(c.purchasing_mobile || "");
        setPurchasingEmail(c.purchasing_email || "");
        setObraContact((c as any).obra_contact || "");
        setObraMobile((c as any).obra_mobile || "");
        setObraEmail((c as any).obra_email || "");

        const activeRefs = c.commercial_references.filter(r => r.is_active);
        if (activeRefs.length) setRefs(activeRefs.map(r => ({ name: r.name, address: r.address || "", phone: r.phone || "", email: r.email || "" })));

        const activeReps = c.legal_representatives.filter(r => r.is_active);
        if (activeReps.length) setReps(activeReps.map(r => ({ first_name: r.first_name, last_name: r.last_name, document_type: r.document_type || "CC", document_number: r.document_number, phone: r.phone || "", email: r.email || "" })));

        const activeParts = c.partners.filter(p => p.is_active);
        if (activeParts.length) setPartners(activeParts.map(p => ({ first_name: p.first_name, last_name: p.last_name, document_type: p.document_type || "CC", document_number: p.document_number, phone: p.phone || "", participation_percentage: String(p.participation_percentage || "") })));

        const activePep = c.pep.filter(p => p.is_active);
        if (activePep.length) setPeps(activePep.map(p => ({ first_name: p.first_name, last_name: p.last_name, document_type: p.document_type || "CC", document_number: p.document_number, phone: p.phone || "", position: p.position || "", email: p.email || "" })));

        const firstRep = activeReps[0];
        if (firstRep) {
          setSignerName(`${firstRep.first_name} ${firstRep.last_name}`);
          setSignerDocument(firstRep.document_number);
        }

        if (data.already_completed) setDone(true);
      })
      .catch((e) => {
        if (e?.status === 410) setExpired(true);
        else setError(e?.detail || "Enlace no válido o expirado");
      })
      .finally(() => setLoading(false));
  }, [token]);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!signature)           { alert("Por favor firme el documento antes de enviar"); return; }
    if (!signerName.trim())   { alert("Por favor ingrese su nombre completo"); return; }
    if (!signerDocument.trim()) { alert("Por favor ingrese su número de documento"); return; }

    setSubmitting(true);
    try {
      const payload: OnboardingSubmit = {
        name, document: doc, document_type: docType,
        economic_activity_id: activityId,
        address: address || null, phone: phone || null, mobile: mobile || null,
        billing_email: billingEmail || null, info_email: infoEmail || null,
        city_id: cityId,
        treasury_contact: treasuryContact || null, treasury_mobile: treasuryMobile || null, treasury_email: treasuryEmail || null,
        purchasing_contact: purchasingContact || null, purchasing_mobile: purchasingMobile || null, purchasing_email: purchasingEmail || null,
        obra_contact: obraContact || null, obra_mobile: obraMobile || null, obra_email: obraEmail || null,
        commercial_references: refs.filter(r => r.name.trim()).map(r => ({ name: r.name, address: r.address || null, phone: r.phone || null, email: r.email || null })),
        legal_representatives: reps.filter(r => r.first_name.trim()).map(r => ({ first_name: r.first_name, last_name: r.last_name, document_type: r.document_type || null, document_number: r.document_number, phone: r.phone || null, email: r.email || null })),
        partners: partners.filter(p => p.first_name.trim()).map(p => ({ first_name: p.first_name, last_name: p.last_name, document_type: p.document_type || null, document_number: p.document_number, phone: p.phone || null, participation_percentage: p.participation_percentage ? Number(p.participation_percentage) : null })),
        pep: peps.filter(p => p.first_name.trim()).map(p => ({ first_name: p.first_name, last_name: p.last_name, document_type: p.document_type || null, document_number: p.document_number, phone: p.phone || null, position: p.position || null, email: p.email || null })),
        origen_fondos: origenFondos,
        signature, signer_name: signerName, signer_document: signerDocument,
      };
      await api.onboarding.submit(token!, payload);
      setDone(true);
    } catch (e: unknown) {
      alert((e as { detail?: string }).detail || "Error al enviar el formulario");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render states ────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="animate-spin text-amber-500" size={36} />
        <p className="text-sm text-gray-400">Cargando formulario...</p>
      </div>
    </div>
  );

  if (expired) return <StatusScreen icon="expired" title="Enlace expirado" message="Este enlace de formulario ha expirado. Comuníquese con CONINMAQ para solicitar uno nuevo." />;
  if (error)   return <StatusScreen icon="error"   title="Enlace no válido" message={error} />;

  if (done) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-md max-w-md w-full p-10 text-center">
        <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="text-amber-500" size={40} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Formulario completado!</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          Su información ha sido recibida exitosamente. El equipo comercial de CONINMAQ revisará sus datos y se comunicará con usted próximamente.
        </p>
        <div className="bg-gray-50 rounded-xl p-4 space-y-2.5 text-left">
          {[
            "Formato Cliente Nuevo",
            "Declaración de Origen de Fondos",
            "Firma digital capturada",
          ].map(d => (
            <div key={d} className="flex items-center gap-2.5 text-sm text-gray-700">
              <CheckCircle2 size={15} className="text-amber-500 flex-shrink-0" />
              {d}
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-gray-400">CONINMAQ SAS · <a href="mailto:ventas@coninmaqsas.com" className="text-amber-500 hover:underline">ventas@coninmaqsas.com</a></p>
      </div>
    </div>
  );

  // ── Main form ───────────────────────────────────────────────────────────────
  // Force light-mode CSS variables regardless of the global theme (dark by default)
  const lightTheme: React.CSSProperties = {
    ["--surface"      as string]: "#f4f4f6",
    ["--surface-2"    as string]: "#ffffff",
    ["--surface-3"    as string]: "#f0f0f5",
    ["--surface-4"    as string]: "#e8e8ef",
    ["--border"       as string]: "#e2e2ea",
    ["--border-light" as string]: "#d0d0dc",
    ["--fg"           as string]: "#18181b",
    ["--fg-2"         as string]: "#27272a",
    ["--fg-3"         as string]: "#3f3f46",
    ["--fg-5"         as string]: "#71717a",
    ["--fg-6"         as string]: "#a1a1aa",
  };

  return (
    <div className="min-h-screen bg-gray-50" style={lightTheme}>
      {/* Header */}
      <div className="bg-black px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-amber-500 font-black text-xl tracking-widest">CONINMAQ</span>
            <p className="text-gray-500 text-xs tracking-widest mt-0.5 hidden sm:block">FORMULARIO DE VINCULACIÓN</p>
          </div>
          <StepIndicator current={step} />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* ── Step 1: Datos ────────────────────────────────────────────────────── */}
        {step === 1 && (
          <>
            {/* Page title */}
            <div>
              <h2 className="text-xl font-bold text-gray-900">Datos del cliente</h2>
              <p className="text-sm text-gray-500 mt-1">
                Complete o corrija su información
              </p>
            </div>

            {/* Datos básicos */}
            <Section title="Datos básicos">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Field label="Nombre o razón social" required>
                    <input className={INPUT} value={name} onChange={e => setName(e.target.value)} />
                  </Field>
                </div>
                <Field label="Tipo de identificación">
                  <select className={SELECT} value={docType} onChange={e => setDocType(e.target.value)}>
                    <option value="NIT">NIT</option>
                    <option value="CC">Cédula de Ciudadanía</option>
                    <option value="CE">Cédula de Extranjería</option>
                    <option value="PAS">Pasaporte</option>
                  </select>
                </Field>
                <Field label="Número de identificación" required>
                  <input className={INPUT} value={doc} onChange={e => setDoc(e.target.value)} />
                </Field>
                <Field label="Actividad económica (CIIU)">
                  <SearchSelect
                    value={activityId}
                    displayValue={activityLabel}
                    onSearch={async q => { const r = await api.economicActivities.search(q); return r.map(a => ({ id: a.id, label: `${a.code} — ${a.description}` })); }}
                    onSelect={(id, l) => { setActivityId(id); setActivityLabel(l); }}
                    placeholder="Buscar actividad..."
                  />
                </Field>
                <Field label="Ciudad">
                  <SearchSelect
                    value={cityId}
                    displayValue={cityLabel}
                    onSearch={async q => { const r = await api.locations.cities(q); return r.map(c => ({ id: c.id, label: c.name })); }}
                    onSelect={(id, l) => { setCityId(id); setCityLabel(l); }}
                    placeholder="Buscar ciudad..."
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Dirección">
                    <input className={INPUT} value={address} onChange={e => setAddress(e.target.value)} />
                  </Field>
                </div>
                <Field label="Teléfono empresa">
                  <input className={INPUT} value={phone} onChange={e => setPhone(e.target.value)} />
                </Field>
                <Field label="Celular">
                  <input className={INPUT} value={mobile} onChange={e => setMobile(e.target.value)} />
                </Field>
                <Field label="Correo facturación">
                  <input className={INPUT} type="email" value={billingEmail} onChange={e => setBillingEmail(e.target.value)} />
                </Field>
                <Field label="Correo información">
                  <input className={INPUT} type="email" value={infoEmail} onChange={e => setInfoEmail(e.target.value)} />
                </Field>
              </div>
            </Section>

            {/* Contactos */}
            <Section title="Contactos por área">
              <ContactRow label="Tesorería"  contact={treasuryContact}  mobile={treasuryMobile}  email={treasuryEmail}  onChange={(f, v) => { if (f === "c") setTreasuryContact(v);  if (f === "m") setTreasuryMobile(v);  if (f === "e") setTreasuryEmail(v);  }} />
              <ContactRow label="Compras"    contact={purchasingContact} mobile={purchasingMobile} email={purchasingEmail} onChange={(f, v) => { if (f === "c") setPurchasingContact(v); if (f === "m") setPurchasingMobile(v); if (f === "e") setPurchasingEmail(v); }} />
              <ContactRow label="Obra"       contact={obraContact}       mobile={obraMobile}       email={obraEmail}       onChange={(f, v) => { if (f === "c") setObraContact(v);       if (f === "m") setObraMobile(v);       if (f === "e") setObraEmail(v);       }} />
            </Section>

            {/* Referencias comerciales */}
            <Section
              title="Referencias comerciales"
              action={
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-500 font-semibold transition-colors"
                  onClick={() => setRefs(p => [...p, EMPTY_REF()])}
                >
                  <Plus size={13} /> Agregar
                </button>
              }
            >
              {refs.map((r, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                  <Field label={`Empresa ${i + 1}`}>
                    <input className={INPUT} value={r.name} onChange={e => setRefs(p => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                  </Field>
                  <Field label="Teléfono">
                    <input className={INPUT} value={r.phone} onChange={e => setRefs(p => p.map((x, j) => j === i ? { ...x, phone: e.target.value } : x))} />
                  </Field>
                  <Field label="Dirección">
                    <input className={INPUT} value={r.address} onChange={e => setRefs(p => p.map((x, j) => j === i ? { ...x, address: e.target.value } : x))} />
                  </Field>
                  <Field label="Correo">
                    <input className={INPUT} value={r.email} onChange={e => setRefs(p => p.map((x, j) => j === i ? { ...x, email: e.target.value } : x))} />
                  </Field>
                  {refs.length > 1 && (
                    <button type="button" className={BTN_GHOST} onClick={() => setRefs(p => p.filter((_, j) => j !== i))}>
                      <Trash2 size={12} /> Eliminar referencia
                    </button>
                  )}
                </div>
              ))}
            </Section>

            {/* Representantes legales */}
            <Section
              title="Representante(s) legal(es)"
              action={
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-500 font-semibold transition-colors"
                  onClick={() => setReps(p => [...p, EMPTY_REP()])}
                >
                  <Plus size={13} /> Agregar
                </button>
              }
            >
              {reps.map((r, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                  <Field label="Nombres"><input className={INPUT} value={r.first_name} onChange={e => setReps(p => p.map((x, j) => j === i ? { ...x, first_name: e.target.value } : x))} /></Field>
                  <Field label="Apellidos"><input className={INPUT} value={r.last_name} onChange={e => setReps(p => p.map((x, j) => j === i ? { ...x, last_name: e.target.value } : x))} /></Field>
                  <Field label="Tipo de documento">
                    <select className={SELECT} value={r.document_type} onChange={e => setReps(p => p.map((x, j) => j === i ? { ...x, document_type: e.target.value } : x))}>
                      <option value="CC">CC</option><option value="CE">CE</option><option value="PAS">Pasaporte</option>
                    </select>
                  </Field>
                  <Field label="No. de identificación"><input className={INPUT} value={r.document_number} onChange={e => setReps(p => p.map((x, j) => j === i ? { ...x, document_number: e.target.value } : x))} /></Field>
                  <Field label="Teléfono"><input className={INPUT} value={r.phone} onChange={e => setReps(p => p.map((x, j) => j === i ? { ...x, phone: e.target.value } : x))} /></Field>
                  <Field label="Correo"><input className={INPUT} value={r.email} onChange={e => setReps(p => p.map((x, j) => j === i ? { ...x, email: e.target.value } : x))} /></Field>
                  {reps.length > 1 && (
                    <button type="button" className={BTN_GHOST} onClick={() => setReps(p => p.filter((_, j) => j !== i))}>
                      <Trash2 size={12} /> Eliminar representante
                    </button>
                  )}
                </div>
              ))}
            </Section>

            {/* Socios / beneficiarios */}
            <Section
              title="Socios / beneficiarios finales (>5%)"
              action={
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-500 font-semibold transition-colors"
                  onClick={() => setPartners(p => [...p, EMPTY_PART()])}
                >
                  <Plus size={13} /> Agregar
                </button>
              }
            >
              {partners.length === 0 ? (
                <p className="text-sm text-gray-400 py-1">Sin socios registrados</p>
              ) : partners.map((p, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                  <Field label="Nombres"><input className={INPUT} value={p.first_name} onChange={e => setPartners(prev => prev.map((x, j) => j === i ? { ...x, first_name: e.target.value } : x))} /></Field>
                  <Field label="Apellidos"><input className={INPUT} value={p.last_name} onChange={e => setPartners(prev => prev.map((x, j) => j === i ? { ...x, last_name: e.target.value } : x))} /></Field>
                  <Field label="Tipo de documento">
                    <select className={SELECT} value={p.document_type} onChange={e => setPartners(prev => prev.map((x, j) => j === i ? { ...x, document_type: e.target.value } : x))}>
                      <option value="CC">CC</option><option value="CE">CE</option><option value="PAS">Pasaporte</option>
                    </select>
                  </Field>
                  <Field label="No. de identificación"><input className={INPUT} value={p.document_number} onChange={e => setPartners(prev => prev.map((x, j) => j === i ? { ...x, document_number: e.target.value } : x))} /></Field>
                  <Field label="Teléfono"><input className={INPUT} value={p.phone} onChange={e => setPartners(prev => prev.map((x, j) => j === i ? { ...x, phone: e.target.value } : x))} /></Field>
                  <Field label="% Participación"><input className={INPUT} type="number" min="0" max="100" value={p.participation_percentage} onChange={e => setPartners(prev => prev.map((x, j) => j === i ? { ...x, participation_percentage: e.target.value } : x))} /></Field>
                  <button type="button" className={BTN_GHOST} onClick={() => setPartners(prev => prev.filter((_, j) => j !== i))}>
                    <Trash2 size={12} /> Eliminar socio
                  </button>
                </div>
              ))}
            </Section>

            {/* PEP */}
            <Section
              title="Personas políticamente expuestas (PEP)"
              action={
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-500 font-semibold transition-colors"
                  onClick={() => setPeps(p => [...p, EMPTY_PEP()])}
                >
                  <Plus size={13} /> Agregar
                </button>
              }
            >
              {peps.length === 0 ? (
                <p className="text-sm text-gray-400 py-1">Sin PEP registradas</p>
              ) : peps.map((p, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                  <Field label="Nombres"><input className={INPUT} value={p.first_name} onChange={e => setPeps(prev => prev.map((x, j) => j === i ? { ...x, first_name: e.target.value } : x))} /></Field>
                  <Field label="Apellidos"><input className={INPUT} value={p.last_name} onChange={e => setPeps(prev => prev.map((x, j) => j === i ? { ...x, last_name: e.target.value } : x))} /></Field>
                  <Field label="Tipo de documento">
                    <select className={SELECT} value={p.document_type} onChange={e => setPeps(prev => prev.map((x, j) => j === i ? { ...x, document_type: e.target.value } : x))}>
                      <option value="CC">CC</option><option value="CE">CE</option><option value="PAS">Pasaporte</option>
                    </select>
                  </Field>
                  <Field label="No. de identificación"><input className={INPUT} value={p.document_number} onChange={e => setPeps(prev => prev.map((x, j) => j === i ? { ...x, document_number: e.target.value } : x))} /></Field>
                  <Field label="Teléfono"><input className={INPUT} value={p.phone} onChange={e => setPeps(prev => prev.map((x, j) => j === i ? { ...x, phone: e.target.value } : x))} /></Field>
                  <Field label="Cargo / Posición"><input className={INPUT} value={p.position} onChange={e => setPeps(prev => prev.map((x, j) => j === i ? { ...x, position: e.target.value } : x))} /></Field>
                  <button type="button" className={BTN_GHOST} onClick={() => setPeps(prev => prev.filter((_, j) => j !== i))}>
                    <Trash2 size={12} /> Eliminar PEP
                  </button>
                </div>
              ))}
            </Section>

            <div className="flex justify-end pt-2 pb-6">
              <button className={BTN_PRIMARY} onClick={() => setStep(2)}>
                Continuar <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}

        {/* ── Step 2: Declaración ──────────────────────────────────────────────── */}
        {step === 2 && (
          <>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Declaración de origen de fondos</h2>
              <p className="text-sm text-gray-500 mt-1">Lea y diligencie la declaración a continuación</p>
            </div>

            {/* Declaración */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <p className="text-sm text-gray-700 leading-relaxed">
                Yo{" "}
                <strong className="text-gray-900">
                  {reps[0] ? `${reps[0].first_name} ${reps[0].last_name}` : "[Representante Legal]"}
                </strong>
                , como Representante Legal de la empresa{" "}
                <strong className="text-gray-900">{name}</strong>{" "}
                identificada con{" "}
                <strong className="text-gray-900">{docType} {doc}</strong>
                , declaro expresamente que:
              </p>

              <div className="space-y-3">
                {[
                  "Tanto mi actividad, profesión u oficio es lícita y la ejerzo dentro del marco legal vigente. Los recursos que poseo no provienen de actividades ilícitas contempladas en el Código Penal Colombiano.",
                  "La información suministrada en la solicitud de vinculación es veraz y verificable, y me comprometo a actualizarla anualmente o cuando se produzca un cambio.",
                  "Los recursos derivados de esta relación comercial no serán destinados a la financiación del terrorismo, grupos terroristas o actividades terroristas.",
                  "Los recursos que poseo provienen de las fuentes descritas a continuación:",
                ].map((text, i) => (
                  <div key={i} className="flex gap-3.5 p-3.5 bg-gray-50 rounded-xl">
                    <div className="bg-amber-500 text-black font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Textarea origen de fondos */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <Field label="Descripción del origen de fondos" required>
                <textarea
                  className={INPUT + " resize-none"}
                  rows={5}
                  value={origenFondos}
                  onChange={e => setOrigenFondos(e.target.value)}
                  placeholder="Describa detalladamente la actividad económica, profesión, oficio o negocio del que provienen los recursos..."
                />
              </Field>
            </div>

            <div className="flex justify-between pt-2 pb-6">
              <button className={BTN_SECONDARY} onClick={() => setStep(1)}>
                <ChevronLeft size={16} /> Anterior
              </button>
              <button className={BTN_PRIMARY} onClick={() => setStep(3)} disabled={!origenFondos.trim()}>
                Continuar <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}

        {/* ── Step 3: Firma ────────────────────────────────────────────────────── */}
        {step === 3 && (
          <>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Firma digital</h2>
              <p className="text-sm text-gray-500 mt-1">Firme los documentos para completar su vinculación</p>
            </div>

            {/* Datos del firmante */}
            <Section title="Datos del firmante">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nombres y apellidos" required>
                  <input
                    className={INPUT}
                    value={signerName}
                    onChange={e => setSignerName(e.target.value)}
                    placeholder="Como aparece en el documento"
                  />
                </Field>
                <Field label="Número de documento" required>
                  <input className={INPUT} value={signerDocument} onChange={e => setSignerDocument(e.target.value)} />
                </Field>
              </div>
            </Section>

            {/* Firma */}
            <Section title="Firma del documento">
              <SignaturePad onSigned={setSignature} />
            </Section>

            {/* Documentos a firmar */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Documentos a firmar</p>
              <div className="space-y-2.5">
                {[
                  "Formato Cliente Nuevo",
                  "Declaración de Origen de Fondos",
                ].map(name => (
                  <div key={name} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl text-sm">
                    <div className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0" />
                    <span className="text-gray-700">{name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-2 pb-6">
              <button className={BTN_SECONDARY} onClick={() => setStep(2)} disabled={submitting}>
                <ChevronLeft size={16} /> Anterior
              </button>
              <button
                className={BTN_PRIMARY}
                onClick={handleSubmit}
                disabled={submitting || !signature || !signerName.trim() || !signerDocument.trim()}
              >
                {submitting
                  ? <><Loader2 size={16} className="animate-spin" /> Enviando...</>
                  : <>Enviar documentos firmados <ChevronRight size={16} /></>
                }
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
