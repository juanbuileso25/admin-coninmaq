import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
import type { Machine } from "../types/machine";

interface UseMachinesReturn {
  machines:     Machine[];
  loading:      boolean;
  error:        string | null;
  addMachine:   (data: Omit<Machine, "id" | "created_at" | "updated_at">) => Promise<Machine>;
  updateMachine:(id: string, data: Partial<Omit<Machine, "id" | "created_at">>) => Promise<void>;
  removeMachine:(id: string) => Promise<void>;
  toggleField:  (id: string, field: "visible_web" | "featured") => Promise<void>;
  refresh:      () => Promise<void>;
}

export function useMachines(machineType: string): UseMachinesReturn {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.machines.list({ machine_type: machineType });
      setMachines(data as unknown as Machine[]);
    } catch (e: unknown) {
      const err = e as { detail?: string };
      setError(err.detail ?? "Error al cargar las máquinas");
    } finally {
      setLoading(false);
    }
  }, [machineType]);

  useEffect(() => { load(); }, [load]);

  const addMachine = async (data: Omit<Machine, "id" | "created_at" | "updated_at">): Promise<Machine> => {
    const created = await api.machines.create(data);
    const machine = created as unknown as Machine;
    setMachines((prev) => [machine, ...prev]);
    return machine;
  };

  const updateMachine = async (id: string, data: Partial<Omit<Machine, "id" | "created_at">>) => {
    const updated = await api.machines.update(id, data);
    setMachines((prev) => prev.map((m) => (m.id === id ? (updated as unknown as Machine) : m)));
  };

  const removeMachine = async (id: string) => {
    await api.machines.remove(id);
    setMachines((prev) => prev.filter((m) => m.id !== id));
  };

  const toggleField = async (id: string, field: "visible_web" | "featured") => {
    const updated = field === "visible_web"
      ? await api.machines.toggleVisibility(id)
      : await api.machines.toggleFeatured(id);
    setMachines((prev) => prev.map((m) => (m.id === id ? (updated as unknown as Machine) : m)));
  };

  return { machines, loading, error, addMachine, updateMachine, removeMachine, toggleField, refresh: load };
}
