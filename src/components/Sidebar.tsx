import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Package, FileText, Users, Settings, LogOut, ChevronDown,
  Truck, Wrench, Key, HardHat, DollarSign, ShieldCheck, Building2,
  ContactRound, Globe, Info, Bot, MessageSquare, UserCheck, ReceiptText,
  Banknote, FileSpreadsheet, GitMerge, Star, ShoppingCart, Factory,
  Loader2, HelpCircle,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { api, type MenuItemResponse } from "../services/api";

// ── Mapeo nombre → componente Lucide ──────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, Package, FileText, Users, Settings, Truck, Wrench, Key,
  HardHat, DollarSign, ShieldCheck, Building2, ContactRound, Globe, Info,
  Bot, MessageSquare, UserCheck, ReceiptText, Banknote, FileSpreadsheet,
  GitMerge, Star, ShoppingCart, Factory,
};

function NavIcon({ name, size = 17, className }: { name: string | null; size?: number; className?: string }) {
  const Icon = name ? (ICON_MAP[name] ?? HelpCircle) : HelpCircle;
  return <Icon size={size} className={className} />;
}

interface SidebarProps {
  collapsed: boolean;
}

export default function Sidebar({ collapsed }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [menuItems,   setMenuItems]   = useState<MenuItemResponse[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [openMenus,   setOpenMenus]   = useState<Record<string, boolean>>({});

  // Cargar menú al montar
  useEffect(() => {
    api.menuItems.myMenu()
      .then((items) => {
        setMenuItems(items);
        // Auto-abrir el grupo activo
        const initial: Record<string, boolean> = {};
        for (const item of items) {
          if (item.children.some((c) => location.pathname.startsWith(c.path ?? "__"))) {
            initial[item.id] = true;
          }
          if (item.path && location.pathname.startsWith(item.path)) {
            initial[item.id] = true;
          }
        }
        setOpenMenus(initial);
      })
      .catch(() => setMenuItems([]))
      .finally(() => setMenuLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMenu = (id: string) =>
    setOpenMenus((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleLogout = () => { logout(); navigate("/"); };

  // Agrupar por group
  const groups = menuItems.reduce<Record<string, MenuItemResponse[]>>((acc, item) => {
    const g = item.group ?? "General";
    if (!acc[g]) acc[g] = [];
    acc[g].push(item);
    return acc;
  }, {});

  // Orden de grupos (Principal primero, Sistema después)
  const groupOrder = ["Principal", "Sistema", "General"];
  const sortedGroups = Object.keys(groups).sort(
    (a, b) => (groupOrder.indexOf(a) ?? 99) - (groupOrder.indexOf(b) ?? 99)
  );

  return (
    <aside
      className={`flex flex-col h-full bg-surface-2 border-r border-border transition-all duration-300 ${
        collapsed ? "w-[64px]" : "w-[220px]"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center justify-center px-4 py-5 border-b border-border min-h-[64px]">
        {collapsed
          ? <img src={`${import.meta.env.BASE_URL}logo-icon.png`} alt="Coninmaq" className="h-8 w-8 object-contain" />
          : <img src={`${import.meta.env.BASE_URL}logo-yellow.png`} alt="Coninmaq" className="h-8 w-auto object-contain animate-fade-in" />
        }
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-5">
        {menuLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={16} className="animate-spin text-fg-6" />
          </div>
        ) : (
          sortedGroups.map((groupName) => (
            <div key={groupName}>
              {!collapsed && (
                <p className="px-4 mb-1.5 text-[10px] uppercase tracking-[0.18em] text-fg-6 font-medium">
                  {groupName}
                </p>
              )}
              <ul className="space-y-0.5">
                {groups[groupName].map((item) => {
                  const isOpen      = !!openMenus[item.id];
                  const isSubActive = item.children.some((c) =>
                    c.path ? location.pathname.startsWith(c.path) : false
                  );

                  /* ── Ítem con hijos ── */
                  if (item.children.length > 0) {
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => !collapsed && toggleMenu(item.id)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium
                                      transition-all duration-150 group
                                      ${isSubActive
                                        ? "text-accent"
                                        : "text-fg-4 hover:text-fg hover:bg-surface-3"
                                      }`}
                        >
                          <NavIcon
                            name={item.icon}
                            size={17}
                            className={`flex-shrink-0 transition-colors ${
                              isSubActive ? "text-accent" : "text-fg-5 group-hover:text-fg-3"
                            }`}
                          />
                          {!collapsed && (
                            <>
                              <span className="truncate animate-fade-in flex-1 text-left">
                                {item.label}
                              </span>
                              <ChevronDown
                                size={13}
                                className={`flex-shrink-0 transition-transform duration-200 ${
                                  isOpen ? "rotate-180 text-accent" : "text-fg-6"
                                }`}
                              />
                            </>
                          )}
                        </button>

                        {/* Submenú */}
                        {!collapsed && (
                          <div
                            className={`overflow-hidden transition-all duration-250 ${
                              isOpen ? "max-h-60 opacity-100" : "max-h-0 opacity-0"
                            }`}
                          >
                            <ul className="border-l border-border ml-7 pl-0 py-1 space-y-0.5">
                              {item.children.map((child) => (
                                <li key={child.id}>
                                  <NavLink
                                    to={child.path ?? "#"}
                                    className={({ isActive }) =>
                                      `flex items-center gap-2.5 pl-3 pr-4 py-2 text-xs font-medium
                                       transition-all duration-150 border-l-2 -ml-px
                                       ${isActive
                                         ? "text-accent border-accent bg-accent-muted"
                                         : "text-fg-5 border-transparent hover:text-fg-2 hover:border-fg-6"
                                       }`
                                    }
                                  >
                                    {({ isActive }) => (
                                      <>
                                        <NavIcon
                                          name={child.icon}
                                          size={13}
                                          className={isActive ? "text-accent" : "text-fg-6"}
                                        />
                                        <span className="truncate">{child.label}</span>
                                      </>
                                    )}
                                  </NavLink>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </li>
                    );
                  }

                  /* ── Ítem simple ── */
                  return (
                    <li key={item.id}>
                      <NavLink
                        to={item.path ?? "#"}
                        className={({ isActive }) =>
                          `relative flex items-center gap-3 px-4 py-2.5 text-sm font-medium
                           transition-all duration-150 group
                           ${isActive
                             ? "text-accent bg-accent-muted border-r-2 border-accent"
                             : "text-fg-4 hover:text-fg hover:bg-surface-3"
                           }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <NavIcon
                              name={item.icon}
                              size={17}
                              className={`flex-shrink-0 transition-colors ${
                                isActive ? "text-accent" : "text-fg-5 group-hover:text-fg-3"
                              }`}
                            />
                            {!collapsed && (
                              <span className="truncate animate-fade-in">{item.label}</span>
                            )}
                          </>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </nav>

      {/* User + logout */}
      <div className="border-t border-border p-3 space-y-2">
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-1 py-1 animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center flex-shrink-0">
              <span className="text-accent font-bold text-xs">{user.avatar}</span>
            </div>
            <div className="overflow-hidden">
              <p className="text-fg-2 text-xs font-semibold truncate">{user.name}</p>
              <p className="text-fg-5 text-[10px] truncate">{user.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-fg-5
                     hover:text-red-400 hover:bg-red-950/20 transition-all duration-150 rounded-sm"
        >
          <LogOut size={16} className="flex-shrink-0" />
          {!collapsed && <span className="animate-fade-in">Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}
