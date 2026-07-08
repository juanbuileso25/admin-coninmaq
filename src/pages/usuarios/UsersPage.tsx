import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Search, Pencil, Trash2, AlertTriangle, Loader2, AlertCircle, UserCheck, UserX, ShieldCheck, Zap, Menu } from "lucide-react";
import { api, type UserResponse, type RoleResponse, type AreaResponse, type AppModuleResponse, type MenuItemResponse } from "../../services/api";

/* ── helpers ── */
function initials(u: UserResponse) {
  return `${u.first_name[0] ?? ""}${u.last_name[0] ?? ""}`.toUpperCase();
}

function primaryRole(u: UserResponse) {
  return u.role_assignments[0]?.role.name ?? null;
}

function primaryArea(u: UserResponse) {
  return u.role_assignments[0]?.area_name ?? null;
}

/* ── Checkbox helper ── */
function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <label className="flex-shrink-0 cursor-pointer" onClick={onChange}>
      <div className={`w-3.5 h-3.5 border flex items-center justify-center transition-all ${
        checked ? "bg-accent border-accent" : "border-border-light bg-surface-3"
      }`}>
        {checked && (
          <svg className="w-2 h-2 text-zinc-900" viewBox="0 0 10 8" fill="none">
            <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
    </label>
  );
}

/* ── Modal ── */
type ModalProps = {
  user: UserResponse | null;
  roles: RoleResponse[];
  areas: AreaResponse[];
  allModules: AppModuleResponse[];
  allMenuItems: MenuItemResponse[];
  onClose: () => void;
  onSaved: () => void;
};

type Tab = "datos" | "acciones" | "menu";

function UserModal({ user, roles, areas, allModules, allMenuItems, onClose, onSaved }: ModalProps) {
  const isEdit = !!user;
  const [tab, setTab] = useState<Tab>("datos");

  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName,  setLastName]  = useState(user?.last_name ?? "");
  const [email,     setEmail]     = useState(user?.email ?? "");
  const [roleId,    setRoleId]    = useState(user?.role_assignments[0]?.role.id ?? "");
  const [areaId,    setAreaId]    = useState(user?.role_assignments[0]?.area_id ?? "");
  const [isActive,  setIsActive]  = useState(user?.is_active ?? true);

  const [selectedActionIds,   setSelectedActionIds]   = useState<Set<string>>(
    () => new Set(user?.user_action_ids ?? [])
  );
  const [selectedMenuItemIds, setSelectedMenuItemIds] = useState<Set<string>>(
    () => new Set(user?.user_menu_item_ids ?? [])
  );

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  // ── Actions helpers ──
  const toggleAction = (id: string) =>
    setSelectedActionIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleModule = (mod: AppModuleResponse) => {
    const ids = mod.actions.filter((a) => a.is_active).map((a) => a.id);
    const allSel = ids.every((id) => selectedActionIds.has(id));
    setSelectedActionIds((prev) => {
      const n = new Set(prev);
      ids.forEach((id) => allSel ? n.delete(id) : n.add(id));
      return n;
    });
  };

  // ── Menu items helpers ──
  const toggleMenuItem = (id: string) =>
    setSelectedMenuItemIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleParentMenu = (item: MenuItemResponse) => {
    const ids = [item.id, ...item.children.map((c) => c.id)];
    const allSel = ids.every((id) => selectedMenuItemIds.has(id));
    setSelectedMenuItemIds((prev) => {
      const n = new Set(prev);
      ids.forEach((id) => allSel ? n.delete(id) : n.add(id));
      return n;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let userId = user?.id ?? "";

      if (isEdit) {
        await api.users.update(user.id, { first_name: firstName, last_name: lastName, is_active: isActive });
        const currentRole = user.role_assignments[0];
        const roleChanged = currentRole?.role.id !== roleId || currentRole?.area_id !== (areaId || null);
        if (roleChanged) {
          if (currentRole) await api.users.removeRole(user.id, currentRole.role.id, currentRole.area_id);
          if (roleId) await api.users.assignRole(user.id, roleId, areaId || undefined);
        }
      } else {
        const newUser = await api.users.create({
          first_name: firstName, last_name: lastName, email,
          role_id: roleId || undefined, area_id: areaId || undefined,
        });
        userId = newUser.id;
      }

      await Promise.all([
        api.users.setActions(userId, Array.from(selectedActionIds)),
        api.users.setMenuItems(userId, Array.from(selectedMenuItemIds)),
      ]);

      onSaved();
    } catch (err: unknown) {
      setError((err as { detail?: string }).detail ?? "Ocurrió un error. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "datos",    label: "Datos",    icon: null },
    { key: "menu",     label: "Menú",     icon: <Menu size={11} /> },
    { key: "acciones", label: "Acciones", icon: <Zap size={11} /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface-2 border border-border w-full max-w-lg shadow-card animate-fade-up flex flex-col max-h-[90vh]">
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-accent to-transparent flex-shrink-0" />

        <div className="px-6 pt-5 flex-shrink-0">
          <h2 className="text-fg text-base font-semibold mb-4">
            {isEdit ? "Editar usuario" : "Nuevo usuario"}
          </h2>
          {/* Tabs */}
          <div className="flex border-b border-border gap-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all border-b-2 -mb-px ${
                  tab === t.key
                    ? "text-accent border-accent"
                    : "text-fg-5 border-transparent hover:text-fg-3"
                }`}
              >
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

            {/* ── Tab: Datos ── */}
            {tab === "datos" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Nombre</label>
                    <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="input-dark w-full" placeholder="Juan" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Apellido</label>
                    <input value={lastName} onChange={(e) => setLastName(e.target.value)} required className="input-dark w-full" placeholder="Pérez" />
                  </div>
                </div>
                {!isEdit && (
                  <div className="space-y-1.5">
                    <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Correo electrónico</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-dark w-full" placeholder="usuario@coninmaq.com" />
                    <p className="text-fg-6 text-[11px]">Se enviará un correo para que el usuario configure su contraseña.</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Rol</label>
                    <select value={roleId} onChange={(e) => { setRoleId(e.target.value); setAreaId(""); }} className="input-dark w-full appearance-none">
                      <option value="">Sin rol</option>
                      {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                  {areas.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Área</label>
                      <select value={areaId} onChange={(e) => setAreaId(e.target.value)} className="input-dark w-full appearance-none">
                        <option value="">Sin área</option>
                        {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
                {isEdit && (
                  <label className="flex items-center gap-3 cursor-pointer group w-fit">
                    <div className="relative flex-shrink-0">
                      <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="peer sr-only" />
                      <div className="w-4 h-4 border border-border-light bg-surface-3 peer-checked:bg-accent peer-checked:border-accent transition-all flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-zinc-900 opacity-0 peer-checked:opacity-100 transition-opacity absolute" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                    <span className="text-fg-4 text-xs group-hover:text-fg-3 transition-colors select-none">Usuario activo</span>
                  </label>
                )}
              </div>
            )}

            {/* ── Tab: Acciones (nuevo sistema) ── */}
            {tab === "acciones" && (
              <div className="space-y-3">
                <p className="text-fg-6 text-[11px]">Acciones específicas del nuevo sistema de permisos, agrupadas por módulo.</p>
                {allModules.length === 0 ? (
                  <p className="text-fg-6 text-xs italic py-4 text-center">No hay módulos configurados. Crea módulos en Ajustes → Módulos.</p>
                ) : (
                  <div className="border border-border divide-y divide-border">
                    {allModules.map((mod) => {
                      const activeActions = mod.actions.filter((a) => a.is_active);
                      const allSel = activeActions.length > 0 && activeActions.every((a) => selectedActionIds.has(a.id));
                      const someSel = activeActions.some((a) => selectedActionIds.has(a.id));
                      return (
                        <div key={mod.id} className="px-3 py-2.5">
                          <button type="button" onClick={() => toggleModule(mod)} className="flex items-center gap-2 group mb-2">
                            <div className={`w-3.5 h-3.5 border flex items-center justify-center flex-shrink-0 transition-colors ${
                              allSel ? "bg-accent border-accent" : someSel ? "bg-accent/40 border-accent/60" : "border-border-light bg-surface-3"
                            }`}>
                              {(allSel || someSel) && (
                                <svg className="w-2 h-2 text-zinc-900" viewBox="0 0 10 8" fill="none">
                                  <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </div>
                            <span className="text-fg-3 text-xs font-medium group-hover:text-fg transition-colors">{mod.name}</span>
                            <span className="font-mono text-[10px] text-fg-6">{mod.code}</span>
                          </button>
                          {activeActions.length === 0 ? (
                            <p className="text-fg-6 text-[11px] pl-5 italic">Sin acciones activas</p>
                          ) : (
                            <div className="flex flex-wrap gap-2 pl-5">
                              {activeActions.map((action) => (
                                <label key={action.id} className="flex items-center gap-1.5 cursor-pointer group">
                                  <Checkbox checked={selectedActionIds.has(action.id)} onChange={() => toggleAction(action.id)} />
                                  <span className="text-fg-5 text-[11px] group-hover:text-fg-3 transition-colors select-none">
                                    {action.name}
                                    <span className="font-mono text-fg-6 ml-1">({action.code})</span>
                                  </span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Menú ── */}
            {tab === "menu" && (
              <div className="space-y-3">
                <p className="text-fg-6 text-[11px]">Selecciona los ítems de menú que este usuario puede ver en el sidebar.</p>
                {allMenuItems.length === 0 ? (
                  <p className="text-fg-6 text-xs italic py-4 text-center">No hay ítems de menú. Crea el menú en Ajustes → Menú.</p>
                ) : (
                  <div className="border border-border divide-y divide-border">
                    {allMenuItems.map((item) => {
                      const childIds = item.children.map((c) => c.id);
                      const allIds = [item.id, ...childIds];
                      const allSel  = allIds.every((id) => selectedMenuItemIds.has(id));
                      const someSel = allIds.some((id) => selectedMenuItemIds.has(id));
                      return (
                        <div key={item.id} className="px-3 py-2.5">
                          <button type="button" onClick={() => toggleParentMenu(item)} className="flex items-center gap-2 group mb-1">
                            <div className={`w-3.5 h-3.5 border flex items-center justify-center flex-shrink-0 transition-colors ${
                              allSel ? "bg-accent border-accent" : someSel ? "bg-accent/40 border-accent/60" : "border-border-light bg-surface-3"
                            }`}>
                              {(allSel || someSel) && (
                                <svg className="w-2 h-2 text-zinc-900" viewBox="0 0 10 8" fill="none">
                                  <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </div>
                            <span className="text-fg-3 text-xs font-medium group-hover:text-fg transition-colors">{item.label}</span>
                            {item.icon && <span className="text-fg-6 text-[10px] font-mono">{item.icon}</span>}
                          </button>
                          {item.children.length > 0 && (
                            <div className="pl-5 flex flex-col gap-1">
                              {item.children.map((child) => (
                                <label key={child.id} className="flex items-center gap-1.5 cursor-pointer group">
                                  <Checkbox checked={selectedMenuItemIds.has(child.id)} onChange={() => toggleMenuItem(child.id)} />
                                  <span className="text-fg-5 text-[11px] group-hover:text-fg-3 transition-colors select-none">{child.label}</span>
                                  {child.path && <span className="text-fg-6 text-[10px] font-mono">{child.path}</span>}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>

          {error && (
            <div className="mx-6 mb-2 flex items-start gap-2.5 bg-red-950/40 border border-red-800/40 px-3 py-2.5">
              <AlertCircle size={13} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 px-6 pb-5 pt-2 flex-shrink-0 border-t border-border">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-xs text-fg-4 border border-border hover:border-border-light transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-light text-zinc-900
                         font-semibold text-xs uppercase tracking-wider transition-all hover:shadow-glow disabled:opacity-60">
              {loading && <Loader2 size={13} className="animate-spin" />}
              {isEdit ? "Guardar cambios" : "Crear usuario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Page ── */
export default function UsersPage() {
  const [users,          setUsers]          = useState<UserResponse[]>([]);
  const [roles,          setRoles]          = useState<RoleResponse[]>([]);
  const [areas,          setAreas]          = useState<AreaResponse[]>([]);
  const [allModules,     setAllModules]     = useState<AppModuleResponse[]>([]);
  const [allMenuItems,   setAllMenuItems]   = useState<MenuItemResponse[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState("");

  const [modalOpen,     setModalOpen]     = useState(false);
  const [editing,       setEditing]       = useState<UserResponse | null>(null);
  const [deletingId,    setDeletingId]    = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, r, a, m, mi] = await Promise.all([
        api.users.list(),
        api.roles.list(),
        api.areas.list(),
        api.appModules.list().catch(() => []),
        api.menuItems.list().catch(() => []),
      ]);
      setUsers(u);
      setRoles(r);
      setAreas(a);
      setAllModules(m);
      setAllMenuItems(mi);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      u.first_name.toLowerCase().includes(q) ||
      u.last_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (primaryRole(u) ?? "").toLowerCase().includes(q)
    );
  }, [users, search]);

  const activeCount   = users.filter((u) => u.is_active).length;
  const inactiveCount = users.filter((u) => !u.is_active).length;

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit   = (u: UserResponse) => { setEditing(u); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };
  const handleSaved = () => { closeModal(); load(); };

  const confirmDelete = async (id: string) => {
    setDeleteLoading(true);
    try { await api.users.remove(id); setDeletingId(null); load(); }
    finally { setDeleteLoading(false); }
  };

  return (
    <div className="space-y-5 max-w-[1100px]">

      <div className="flex items-start justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-fg-6 text-xs uppercase tracking-wider mb-1">Administración</p>
          <h1 className="text-fg text-xl font-semibold">Usuarios</h1>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-accent hover:bg-accent-light text-zinc-900 font-semibold
                     text-xs uppercase tracking-wider px-4 py-2.5 transition-all hover:shadow-glow hover:-translate-y-px flex-shrink-0">
          <Plus size={15} /> Nuevo usuario
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 animate-fade-up" style={{ animationDelay: "60ms", animationFillMode: "both" }}>
        {[
          { label: "Total",     value: users.length,  color: "text-fg",          icon: <ShieldCheck size={15} /> },
          { label: "Activos",   value: activeCount,   color: "text-emerald-400", icon: <UserCheck size={15} /> },
          { label: "Inactivos", value: inactiveCount, color: "text-red-400",     icon: <UserX size={15} /> },
        ].map((s) => (
          <div key={s.label} className="bg-surface-2 border border-border px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`${s.color} opacity-60`}>{s.icon}</span>
              <span className="text-fg-5 text-xs">{s.label}</span>
            </div>
            <span className={`text-lg font-bold ${s.color}`}>{s.value}</span>
          </div>
        ))}
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "100ms", animationFillMode: "both" }}>
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-5" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email o rol..."
            className="w-full bg-surface-2 border border-border text-sm text-fg-2 pl-9 pr-4 py-2.5
                       placeholder:text-fg-6 outline-none focus:border-accent transition-all" />
        </div>
      </div>

      <div className="bg-surface-2 border border-border overflow-hidden animate-fade-up" style={{ animationDelay: "140ms", animationFillMode: "both" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">Usuario</th>
                <th className="text-left px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">Correo</th>
                <th className="text-left px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">Rol</th>
                <th className="text-left px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">Área</th>
                <th className="text-center px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">Estado</th>
                <th className="text-right px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr><td colSpan={6} className="text-center py-12 text-fg-6 text-sm">
                  <Loader2 size={18} className="animate-spin inline-block mr-2" />Cargando...
                </td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-fg-6 text-sm">No se encontraron usuarios</td></tr>
              )}
              {!loading && filtered.map((u) => (
                <>
                  <tr key={u.id} className="hover:bg-surface-3 transition-colors duration-100 group cursor-pointer" onClick={() => openEdit(u)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 flex-shrink-0 bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-[11px] font-bold">
                          {initials(u)}
                        </div>
                        <p className="text-fg-2 font-medium text-sm">{u.first_name} {u.last_name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-fg-4 text-xs">{u.email}</td>
                    <td className="px-4 py-3">
                      {primaryRole(u) ? (
                        <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium border bg-accent/10 text-accent border-accent/20">
                          {primaryRole(u)}
                        </span>
                      ) : <span className="text-fg-6 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {primaryArea(u)
                        ? <span className="text-fg-4 text-xs">{primaryArea(u)}</span>
                        : <span className="text-fg-6 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium border ${
                        u.is_active
                          ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/40"
                          : "bg-red-950/40 text-red-400 border-red-800/40"
                      }`}>
                        {u.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openEdit(u)}
                          className="w-8 h-8 flex items-center justify-center text-fg-5 hover:text-accent hover:bg-surface-4 transition-all">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDeletingId(u.id)}
                          className="w-8 h-8 flex items-center justify-center text-fg-5 hover:text-red-400 hover:bg-red-950/20 transition-all">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {deletingId === u.id && (
                    <tr key={`del-${u.id}`} className="bg-red-950/20 border-b border-red-900/30">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2.5 text-red-300">
                            <AlertTriangle size={15} />
                            <span className="text-sm">¿Eliminar a <strong>{u.first_name} {u.last_name}</strong>? Esta acción no se puede deshacer.</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button onClick={() => setDeletingId(null)}
                              className="px-4 py-1.5 text-xs text-fg-4 border border-border hover:border-border-light transition-all">
                              Cancelar
                            </button>
                            <button onClick={() => confirmDelete(u.id)} disabled={deleteLoading}
                              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-red-700 hover:bg-red-600 transition-all disabled:opacity-60">
                              {deleteLoading && <Loader2 size={12} className="animate-spin" />}
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border bg-surface-3">
          <p className="text-fg-6 text-xs">
            Mostrando <span className="text-fg-4">{filtered.length}</span> de{" "}
            <span className="text-fg-4">{users.length}</span> usuarios
          </p>
        </div>
      </div>

      {modalOpen && (
        <UserModal
          user={editing}
          roles={roles}
          areas={areas}
          allModules={allModules}
          allMenuItems={allMenuItems}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
