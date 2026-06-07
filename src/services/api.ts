const BASE_URL = import.meta.env.VITE_API_URL ?? "https://api.coninmaqsas.com";

const TOKEN_KEY = "coninmaq_token";
const REFRESH_KEY = "coninmaq_refresh";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

export function setTokens(access: string, refresh: string, remember: boolean) {
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(TOKEN_KEY, access);
  storage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw { status: res.status, detail: body.detail ?? "Error desconocido" };
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export type UserRoleResponse = { role: { id: string; name: string }; area_id: string | null; area_name: string | null };
export type UserResponse = { id: string; first_name: string; last_name: string; email: string; is_active: boolean; created_at: string; role_assignments: UserRoleResponse[] };
export type RoleResponse = { id: string; name: string; description: string | null };
export type AreaResponse = { id: string; name: string; description: string | null };

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ access_token: string; refresh_token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
  },
  users: {
    me: () => request<UserResponse>("/users/me"),
    list: () => request<UserResponse[]>("/users/"),
    create: (data: { first_name: string; last_name: string; email: string; role_id?: string; area_id?: string }) =>
      request<UserResponse>("/users/", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: { first_name?: string; last_name?: string; is_active?: boolean }) =>
      request<UserResponse>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/users/${id}`, { method: "DELETE" }),
    assignRole: (id: string, role_id: string, area_id?: string) =>
      request<void>(`/users/${id}/roles`, { method: "POST", body: JSON.stringify({ role_id, area_id }) }),
    removeRole: (id: string, role_id: string) =>
      request<void>(`/users/${id}/roles/${role_id}`, { method: "DELETE" }),
    changePassword: (current_password: string, new_password: string) =>
      request<void>("/users/me/change-password", {
        method: "PATCH",
        body: JSON.stringify({ current_password, new_password }),
      }),
  },
  roles: {
    list: () => request<RoleResponse[]>("/roles/"),
    create: (data: { name: string; description?: string }) =>
      request<RoleResponse>("/roles/", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; description?: string }) =>
      request<RoleResponse>(`/roles/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/roles/${id}`, { method: "DELETE" }),
  },
  areas: {
    list: () => request<AreaResponse[]>("/areas/"),
    create: (data: { name: string; description?: string }) =>
      request<AreaResponse>("/areas/", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; description?: string }) =>
      request<AreaResponse>(`/areas/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/areas/${id}`, { method: "DELETE" }),
  },
  passwordReset: {
    forgot: (email: string) =>
      request<void>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    reset: (token: string, new_password: string) =>
      request<void>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, new_password }),
      }),
  },
};
