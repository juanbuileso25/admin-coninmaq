import { useState } from "react";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, KeyRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { api } from "../services/api";

const schema = yup.object({
  current_password: yup.string().required("La contraseña actual es obligatoria"),
  new_password: yup
    .string()
    .required("La nueva contraseña es obligatoria")
    .min(8, "Mínimo 8 caracteres"),
  confirm_password: yup
    .string()
    .required("Confirma la nueva contraseña")
    .oneOf([yup.ref("new_password")], "Las contraseñas no coinciden"),
});

type FormValues = yup.InferType<typeof schema>;

export default function ChangePasswordPage() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [apiError, setApiError]       = useState("");
  const [success, setSuccess]         = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: yupResolver(schema), mode: "onTouched" });

  const onSubmit = async (data: FormValues) => {
    setApiError("");
    setSuccess(false);
    try {
      await api.users.changePassword(data.current_password, data.new_password);
      setSuccess(true);
      reset();
    } catch (err: unknown) {
      const e = err as { detail?: string };
      setApiError(e?.detail ?? "Ocurrió un error al cambiar la contraseña");
    }
  };

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <KeyRound size={18} className="text-accent" />
          <h1 className="text-fg text-lg font-semibold">Cambiar contraseña</h1>
        </div>
        <p className="text-fg-5 text-sm ml-7">
          Actualiza tu contraseña de acceso al panel administrativo.
        </p>
      </div>

      <div className="bg-surface-2 border border-border p-6">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

          {/* Contraseña actual */}
          <div className="space-y-1.5">
            <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">
              Contraseña actual
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                {...register("current_password")}
                className={`input-dark pr-11 ${errors.current_password ? "border-red-700 focus:border-red-600 focus:shadow-none" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-5 hover:text-fg-3 transition-colors"
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.current_password && (
              <p className="flex items-center gap-1.5 text-red-400 text-[11px]">
                <AlertCircle size={11} /> {errors.current_password.message}
              </p>
            )}
          </div>

          <div className="h-px bg-border-light" />

          {/* Nueva contraseña */}
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
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-5 hover:text-fg-3 transition-colors"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.new_password && (
              <p className="flex items-center gap-1.5 text-red-400 text-[11px]">
                <AlertCircle size={11} /> {errors.new_password.message}
              </p>
            )}
          </div>

          {/* Confirmar contraseña */}
          <div className="space-y-1.5">
            <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">
              Confirmar nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Repite la nueva contraseña"
                {...register("confirm_password")}
                className={`input-dark pr-11 ${errors.confirm_password ? "border-red-700 focus:border-red-600 focus:shadow-none" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-5 hover:text-fg-3 transition-colors"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirm_password && (
              <p className="flex items-center gap-1.5 text-red-400 text-[11px]">
                <AlertCircle size={11} /> {errors.confirm_password.message}
              </p>
            )}
          </div>

          {/* Error de API */}
          {apiError && (
            <div className="flex items-start gap-2.5 bg-red-950/40 border border-red-800/40 px-4 py-3">
              <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-red-400 text-xs leading-relaxed">{apiError}</p>
            </div>
          )}

          {/* Éxito */}
          {success && (
            <div className="flex items-start gap-2.5 bg-green-950/40 border border-green-800/40 px-4 py-3">
              <CheckCircle2 size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
              <p className="text-green-400 text-xs leading-relaxed">
                Contraseña actualizada correctamente.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2
                       bg-accent hover:bg-accent-light active:bg-accent-dark
                       text-zinc-900 font-semibold text-sm tracking-wider uppercase
                       px-6 py-2.5 transition-all duration-200
                       hover:shadow-glow disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Guardando...
              </>
            ) : (
              "Actualizar contraseña"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
