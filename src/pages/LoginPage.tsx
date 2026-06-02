import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useAuth } from "../hooks/useAuth";

const schema = yup.object({
  email: yup
    .string()
    .required("El correo es obligatorio")
    .email("Ingresa un correo válido"),
  password: yup
    .string()
    .required("La contraseña es obligatoria")
    .min(4, "Mínimo 4 caracteres"),
  remember: yup.boolean().default(false),
});

type FormValues = yup.InferType<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPwd, setShowPwd]     = useState(false);
  const [authError, setAuthError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    mode: "onTouched",
  });

  const onSubmit = async (data: FormValues) => {
    setAuthError("");
    await new Promise((r) => setTimeout(r, 900));
    const ok = login(data.email, data.password, data.remember ?? false);
    if (ok) {
      navigate("/dashboard");
    } else {
      setAuthError("Credenciales incorrectas. Verifica tu email y contraseña.");
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4 relative overflow-hidden">

      {/* Grid background */}
      <div className="absolute inset-0 bg-grid-dark" style={{ backgroundSize: "40px 40px" }} />

      {/* Radial glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-accent opacity-[0.04] blur-[120px]" />
      </div>

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-accent/20" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-accent/20" />

      {/* Card */}
      <div className="relative w-full max-w-md animate-fade-up">

        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-accent to-transparent" />

        <div className="bg-surface-2 border border-border p-8 shadow-card">

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <img src="/logo-yellow.png" alt="Coninmaq" className="h-10 w-auto mb-6 opacity-90" />
            <div className="text-center">
              <h1 className="text-white text-xl font-semibold tracking-wide">Panel Administrativo</h1>
              <p className="text-zinc-500 text-xs mt-1 tracking-wider uppercase">Acceso restringido</p>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-7">
            <div className="flex-1 h-px bg-border-light" />
            <span className="text-zinc-600 text-[10px] uppercase tracking-[0.2em]">Iniciar sesión</span>
            <div className="flex-1 h-px bg-border-light" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
                Correo electrónico
              </label>
              <input
                type="email"
                autoComplete="email"
                placeholder="admin@coninmaq.com"
                {...register("email")}
                className={`input-dark ${errors.email ? "border-red-700 focus:border-red-600 focus:shadow-none" : ""}`}
              />
              {errors.email && (
                <p className="flex items-center gap-1.5 text-red-400 text-[11px] animate-fade-in">
                  <AlertCircle size={11} />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register("password")}
                  className={`input-dark pr-11 ${errors.password ? "border-red-700 focus:border-red-600 focus:shadow-none" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="flex items-center gap-1.5 text-red-400 text-[11px] animate-fade-in">
                  <AlertCircle size={11} />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-3 cursor-pointer group w-fit">
              <div className="relative flex-shrink-0">
                <input
                  type="checkbox"
                  {...register("remember")}
                  className="peer sr-only"
                />
                <div className="w-4 h-4 border border-border-light bg-surface-3
                                peer-checked:bg-accent peer-checked:border-accent
                                transition-all duration-150 flex items-center justify-center">
                  <svg
                    className="w-2.5 h-2.5 text-zinc-900 opacity-0 peer-checked:opacity-100 transition-opacity absolute"
                    viewBox="0 0 10 8" fill="none"
                  >
                    <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              <span className="text-zinc-400 text-xs group-hover:text-zinc-300 transition-colors select-none">
                Recordar sesión
              </span>
            </label>

            {/* Auth error */}
            {authError && (
              <div className="flex items-start gap-2.5 bg-red-950/40 border border-red-800/40 px-4 py-3 animate-fade-in">
                <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-red-400 text-xs leading-relaxed">{authError}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-1 flex items-center justify-center gap-2
                         bg-accent hover:bg-accent-light active:bg-accent-dark
                         text-zinc-900 font-semibold text-sm tracking-wider uppercase
                         py-3 transition-all duration-200
                         hover:shadow-glow disabled:opacity-60 disabled:cursor-not-allowed
                         hover:-translate-y-px"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Verificando...
                </>
              ) : (
                "Ingresar"
              )}
            </button>
          </form>

          <p className="text-center text-zinc-600 text-[11px] mt-6">
            Solo personal autorizado de Coninmaq
          </p>
        </div>

        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      </div>
    </div>
  );
}
