import { useState, useMemo, useEffect, useCallback } from "react";
import { Plus, Search, Pencil, Trash2, AlertTriangle, Loader2, AlertCircle, UserCheck, UserX, ShieldCheck } from "lucide-react";
import { api, type UserResponse, type RoleResponse, type AreaResponse, type PermissionResponse } from "../../services/api";

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

const SUBJECT_LABELS: Record<string, string> = {
  Dashboard:    "Dashboard",
  Inventory:    "Inventario",
  Quote:        "Cotizaciones",
  RentalRecord: "Renta",
  User:         "Usuarios",
  Settings:     "Ajustes",
  Agent:        "Agente IA",
};

const ACTION_LABELS: Record<string, string> = {
  read:   "Ver",
  create: "Crear",
  update: "Editar",
  delete: "Eliminar",
};

/* ── Modal ── */
type ModalProps = {
  user: UserResponse | null;
  roles: RoleResponse[];
  areas: AreaResponse[];
  allPermissions: PermissionResponse[];
  onClose: () => void;
  onSaved: () => void;
};

function UserModal({ user, roles, areas, allPermissions, onClose, onSaved }: ModalProps) {
  const isEdit = !!user;

  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName,  setLastName]  = useState(user?.last_name ?? "");
  const [email,     setEmail]     = useState(user?.email ?? "");
  const [roleId,    setRoleId]    = useState(user?.role_assignments[0]?.role.id ?? "");
  const [areaId,    setAreaId]    = useState(user?.role_assignments[0]?.area_id ?? "");
  const [isActive,  setIsActive]  = useState(user?.is_active ?? true);

  const [selectedPermIds, setSelectedPermIds] = useState<Set<string>>(() => {
    if (!user) return new Set();
    return new Set(
      allPermissions
        .filter((p) => user.permissions.some((up) => up.action === p.action && up.subject === p.subject))
        .map((p) => p.id)
    );
  });

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const togglePerm = (id: string) => {
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSubject = (subject: string) => {
    const subjectPerms = allPermissions.filter((p) => p.subject === subject).map((p) => p.id);
    const allSelected = subjectPerms.every((id) => selectedPermIds.has(id));
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      subjectPerms.forEach((id) => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  // Agrupar permisos por subject
  const permsBySubject = useMemo(() => {
    const map: Record<string, PermissionResponse[]> = {};
    for (const p of allPermissions) {
      if (!map[p.subject]) map[p.subject] = [];
      map[p.subject].push(p);
    }
    return map;
  }, [allPermissions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isEdit) {
        await api.users.update(user.id, { first_name: firstName, last_name: lastName, is_active: isActive });

        const currentRole = user.role_assignments[0];
        const roleChanged = currentRole?.role.id !== roleId || currentRole?.area_id !== (areaId || null);
        if (roleChanged) {
          if (currentRole) await api.users.removeRole(user.id, currentRole.role.id, currentRole.area_id);
          if (roleId) await api.users.assignRole(user.id, roleId, areaId || undefined);
        }

        await api.permissions.setUserPermissions(user.id, Array.from(selectedPermIds));
      } else {
        const newUser = await api.users.create({
          first_name: firstName,
          last_name: lastName,
          email,
          role_id: roleId || undefined,
          area_id: areaId || undefined,
        });
        if (selectedPermIds.size > 0) {
          await api.permissions.setUserPermissions(newUser.id, Array.from(selectedPermIds));
        }
      }
      onSaved();
    } catch (err: unknown) {
      const e = err as { detail?: string };
      setError(e?.detail ?? "Ocurrió un error. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface-2 border border-border w-full max-w-lg shadow-card animate-fade-up flex flex-col max-h-[90vh]">
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-accent to-transparent flex-shrink-0" />
        <div className="p-6 overflow-y-auto">
          <h2 className="text-fg text-base font-semibold mb-5">
            {isEdit ? "Editar usuario" : "Nuevo usuario"}
          </h2>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* Datos básicos */}
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
                    <div className="w-4 h-4 border border-border-light bg-surface-3 peer-checked:bg-accent peer-checked:border-accent transition-all duration-150 flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-zinc-900 opacity-0 peer-checked:opacity-100 transition-opacity absolute" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  <span className="text-fg-4 text-xs group-hover:text-fg-3 transition-colors select-none">Usuario activo</span>
                </label>
              )}
            </div>

            {/* Permisos */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={13} className="text-accent" />
                <span className="text-fg-4 text-xs font-medium uppercase tracking-wider">Permisos</span>
              </div>
              <div className="border border-border divide-y divide-border">
                {Object.entries(permsBySubject).map(([subject, perms]) => {
                  const allSelected = perms.every((p) => selectedPermIds.has(p.id));
                  const someSelected = perms.some((p) => selectedPermIds.has(p.id));
                  return (
                    <div key={subject} className="px-3 py-2.5">
                      <div className="flex items-center justify-between mb-2">
                        <button type="button" onClick={() => toggleSubject(subject)}
                          className="flex items-center gap-2 group">
                          <div className={`w-3.5 h-3.5 border flex items-center justify-center flex-shrink-0 transition-colors ${
                            allSelected ? "bg-accent border-accent" : someSelected ? "bg-accent/40 border-accent/60" : "border-border-light bg-surface-3"
                          }`}>
                            {(allSelected || someSelected) && (
                              <svg className="w-2 h-2 text-zinc-900" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          <span className="text-fg-3 text-xs font-medium group-hover:text-fg transition-colors">
                            {SUBJECT_LABELS[subject] ?? subject}
                          </span>
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 pl-5">
                        {perms.map((p) => (
                          <label key={p.id} className="flex items-center gap-1.5 cursor-pointer group">
                            <div className="relative flex-shrink-0">
                              <input type="checkbox" checked={selectedPermIds.has(p.id)} onChange={() => togglePerm(p.id)} className="peer sr-only" />
                              <div className="w-3.5 h-3.5 border border-border-light bg-surface-3 peer-checked:bg-accent peer-checked:border-accent transition-all flex items-center justify-center">
                                <svg className="w-2 h-2 text-zinc-900 opacity-0 peer-checked:opacity-100 transition-opacity absolute" viewBox="0 0 10 8" fill="none">
                                  <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </div>
                            </div>
                            <span className="text-fg-5 text-[11px] group-hover:text-fg-3 transition-colors select-none">
                              {ACTION_LABELS[p.action] ?? p.action}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 bg-red-950/40 border border-red-800/40 px-3 py-2.5">
                <AlertCircle size={13} className="text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-xs text-fg-4 border border-border hover:border-border-light transition-all">
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-light text-zinc-900
                           font-semibold text-xs uppercase tracking-wider transition-all hover:shadow-glow disabled:opacity-60">
                {loading ? <Loader2 size={13} className="animate-spin" /> : null}
                {isEdit ? "Guardar cambios" : "Crear usuario"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ── Page ── */
export default function UsersPage() {
  const [users,          setUsers]          = useState<UserResponse[]>([]);
  const [roles,          setRoles]          = useState<RoleResponse[]>([]);
  const [areas,          setAreas]          = useState<AreaResponse[]>([]);
  const [allPermissions, setAllPermissions] = useState<PermissionResponse[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState("");

  const [modalOpen,     setModalOpen]     = useState(false);
  const [editing,       setEditing]       = useState<UserResponse | null>(null);
  const [deletingId,    setDeletingId]    = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, r, a, p] = await Promise.all([
        api.users.list(),
        api.roles.list(),
        api.areas.list(),
        api.permissions.list(),
      ]);
      setUsers(u);
      setRoles(r);
      setAreas(a);
      setAllPermissions(p);
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
          allPermissions={allPermissions}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
