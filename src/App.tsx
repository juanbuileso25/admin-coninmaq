import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage            from "./pages/LoginPage";
import DashboardPage        from "./pages/DashboardPage";
import PlaceholderPage      from "./pages/PlaceholderPage";
import AdminLayout          from "./layouts/AdminLayout";
import MaquinariaNuevaPage  from "./pages/inventario/MaquinariaNuevaPage";
import MaquinariaUsadaPage  from "./pages/inventario/MaquinariaUsadaPage";
import HorometroPage        from "./pages/renta/HorometroPage";
import UsersPage            from "./pages/usuarios/UsersPage";
import RolesPage            from "./pages/ajustes/RolesPage";
import AreasPage            from "./pages/ajustes/AreasPage";
import ForgotPasswordPage   from "./pages/ForgotPasswordPage";
import ResetPasswordPage    from "./pages/ResetPasswordPage";
import ClientesPage         from "./pages/clientes/ClientesPage";
import OnboardingPage       from "./pages/onboarding/OnboardingPage";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password"  element={<ResetPasswordPage />} />
      <Route path="/onboarding/:token" element={<OnboardingPage />} />

      {/* Protected */}
      <Route element={<AdminLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Inventario */}
        <Route path="/inventario" element={<Navigate to="/inventario/maquinaria-nueva" replace />} />
        <Route path="/inventario/maquinaria-nueva" element={<MaquinariaNuevaPage />} />
        <Route path="/inventario/maquinaria-usada" element={<MaquinariaUsadaPage />} />
        <Route path="/inventario/repuestos"        element={<PlaceholderPage title="Repuestos" />} />
        <Route path="/inventario/renta"            element={<PlaceholderPage title="Renta" />} />

        {/* Renta */}
        <Route path="/renta" element={<Navigate to="/renta/horometro" replace />} />
        <Route path="/renta/horometro" element={<HorometroPage />} />

        <Route path="/cotizaciones" element={<PlaceholderPage title="Cotizaciones" />} />
        <Route path="/clientes"    element={<ClientesPage />} />
        <Route path="/agente"       element={<PlaceholderPage title="Agente IA" />} />
        <Route path="/usuarios"     element={<UsersPage />} />
        <Route path="/ajustes"        element={<Navigate to="/ajustes/roles" replace />} />
        <Route path="/ajustes/roles"  element={<RolesPage />} />
        <Route path="/ajustes/areas"  element={<AreasPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
