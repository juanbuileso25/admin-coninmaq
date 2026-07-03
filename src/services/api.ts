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

// ── Reviews types ─────────────────────────────────────────────────────────────

export type ReviewResponse = {
  id:                  number;
  q1_attention:        number;
  q2_information:      number;
  q3_response_time:    number;
  q4_quality:          number;
  q5_understanding:    number;
  q6_value:            number;
  q7_overall:          number;
  q8_nps:              number;
  comment:             string | null;
  reviewer_name:       string | null;
  reviewer_role:       string | null;
  average_score:       number;
  show_as_testimonial: boolean;
  created_at:          string;
};

// ── Payments types ────────────────────────────────────────────────────────────

export type PaymentStatus = "pending" | "matched";

export type BankTransactionResponse = {
  id: string;
  account: string;
  transaction_date: string;
  amount: number;
  description: string;
  matched: boolean;
  source_file: string;
  uploaded_by: string;
  created_at: string;
};

export type PaymentResponse = {
  id: string;
  file_url: string;
  file_type: "image" | "pdf";
  extracted_date: string | null;
  extracted_amount: number | null;
  payer_name: string | null;
  whatsapp_sender: string;
  whatsapp_sender_name: string | null;
  status: PaymentStatus;
  created_at: string;
  matched_transaction: BankTransactionResponse | null;
};

export type ReconciliationItem = {
  payment: PaymentResponse;
  candidates: BankTransactionResponse[];
};

export type UploadSummary = {
  imported: number;
  skipped: number;
  auto_matched: number;
};

// ── Scoring types ─────────────────────────────────────────────────────────────

export interface LeadScoreDetail {
  display_name: string;
  captured_value: string | null;
  label: string;
  points: number;
  tier: "A" | "B" | "C";
}

export interface LeadScoreResponse {
  id: number;
  lead_id: number;
  product_code: string | null;
  detail: Record<string, LeadScoreDetail>;
  raw_score: number;
  final_score: number;
  tier_final: "A" | "B" | "no_fit";
  tier_a_threshold: number;
  tier_b_threshold: number;
  calculated_at: string;
}

export interface ScoringRule {
  id: number;
  tier: "A" | "B" | "C";
  condition_type: string;
  value_min: number | null;
  value_max: number | null;
  values_list: string[] | null;
  points: number;
  label: string;
}

export interface ScoringVariable {
  id: number;
  name: string;
  display_name: string;
  source: string;
  data_key: string;
  is_active: boolean;
  sort_order: number;
  rules: ScoringRule[];
}

// ── Bot types ──────────────────────────────────────────────────────────────────

export type BotMessageResponse = {
  id: number;
  role: string;
  content: string;
  created_at: string;
};

export type BotSessionListItem = {
  id: number;
  session_id: string;
  phone_number: string | null;
  phase: string;
  bot_active: boolean;
  assigned_advisor_id: string | null;
  products_count: number;
  client_name: string | null;
  client_company: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

export type BotSessionDetail = BotSessionListItem & {
  accumulated_products: object[];
  client_data_cache: Record<string, unknown> | null;
  qualification_cache: Record<string, unknown> | null;
  messages: BotMessageResponse[];
};

export interface BotQuotationSummary {
  quotation_number: string;
  total: number;
  pdf_url: string | null;
  email_sent: boolean;
  created_at: string;
}

export type BotLeadResponse = {
  id: number;
  session_id: string;
  phone_number: string | null;
  name: string | null;
  email: string | null;
  company: string | null;
  client_type: string;
  equipment_interest: string | null;
  timeline: string | null;
  industry: string | null;
  budget_text: string | null;
  budget_value: number;
  created_at: string;
  score?: LeadScoreResponse | null;
  latest_quotation?: BotQuotationSummary | null;
};

export type BotQuotationResponse = {
  id: number;
  session_id: string;
  lead_id: number | null;
  lead_email: string | null;
  lead_name: string | null;
  quotation_number: string;
  items: object[] | null;
  subtotal: number;
  iva_total: number;
  discount_total: number;
  total: number;
  pdf_url: string | null;
  page_url: string | null;
  delivery_mode: string;
  email_sent: boolean;
  status: string;
  expires_at: string | null;
  created_at: string;
};

export type ManualQuotationItem = { machine_code: string; quantity: number; sale_price?: number; tax_value?: number };

// ── Quotation page (public) ───────────────────────────────────────────────────
export type QuotationMachineSpec      = { label: string; value: string; icon: string; order: number };
export type QuotationMachineHighlight = { text: string; icon: string; order: number };
export type QuotationMachineImage     = { url: string; is_primary: boolean; order: number };
export type QuotationMachineMedia     = { url: string; media_type: string; title: string | null; order: number };
export type QuotationMachine = {
  code: string; model: string; brand: string; category: string;
  description: string; pdf_url: string; image_url: string;
  specs: QuotationMachineSpec[]; highlights: QuotationMachineHighlight[];
  images: QuotationMachineImage[]; videos: QuotationMachineMedia[];
};
export type QuotationItem = {
  producto: string; cantidad: number; precio_base: number;
  codigo: string; sale_price: number; tax_value: number;
  machine: QuotationMachine | null;
};
export type QuotationClient  = { name: string | null; email: string | null; company: string | null; phone_number: string | null };
export type QuotationAdvisor = { name: string; email: string; phone: string; cargo: string };
export type QuotationPageData = {
  quotation_number: string; quotation_date: string | null; expires_at: string | null;
  subtotal: number; iva_total: number; total: number; discount_total: number;
  delivery_mode: string; status: string; pdf_url: string | null; page_url: string | null;
  items: QuotationItem[]; client: QuotationClient | null; advisor: QuotationAdvisor | null;
};
export type ManualQuotationRequest = {
  client_name: string;
  client_email: string;
  client_company?: string;
  client_type?: string;
  lead_id?: number;
  items: ManualQuotationItem[];
  delivery_mode: string;
  send_email: boolean;
};
export type ManualQuotationResponse = {
  quotation_number: string;
  subtotal: number;
  iva_total: number;
  discount_total: number;
  total: number;
  page_url: string;
  pdf_url: string | null;
  email_sent: boolean;
  not_found: string[];
};

export type PhaseCount = { phase: string; count: number };
export type BotMetrics = {
  total_sessions: number;
  active_sessions: number;
  bot_paused_sessions: number;
  sessions_by_phase: PhaseCount[];
  total_leads: number;
  leads_last_7_days: number;
  top_equipment_interest: { equipment: string; count: number }[];
  top_industries: { industry: string; count: number }[];
  total_quotations: number;
  quotations_email_sent: number;
  total_revenue: number;
  quotations_by_delivery: { mode: string; count: number }[];
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

// ── Machine types ──────────────────────────────────────────────────────────────

export type MachineTypeResponse      = { id: number; name: string; slug: string; is_active: boolean };
export type MachineSpecResponse      = { id: string; label: string; value: string; icon: string; order: number };
export type MachineHighlightResponse = { id: string; text: string; order: number };
export type MachineImageResponse     = { id: string; url: string; is_primary: boolean; order: number };
export type MachineMediaResponse     = { id: string; url: string; file_name: string; media_type: "image" | "video"; title: string | null; file_size: number | null; order: number; uploaded_at: string };
export type MachineResponse = {
  id: string; code: string; brand: string; category: string; model: string; slug: string;
  description: string; price: number; sale_price: number; tax_value: number; show_price: boolean;
  warranty: string; delivery_time: string; image_url: string; pdf_url: string;
  visible_web: boolean; featured: boolean; machine_type_id: number; machine_type: MachineTypeResponse;
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

// ── Foreign Trade ─────────────────────────────────────────────────────────────
export type MachineInfoDocumentResponse = {
  id: string;
  document_key: string;
  label: string;
  file_url: string;
  file_name: string;
  is_active: boolean;
  uploaded_at: string;
};

export type MachineInfoResponse = {
  id: string;
  plate: string;
  brand: string;
  model: string;
  machine_serial: string;
  engine_serial: string | null;
  model_year: number | null;
  category: string | null;
  import_declaration: string | null;
  clearance_date: string | null;
  purchase_order: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  documents: MachineInfoDocumentResponse[];
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
  draft_filler_name:      string | null;
  draft_filler_document:  string | null;
  draft_filler_signature: string | null;
  draft_origen_fondos:    string | null;
};

type OnboardingFormData = {
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
  filler_name: string | null; filler_document: string | null; filler_signature: string | null;
};

export type OnboardingSaveProgress = OnboardingFormData;

export type OnboardingSubmit = OnboardingFormData & {
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
    login: (email: string, password: string, remember_me = false) =>
      request<{ access_token: string; refresh_token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, remember_me }),
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
    listMedia: (machineId: string) =>
      request<MachineMediaResponse[]>(`/machines/${machineId}/media`),
    uploadMedia: (machineId: string, file: File, title?: string) => {
      const form = new FormData();
      form.append("file", file);
      const qs = title ? `?title=${encodeURIComponent(title)}` : "";
      return request<MachineMediaResponse>(`/machines/${machineId}/media${qs}`, {
        method: "POST",
        body: form,
        headers: {},
      });
    },
    deleteMedia: (machineId: string, mediaId: string) =>
      request<void>(`/machines/${machineId}/media/${mediaId}`, { method: "DELETE" }),
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
  foreignTrade: {
    list: (params?: { is_active?: boolean; search?: string }) => {
      const qs = new URLSearchParams();
      if (params?.is_active !== undefined) qs.set("is_active", String(params.is_active));
      if (params?.search) qs.set("search", params.search);
      return request<MachineInfoResponse[]>(`/foreign-trade/?${qs}`);
    },
    get: (id: string) => request<MachineInfoResponse>(`/foreign-trade/${id}`),
    create: (data: object) =>
      request<MachineInfoResponse>("/foreign-trade/", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: object) =>
      request<MachineInfoResponse>(`/foreign-trade/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    deactivate: (id: string) => request<void>(`/foreign-trade/${id}`, { method: "DELETE" }),
    uploadDocument: (id: string, file: File, documentKey: string) => {
      const form = new FormData();
      form.append("file", file);
      form.append("document_key", documentKey);
      return request<MachineInfoResponse>(`/foreign-trade/${id}/documents`, {
        method: "POST",
        body: form,
        headers: {},
      });
    },
    removeDocument: (id: string, docId: string) =>
      request<MachineInfoResponse>(`/foreign-trade/${id}/documents/${docId}`, { method: "DELETE" }),
  },
  onboarding: {
    get:          (token: string) => request<OnboardingPublicResponse>(`/onboarding/${token}`),
    saveProgress: (token: string, data: OnboardingSaveProgress) => request<{ message: string }>(`/onboarding/${token}/save-progress`, { method: "POST", body: JSON.stringify(data) }),
    submit:       (token: string, data: OnboardingSubmit) => request<ClientResponse>(`/onboarding/${token}/submit`, { method: "POST", body: JSON.stringify(data) }),
    send:         (clientId: string) => request<SendOnboardingResponse>(`/clients/${clientId}/send-onboarding`, { method: "POST" }),
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
  payments: {
    list: (status?: string) => {
      const qs = status ? `?status=${status}` : "";
      return request<PaymentResponse[]>(`/payments/${qs}`);
    },
    get: (id: string) => request<PaymentResponse>(`/payments/${id}`),
    update: (id: string, data: object) =>
      request<PaymentResponse>(`/payments/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    match: (paymentId: string, txId: string) =>
      request<PaymentResponse>(`/payments/${paymentId}/match/${txId}`, { method: "POST" }),
    unmatch: (paymentId: string) =>
      request<PaymentResponse>(`/payments/${paymentId}/match`, { method: "DELETE" }),
    upload: (files: File[], payerName?: string, caption?: string) => {
      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      if (payerName) form.append("payer_name", payerName);
      if (caption)   form.append("caption", caption);
      return request<PaymentResponse[]>("/payments/upload", { method: "POST", body: form });
    },
    reconciliation: () => request<ReconciliationItem[]>("/payments/reconciliation"),
    reconciliationExport: async (fromDate: string, toDate: string): Promise<Blob> => {
      const token = getToken();
      const res = await fetch(
        `${BASE_URL}/payments/reconciliation/export?from_date=${fromDate}&to_date=${toDate}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (!res.ok) throw { status: res.status, detail: "Error generando reporte" };
      return res.blob();
    },
    bankTransactions: {
      list: (matched?: boolean) => {
        const qs = matched !== undefined ? `?matched=${matched}` : "";
        return request<BankTransactionResponse[]>(`/payments/bank-transactions/${qs}`);
      },
      upload: (file: File, filterDate?: string) => {
        const form = new FormData();
        form.append("file", file);
        const qs = filterDate ? `?filter_date=${filterDate}` : "";
        return request<UploadSummary>(`/payments/bank-transactions/upload${qs}`, { method: "POST", body: form });
      },
    },
  },
  bot: {
    metrics: () => request<BotMetrics>("/bot/metrics"),
    sessions: (params?: { phase?: string; bot_active?: boolean; is_active?: boolean; page?: number; page_size?: number }) => {
      const qs = new URLSearchParams();
      if (params?.phase !== undefined)      qs.set("phase",      params.phase);
      if (params?.bot_active !== undefined)  qs.set("bot_active", String(params.bot_active));
      if (params?.is_active !== undefined)   qs.set("is_active",  String(params.is_active));
      if (params?.page !== undefined)        qs.set("page",       String(params.page));
      if (params?.page_size !== undefined)   qs.set("page_size",  String(params.page_size));
      return request<PaginatedResponse<BotSessionListItem>>(`/bot/sessions?${qs}`);
    },
    session: (sessionId: string) => request<BotSessionDetail>(`/bot/sessions/${sessionId}`),
    patchSession: (sessionId: string, data: { bot_active?: boolean; assigned_advisor_id?: string }) =>
      request<BotSessionDetail>(`/bot/sessions/${sessionId}`, { method: "PATCH", body: JSON.stringify(data) }),
    sendMessage: (sessionId: string, content: string) =>
      request<BotMessageResponse>(`/bot/sessions/${sessionId}/messages`, { method: "POST", body: JSON.stringify({ content }) }),
    leads: (params?: { industry?: string; client_type?: string; tier?: string; page?: number; page_size?: number }) => {
      const qs = new URLSearchParams();
      if (params?.industry)    qs.set("industry",    params.industry);
      if (params?.client_type) qs.set("client_type", params.client_type);
      if (params?.tier)        qs.set("tier",        params.tier);
      if (params?.page)        qs.set("page",        String(params.page));
      if (params?.page_size)   qs.set("page_size",   String(params.page_size));
      return request<PaginatedResponse<BotLeadResponse>>(`/bot/leads?${qs}`);
    },
    leadScore: (leadId: number) =>
      request<BotLeadResponse>(`/bot/leads/${leadId}/score`),
    scoringVariables: () =>
      request<ScoringVariable[]>("/bot/scoring/variables"),
    patchScoringVariable: (id: number, data: Partial<Pick<ScoringVariable, "display_name" | "is_active" | "sort_order">>) =>
      request<ScoringVariable>(`/bot/scoring/variables/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    patchScoringRule: (id: number, data: Partial<Pick<ScoringRule, "points" | "label" | "value_min" | "value_max" | "values_list">>) =>
      request<ScoringRule>(`/bot/scoring/rules/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    quotations: (params?: { status?: string; delivery_mode?: string; page?: number; page_size?: number }) => {
      const qs = new URLSearchParams();
      if (params?.status)        qs.set("status",        params.status);
      if (params?.delivery_mode) qs.set("delivery_mode", params.delivery_mode);
      if (params?.page)          qs.set("page",          String(params.page));
      if (params?.page_size)     qs.set("page_size",     String(params.page_size));
      return request<PaginatedResponse<BotQuotationResponse>>(`/bot/quotations?${qs}`);
    },
    createManualQuotation: (data: ManualQuotationRequest) =>
      request<ManualQuotationResponse>("/quotations/generate", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  quotations: {
    getPage: (quotationNumber: string) =>
      request<QuotationPageData>(`/cotizacion/${quotationNumber}`),
  },
  reviews: {
    list: (params?: { page?: number; page_size?: number }) => {
      const qs = new URLSearchParams();
      if (params?.page)      qs.set("page",      String(params.page));
      if (params?.page_size) qs.set("page_size", String(params.page_size));
      return request<PaginatedResponse<ReviewResponse>>(`/reviews/?${qs}`);
    },
    patch: (id: number, data: { show_as_testimonial?: boolean; reviewer_name?: string; reviewer_role?: string }) =>
      request<ReviewResponse>(`/reviews/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },
};
