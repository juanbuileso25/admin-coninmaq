import { useEffect, useRef, useState } from "react";
import { Pencil, Plus, Search, X, Loader2, PackageX, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import { api, type MachineResponse, type SparePart, type SparePartCreate, type SparePartUpdate } from "../../services/api";
import Select from "../../components/ui/Select";

const COP = (n: number) => (n ? `$${n.toLocaleString("es-CO")}` : "—");

// ── Status badge ──────────────────────────────────────────────────────────────

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span className={`px-2 py-0.5 text-[11px] font-bold border rounded-sm ${
      active
        ? "bg-green-500/15 text-green-400 border-green-500/30"
        : "bg-surface-3 text-fg-5 border-border"
    }`}>
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}

// ── Inline drawer ─────────────────────────────────────────────────────────────

interface DrawerProps {
  open:     boolean;
  onClose:  () => void;
  editing:  SparePart | null;
  onSaved:  () => void;
}

function SparePartDrawer({ open, onClose, editing, onSaved }: DrawerProps) {
  const [code,         setCode]        = useState("");
  const [name,         setName]        = useState("");
  const [brand,        setBrand]       = useState("");
  const [category,     setCategory]    = useState("");
  const [description,  setDescription] = useState("");
  const [salePrice,    setSalePrice]   = useState("");
  const [taxPct,       setTaxPct]      = useState("19");
  const [unit,         setUnit]        = useState("unidad");
  const [stock,        setStock]       = useState("0");
  const [reorder,      setReorder]     = useState("0");
  const [machineId,    setMachineId]   = useState("");
  const [showPrice,    setShowPrice]   = useState(true);
  const [submitting,   setSubmitting]  = useState(false);
  const [machines,     setMachines]    = useState<MachineResponse[]>([]);

  useEffect(() => {
    if (open) {
      api.machines.list().then(setMachines).catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (open && editing) {
      setCode(editing.code);
      setName(editing.name);
      setBrand(editing.brand ?? "");
      setCategory(editing.category ?? "");
      setDescription(editing.description ?? "");
      setSalePrice(editing.sale_price > 0 ? editing.sale_price.toLocaleString("es-CO") : "");
      setTaxPct(editing.sale_price > 0 ? String(Math.round((editing.tax_value / editing.sale_price) * 100)) : "19");
      setUnit(editing.unit);
      setStock(String(editing.stock_quantity));
      setReorder(String(editing.reorder_level));
      setMachineId(editing.machine_id ?? "");
      setShowPrice(editing.show_price);
    } else if (open && !editing) {
      setCode(""); setName(""); setBrand(""); setCategory(""); setDescription("");
      setSalePrice(""); setTaxPct("19"); setUnit("unidad"); setStock("0"); setReorder("0");
      setMachineId(""); setShowPrice(true);
    }
  }, [open, editing]);

  const parseCOP = (s: string) => parseInt(s.replace(/\D/g, ""), 10) || 0;

  const basePrice    = parseCOP(salePrice);
  const pct          = parseFloat(taxPct) || 0;
  const computedTax  = Math.round(basePrice * pct / 100);
  const totalPrice   = basePrice + computedTax;

  const submit = async () => {
    if (!code.trim()) return toast.error("El código es requerido");
    if (!name.trim()) return toast.error("El nombre es requerido");

    setSubmitting(true);
    try {
      const payload: SparePartCreate = {
        code:         code.trim(),
        name:         name.trim(),
        brand:        brand.trim()       || null,
        category:     category.trim()    || null,
        description:  description.trim() || null,
        sale_price:   basePrice,
        tax_value:    computedTax,
        unit:         unit.trim() || "unidad",
        stock_quantity: parseInt(stock, 10) || 0,
        reorder_level:  parseInt(reorder, 10) || 0,
        machine_id:   machineId.trim() || null,
        show_price:   showPrice,
      };

      if (editing) {
        await api.spareParts.update(editing.id, payload as SparePartUpdate);
        toast.success("Repuesto actualizado");
      } else {
        await api.spareParts.create(payload);
        toast.success("Repuesto creado");
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { detail?: string })?.detail ?? "Error al guardar";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl bg-surface-2 border-l border-border flex flex-col h-full overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-fg font-semibold text-base">
              {editing ? "Editar repuesto" : "Nuevo repuesto"}
            </h2>
            <p className="text-fg-5 text-xs mt-0.5">Catálogo de repuestos</p>
          </div>
          <button onClick={onClose} className="text-fg-5 hover:text-fg transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-fg-4 text-xs mb-1.5 block">Código *</label>
              <input
                className="w-full bg-surface-3 border border-border text-fg px-3 py-2.5 text-sm placeholder:text-fg-6 outline-none focus:border-accent"
                placeholder="REP-001"
                value={code}
                onChange={e => setCode(e.target.value)}
              />
            </div>
            <div>
              <label className="text-fg-4 text-xs mb-1.5 block">Unidad</label>
              <input
                className="w-full bg-surface-3 border border-border text-fg px-3 py-2.5 text-sm placeholder:text-fg-6 outline-none focus:border-accent"
                placeholder="unidad"
                value={unit}
                onChange={e => setUnit(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-fg-4 text-xs mb-1.5 block">Nombre *</label>
            <input
              className="w-full bg-surface-3 border border-border text-fg px-3 py-2.5 text-sm placeholder:text-fg-6 outline-none focus:border-accent"
              placeholder="Nombre del repuesto"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-fg-4 text-xs mb-1.5 block">Marca</label>
              <input
                className="w-full bg-surface-3 border border-border text-fg px-3 py-2.5 text-sm placeholder:text-fg-6 outline-none focus:border-accent"
                placeholder="Lonking, Kubota..."
                value={brand}
                onChange={e => setBrand(e.target.value)}
              />
            </div>
            <div>
              <label className="text-fg-4 text-xs mb-1.5 block">Categoría</label>
              <input
                className="w-full bg-surface-3 border border-border text-fg px-3 py-2.5 text-sm placeholder:text-fg-6 outline-none focus:border-accent"
                placeholder="Filtros, Hidráulica..."
                value={category}
                onChange={e => setCategory(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-fg-4 text-xs mb-1.5 block">Descripción</label>
            <textarea
              rows={3}
              className="w-full bg-surface-3 border border-border text-fg text-sm px-3 py-2.5 outline-none focus:border-accent resize-none placeholder:text-fg-6"
              placeholder="Descripción técnica del repuesto..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-fg-4 text-xs mb-1.5 block">Precio sin IVA</label>
              <input
                className="w-full bg-surface-3 border border-border text-fg px-3 py-2.5 text-sm placeholder:text-fg-6 outline-none focus:border-accent"
                placeholder="0"
                value={salePrice}
                onChange={e => setSalePrice(e.target.value)}
              />
            </div>
            <div>
              <label className="text-fg-4 text-xs mb-1.5 block">% IVA</label>
              <select
                className="w-full bg-surface-3 border border-border text-fg px-3 py-2.5 text-sm outline-none focus:border-accent"
                value={taxPct}
                onChange={e => setTaxPct(e.target.value)}
              >
                <option value="0">0% — Exento</option>
                <option value="5">5%</option>
                <option value="19">19%</option>
              </select>
            </div>
          </div>

          {basePrice > 0 && (
            <div className="bg-surface-3 border border-border px-4 py-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-fg-5 text-xs block">IVA ({taxPct}%)</span>
                <span className="text-fg font-mono">{COP(computedTax)}</span>
              </div>
              <div>
                <span className="text-fg-5 text-xs block">Total con IVA</span>
                <span className="text-accent font-mono font-semibold">{COP(totalPrice)}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-fg-4 text-xs mb-1.5 block">Stock</label>
              <input
                type="number"
                min={0}
                className="w-full bg-surface-3 border border-border text-fg px-3 py-2.5 text-sm placeholder:text-fg-6 outline-none focus:border-accent"
                value={stock}
                onChange={e => setStock(e.target.value)}
              />
            </div>
            <div>
              <label className="text-fg-4 text-xs mb-1.5 block">Nivel de reorden</label>
              <input
                type="number"
                min={0}
                className="w-full bg-surface-3 border border-border text-fg px-3 py-2.5 text-sm placeholder:text-fg-6 outline-none focus:border-accent"
                value={reorder}
                onChange={e => setReorder(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-fg-4 text-xs mb-1.5 block">Máquina vinculada (opcional)</label>
            <Select
              value={machineId}
              onChange={setMachineId}
              placeholder="Sin máquina vinculada"
              clearable
              options={machines.map(m => ({ value: m.id, label: `${m.brand} ${m.model} (${m.code})` }))}
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showPrice}
              onChange={e => setShowPrice(e.target.checked)}
              className="w-4 h-4 accent-accent"
            />
            <span className="text-sm text-fg">Mostrar precio al público</span>
          </label>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-border flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-border text-fg-4 text-sm hover:bg-surface-3 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="flex-1 px-4 py-2.5 bg-accent text-black text-sm font-semibold hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {submitting ? "Guardando..." : editing ? "Guardar cambios" : "Crear repuesto"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RepuestosInventarioPage() {
  const [parts, setParts]       = useState<SparePart[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing]       = useState<SparePart | null>(null);
  const [toggling, setToggling]     = useState<number | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const PAGE_SIZE = 20;

  const load = async (q = search) => {
    setLoading(true);
    try {
      const res = await api.spareParts.list({ search: q || undefined, page, page_size: PAGE_SIZE });
      setParts(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => { setPage(1); load(search); }, 350);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const openNew = () => { setEditing(null); setDrawerOpen(true); };
  const openEdit = (p: SparePart) => { setEditing(p); setDrawerOpen(true); };

  const toggleActive = async (p: SparePart) => {
    setToggling(p.id);
    try {
      const updated = await api.spareParts.update(p.id, { is_active: !p.is_active });
      setParts(prev => prev.map(x => x.id === p.id ? updated : x));
    } catch {
      toast.error("No se pudo cambiar el estado");
    } finally {
      setToggling(null);
    }
  };

  const pages = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <div className="space-y-5">

      <div>
        <h1 className="text-fg font-bold text-xl">Inventario de Repuestos</h1>
        <p className="text-fg-5 text-sm mt-0.5">Catálogo de repuestos disponibles</p>
      </div>

      {/* Filters + actions */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-6 pointer-events-none" />
          <input
            className="w-full bg-surface-2 border border-border text-fg pl-9 pr-4 py-2.5 text-sm placeholder:text-fg-6 outline-none focus:border-accent"
            placeholder="Buscar por código, nombre o marca..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent text-black text-sm font-semibold hover:bg-accent/90 transition-colors whitespace-nowrap"
        >
          <Plus size={15} />
          Nuevo repuesto
        </button>
      </div>

      {/* Table */}
      <div className="bg-surface-2 border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {["Código", "Nombre", "Marca", "Categoría", "Precio sin IVA", "IVA", "Total", "Stock", "Máquina vinculada", "Estado", "Acciones"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-fg-5 text-xs uppercase tracking-wider font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={11} className="px-4 py-8 text-center text-fg-5">Cargando...</td></tr>
            )}
            {!loading && parts.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center">
                  <PackageX size={28} className="mx-auto mb-2 text-fg-6" />
                  <p className="text-fg-5 text-sm">Sin repuestos en el catálogo</p>
                </td>
              </tr>
            )}
            {!loading && parts.map(p => {
              const lowStock = p.reorder_level > 0 && p.stock_quantity <= p.reorder_level;
              return (
                <tr key={p.id} className="border-b border-border hover:bg-surface-3 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-accent whitespace-nowrap">{p.code}</td>
                  <td className="px-4 py-3 text-fg font-medium max-w-[180px] truncate">{p.name}</td>
                  <td className="px-4 py-3 text-fg-4">{p.brand ?? "—"}</td>
                  <td className="px-4 py-3 text-fg-4">{p.category ?? "—"}</td>
                  <td className="px-4 py-3 text-fg-4 font-mono text-xs whitespace-nowrap">{COP(p.sale_price)}</td>
                  <td className="px-4 py-3 text-fg-5 text-xs whitespace-nowrap">
                    {p.sale_price > 0 ? `${Math.round((p.tax_value / p.sale_price) * 100)}%` : "—"}
                  </td>
                  <td className="px-4 py-3 text-fg font-mono text-xs whitespace-nowrap font-semibold">{COP(p.sale_price + p.tax_value)}</td>
                  <td className={`px-4 py-3 font-mono text-xs font-semibold ${lowStock ? "text-red-400" : "text-fg"}`}>
                    {p.stock_quantity}
                    {lowStock && <span className="ml-1 text-red-400">⚠</span>}
                  </td>
                  <td className="px-4 py-3 text-fg-4 text-xs max-w-[120px] truncate">
                    {p.machine_name ?? p.machine_id ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <ActiveBadge active={p.is_active} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(p)}
                        className="text-fg-5 hover:text-fg transition-colors p-1"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => toggleActive(p)}
                        disabled={toggling === p.id}
                        className="text-fg-5 hover:text-fg transition-colors p-1 disabled:opacity-40"
                        title={p.is_active ? "Desactivar" : "Activar"}
                      >
                        {p.is_active ? <ToggleRight size={16} className="text-green-400" /> : <ToggleLeft size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-fg-5">
          <span>{total} repuestos en total</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 border border-border hover:bg-surface-3 disabled:opacity-40 transition-colors">
              Anterior
            </button>
            <span className="px-3 py-1.5 bg-surface-3 border border-border text-fg">{page} / {pages}</span>
            <button disabled={page === pages} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 border border-border hover:bg-surface-3 disabled:opacity-40 transition-colors">
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Drawer */}
      <SparePartDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editing={editing}
        onSaved={() => { load(); }}
      />
    </div>
  );
}
