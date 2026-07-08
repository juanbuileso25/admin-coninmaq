import { useState, useEffect, useCallback } from "react";
import {
  Plus, Pencil, Loader2, ChevronDown, Code2, Zap,
  ToggleLeft, ToggleRight, AlertCircle, X, Check,
} from "lucide-react";
import { api, type AppModuleResponse, type ActionResponse } from "../../services/api";

/* ── helpers ─────────────────────────────────────────────────────────────────── */
function CodeBadge({ code }: { code: string }) {
  return (
    <span className="font-mono text-[10px] bg-accent/10 text-accent border border-accent/20 px-1.5 py-0.5">
      {code}
    </span>
  );
}

/* ── Module Form ─────────────────────────────────────────────────────────────── */
type ModuleFormProps = {
  initial?: AppModuleResponse | null;
  onClose: () => void;
  onSaved: (m: AppModuleResponse) => void;
};

function ModuleForm({ initial, onClose, onSaved }: ModuleFormProps) {
  const [code, setCode]   = useState(initial?.code ?? "");
  const [name, setName]   = useState(initial?.name ?? "");
  const [desc, setDesc]   = useState(initial?.description ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = { code: code.trim(), name: name.trim(), description: desc.trim() || undefined };
      const result = initial
        ? await api.appModules.update(initial.id, data)
        : await api.appModules.create(data);
      onSaved(result);
    } catch (err: unknown) {
      setError((err as { detail?: string }).detail ?? "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface-2 border border-border w-full max-w-sm shadow-card animate-fade-up">
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-accent to-transparent" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-fg text-sm font-semibold">{initial ? "Editar módulo" : "Nuevo módulo"}</h2>
            <button onClick={onClose} className="text-fg-5 hover:text-fg transition-colors"><X size={16} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-fg-5 text-[10px] uppercase tracking-wider">Código</label>
              <input
                value={code} onChange={(e) => setCode(e.target.value)} required
                className="input-dark w-full font-mono text-sm"
                placeholder="comercio_exterior"
              />
              <p className="text-fg-6 text-[10px]">Identificador único del módulo (snake_case)</p>
            </div>
            <div className="space-y-1">
              <label className="text-fg-5 text-[10px] uppercase tracking-wider">Nombre</label>
              <input
                value={name} onChange={(e) => setName(e.target.value)} required
                className="input-dark w-full"
                placeholder="Comercio Exterior"
              />
            </div>
            <div className="space-y-1">
              <label className="text-fg-5 text-[10px] uppercase tracking-wider">Descripción</label>
              <input
                value={desc} onChange={(e) => setDesc(e.target.value)}
                className="input-dark w-full"
                placeholder="Opcional"
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 bg-red-950/40 border border-red-800/40 px-3 py-2">
                <AlertCircle size={12} className="text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 px-3 py-2 text-xs text-fg-4 border border-border hover:border-border-light transition-all">
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-accent hover:bg-accent-light
                           text-zinc-900 font-semibold text-xs uppercase tracking-wider transition-all disabled:opacity-60">
                {loading && <Loader2 size={12} className="animate-spin" />}
                {initial ? "Guardar" : "Crear"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ── Action Form ─────────────────────────────────────────────────────────────── */
type ActionFormProps = {
  moduleId: string;
  initial?: ActionResponse | null;
  onClose: () => void;
  onSaved: (m: AppModuleResponse) => void;
};

function ActionForm({ moduleId, initial, onClose, onSaved }: ActionFormProps) {
  const [code, setCode]   = useState(initial?.code ?? "");
  const [name, setName]   = useState(initial?.name ?? "");
  const [desc, setDesc]   = useState(initial?.description ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = { code: code.trim(), name: name.trim(), description: desc.trim() || undefined };
      const result = initial
        ? await api.appModules.updateAction(moduleId, initial.id, data)
        : await api.appModules.addAction(moduleId, data);
      onSaved(result);
    } catch (err: unknown) {
      setError((err as { detail?: string }).detail ?? "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface-2 border border-border w-full max-w-sm shadow-card animate-fade-up">
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-accent to-transparent" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-fg text-sm font-semibold">{initial ? "Editar acción" : "Nueva acción"}</h2>
            <button onClick={onClose} className="text-fg-5 hover:text-fg transition-colors"><X size={16} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-fg-5 text-[10px] uppercase tracking-wider">Código</label>
              <input
                value={code} onChange={(e) => setCode(e.target.value)} required
                className="input-dark w-full font-mono text-sm"
                placeholder="ver"
              />
            </div>
            <div className="space-y-1">
              <label className="text-fg-5 text-[10px] uppercase tracking-wider">Nombre</label>
              <input
                value={name} onChange={(e) => setName(e.target.value)} required
                className="input-dark w-full"
                placeholder="Ver pedidos"
              />
            </div>
            <div className="space-y-1">
              <label className="text-fg-5 text-[10px] uppercase tracking-wider">Descripción</label>
              <input
                value={desc} onChange={(e) => setDesc(e.target.value)}
                className="input-dark w-full"
                placeholder="Opcional"
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 bg-red-950/40 border border-red-800/40 px-3 py-2">
                <AlertCircle size={12} className="text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 px-3 py-2 text-xs text-fg-4 border border-border hover:border-border-light transition-all">
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-accent hover:bg-accent-light
                           text-zinc-900 font-semibold text-xs uppercase tracking-wider transition-all disabled:opacity-60">
                {loading && <Loader2 size={12} className="animate-spin" />}
                {initial ? "Guardar" : "Crear"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ── Module Card ─────────────────────────────────────────────────────────────── */
type ModuleCardProps = {
  mod: AppModuleResponse;
  onUpdated: (m: AppModuleResponse) => void;
};

function ModuleCard({ mod, onUpdated }: ModuleCardProps) {
  const [open, setOpen]             = useState(false);
  const [editModule, setEditModule] = useState(false);
  const [addAction, setAddAction]   = useState(false);
  const [editAction, setEditAction] = useState<ActionResponse | null>(null);
  const [toggling, setToggling]     = useState<string | null>(null);

  const activeActions = mod.actions.filter((a) => a.is_active);

  const toggleModule = async () => {
    setToggling("module");
    try {
      const updated = await api.appModules.update(mod.id, { is_active: !mod.is_active });
      onUpdated(updated);
    } finally {
      setToggling(null);
    }
  };

  const toggleAction = async (action: ActionResponse) => {
    setToggling(action.id);
    try {
      const updated = await api.appModules.updateAction(mod.id, action.id, { is_active: !action.is_active });
      onUpdated(updated);
    } finally {
      setToggling(null);
    }
  };

  return (
    <>
      <div className={`bg-surface-2 border transition-colors ${mod.is_active ? "border-border" : "border-border opacity-60"}`}>
        {/* Card header */}
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setOpen(!open)}
            className="flex-1 flex items-center gap-3 min-w-0 text-left"
          >
            <div className="w-8 h-8 bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
              <Code2 size={14} className="text-accent" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-fg text-sm font-medium">{mod.name}</span>
                <CodeBadge code={mod.code} />
              </div>
              {mod.description && (
                <p className="text-fg-6 text-[11px] truncate mt-0.5">{mod.description}</p>
              )}
            </div>
            <div className="ml-auto flex items-center gap-2 flex-shrink-0">
              <span className="text-fg-6 text-[11px]">
                <span className="text-accent font-medium">{activeActions.length}</span> acción{activeActions.length !== 1 ? "es" : ""}
              </span>
              <ChevronDown
                size={14}
                className={`text-fg-5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
              />
            </div>
          </button>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setEditModule(true)}
              className="w-7 h-7 flex items-center justify-center text-fg-5 hover:text-accent hover:bg-surface-3 transition-all"
              title="Editar módulo"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={toggleModule}
              disabled={toggling === "module"}
              className="w-7 h-7 flex items-center justify-center transition-all disabled:opacity-40"
              title={mod.is_active ? "Desactivar" : "Activar"}
            >
              {toggling === "module"
                ? <Loader2 size={13} className="animate-spin text-fg-5" />
                : mod.is_active
                  ? <ToggleRight size={16} className="text-accent" />
                  : <ToggleLeft size={16} className="text-fg-5" />
              }
            </button>
          </div>
        </div>

        {/* Expanded actions */}
        {open && (
          <div className="border-t border-border">
            {mod.actions.length === 0 ? (
              <p className="px-4 py-3 text-fg-6 text-xs italic">Sin acciones aún</p>
            ) : (
              <div className="divide-y divide-border">
                {mod.actions.map((action) => (
                  <div key={action.id} className={`flex items-center gap-3 px-4 py-2.5 ${!action.is_active ? "opacity-50" : ""}`}>
                    <Zap size={12} className="text-fg-6 flex-shrink-0" />
                    <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                      <span className="text-fg-3 text-xs">{action.name}</span>
                      <CodeBadge code={action.code} />
                      {!action.is_active && (
                        <span className="text-[10px] text-fg-6 italic">inactiva</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => setEditAction(action)}
                        className="w-6 h-6 flex items-center justify-center text-fg-6 hover:text-accent transition-colors"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        onClick={() => toggleAction(action)}
                        disabled={toggling === action.id}
                        className="w-6 h-6 flex items-center justify-center transition-all disabled:opacity-40"
                      >
                        {toggling === action.id
                          ? <Loader2 size={11} className="animate-spin text-fg-5" />
                          : action.is_active
                            ? <ToggleRight size={14} className="text-accent" />
                            : <ToggleLeft size={14} className="text-fg-5" />
                        }
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="px-4 py-2.5 border-t border-border">
              <button
                onClick={() => setAddAction(true)}
                className="flex items-center gap-1.5 text-xs text-fg-5 hover:text-accent transition-colors"
              >
                <Plus size={13} /> Agregar acción
              </button>
            </div>
          </div>
        )}
      </div>

      {editModule && (
        <ModuleForm
          initial={mod}
          onClose={() => setEditModule(false)}
          onSaved={(m) => { setEditModule(false); onUpdated(m); }}
        />
      )}
      {addAction && (
        <ActionForm
          moduleId={mod.id}
          onClose={() => setAddAction(false)}
          onSaved={(m) => { setAddAction(false); onUpdated(m); }}
        />
      )}
      {editAction && (
        <ActionForm
          moduleId={mod.id}
          initial={editAction}
          onClose={() => setEditAction(null)}
          onSaved={(m) => { setEditAction(null); onUpdated(m); }}
        />
      )}
    </>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────────── */
export default function ModulosPage() {
  const [modules,      setModules]      = useState<AppModuleResponse[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [createOpen,   setCreateOpen]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setModules(await api.appModules.list(showInactive));
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

  useEffect(() => { load(); }, [load]);

  const handleUpdated = (updated: AppModuleResponse) => {
    setModules((prev) => prev.map((m) => m.id === updated.id ? updated : m));
  };

  const handleCreated = (created: AppModuleResponse) => {
    setCreateOpen(false);
    setModules((prev) => [...prev, created]);
  };

  const activeCount = modules.filter((m) => m.is_active).length;

  return (
    <div className="space-y-5 max-w-[860px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-fg-6 text-xs uppercase tracking-wider mb-1">Ajustes</p>
          <h1 className="text-fg text-xl font-semibold">Módulos del sistema</h1>
          <p className="text-fg-5 text-xs mt-1">Define los módulos y sus acciones disponibles para asignar a usuarios.</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 bg-accent hover:bg-accent-light text-zinc-900 font-semibold
                     text-xs uppercase tracking-wider px-4 py-2.5 transition-all hover:shadow-glow hover:-translate-y-px flex-shrink-0"
        >
          <Plus size={15} /> Nuevo módulo
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 animate-fade-up" style={{ animationDelay: "30ms", animationFillMode: "both" }}>
        <p className="text-fg-5 text-xs">
          <span className="text-fg-3 font-medium">{activeCount}</span> módulos activos
        </p>
        <label className="flex items-center gap-2 cursor-pointer group">
          <div className="relative">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="peer sr-only" />
            <div className="w-3.5 h-3.5 border border-border-light bg-surface-3 peer-checked:bg-accent peer-checked:border-accent transition-all flex items-center justify-center">
              {showInactive && <Check size={9} className="text-zinc-900" />}
            </div>
          </div>
          <span className="text-fg-5 text-xs group-hover:text-fg-3 transition-colors select-none">Mostrar inactivos</span>
        </label>
      </div>

      {/* List */}
      <div className="space-y-2 animate-fade-up" style={{ animationDelay: "60ms", animationFillMode: "both" }}>
        {loading && (
          <div className="flex items-center justify-center py-16 text-fg-6 text-sm">
            <Loader2 size={16} className="animate-spin mr-2" /> Cargando...
          </div>
        )}
        {!loading && modules.length === 0 && (
          <div className="text-center py-16 text-fg-6 text-sm border border-border bg-surface-2">
            <Code2 size={24} className="mx-auto mb-2 opacity-30" />
            No hay módulos creados aún
          </div>
        )}
        {!loading && modules.map((mod) => (
          <ModuleCard key={mod.id} mod={mod} onUpdated={handleUpdated} />
        ))}
      </div>

      {createOpen && (
        <ModuleForm onClose={() => setCreateOpen(false)} onSaved={handleCreated} />
      )}
    </div>
  );
}
