import { useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { Menu, X, Bell, Sun, Moon } from "lucide-react";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../context/ThemeContext";
import { AbilityContext } from "../context/AbilityContext";

export default function AdminLayout() {
  const { user, ability } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed]     = useState(false);
  const [mobileOpen, setMobileOpen]   = useState(false);

  if (!user) return <Navigate to="/" replace />;

  return (
    <AbilityContext.Provider value={ability}>
    <div className="flex h-screen bg-surface overflow-hidden">

      {/* Sidebar — desktop */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar collapsed={collapsed} />
      </div>

      {/* Sidebar — mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex animate-fade-in">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 flex-shrink-0">
            <Sidebar collapsed={false} />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <header className="flex items-center justify-between px-5 py-3.5 bg-surface-2 border-b border-border flex-shrink-0 min-h-[64px]">
          <div className="flex items-center gap-3">
            {/* Toggle sidebar (desktop) */}
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="hidden lg:flex items-center justify-center w-8 h-8
                         text-fg-5 hover:text-fg-2 hover:bg-surface-4
                         transition-all duration-150 rounded-sm"
            >
              <Menu size={18} />
            </button>

            {/* Toggle sidebar (mobile) */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="lg:hidden flex items-center justify-center w-8 h-8
                         text-fg-5 hover:text-fg-2 hover:bg-surface-4
                         transition-all duration-150 rounded-sm"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            <div className="h-4 w-px bg-border-light hidden lg:block" />
            <span className="hidden lg:block text-fg-6 text-xs uppercase tracking-wider">
              Panel de Control
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              className="w-8 h-8 flex items-center justify-center text-fg-5
                         hover:text-fg-2 hover:bg-surface-4 transition-all duration-150 rounded-sm"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Notification bell */}
            <button className="relative w-8 h-8 flex items-center justify-center text-fg-5
                               hover:text-fg-2 hover:bg-surface-4 transition-all duration-150 rounded-sm">
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-accent rounded-full" />
            </button>

            {/* User chip */}
            <div className="flex items-center gap-2 bg-surface-3 border border-border px-3 py-1.5 rounded-sm">
              <div className="w-5 h-5 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center">
                <span className="text-accent font-bold text-[9px]">{user.avatar}</span>
              </div>
              <span className="text-fg-3 text-xs font-medium hidden sm:block">{user.name}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-5 lg:p-7">
          <Outlet />
        </main>
      </div>
    </div>
    </AbilityContext.Provider>
  );
}
