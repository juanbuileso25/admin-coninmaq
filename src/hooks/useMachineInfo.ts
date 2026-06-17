import { useState, useEffect, useCallback } from "react";
import { api, type MachineInfoResponse } from "../services/api";

export function useMachineInfo(initialIsActive: boolean | undefined = true) {
  const [machines, setMachines] = useState<MachineInfoResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isActive?: boolean | undefined, search?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.foreignTrade.list({ is_active: isActive, search });
      setMachines(data);
    } catch (e: unknown) {
      setError((e as { detail?: string }).detail ?? "Error cargando datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(initialIsActive);
  }, [load, initialIsActive]);

  const refresh = (isActive?: boolean | undefined, search?: string) => load(isActive, search);

  return { machines, loading, error, refresh };
}
