import { useState, useEffect, useCallback } from "react";
import {
  Plus, Pencil, Trash2, Loader2, Menu, ChevronDown,
  AlertTriangle, AlertCircle, X, GripVertical,
} from "lucide-react";
import { api, type MenuItemResponse } from "../../services/api";

/* ── Drag sort hook ───────────────────────────────────────────────────────────── */
function useDragSort(
  items: MenuItemResponse[],
  onReorder: (newItems: MenuItemResponse[]) => Promise<void>,
) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overId,    setOverId]    = useState<string | null>(null);

  const clear = () => { setDraggedId(null); setOverId(null); };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id !== draggedId) setOverId(id);
  };

  const handleDrop = async (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === id) { clear(); return; }
    const from = items.findIndex((i) => i.id === draggedId);
    const to   = items.findIndex((i) => i.id === id);
    if (from === -1 || to === -1) { clear(); return; }
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    clear();
    await onReorder(next);
  };

  return { draggedId, overId, handleDragStart, handleDragOver, handleDrop, handleDragEnd: clear };
}

/* ── Form ────────────────────────────────────────────────────────────────────── */
type ItemFormProps = {
  initial?: MenuItemResponse | null;
  parentId?: string | null;
  parentLabel?: string;
  onClose: () => void;
  onSaved: () => void;
};

function ItemForm({ initial, parentId, parentLabel, onClose, onSaved }: ItemFormProps) {
  const [label,   setLabel]   = useState(initial?.label ?? "");
  const [icon,    setIcon]    = useState(initial?.icon ?? "");
  const [path,    setPath]    = useState(initial?.path ?? "");
  const [group,   setGroup]   = useState(initial?.group ?? "");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const isEdit = !!initial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = {
        label:     label.trim(),
        icon:      icon.trim() || undefined,
        path:      path.trim() || undefined,
        group:     group.trim() || undefined,
        parent_id: isEdit ? (initial.parent_id ?? undefined) : (parentId ?? undefined),
      };
      if (isEdit) {
        await api.menuItems.update(initial.id, data);
      } else {
        await api.menuItems.create({ ...data, order_index: 0 });
      }
      onSaved();
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
            <div>
              <h2 className="text-fg text-sm font-semibold">
                {isEdit ? "Editar ítem de menú" : parentId ? "Nuevo subítem" : "Nuevo ítem de menú"}
              </h2>
              {parentLabel && !isEdit && (
                <p className="text-fg-5 text-[11px] mt-0.5">Bajo: <span className="text-accent">{parentLabel}</span></p>
              )}
            </div>
            <button onClick={onClose} className="text-fg-5 hover:text-fg transition-colors"><X size={16} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-fg-5 text-[10px] uppercase tracking-wider">Etiqueta *</label>
              <input
                value={label} onChange={(e) => setLabel(e.target.value)} required
                className="input-dark w-full"
                placeholder="Comercio Exterior"
              />
            </div>
            <div className="space-y-1">
              <label className="text-fg-5 text-[10px] uppercase tracking-wider">Ruta</label>
              <input
                value={path} onChange={(e) => setPath(e.target.value)}
                className="input-dark w-full font-mono text-sm"
                placeholder="/comercio-exterior/pedidos"
              />
            </div>
            <div className="space-y-1">
              <label className="text-fg-5 text-[10px] uppercase tracking-wider">Ícono (nombre)</label>
              <input
                value={icon} onChange={(e) => setIcon(e.target.value)}
                className="input-dark w-full"
                placeholder="Globe"
              />
            </div>
            {!parentId && !isEdit && (
              <div className="space-y-1">
                <label className="text-fg-5 text-[10px] uppercase tracking-wider">Sección (group)</label>
                <input
                  value={group} onChange={(e) => setGroup(e.target.value)}
                  className="input-dark w-full"
                  placeholder="Principal / Sistema"
                />
                <p className="text-fg-6 text-[10px]">Agrupa los ítems en el sidebar</p>
              </div>
            )}
            {isEdit && !initial.parent_id && (
              <div className="space-y-1">
                <label className="text-fg-5 text-[10px] uppercase tracking-wider">Sección (group)</label>
                <input
                  value={group} onChange={(e) => setGroup(e.target.value)}
                  className="input-dark w-full"
                  placeholder="Principal / Sistema"
                />
              </div>
            )}
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
                {isEdit ? "Guardar" : "Crear"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ── Children sortable list ───────────────────────────────────────────────────── */
type ChildrenListProps = {
  children: MenuItemResponse[];
  onReorderChildren: (newChildren: MenuItemResponse[]) => Promise<void>;
  onRefresh: () => void;
};

function ChildrenList({ children, onReorderChildren, onRefresh }: ChildrenListProps) {
  const { draggedId, overId, handleDragStart, handleDragOver, handleDrop, handleDragEnd } =
    useDragSort(children, onReorderChildren);

  return (
    <div>
      {children.map((child) => (
        <ChildRow
          key={child.id}
          item={child}
          isDragging={draggedId === child.id}
          isOver={overId === child.id}
          onDragStart={(e) => handleDragStart(e, child.id)}
          onDragOver={(e) => handleDragOver(e, child.id)}
          onDrop={(e) => handleDrop(e, child.id)}
          onDragEnd={handleDragEnd}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
}

/* ── Child row ────────────────────────────────────────────────────────────────── */
type ChildRowProps = {
  item: MenuItemResponse;
  isDragging: boolean;
  isOver: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver:  (e: React.DragEvent) => void;
  onDrop:      (e: React.DragEvent) => void;
  onDragEnd:   () => void;
  onRefresh: () => void;
};

function ChildRow({ item, isDragging, isOver, onDragStart, onDragOver, onDrop, onDragEnd, onRefresh }: ChildRowProps) {
  const [editing,      setEditing]      = useState(false);
  const [deleting,     setDeleting]     = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try { await api.menuItems.delete(item.id); onRefresh(); }
    finally { setDeleteLoading(false); }
  };

  return (
    <>
      <div
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        className={`ml-6 border-l border-border transition-all ${isDragging ? "opacity-40" : ""}`}
      >
        <div className={`flex items-center gap-2 px-3 py-2.5 bg-surface-2 border-b border-border
                         hover:bg-surface-3 group transition-colors
                         ${isOver ? "border-t-2 border-t-accent" : ""}
                         ${!item.is_active ? "opacity-50" : ""}`}>
          {/* Drag handle */}
          <div className="w-3 flex-shrink-0 flex items-center cursor-grab active:cursor-grabbing text-fg-6 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical size={12} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-fg-3 text-sm">{item.label}</span>
              {item.icon && (
                <span className="text-fg-6 text-[10px] font-mono bg-surface-3 border border-border px-1">{item.icon}</span>
              )}
              {!item.is_active && <span className="text-[10px] text-fg-6 italic">inactivo</span>}
            </div>
            {item.path && (
              <p className="text-fg-6 text-[10px] font-mono truncate">{item.path}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button onClick={() => setEditing(true)}
              className="w-6 h-6 flex items-center justify-center text-fg-6 hover:text-accent transition-colors"
              title="Editar">
              <Pencil size={11} />
            </button>
            <button onClick={() => setDeleting(true)}
              className="w-6 h-6 flex items-center justify-center text-fg-6 hover:text-red-400 transition-colors"
              title="Eliminar">
              <Trash2 size={11} />
            </button>
          </div>
        </div>

        {deleting && (
          <div className="bg-red-950/20 border-b border-red-900/30 px-3 py-2.5 flex items-center justify-between gap-3 ml-0">
            <div className="flex items-center gap-2 text-red-300">
              <AlertTriangle size={12} />
              <span className="text-xs">¿Eliminar <strong>{item.label}</strong>?</span>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => setDeleting(false)}
                className="px-3 py-1 text-[11px] text-fg-4 border border-border hover:border-border-light transition-all">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleteLoading}
                className="flex items-center gap-1 px-3 py-1 text-[11px] font-semibold text-white bg-red-700 hover:bg-red-600 transition-all disabled:opacity-60">
                {deleteLoading && <Loader2 size={10} className="animate-spin" />}
                Eliminar
              </button>
            </div>
          </div>
        )}
      </div>

      {editing && (
        <ItemForm
          initial={item}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); onRefresh(); }}
        />
      )}
    </>
  );
}

/* ── Parent row ───────────────────────────────────────────────────────────────── */
type ParentRowProps = {
  item: MenuItemResponse;
  isDragging: boolean;
  isOver: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver:  (e: React.DragEvent) => void;
  onDrop:      (e: React.DragEvent) => void;
  onDragEnd:   () => void;
  onReorderChildren: (parentId: string, newChildren: MenuItemResponse[]) => Promise<void>;
  onRefresh: () => void;
};

function ParentRow({
  item, isDragging, isOver,
  onDragStart, onDragOver, onDrop, onDragEnd,
  onReorderChildren, onRefresh,
}: ParentRowProps) {
  const [open,         setOpen]         = useState(false);
  const [editing,      setEditing]      = useState(false);
  const [addSub,       setAddSub]       = useState(false);
  const [deleting,     setDeleting]     = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const hasChildren = item.children.length > 0;

  const handleDelete = async () => {
    setDeleteLoading(true);
    try { await api.menuItems.delete(item.id); onRefresh(); }
    finally { setDeleteLoading(false); }
  };

  return (
    <>
      <div
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        className={`transition-all ${isDragging ? "opacity-40" : ""}`}
      >
        <div className={`flex items-center gap-2 px-3 py-2.5 bg-surface-2 border-b border-border
                         hover:bg-surface-3 group transition-colors
                         ${isOver ? "border-t-2 border-t-accent" : ""}
                         ${!item.is_active ? "opacity-50" : ""}`}>
          {/* Drag handle */}
          <div className="flex-shrink-0 cursor-grab active:cursor-grabbing text-fg-6 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical size={13} />
          </div>

          {/* Expand/collapse */}
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
            className="w-5 flex-shrink-0"
          >
            {hasChildren && (
              <ChevronDown
                size={13}
                className={`text-fg-5 transition-transform ${open ? "rotate-180" : ""}`}
              />
            )}
          </button>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-fg-2 text-sm font-medium">{item.label}</span>
              {item.icon && (
                <span className="text-fg-6 text-[10px] font-mono bg-surface-3 border border-border px-1">{item.icon}</span>
              )}
              {item.group && (
                <span className="text-[10px] text-fg-6 bg-surface-3 border border-border px-1.5">{item.group}</span>
              )}
              {!item.is_active && <span className="text-[10px] text-fg-6 italic">inactivo</span>}
            </div>
            {item.path && (
              <p className="text-fg-6 text-[10px] font-mono truncate">{item.path}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button onClick={(e) => { e.stopPropagation(); setAddSub(true); }}
              className="w-6 h-6 flex items-center justify-center text-fg-6 hover:text-accent transition-colors"
              title="Agregar subítem">
              <Plus size={11} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setEditing(true); }}
              className="w-6 h-6 flex items-center justify-center text-fg-6 hover:text-accent transition-colors"
              title="Editar">
              <Pencil size={11} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setDeleting(true); }}
              className="w-6 h-6 flex items-center justify-center text-fg-6 hover:text-red-400 transition-colors"
              title="Eliminar">
              <Trash2 size={11} />
            </button>
          </div>
        </div>

        {/* Delete confirm */}
        {deleting && (
          <div className="bg-red-950/20 border-b border-red-900/30 px-3 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-red-300">
              <AlertTriangle size={12} />
              <span className="text-xs">¿Eliminar <strong>{item.label}</strong>?{hasChildren ? " Se eliminarán sus subítems también." : ""}</span>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => setDeleting(false)}
                className="px-3 py-1 text-[11px] text-fg-4 border border-border hover:border-border-light transition-all">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleteLoading}
                className="flex items-center gap-1 px-3 py-1 text-[11px] font-semibold text-white bg-red-700 hover:bg-red-600 transition-all disabled:opacity-60">
                {deleteLoading && <Loader2 size={10} className="animate-spin" />}
                Eliminar
              </button>
            </div>
          </div>
        )}

        {/* Children */}
        {open && hasChildren && (
          <ChildrenList
            children={item.children}
            onReorderChildren={(newChildren) => onReorderChildren(item.id, newChildren)}
            onRefresh={onRefresh}
          />
        )}
      </div>

      {editing && (
        <ItemForm
          initial={item}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); onRefresh(); }}
        />
      )}
      {addSub && (
        <ItemForm
          parentId={item.id}
          parentLabel={item.label}
          onClose={() => setAddSub(false)}
          onSaved={() => { setAddSub(false); onRefresh(); }}
        />
      )}
    </>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────────── */
export default function MenuPage() {
  const [items,      setItems]      = useState<MenuItemResponse[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await api.menuItems.list()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const reorderParents = async (newItems: MenuItemResponse[]) => {
    setItems(newItems);
    setSaving(true);
    try {
      await api.menuItems.reorder(newItems.map((item, i) => ({ id: item.id, order_index: i })));
    } finally {
      setSaving(false);
    }
  };

  const reorderChildren = async (parentId: string, newChildren: MenuItemResponse[]) => {
    setItems((prev) =>
      prev.map((item) => item.id === parentId ? { ...item, children: newChildren } : item)
    );
    setSaving(true);
    try {
      await api.menuItems.reorder(newChildren.map((child, i) => ({ id: child.id, order_index: i })));
    } finally {
      setSaving(false);
    }
  };

  const { draggedId, overId, handleDragStart, handleDragOver, handleDrop, handleDragEnd } =
    useDragSort(items, reorderParents);

  return (
    <div className="space-y-5 max-w-[720px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-fg-6 text-xs uppercase tracking-wider mb-1">Ajustes</p>
          <h1 className="text-fg text-xl font-semibold">Menú del sistema</h1>
          <p className="text-fg-5 text-xs mt-1">Define la jerarquía de menú que puede asignarse a usuarios.</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {saving && (
            <span className="flex items-center gap-1.5 text-fg-5 text-xs">
              <Loader2 size={12} className="animate-spin" /> Guardando...
            </span>
          )}
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 bg-accent hover:bg-accent-light text-zinc-900 font-semibold
                       text-xs uppercase tracking-wider px-4 py-2.5 transition-all hover:shadow-glow hover:-translate-y-px"
          >
            <Plus size={15} /> Nuevo ítem
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="text-fg-6 text-[11px] flex items-center gap-3 animate-fade-up" style={{ animationDelay: "30ms", animationFillMode: "both" }}>
        <span className="flex items-center gap-1"><GripVertical size={10} /> Arrastrar para reordenar</span>
        <span className="flex items-center gap-1"><Plus size={10} /> Agregar subítem</span>
        <span className="flex items-center gap-1"><Pencil size={10} /> Editar</span>
        <span className="flex items-center gap-1"><Trash2 size={10} /> Eliminar</span>
        <span className="text-fg-6">(Pasa el cursor por encima)</span>
      </div>

      {/* Tree */}
      <div className="border border-border bg-surface-2 overflow-hidden animate-fade-up" style={{ animationDelay: "60ms", animationFillMode: "both" }}>
        {/* Header row */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface-3">
          <div className="w-4 flex-shrink-0" />
          <div className="w-5 flex-shrink-0" />
          <span className="flex-1 text-[10px] uppercase tracking-wider text-fg-5 font-medium">Etiqueta</span>
          <div className="w-20 flex-shrink-0" />
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12 text-fg-6 text-sm">
            <Loader2 size={16} className="animate-spin mr-2" /> Cargando...
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="text-center py-12 text-fg-6 text-sm">
            <Menu size={24} className="mx-auto mb-2 opacity-30" />
            No hay ítems de menú creados aún
          </div>
        )}
        {!loading && items.map((item) => (
          <ParentRow
            key={item.id}
            item={item}
            isDragging={draggedId === item.id}
            isOver={overId === item.id}
            onDragStart={(e) => handleDragStart(e, item.id)}
            onDragOver={(e) => handleDragOver(e, item.id)}
            onDrop={(e) => handleDrop(e, item.id)}
            onDragEnd={handleDragEnd}
            onReorderChildren={reorderChildren}
            onRefresh={load}
          />
        ))}
      </div>

      {createOpen && (
        <ItemForm
          onClose={() => setCreateOpen(false)}
          onSaved={() => { setCreateOpen(false); load(); }}
        />
      )}
    </div>
  );
}
