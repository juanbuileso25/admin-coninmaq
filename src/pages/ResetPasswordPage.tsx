import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { api } from "../services/api";

const schema = yup.object({
  new_password: yup.string().required("La contraseña es obligatoria").min(8, "Mínimo 8 caracteres"),
  confirm_password: yup
    .string()
    .required("Confirma la contraseña")
    .oneOf([yup.ref("new_password")], "Las contraseñas no coinciden"),
});

type FormValues = yup.InferType<typeof schema>;

export default function ResetPasswordPage() {
  const [searchParams]          = useSearchParams();
  const navigate                = useNavigate();
  const [showNew, setShowNew]   = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [apiError, setApiError] = useState("");
  const [success, setSuccess]   = useState(false);

  const token = searchParams.get("token") ?? "";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: yupResolver(schema), mode: "onTouched" });

  const onSubmit = async (data: FormValues) => {
    setApiError("");
    try {
      await api.passwordReset.reset(token, data.new_password);
      setSuccess(true);
      setTimeout(() => navigate("/"), 3000);
    } catch (err: unknown) {
      const e = err as { detail?: string };
      setApiError(e?.detail ?? "El enlace es inválido o ha expirado.");
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-red-400 text-sm">Enlace inválido.</p>
          <Link to="/" className="text-accent text-sm hover:underline">Volver al inicio</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-dark" style={{ backgroundSize: "40px 40px" }} />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-accent opacity-[0.04] blur-[120px]" />
      </div>
      <div className="absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-accent/20" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-accent/20" />

      <div className="relative w-full max-w-md animate-fade-up">
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-accent to-transparent" />
        <div className="bg-surface-2 border border-border p-8 shadow-card">

          <div className="flex flex-col items-center mb-8">
            <img src={`${import.meta.env.BASE_URL}logo-yellow.png`} alt="Coninmaq" className="h-10 w-auto mb-6 opacity-90" />
            <div className="text-center">
              <h1 className="text-fg text-xl font-semibold tracking-wide">Nueva contraseña</h1>
              <p className="text-fg-5 text-xs mt-1">Ingresa tu nueva contraseña de acceso</p>
            </div>
          </div>

          {success ? (
            <div className="space-y-5">
              <div className="flex items-start gap-2.5 bg-green-950/40 border border-green-800/40 px-4 py-4">
                <CheckCircle2 size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                <p className="text-green-400 text-sm leading-relaxed">
                  Contraseña actualizada correctamente. Redirigiendo al inicio de sesión...
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Mínimo 8 caracteres"
                    {...register("new_password")}
                    className={`input-dark pr-11 ${errors.new_password ? "border-red-700 focus:border-red-600 focus:shadow-none" : ""}`}
                  />
                  <button type="button" onClick={() => setShowNew(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-5 hover:text-fg-3 transition-colors">
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.new_password && (
                  <p className="flex items-center gap-1.5 text-red-400 text-[11px]">
                    <AlertCircle size={11} /> {errors.new_password.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <input
                    type={showConf ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Repite la nueva contraseña"
                    {...register("confirm_password")}
                    className={`input-dark pr-11 ${errors.confirm_password ? "border-red-700 focus:border-red-600 focus:shadow-none" : ""}`}
                  />
                  <button type="button" onClick={() => setShowConf(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-5 hover:text-fg-3 transition-colors">
                    {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.confirm_password && (
                  <p className="flex items-center gap-1.5 text-red-400 text-[11px]">
                    <AlertCircle size={11} /> {errors.confirm_password.message}
                  </p>
                )}
              </div>

              {apiError && (
                <div className="flex items-start gap-2.5 bg-red-950/40 border border-red-800/40 px-4 py-3">
                  <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-red-400 text-xs">{apiError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2
                           bg-accent hover:bg-accent-light active:bg-accent-dark
                           text-zinc-900 font-semibold text-sm tracking-wider uppercase
                           py-3 transition-all duration-200
                           hover:shadow-glow disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <><Loader2 size={15} className="animate-spin" /> Guardando...</> : "Guardar contraseña"}
              </button>

              <Link to="/" className="flex items-center justify-center gap-2 text-fg-5 hover:text-fg-3 text-xs transition-colors">
                <ArrowLeft size={12} />
                Volver al inicio de sesión
              </Link>
            </form>
          )}
        </div>
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      </div>
    </div>
  );
}
