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

export type MachineTypeResponse      = { id: number; name: string; slug: string; is_active: boolean };
export type MachineSpecResponse      = { id: string; label: string; value: string; icon: string; order: number };
export type MachineHighlightResponse = { id: string; text: string; order: number };
export type MachineImageResponse     = { id: string; url: string; is_primary: boolean; order: number };
export type MachineResponse = {
  id: string; code: string; brand: string; category: string; model: string; slug: string;
  description: string; price: number; show_price: boolean; warranty: string; delivery_time: string;
  image_url: string; pdf_url: string; visible_web: boolean; featured: boolean;
  machine_type_id: number; machine_type: MachineTypeResponse;
  specs: MachineSpecResponse[]; highlights: MachineHighlightResponse[]; images: MachineImageResponse[];
  year: number | null; hours_used: string | null; condition: string | null; inspection: string | null;
  created_at: string; updated_at: string;
};
export type MachineFilters = { machine_type?: string; category?: string; featured?: boolean; visible_web?: boolean };

// ── Locations & Economic Activities ──────────────────────────────────────────
export type CityResponse             = { id: number; state_id: number; name: string; is_capital: boolean };
export type StateResponse            = { id: number; country_id: number; code: string; name: string };
export type CountryResponse          = { id: number; iso2: string; name: string; indicative: string };
export type EconomicActivityResponse = { id: number; code: string; description: string };
export type DocumentTypeResponse     = { id: number; code: string; description: string; is_active: boolean };

// ── Clients ───────────────────────────────────────────────────────────────────
export type CommercialReferenceResponse    = { id: string; name: string; address: string | null; phone: string | null; email: string | null; is_active: boolean };
export type LegalRepresentativeResponse   = { id: string; first_name: string; last_name: string; document_type: string | null; document_number: string; phone: string | null; email: string | null; is_active: boolean };
export type ClientPartnerResponse         = { id: string; first_name: string; last_name: string; document_type: string | null; document_number: string; phone: string | null; participation_percentage: number | null; is_active: boolean };
export type ClientPepResponse             = { id: string; first_name: string; last_name: string; document_type: string | null; document_number: string; phone: string | null; position: string | null; email: string | null; is_active: boolean };
export type ClientDocumentResponse = { id: string; label: string; file_url: string; file_name: string; is_active: boolean; uploaded_at: string };

export type ClientResponse = {
  id: string; name: string; document: string; document_type: string | null;
  economic_activity_id: number | null;
  economic_activity: { id: number; code: string; description: string } | null;
  address: string | null;
  phone: string | null; mobile: string | null; billing_email: string | null; info_email: string | null;
  treasury_contact: string | null; treasury_mobile: string | null; treasury_email: string | null;
  purchasing_contact: string | null; purchasing_mobile: string | null; purchasing_email: string | null;
  obra_contact: string | null; obra_mobile: string | null; obra_email: string | null;
  onboarding_completed_at: string | null;
  city_id: number | null;
  city: { id: number; name: string } | null;
  is_active: boolean; created_at: string; updated_at: string;
  commercial_references: CommercialReferenceResponse[];
  legal_representatives: LegalRepresentativeResponse[];
  partners: ClientPartnerResponse[];
  pep: ClientPepResponse[];
  documents: ClientDocumentResponse[];
};

// ── Onboarding ────────────────────────────────────────────────────────────────
export type RequiredDocStatus = {
  key: string;
  label: string;
  uploaded: boolean;
  file_url: string | null;
};

export type OnboardingPublicResponse = {
  client: ClientResponse;
  expires_at: string;
  already_completed: boolean;
  required_docs: RequiredDocStatus[];
};

export type OnboardingSubmit = {
  name: string; document: string; document_type: string | null;
  economic_activity_id: number | null;
  address: string | null; phone: string | null; mobile: string | null;
  billing_email: string | null; info_email: string | null;
  city_id: number | null;
  treasury_contact: string | null; treasury_mobile: string | null; treasury_email: string | null;
  purchasing_contact: string | null; purchasing_mobile: string | null; purchasing_email: string | null;
  obra_contact: string | null; obra_mobile: string | null; obra_email: string | null;
  commercial_references: { name: string; address: string | null; phone: string | null; email: string | null }[];
  legal_representatives: { first_name: string; last_name: string; document_type: string | null; document_number: string; phone: string | null; email: string | null }[];
  partners: { first_name: string; last_name: string; document_type: string | null; document_number: string; phone: string | null; participation_percentage: number | null }[];
  pep: { first_name: string; last_name: string; document_type: string | null; document_number: string; phone: string | null; position: string | null; email: string | null }[];
  origen_fondos: string;
  signature: string; signer_name: string; signer_document: string;
};

export type SendOnboardingResponse = { message: string; expires_at: string };

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
  machineTypes: {
    list: () => request<MachineTypeResponse[]>("/machine-types/"),
    create: (data: { name: string; slug: string }) =>
      request<MachineTypeResponse>("/machine-types/", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: { name?: string; is_active?: boolean }) =>
      request<MachineTypeResponse>(`/machine-types/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },
  machines: {
    list: (filters?: MachineFilters) => {
      const params = new URLSearchParams();
      if (filters?.machine_type !== undefined) params.set("machine_type", filters.machine_type);
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
    addImage: (id: string, file: File, setPrimary = false) => {
      const form = new FormData();
      form.append("file", file);
      const qs = setPrimary ? "?set_primary=true" : "";
      return request<MachineResponse>(`/machines/${id}/images${qs}`, {
        method: "POST",
        body: form,
        headers: {},
      });
    },
    setPrimaryImage: (machineId: string, imageId: string) =>
      request<MachineResponse>(`/machines/${machineId}/images/${imageId}/set-primary`, { method: "PATCH" }),
    deleteImage: (machineId: string, imageId: string) =>
      request<MachineResponse>(`/machines/${machineId}/images/${imageId}`, { method: "DELETE" }),
  },
  locations: {
    countries: () => request<CountryResponse[]>("/locations/countries"),
    states: (country_id?: number) => {
      const qs = country_id ? `?country_id=${country_id}` : "";
      return request<StateResponse[]>(`/locations/states${qs}`);
    },
    cities: (search?: string, state_id?: number, limit = 20) => {
      const params = new URLSearchParams();
      if (search)   params.set("search",   search);
      if (state_id) params.set("state_id", String(state_id));
      params.set("limit", String(limit));
      return request<CityResponse[]>(`/locations/cities?${params}`);
    },
  },
  economicActivities: {
    search: (search?: string, limit = 20) => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("limit", String(limit));
      return request<EconomicActivityResponse[]>(`/economic-activities/?${params}`);
    },
  },
  documentTypes: {
    list: () => request<DocumentTypeResponse[]>("/document-types/"),
  },
  clients: {
    list: (params?: { is_active?: boolean; search?: string }) => {
      const qs = new URLSearchParams();
      if (params?.is_active !== undefined) qs.set("is_active", String(params.is_active));
      if (params?.search)                  qs.set("search",    params.search);
      return request<ClientResponse[]>(`/clients/?${qs}`);
    },
    get:    (id: string) => request<ClientResponse>(`/clients/${id}`),
    create: (data: object) => request<ClientResponse>("/clients/", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: object) => request<ClientResponse>(`/clients/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    deactivate: (id: string) => request<void>(`/clients/${id}`, { method: "DELETE" }),
    addReference:          (id: string, data: object) => request<ClientResponse>(`/clients/${id}/commercial-references`, { method: "POST", body: JSON.stringify(data) }),
    removeReference:       (id: string, refId: string) => request<ClientResponse>(`/clients/${id}/commercial-references/${refId}`, { method: "DELETE" }),
    addLegalRep:           (id: string, data: object) => request<ClientResponse>(`/clients/${id}/legal-representatives`, { method: "POST", body: JSON.stringify(data) }),
    removeLegalRep:        (id: string, repId: string) => request<ClientResponse>(`/clients/${id}/legal-representatives/${repId}`, { method: "DELETE" }),
    addPartner:            (id: string, data: object) => request<ClientResponse>(`/clients/${id}/partners`, { method: "POST", body: JSON.stringify(data) }),
    removePartner:         (id: string, partnerId: string) => request<ClientResponse>(`/clients/${id}/partners/${partnerId}`, { method: "DELETE" }),
    addPep:                (id: string, data: object) => request<ClientResponse>(`/clients/${id}/pep`, { method: "POST", body: JSON.stringify(data) }),
    removePep:             (id: string, pepId: string) => request<ClientResponse>(`/clients/${id}/pep/${pepId}`, { method: "DELETE" }),
    uploadDocument: (id: string, file: File, label: string) => {
      const form = new FormData();
      form.append("file", file);
      form.append("label", label);
      return request<ClientResponse>(`/clients/${id}/documents`, { method: "POST", body: form, headers: {} });
    },
    removeDocument: (id: string, docId: string) => request<ClientResponse>(`/clients/${id}/documents/${docId}`, { method: "DELETE" }),
  },
  onboarding: {
    get:    (token: string) => request<OnboardingPublicResponse>(`/onboarding/${token}`),
    submit: (token: string, data: OnboardingSubmit) => request<ClientResponse>(`/onboarding/${token}/submit`, { method: "POST", body: JSON.stringify(data) }),
    send:   (clientId: string) => request<SendOnboardingResponse>(`/clients/${clientId}/send-onboarding`, { method: "POST" }),
    uploadDocument: (token: string, documentKey: string, file: File) => {
      const form = new FormData();
      form.append("document_key", documentKey);
      form.append("file", file);
      return request<{ document_key: string; file_url: string; file_name: string }>(`/onboarding/${token}/upload-document`, { method: "POST", body: form });
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
