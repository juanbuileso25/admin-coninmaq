import { useMemo, useState } from "react";
import { Plus, Search, Users, UserCheck, UserX, Pencil, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { useAbility } from "../../context/AbilityContext";
import { useClients } from "../../hooks/useClients";
import { api, type ClientResponse } from "../../services/api";
import StatCard from "../../components/StatCard";
import ClientDrawer from "../../components/clientes/ClientDrawer";

export default function ClientesPage() {
  const ability = useAbility();
  const canWrite = ability.can("create", "Client");

  const { clients, loading, error, refresh } = useClients(undefined); // all clients

  const [search,      setSearch]      = useState("");
  const [statusFilter,setStatusFilter]= useState<"all" | "active" | "inactive">("all");
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [editing,     setEditing]     = useState<ClientResponse | null>(null);
  const [deactivating,setDeactivating]= useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return clients.filter(c => {
      const matchSearch = !q || c.name.toLowerCase().includes(q) || c.document.includes(q);
      const matchStatus =
        statusFilter === "all"      ? true :
        statusFilter === "active"   ? c.is_active :
        !c.is_active;
      return matchSearch && matchStatus;
    });
  }, [clients, search, statusFilter]);

  const totalActive   = clients.filter(c => c.is_active).length;
  const totalInactive = clients.filter(c => !c.is_active).length;

  const openCreate = () => { setEditing(null); setDrawerOpen(true); };
  const openEdit   = (c: ClientResponse) => { setEditing(c); setDrawerOpen(true); };

  const closeDrawer = (changed: boolean) => {
    setDrawerOpen(false);
    setEditing(null);
    if (changed) refresh(undefined);
  };

  const handleSaved = (saved: ClientResponse) => {
    refresh(undefined);
    // keep drawer open if editing so user can switch tabs
    if (!editing) { setEditing(saved); }
  };

  const handleDeactivate = async (c: ClientResponse) => {
    if (!confirm(`¿Desactivar a "${c.name}"?`)) return;
    setDeactivating(c.id);
    try {
      await api.clients.deactivate(c.id);
      toast.success("Cliente desactivado");
      refresh(undefined);
    } catch (e: unknown) {
      toast.error((e as { detail?: string }).detail ?? "Error");
    } finally {
      setDeactivating(null);
    }
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-fg font-bold text-xl">Clientes</h1>
          <p className="text-fg-5 text-sm mt-0.5">Gestión de clientes y empresas</p>
        </div>
        {canWrite && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent text-black text-sm font-semibold hover:bg-accent/90 transition-colors"
          >
            <Plus size={15} /> Nuevo cliente
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total clientes"  value={String(clients.length)} icon={Users}     delay={0} />
        <StatCard label="Activos"         value={String(totalActive)}    icon={UserCheck} accent delay={50} />
        <StatCard label="Inactivos"       value={String(totalInactive)}  icon={UserX}     delay={100} />
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-6 pointer-events-none" />
          <input
            className="w-full bg-surface-2 border border-border text-fg pl-9 pr-4 py-2.5 text-sm placeholder:text-fg-6 outline-none focus:border-accent"
            placeholder="Buscar por nombre o documento..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="bg-surface-2 border border-border text-fg-3 px-3 py-2.5 text-sm outline-none focus:border-accent cursor-pointer"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
        >
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>

      {/* Error */}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Table */}
      <div className="bg-surface-2 border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-3">
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-5 uppercase tracking-wider">Nombre / Razón social</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-5 uppercase tracking-wider">Documento</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-5 uppercase tracking-wider hidden md:table-cell">Ciudad</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-5 uppercase tracking-wider hidden lg:table-cell">Creado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-5 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} className="py-10 text-center text-fg-5 text-sm">Cargando...</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center text-fg-5 text-sm">Sin clientes</td></tr>
              )}
              {!loading && filtered.map(c => (
                <tr
                  key={c.id}
                  className="border-b border-border hover:bg-surface-3 transition-colors cursor-pointer"
                  onClick={() => openEdit(c)}
                >
                  <td className="px-4 py-3">
                    <p className="text-fg font-medium truncate max-w-[200px]">{c.name}</p>
                  </td>
                  <td className="px-4 py-3 text-fg-3">
                    {c.document_type && <span className="text-fg-5 text-xs mr-1.5">{c.document_type}</span>}
                    {c.document}
                  </td>
                  <td className="px-4 py-3 text-fg-4 hidden md:table-cell">
                    {c.city ? c.city.name : <span className="text-fg-6">—</span>}
                  </td>
                  <td className="px-4 py-3 text-fg-5 text-xs hidden lg:table-cell">
                    {new Date(c.created_at).toLocaleDateString("es-CO")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${
                      c.is_active
                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                        : "bg-fg-6/10 text-fg-5 border border-border"
                    }`}>
                      {c.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1 justify-end">
                      {canWrite && (
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 text-fg-5 hover:text-accent transition-colors"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      {canWrite && c.is_active && (
                        <button
                          onClick={() => handleDeactivate(c)}
                          disabled={deactivating === c.id}
                          className="p-1.5 text-fg-5 hover:text-red-400 transition-colors disabled:opacity-50"
                          title="Desactivar"
                        >
                          <UserMinus size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        {!loading && (
          <div className="px-4 py-2.5 border-t border-border bg-surface-3">
            <p className="text-fg-5 text-xs">{filtered.length} de {clients.length} clientes</p>
          </div>
        )}
      </div>

      <ClientDrawer
        open={drawerOpen}
        client={editing}
        onClose={closeDrawer}
        onSaved={handleSaved}
      />
    </div>
  );
}
