import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  FileText,
  Users,
  Settings,
  LogOut,
  ChevronDown,
  Truck,
  Wrench,
  Key,
  HardHat,
  DollarSign,
  ShieldCheck,
  Building2,
  ContactRound,
  Globe,
  Info,
  Bot,
  MessageSquare,
  UserCheck,
  ReceiptText,
  Banknote,
  FileSpreadsheet,
  GitMerge,
  Star,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useAbility } from "../context/AbilityContext";
import type { Subjects } from "../ability";

interface SubItem {
  label: string;
  to:    string;
}

interface NavItem {
  label:    string;
  to?:      string;
  icon:     React.ElementType;
  subject?: Subjects;
  sub?:     SubItem[];
}

interface NavGroup {
  section: string;
  items:   NavItem[];
}

const NAV: NavGroup[] = [
  {
    section: "Principal",
    items: [
      { label: "Dashboard",    to: "/dashboard",    icon: LayoutDashboard, subject: "Dashboard"    },
      {
        label: "Inventario",
        icon:  Package,
        subject: "Inventory",
        sub: [
          { label: "Maquinaria nueva", to: "/inventario/maquinaria-nueva" },
          { label: "Maquinaria usada", to: "/inventario/maquinaria-usada" },
          { label: "Repuestos",        to: "/inventario/repuestos"        },
          { label: "Renta",            to: "/inventario/renta"            },
        ],
      },
      {
        label: "Comercio exterior",
        icon:  Globe,
        subject: "ForeignTrade",
        sub: [
          { label: "Info maquinas", to: "/comercio-exterior/informacion-maquinas" },
        ],
      },
      {
        label: "Comercial",
        icon: FileText,
        subject: "Quote",
        sub: [
          { label: "Leads",           to: "/comercial/leads"           },
          { label: "Cotizaciones",    to: "/comercial/cotizaciones"    },
          { label: "Calificaciones",  to: "/comercial/calificaciones"  },
        ],
      },
      { label: "Clientes",    to: "/clientes",    icon: ContactRound,  subject: "Client"  },
      {
        label: "Pagos",
        icon: Banknote,
        subject: "Payments",
        sub: [
          { label: "Comprobantes",  to: "/pagos/comprobantes"  },
          { label: "Extracto",      to: "/pagos/extracto"      },
          { label: "Conciliación",  to: "/pagos/conciliacion"  },
        ],
      },
      {
        label: "Renta",
        icon:  DollarSign,
        subject: "RentalRecord",
        sub: [
          { label: "Horómetro", to: "/renta/horometro" },
        ],
      },
    ],
  },
  {
    section: "Sistema",
    items: [
      {
        label: "Coni",
        icon: Bot,
        subject: "BotSession",
        sub: [
          { label: "Conversaciones", to: "/agente/sesiones" },
        ],
      },
      { label: "Usuarios",  to: "/usuarios", icon: Users,    subject: "User"     },
      {
        label: "Ajustes",
        icon: Settings,
        subject: "Settings",
        sub: [
          { label: "Roles",            to: "/ajustes/roles"    },
          { label: "Áreas",            to: "/ajustes/areas"    },
          { label: "Calificación ICP", to: "/ajustes/scoring"  },
        ],
      },
    ],
  },
];

const SUB_ICONS: Record<string, React.ElementType> = {
  "/inventario/maquinaria-nueva": HardHat,
  "/inventario/maquinaria-usada": Truck,
  "/inventario/repuestos":        Wrench,
  "/inventario/renta":            Key,
  "/renta/horometro":             Key,
  "/ajustes/roles":               ShieldCheck,
  "/ajustes/areas":               Building2,
  "/comercio-exterior/informacion-maquinas": Info,
  "/agente/sesiones":        MessageSquare,
  "/comercial/leads":           UserCheck,
  "/comercial/cotizaciones":    ReceiptText,
  "/comercial/calificaciones":  Star,
  "/pagos/comprobantes":  Banknote,
  "/pagos/extracto":      FileSpreadsheet,
  "/pagos/conciliacion":  GitMerge,
  "/ajustes/scoring":     Star,
};

interface SidebarProps {
  collapsed: boolean;
}

export default function Sidebar({ collapsed }: SidebarProps) {
  const { user, logout } = useAuth();
  const ability = useAbility();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => ({
    Inventario:          location.pathname.startsWith("/inventario"),
    Renta:               location.pathname.startsWith("/renta"),
    "Comercio exterior": location.pathname.startsWith("/comercio-exterior"),
    Comercial:           location.pathname.startsWith("/comercial"),
    "Agente IA":         location.pathname.startsWith("/agente"),
    Pagos:               location.pathname.startsWith("/pagos"),
    Ajustes:             location.pathname.startsWith("/ajustes"),
  }));

  const toggleMenu = (label: string) =>
    setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] }));

  const handleLogout = () => {
    logout();
    navigate("/");
  };

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
        {NAV.map((group) => (
          <div key={group.section}>
            {!collapsed && (
              <p className="px-4 mb-1.5 text-[10px] uppercase tracking-[0.18em] text-fg-6 font-medium">
                {group.section}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.filter((item) => !item.subject || ability.can("read", item.subject)).map((item) => {
                const Icon        = item.icon;
                const isOpen      = !!openMenus[item.label];
                const isSubActive = item.sub?.some((s) => location.pathname.startsWith(s.to));

                /* ── Item con submenú ── */
                if (item.sub) {
                  return (
                    <li key={item.label}>
                      <button
                        onClick={() => !collapsed && toggleMenu(item.label)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium
                                    transition-all duration-150 group
                                    ${isSubActive
                                      ? "text-accent"
                                      : "text-fg-4 hover:text-fg hover:bg-surface-3"
                                    }`}
                      >
                        <Icon
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
                            {item.sub.map((sub) => {
                              const SubIcon = SUB_ICONS[sub.to];
                              return (
                                <li key={sub.to}>
                                  <NavLink
                                    to={sub.to}
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
                                        {SubIcon && (
                                          <SubIcon
                                            size={13}
                                            className={isActive ? "text-accent" : "text-fg-6"}
                                          />
                                        )}
                                        <span className="truncate">{sub.label}</span>
                                      </>
                                    )}
                                  </NavLink>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </li>
                  );
                }

                /* ── Item simple ── */
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to!}
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
                          <Icon
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
        ))}
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
