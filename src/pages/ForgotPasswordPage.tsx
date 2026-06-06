import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { api } from "../services/api";

const schema = yup.object({
  email: yup.string().required("El correo es obligatorio").email("Ingresa un correo válido"),
});

type FormValues = yup.InferType<typeof schema>;

export default function ForgotPasswordPage() {
  const [apiError, setApiError] = useState("");
  const [sent, setSent]         = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: yupResolver(schema), mode: "onTouched" });

  const onSubmit = async (data: FormValues) => {
    setApiError("");
    try {
      await api.passwordReset.forgot(data.email);
      setSent(true);
    } catch {
      setApiError("Ocurrió un error. Intenta de nuevo.");
    }
  };

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
              <h1 className="text-fg text-xl font-semibold tracking-wide">Recuperar contraseña</h1>
              <p className="text-fg-5 text-xs mt-1">Te enviaremos un enlace a tu correo</p>
            </div>
          </div>

          {sent ? (
            <div className="space-y-5">
              <div className="flex items-start gap-2.5 bg-green-950/40 border border-green-800/40 px-4 py-4">
                <CheckCircle2 size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                <p className="text-green-400 text-sm leading-relaxed">
                  Si tu correo está registrado, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
                </p>
              </div>
              <Link
                to="/"
                className="flex items-center justify-center gap-2 text-fg-4 hover:text-fg-2 text-sm transition-colors"
              >
                <ArrowLeft size={14} />
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">
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
                  <p className="flex items-center gap-1.5 text-red-400 text-[11px]">
                    <AlertCircle size={11} /> {errors.email.message}
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
                {isSubmitting ? <><Loader2 size={15} className="animate-spin" /> Enviando...</> : "Enviar enlace"}
              </button>

              <Link
                to="/"
                className="flex items-center justify-center gap-2 text-fg-5 hover:text-fg-3 text-xs transition-colors"
              >
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
