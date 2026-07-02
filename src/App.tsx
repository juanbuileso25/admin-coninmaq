import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage            from "./pages/LoginPage";
import DashboardPage        from "./pages/DashboardPage";
import PlaceholderPage      from "./pages/PlaceholderPage";
import AdminLayout          from "./layouts/AdminLayout";
import MaquinariaNuevaPage  from "./pages/inventario/MaquinariaNuevaPage";
import MaquinariaUsadaPage  from "./pages/inventario/MaquinariaUsadaPage";
import MaquinariaRentaPage  from "./pages/inventario/MaquinariaRentaPage";
import HorometroPage        from "./pages/renta/HorometroPage";
import UsersPage            from "./pages/usuarios/UsersPage";
import RolesPage            from "./pages/ajustes/RolesPage";
import AreasPage            from "./pages/ajustes/AreasPage";
import ForgotPasswordPage   from "./pages/ForgotPasswordPage";
import ResetPasswordPage    from "./pages/ResetPasswordPage";
import ClientesPage         from "./pages/clientes/ClientesPage";
import OnboardingPage       from "./pages/onboarding/OnboardingPage";
import InfoMaquinasPage     from "./pages/comercio-exterior/InfoMaquinasPage";
import ComprobantesPage    from "./pages/pagos/ComprobantesPage";
import ExtractoPage        from "./pages/pagos/ExtractoPage";
import ConciliacionPage    from "./pages/pagos/ConciliacionPage";
import SesionesPage        from "./pages/agente/SesionesPage";
import SesionDetailPage    from "./pages/agente/SesionDetailPage";
import LeadsPage           from "./pages/agente/LeadsPage";
import LeadScorePage       from "./pages/agente/LeadScorePage";
import CotizacionesPage    from "./pages/agente/CotizacionesPage";
import ScoringConfigPage   from "./pages/ajustes/ScoringConfigPage";
import QuotationPage       from "./pages/public/QuotationPage";

export default function App() {
  return (
    <Routes>
      {/* Páginas públicas (sin auth) */}
      <Route path="/c/:quotationNumber" element={<QuotationPage />} />
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
        <Route path="/inventario/renta"            element={<MaquinariaRentaPage />} />

        {/* Renta */}
        <Route path="/renta" element={<Navigate to="/renta/horometro" replace />} />
        <Route path="/renta/horometro" element={<HorometroPage />} />


        {/* Comercio exterior */}
        <Route path="/comercio-exterior" element={<Navigate to="/comercio-exterior/informacion-maquinas" replace />} />
        <Route path="/comercio-exterior/informacion-maquinas" element={<InfoMaquinasPage />} />
        <Route path="/clientes"    element={<ClientesPage />} />

        {/* Pagos */}
        <Route path="/pagos" element={<Navigate to="/pagos/comprobantes" replace />} />
        <Route path="/pagos/comprobantes" element={<ComprobantesPage />} />
        <Route path="/pagos/extracto"     element={<ExtractoPage />} />
        <Route path="/pagos/conciliacion" element={<ConciliacionPage />} />

        {/* Comercial */}
        <Route path="/comercial" element={<Navigate to="/comercial/leads" replace />} />
        <Route path="/comercial/leads"                  element={<LeadsPage />} />
        <Route path="/comercial/leads/:leadId/score"    element={<LeadScorePage />} />
        <Route path="/comercial/cotizaciones"           element={<CotizacionesPage />} />

        {/* Agente IA */}
        <Route path="/agente" element={<Navigate to="/agente/sesiones" replace />} />
        <Route path="/agente/sesiones"            element={<SesionesPage />} />
        <Route path="/agente/sesiones/:sessionId" element={<SesionDetailPage />} />

        {/* Redirects de rutas antiguas */}
        <Route path="/agente/leads"                element={<Navigate to="/comercial/leads" replace />} />
        <Route path="/agente/leads/:leadId/score"  element={<Navigate to="/comercial/leads" replace />} />
        <Route path="/agente/cotizaciones"         element={<Navigate to="/comercial/cotizaciones" replace />} />

        <Route path="/usuarios"     element={<UsersPage />} />
        <Route path="/ajustes"        element={<Navigate to="/ajustes/roles" replace />} />
        <Route path="/ajustes/roles"    element={<RolesPage />} />
        <Route path="/ajustes/areas"    element={<AreasPage />} />
        <Route path="/ajustes/scoring"  element={<ScoringConfigPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
