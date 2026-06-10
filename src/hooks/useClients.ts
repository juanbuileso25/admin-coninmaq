import { useState, useEffect, useCallback } from "react";
import { api, type ClientResponse } from "../services/api";

export function useClients(initialIsActive: boolean | undefined = true) {
  const [clients, setClients]   = useState<ClientResponse[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async (isActive?: boolean | undefined, search?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.clients.list({ is_active: isActive, search });
      setClients(data);
    } catch (e: unknown) {
      setError((e as { detail?: string }).detail ?? "Error cargando clientes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(initialIsActive);
  }, [load, initialIsActive]);

  const refresh = (isActive?: boolean | undefined, search?: string) => load(isActive, search);

  const addClient = async (data: object) => {
    const created = await api.clients.create(data);
    setClients((prev) => [created, ...prev]);
    return created;
  };

  const updateClient = async (id: string, data: object) => {
    const updated = await api.clients.update(id, data);
    setClients((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  };

  const deactivateClient = async (id: string) => {
    await api.clients.deactivate(id);
    setClients((prev) => prev.filter((c) => c.id !== id));
  };

  return { clients, loading, error, refresh, addClient, updateClient, deactivateClient };
}
