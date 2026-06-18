import { useMemo, useState } from "react";
import {
  Plus, Search, FileText, Image, CheckCircle2, Circle,
  PencilLine, ChevronDown, ChevronUp, Truck, PackageCheck, PackageX, FolderCheck,
  Download, FileDown,
} from "lucide-react";
import { useAbility } from "../../context/AbilityContext";
import { useMachineInfo } from "../../hooks/useMachineInfo";
import { type MachineInfoResponse } from "../../services/api";
import StatCard from "../../components/StatCard";
import MachineInfoDrawer from "../../components/comercio-exterior/MachineInfoDrawer";
import CartaTrasladoModal from "../../components/comercio-exterior/CartaTrasladoModal";

const DOCUMENT_SLOTS = [
  { key: "lonking_contract",       label: "Contrato Lonking",           icon: FileText },
  { key: "gps_certificate",        label: "Certificado GPS",            icon: FileText },
  { key: "runt_registration",      label: "Registro RUNT",              icon: FileText },
  { key: "import_declaration_doc", label: "Declaración de Importación", icon: FileText },
  { key: "machine_plate_photo",    label: "Foto Plaqueta Máquina",      icon: Image    },
  { key: "engine_plate_photo",     label: "Foto Plaqueta Motor",        icon: Image    },
] as const;

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

function DocBadge({ uploaded }: { uploaded: boolean }) {
  return uploaded
    ? <CheckCircle2 size={13} className="text-green-400 flex-shrink-0" />
    : <Circle       size={13} className="text-fg-6 flex-shrink-0" />;
}

// ── Vista móvil: tarjeta por máquina ─────────────────────────────────────────
function MachineCard({
  machine,
  onEdit,
  onCarta,
}: {
  machine: MachineInfoResponse;
  onEdit:  (m: MachineInfoResponse) => void;
  onCarta: (m: MachineInfoResponse) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const activeDocs = machine.documents.filter((d) => d.is_active);
  const docsCount  = activeDocs.length;

  return (
    <div className="bg-surface-2 border border-border">
      {/* Cabecera de la tarjeta */}
      <div
        className="flex items-start justify-between px-4 py-3 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="space-y-0.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-accent text-base">{machine.plate}</span>
            <span className={`text-[10px] px-1.5 py-0.5 font-medium ${
              machine.is_active ? "bg-green-500/10 text-green-400" : "bg-fg-6/10 text-fg-6"
            }`}>
              {machine.is_active ? "Activa" : "Inactiva"}
            </span>
          </div>
          <p className="text-fg text-sm font-medium">{machine.brand} {machine.model} {machine.model_year ? `· ${machine.model_year}` : ""}</p>
          {machine.category && <p className="text-fg-5 text-xs">{machine.category}</p>}
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`text-xs font-medium ${docsCount === 6 ? "text-green-400" : docsCount > 0 ? "text-yellow-400" : "text-fg-6"}`}>
              {docsCount}/6 docs
            </span>
            <div className="flex gap-0.5">
              {DOCUMENT_SLOTS.map((s) => (
                <DocBadge key={s.key} uploaded={!!activeDocs.find((d) => d.document_key === s.key)} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <button
            onClick={(e) => { e.stopPropagation(); onCarta(machine); }}
            className="p-2 text-fg-5 hover:text-accent border border-border hover:border-accent/40 transition-colors"
            title="Carta de traslado"
          >
            <FileDown size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(machine); }}
            className="p-2 text-fg-5 hover:text-accent border border-border hover:border-accent/40 transition-colors"
          >
            <PencilLine size={14} />
          </button>
          <button className="p-2 text-fg-6 hover:text-fg transition-colors">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Detalle expandido */}
      {expanded && (
        <div className="border-t border-border px-4 py-4 space-y-4">
          {/* Datos */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <DataItem label="Serial máquina" value={machine.machine_serial} mono />
            <DataItem label="Serial motor"   value={machine.engine_serial}  mono />
            <DataItem label="Categoría"      value={machine.category} />
            <DataItem label="Declaración importación" value={machine.import_declaration} />
            <DataItem label="Fecha levante"  value={formatDate(machine.clearance_date)} />
            <DataItem label="Pedido CONINMAQ" value={machine.purchase_order} />
          </div>

          {/* Documentos — botones grandes para móvil */}
          <div>
            <p className="text-xs font-semibold text-fg-5 uppercase tracking-wider mb-2">Documentos</p>
            <div className="space-y-2">
              {DOCUMENT_SLOTS.map((slot) => {
                const SlotIcon = slot.icon;
                const doc = activeDocs.find((d) => d.document_key === slot.key);
                return doc ? (
                  <a
                    key={slot.key}
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 border border-accent/30 bg-accent/5 active:bg-accent/10 transition-colors"
                  >
                    <SlotIcon size={16} className="text-accent flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-fg text-sm font-medium">{slot.label}</p>
                      <p className="text-fg-5 text-xs truncate">{doc.file_name}</p>
                    </div>
                    <Download size={16} className="text-accent flex-shrink-0" />
                  </a>
                ) : (
                  <div
                    key={slot.key}
                    className="flex items-center gap-3 px-4 py-3 border border-border"
                  >
                    <SlotIcon size={16} className="text-fg-6 flex-shrink-0" />
                    <p className="text-fg-5 text-sm flex-1">{slot.label}</p>
                    <span className="text-xs text-fg-6">Sin archivo</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DataItem({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-fg-6 uppercase tracking-wider">{label}</p>
      <p className={`text-sm text-fg mt-0.5 ${mono ? "font-mono text-xs" : ""}`}>{value || "—"}</p>
    </div>
  );
}

// ── Vista desktop: fila de tabla ─────────────────────────────────────────────
function MachineRow({
  machine,
  onEdit,
  onCarta,
}: {
  machine: MachineInfoResponse;
  onEdit:  (m: MachineInfoResponse) => void;
  onCarta: (m: MachineInfoResponse) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const activeDocs = machine.documents.filter((d) => d.is_active);
  const docsCount  = activeDocs.length;

  return (
    <>
      <tr
        className="border-b border-border hover:bg-surface-3 transition-colors cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-4 py-3">
          <span className="font-mono font-semibold text-accent text-sm">{machine.plate}</span>
        </td>
        <td className="px-4 py-3">
          <p className="text-fg text-sm font-medium">{machine.brand}</p>
          <p className="text-fg-5 text-xs">{machine.model}</p>
          {machine.category && (
            <span className="text-[10px] text-fg-6 border border-border px-1.5 py-0.5 mt-0.5 inline-block">
              {machine.category}
            </span>
          )}
        </td>
        <td className="px-4 py-3 hidden lg:table-cell">
          <p className="font-mono text-xs text-fg">{machine.machine_serial}</p>
          {machine.engine_serial && (
            <p className="font-mono text-xs text-fg-5">{machine.engine_serial}</p>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-fg hidden md:table-cell">
          {machine.model_year ?? "—"}
        </td>
        <td className="px-4 py-3 text-sm text-fg hidden xl:table-cell">
          {formatDate(machine.clearance_date)}
        </td>
        <td className="px-4 py-3 hidden xl:table-cell">
          <span className="text-xs text-fg-4">{machine.purchase_order ?? "—"}</span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-medium ${docsCount === 6 ? "text-green-400" : docsCount > 0 ? "text-yellow-400" : "text-fg-6"}`}>
              {docsCount}/6
            </span>
            <div className="flex gap-0.5">
              {DOCUMENT_SLOTS.map((s) => (
                <DocBadge key={s.key} uploaded={!!activeDocs.find((d) => d.document_key === s.key)} />
              ))}
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={(e) => { e.stopPropagation(); onCarta(machine); }}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 border border-border text-fg-4 hover:text-accent hover:border-accent/40 transition-colors"
              title="Carta de traslado"
            >
              <FileDown size={12} /> Carta
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(machine); }}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 border border-border text-fg-4 hover:text-accent hover:border-accent/40 transition-colors"
            >
              <PencilLine size={12} /> Editar
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
              className="p-1.5 text-fg-6 hover:text-fg transition-colors"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-border bg-surface-3/50">
          <td colSpan={8} className="px-4 py-4">
            <div className="grid grid-cols-2 gap-6 lg:grid-cols-3">
              <div className="space-y-1.5 col-span-2 lg:col-span-1">
                <p className="text-xs font-semibold text-fg-5 uppercase tracking-wider mb-2">Detalle</p>
                <DesktopRow label="Categoría"               value={machine.category} />
                <DesktopRow label="Declaración importación" value={machine.import_declaration} />
                <DesktopRow label="Fecha levante"           value={formatDate(machine.clearance_date)} />
                <DesktopRow label="Pedido CONINMAQ"         value={machine.purchase_order} />
                <DesktopRow label="Serial máquina"          value={machine.machine_serial} mono />
                <DesktopRow label="Serial motor"            value={machine.engine_serial}  mono />
              </div>
              <div className="col-span-2">
                <p className="text-xs font-semibold text-fg-5 uppercase tracking-wider mb-2">Documentos</p>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {DOCUMENT_SLOTS.map((slot) => {
                    const SlotIcon = slot.icon;
                    const doc = activeDocs.find((d) => d.document_key === slot.key);
                    return (
                      <div
                        key={slot.key}
                        className={`flex items-center gap-2.5 px-3 py-2 border text-xs ${
                          doc ? "border-accent/30 bg-accent/5" : "border-border"
                        }`}
                      >
                        <SlotIcon size={13} className={doc ? "text-accent" : "text-fg-6"} />
                        <span className={`flex-1 ${doc ? "text-fg" : "text-fg-5"}`}>{slot.label}</span>
                        {doc ? (
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:underline flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Ver / Descargar
                          </a>
                        ) : (
                          <span className="text-fg-6">Sin archivo</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function DesktopRow({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-fg-5 w-44 flex-shrink-0">{label}:</span>
      <span className={`text-fg ${mono ? "font-mono" : ""}`}>{value || "—"}</span>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function InfoMaquinasPage() {
  const ability  = useAbility();
  const canWrite = ability.can("create", "ForeignTrade");

  const { machines, loading, error, refresh } = useMachineInfo(undefined);

  const [search, setSearch] = useState("");
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [editing,      setEditing]      = useState<MachineInfoResponse | null>(null);
  const [cartaMachine, setCartaMachine] = useState<MachineInfoResponse | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return machines.filter((m) =>
      !q ||
      m.plate.toLowerCase().includes(q) ||
      m.brand.toLowerCase().includes(q) ||
      m.model.toLowerCase().includes(q) ||
      m.machine_serial.toLowerCase().includes(q) ||
      (m.purchase_order ?? "").toLowerCase().includes(q)
    );
  }, [machines, search]);

  const total    = machines.length;
  const active   = machines.filter((m) => m.is_active).length;
  const inactive = total - active;
  const allDocs  = machines.filter((m) => m.documents.filter((d) => d.is_active).length === 6).length;

  const openCreate = () => { setEditing(null); setDrawerOpen(true); };
  const openEdit   = (m: MachineInfoResponse) => { setEditing(m); setDrawerOpen(true); };

  const handleSaved = (saved: MachineInfoResponse) => {
    refresh(undefined);
    if (!editing) setEditing(saved);
  };

  const handleClose = (changed: boolean) => {
    setDrawerOpen(false);
    setEditing(null);
    if (changed) refresh(undefined);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-fg font-bold text-xl">Info Maquinas</h1>
          <p className="text-fg-5 text-sm mt-0.5">Comercio Exterior — registro de maquinaria importada</p>
        </div>
        {canWrite && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent text-black text-sm font-semibold hover:bg-accent/90 transition-colors"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Nueva máquina</span>
            <span className="sm:hidden">Nueva</span>
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total"          value={String(total)}    icon={Truck}        />
        <StatCard label="Activas"        value={String(active)}   icon={PackageCheck} />
        <StatCard label="Inactivas"      value={String(inactive)} icon={PackageX}     />
        <StatCard label="Docs completos" value={String(allDocs)}  icon={FolderCheck}  />
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-6 pointer-events-none" />
        <input
          className="w-full bg-surface-2 border border-border text-fg pl-9 pr-4 py-2.5 text-sm"
          placeholder="Placa, marca, serial..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {loading && <p className="text-center text-fg-5 py-12">Cargando...</p>}

      {!loading && filtered.length === 0 && (
        <p className="text-center text-fg-5 py-12">
          {search ? "Sin resultados para tu búsqueda" : "No hay máquinas registradas"}
        </p>
      )}

      {/* Móvil — tarjetas */}
      {!loading && filtered.length > 0 && (
        <div className="md:hidden space-y-3">
          {filtered.map((m) => (
            <MachineCard key={m.id} machine={m} onEdit={openEdit} onCarta={setCartaMachine} />
          ))}
        </div>
      )}

      {/* Desktop — tabla */}
      {!loading && filtered.length > 0 && (
        <div className="hidden md:block bg-surface-2 border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-border bg-surface-3">
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-5">Placa</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-5">Marca / Modelo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-5 hidden lg:table-cell">Seriales</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-5">Año</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-5 hidden xl:table-cell">Fecha Levante</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-5 hidden xl:table-cell">Pedido</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-5">Docs</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <MachineRow key={m.id} machine={m} onEdit={openEdit} onCarta={setCartaMachine} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <MachineInfoDrawer
        open={drawerOpen}
        machine={editing}
        onClose={handleClose}
        onSaved={handleSaved}
      />

      {cartaMachine && (
        <CartaTrasladoModal
          machine={cartaMachine}
          onClose={() => setCartaMachine(null)}
        />
      )}
    </div>
  );
}
