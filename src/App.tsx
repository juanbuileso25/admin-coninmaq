import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage            from "./pages/LoginPage";
import DashboardPage        from "./pages/DashboardPage";
import PlaceholderPage      from "./pages/PlaceholderPage";
import AdminLayout          from "./layouts/AdminLayout";
import MaquinariaNuevaPage  from "./pages/inventario/MaquinariaNuevaPage";
import HorometroPage        from "./pages/renta/HorometroPage";
import ChangePasswordPage   from "./pages/ChangePasswordPage";
import ForgotPasswordPage   from "./pages/ForgotPasswordPage";
import ResetPasswordPage    from "./pages/ResetPasswordPage";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password"  element={<ResetPasswordPage />} />

      {/* Protected */}
      <Route element={<AdminLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Inventario */}
        <Route path="/inventario" element={<Navigate to="/inventario/maquinaria-nueva" replace />} />
        <Route path="/inventario/maquinaria-nueva" element={<MaquinariaNuevaPage />} />
        <Route path="/inventario/maquinaria-usada" element={<PlaceholderPage title="Maquinaria Usada" />} />
        <Route path="/inventario/repuestos"        element={<PlaceholderPage title="Repuestos" />} />
        <Route path="/inventario/renta"            element={<PlaceholderPage title="Renta" />} />

        {/* Renta */}
        <Route path="/renta" element={<Navigate to="/renta/horometro" replace />} />
        <Route path="/renta/horometro" element={<HorometroPage />} />

        <Route path="/cotizaciones" element={<PlaceholderPage title="Cotizaciones" />} />
        <Route path="/agente"       element={<PlaceholderPage title="Agente IA" />} />
        <Route path="/usuarios"     element={<PlaceholderPage title="Usuarios" />} />
        <Route path="/ajustes"               element={<PlaceholderPage title="Ajustes" />} />
        <Route path="/ajustes/contrasena"    element={<ChangePasswordPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
