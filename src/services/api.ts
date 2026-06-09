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

function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY) ?? sessionStorage.getItem(REFRESH_KEY);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
}

async function tryRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    // Preserve storage type (localStorage vs sessionStorage)
    const inLocal = !!localStorage.getItem(REFRESH_KEY);
    const storage = inLocal ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, data.access_token);
    storage.setItem(REFRESH_KEY, data.refresh_token);
    return data.access_token;
  } catch {
    return null;
  }
}

async function doFetch(path: string, options: RequestInit, token: string | null): Promise<Response> {
  const isFormData = options.body instanceof FormData;
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      // Omit Content-Type for FormData — browser sets it with boundary automatically
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let token = getToken();
  let res = await doFetch(path, options, token);

  // Token expirado — intentar refresh y reintentar una vez
  if (res.status === 401) {
    const newToken = await tryRefresh();
    if (newToken) {
      res = await doFetch(path, options, newToken);
    } else {
      // Refresh también falló — limpiar sesión
      clearTokens();
      window.location.href = "/";
      throw { status: 401, detail: "Sesión expirada" };
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw { status: res.status, detail: body.detail ?? "Error desconocido" };
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export type MachineSpecResponse    = { id: string; label: string; value: string; icon: string; order: number };
export type MachineHighlightResponse = { id: string; text: string; order: number };
export type MachineResponse = {
  id: string; code: string; brand: string; category: string; model: string; slug: string;
  description: string; price: number; show_price: boolean; warranty: string; delivery_time: string;
  image_url: string; pdf_url: string; visible_web: boolean; featured: boolean; is_new: boolean;
  specs: MachineSpecResponse[]; highlights: MachineHighlightResponse[];
  created_at: string; updated_at: string;
};
export type MachineFilters = { is_new?: boolean; category?: string; featured?: boolean; visible_web?: boolean };

export type UserRoleResponse = { role: { id: string; name: string }; area_id: string | null; area_name: string | null };
export type UserPermissionResponse = { id: string; action: string; subject: string };
export type UserResponse = { id: string; first_name: string; last_name: string; email: string; is_active: boolean; created_at: string; role_assignments: UserRoleResponse[]; permissions: UserPermissionResponse[] };
export type RoleResponse = { id: string; name: string; description: string | null };
export type AreaResponse = { id: string; name: string; description: string | null };
export type PermissionResponse = { id: string; action: string; subject: string; description: string | null };

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
    removeRole: (id: string, role_id: string, area_id?: string | null) => {
      const params = area_id ? `?area_id=${area_id}` : "";
      return request<void>(`/users/${id}/roles/${role_id}${params}`, { method: "DELETE" });
    },
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
  permissions: {
    list: () => request<PermissionResponse[]>("/permissions/"),
    setUserPermissions: (userId: string, permissionIds: string[]) =>
      request<void>(`/permissions/users/${userId}/permissions`, {
        method: "PUT",
        body: JSON.stringify(permissionIds),
      }),
  },
  machines: {
    list: (filters?: MachineFilters) => {
      const params = new URLSearchParams();
      if (filters?.is_new     !== undefined) params.set("is_new",      String(filters.is_new));
      if (filters?.category   !== undefined) params.set("category",    filters.category);
      if (filters?.featured   !== undefined) params.set("featured",    String(filters.featured));
      if (filters?.visible_web !== undefined) params.set("visible_web", String(filters.visible_web));
      const qs = params.toString();
      return request<MachineResponse[]>(`/machines/${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) => request<MachineResponse>(`/machines/${id}`),
    create: (data: object) => request<MachineResponse>("/machines/", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: object) => request<MachineResponse>(`/machines/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/machines/${id}`, { method: "DELETE" }),
    toggleVisibility: (id: string) => request<MachineResponse>(`/machines/${id}/toggle-visibility`, { method: "PATCH" }),
    toggleFeatured:   (id: string) => request<MachineResponse>(`/machines/${id}/toggle-featured`,   { method: "PATCH" }),
    uploadImage: (id: string, file: File) => {
      const form = new FormData();
      form.append("file", file);
      return request<MachineResponse>(`/machines/${id}/upload-image`, {
        method: "POST",
        body: form,
        headers: {},  // let browser set Content-Type with boundary
      });
    },
    uploadDocument: (id: string, file: File) => {
      const form = new FormData();
      form.append("file", file);
      return request<MachineResponse>(`/machines/${id}/upload-document`, {
        method: "POST",
        body: form,
        headers: {},
      });
    },
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
