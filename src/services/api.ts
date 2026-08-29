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

async function requestBlob(path: string): Promise<Blob> {
  let token = getToken();
  let res = await doFetch(path, { method: "GET" }, token);

  if (res.status === 401) {
    const newToken = await tryRefresh();
    if (newToken) {
      res = await doFetch(path, { method: "GET" }, newToken);
    } else {
      clearTokens();
      window.location.href = "/";
      throw { status: 401, detail: "Sesión expirada" };
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw { status: res.status, detail: body.detail ?? "Error desconocido" };
  }

  return res.blob();
}

async function downloadBlobAs(path: string, filename: string): Promise<void> {
  const blob = await requestBlob(path);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
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

// ── Prospecting types ─────────────────────────────────────────────────────────

export type ProspectStatus =
  | "nuevo" | "contactado" | "interesado"
  | "negociacion" | "cerrado_ganado" | "cerrado_perdido" | "descartado";

export type ProspectResponse = {
  id: string;
  source: string;
  company_name: string;
  contact_name: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  category: string | null;
  rating: number | null;
  fit_score: number | null;
  deal_type: string | null;
  equipment: string | null;
  score_reason: string | null;
  status: ProspectStatus;
  assigned_to: string | null;
  next_followup: string | null;
  last_contact: string | null;
  created_at: string;
  updated_at: string | null;
};

export type ProspectMessageResponse = {
  id: string;
  prospect_id: string;
  channel: string;
  subject: string | null;
  body: string;
  html_body: string | null;
  sequence_day: number;
  status: string;
  is_test: boolean;
  sent_at: string;
};

export type RunLogResponse = {
  id: string;
  run_type: string;
  source: string;
  prospects_found: number;
  prospects_scored: number;
  prospects_accepted: number;
  prospects_discarded: number;
  messages_sent: number;
  errors: string | null;
  started_at: string;
  finished_at: string | null;
};

export type RunResult = {
  status: string;
  prospects_found: number;
  prospects_accepted: number;
  messages_sent: number;
  errors: string | null;
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

// ── Spare Parts types ─────────────────────────────────────────────────────────

export type SparePart = {
  id: number;
  code: string;
  name: string;
  brand: string | null;
  model_compatibility: string[] | null;
  category: string | null;
  description: string | null;
  sale_price: number;
  tax_value: number;
  unit: string;
  stock_quantity: number;
  reorder_level: number;
  image_url: string | null;
  show_price: boolean;
  machine_id: string | null;
  machine_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SparePartCreate = {
  code: string;
  name: string;
  brand?: string | null;
  model_compatibility?: string[] | null;
  category?: string | null;
  description?: string | null;
  sale_price: number;
  tax_value: number;
  unit?: string;
  stock_quantity?: number;
  reorder_level?: number;
  image_url?: string | null;
  show_price?: boolean;
  machine_id?: string | null;
};

export type SparePartUpdate = Partial<SparePartCreate> & { is_active?: boolean };

export type SparePartRequest = {
  id: number;
  request_number: string;
  session_id: string;
  lead_id: number | null;
  lead_name: string | null;
  lead_email: string | null;
  lead_phone: string | null;
  lead_company: string | null;
  lead_rut_nit: string | null;
  lead_address: string | null;
  machine_brand: string | null;
  machine_model: string | null;
  machine_serial: string | null;
  part_description: string | null;
  quantity: number | null;
  photo_url: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SparePartRequestPatch = {
  status?: string;
  notes?: string;
};

export const SPARE_PART_STAGES = [
  "solicitudes_recibidas",
  "cotizado",
  "esperando_respuesta",
  "negociacion",
  "venta_ganada",
  "venta_perdida",
] as const;

export type SparePartStage = typeof SPARE_PART_STAGES[number];

export const SPARE_PART_STAGE_LABELS: Record<SparePartStage, string> = {
  solicitudes_recibidas: "Solicitudes recibidas",
  cotizado:              "Cotizado",
  esperando_respuesta:   "Esperando respuesta",
  negociacion:           "Negociación",
  venta_ganada:          "Venta ganada",
  venta_perdida:         "Venta perdida",
};

export type EmailClickEvent = {
  quotation_number: string;
  click_count: number;
  first_clicked_at: string;
  last_clicked_at: string;
  ip_address: string | null;
};

export type SparePartSuggestion = {
  id: number;
  code: string;
  name: string;
  brand: string | null;
  category: string | null;
  sale_price: number;
  tax_value: number;
  unit: string;
  image_url: string | null;
  match_score: number;
  match_reason: string;
};

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
  lead_name: string | null;
  lead_company: string | null;
  lead_email: string | null;
  lead_phone: string | null;
};

export interface BotQuotationSummary {
  id: number;
  quotation_number: string;
  total: number;
  pdf_url: string | null;
  page_url: string | null;
  email_sent: boolean;
  created_at: string;
}

export type PipelineStage =
  | "interesado"
  | "contactado"
  | "calificado"
  | "cotizacion_propuesta"
  | "seguimiento"
  | "cerrado"
  | "perdido"
  | "referido";

export const PIPELINE_STAGES: PipelineStage[] = [
  "interesado",
  "contactado",
  "calificado",
  "cotizacion_propuesta",
  "seguimiento",
  "cerrado",
  "perdido",
  "referido",
];

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  interesado:           "Interesado",
  contactado:           "Contactado",
  calificado:           "Calificado",
  cotizacion_propuesta: "Cotización y propuesta",
  seguimiento:          "Seguimiento y negociación",
  cerrado:              "Cerrado ✓",
  perdido:              "Perdido",
  referido:             "Referido",
};

export type LeadStageHistoryResponse = {
  id: number;
  lead_id: number;
  from_stage: string | null;
  to_stage: string;
  changed_by: string;
  note: string | null;
  created_at: string;
};

export type PipelineColumnResponse = {
  stage: PipelineStage;
  leads: BotLeadResponse[];
  count: number;
};

export type BotLeadResponse = {
  id: number;
  session_id: string | null;
  lead_source: string;
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
  rut_nit: string | null;
  rut_razon_social: string | null;
  rut_direccion: string | null;
  rut_representante: string | null;
  rut_received: boolean;
  rut_file_url: string | null;
  pipeline_stage: PipelineStage;
  close_result: "ganado" | "perdido" | null;
  num_units: number | null;
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
  description: string; pdf_url: string; image_url: string; warranty: string;
  specs: QuotationMachineSpec[]; highlights: QuotationMachineHighlight[];
  images: QuotationMachineImage[]; videos: QuotationMachineMedia[];
};
export type QuotationItem = {
  producto: string; cantidad: number; precio_base: number;
  codigo: string; sale_price: number; tax_value: number; tax_rate: number;
  machine: QuotationMachine | null;
};
export type QuotationClient  = { name: string | null; email: string | null; company: string | null; phone_number: string | null; tax_id: string | null; address: string | null; representative: string | null };
export type QuotationAdvisor = { name: string; email: string; phone: string; cargo: string };
export type QuotationPageData = {
  quotation_number: string; quotation_date: string | null; expires_at: string | null;
  subtotal: number; iva_total: number; total: number; discount_total: number;
  delivery_mode: string; status: string; pdf_url: string | null; page_url: string | null;
  items: QuotationItem[]; client: QuotationClient | null; advisor: QuotationAdvisor | null;
  observations: string | null;
};
export type ManualQuotationRequest = {
  client_name: string;
  client_email: string;
  client_company?: string;
  client_tax_id?: string;
  client_address?: string;
  client_type?: string;
  lead_id?: number;
  items: ManualQuotationItem[];
  delivery_mode: string;
  send_email: boolean;
  observations?: string;
  extra_emails?: string[];
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
  date_from: string;
  date_to: string;
  // Estado actual
  total_machines: number;
  machines_visible_web: number;
  total_clients: number;
  active_sessions: number;
  payments_pending: number;
  total_leads: number;
  total_quotations: number;
  total_revenue: number;
  // Período
  quotations_period: number;
  revenue_period: number;
  leads_period: number;
  leads_tier_a_period: number;
  email_sent_period: number;
  // Distribuciones período
  top_equipment_interest: { equipment: string; count: number }[];
  top_industries: { industry: string; count: number }[];
  quotations_by_delivery: { mode: string; count: number }[];
  // Bot
  total_sessions: number;
  bot_paused_sessions: number;
  sessions_by_phase: PhaseCount[];
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
export type UserActionDetail = { action_id: string; action_code: string; module_code: string };
export type UserResponse = { id: string; first_name: string; last_name: string; email: string; is_active: boolean; license_category: string | null; license_number: string | null; created_at: string; role_assignments: UserRoleResponse[]; user_action_ids: string[]; user_actions_detail: UserActionDetail[]; user_menu_item_ids: string[] };
export type RoleResponse = { id: string; name: string; description: string | null };
export type AreaResponse = { id: string; name: string; description: string | null };
export type PermissionResponse = { id: string; action: string; subject: string; description: string | null };

// ── App Modules ───────────────────────────────────────────────────────────────
export type ActionResponse = {
  id: string; module_id: string; code: string; name: string;
  description: string | null; is_active: boolean; created_at: string; updated_at: string;
};
export type AppModuleResponse = {
  id: string; code: string; name: string; description: string | null;
  is_active: boolean; actions: ActionResponse[]; created_at: string; updated_at: string;
};

// ── Menu Items ────────────────────────────────────────────────────────────────
export type MenuItemResponse = {
  id: string; label: string; icon: string | null; path: string | null;
  parent_id: string | null; order_index: number; group: string | null; is_active: boolean;
  children: MenuItemResponse[]; created_at: string; updated_at: string;
};

// ── Suppliers ─────────────────────────────────────────────────────────────────
export type SupplierResponse = {
  id: string;
  name: string;
  country: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

// ── Machine Orders ────────────────────────────────────────────────────────────
export type MachineOrderItemResponse = {
  id: string;
  order_id: string;
  model: string;
  description: string | null;
  machine_serial: string | null;
  engine_serial: string | null;
  client_name: string | null;
  invoice_number: string | null;
  has_matricula: boolean | null;
  matricula_url: string | null;
  fob_value_usd: number | null;
  arrival_date_col: string | null;
  cif_cost: number | null;
  ddp_cost: number | null;
  import_factor: number | null;
  nationalization_trm: number | null;
  sale_value_before_tax: number | null;
  sale_iva: number | null;
  total_sale: number | null;
  profit_cop: number | null;
  profit_pct: number | null;
  machine_info_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type MachineOrderPaymentResponse = {
  id: string;
  order_id: string;
  payment_type: "anticipo_30pct" | "saldo";
  installment_number: number | null;
  amount_usd: number | null;
  payment_date: string | null;
  trm: number | null;
  amount_cop: number | null;
  notes: string | null;
  is_active: boolean;
  machine_item_ids: string[];
  created_at: string;
  updated_at: string;
};

export type MachineOrderListResponse = {
  id: string;
  supplier_id: string;
  supplier: { id: string; name: string };
  factory_order_number: string;
  order_date: string | null;
  bl_number: string | null;
  bl_date: string | null;
  due_date: string | null;
  lonking_invoice: string | null;
  year: number | null;
  status: string;
  freight_agent: string | null;
  customs_broker: string | null;
  notes: string | null;
  is_active: boolean;
  items_count: number;
  total_fob_usd: number | null;
  total_paid_usd: number | null;
  remaining_debt_usd: number | null;
  payment_status: string;
  created_at: string;
  updated_at: string;
};

export type MachineOrderDetailResponse = MachineOrderListResponse & {
  items: MachineOrderItemResponse[];
  payments: MachineOrderPaymentResponse[];
};

// ── Company Docs types ────────────────────────────────────────────────────────

export type VehicleDocumentOut = {
  id: number; doc_type: string; file_url: string; file_name: string; updated_at: string;
};
export type VehicleOut = {
  id: number; plate: string; tipo: string;
  modelo: string | null; marca: string | null; cilindraje: string | null; color: string | null;
  created_at: string; updated_at: string;
  documents: VehicleDocumentOut[];
};

export type VehicleWritableFields = {
  plate?: string;
  tipo?: string;
  modelo?: string | null;
  marca?: string | null;
  cilindraje?: string | null;
  color?: string | null;
};
export type EmployeeDocumentOut = {
  id: number; doc_type: string; file_url: string; file_name: string; updated_at: string;
};
export type EmployeeOut = {
  id: number; full_name: string; cc: string | null; phone: string | null;
  email: string | null; address: string | null; emergency_contact: string | null;
  emergency_phone: string | null; created_at: string; updated_at: string;
  documents: EmployeeDocumentOut[];
};

// ── Inspecciones ──────────────────────────────────────────────────────────────

export type InspectionItemsCatalog = Record<string, Record<string, string>>;

export type InspectionPhotoOut = {
  id: number; photo_url: string; description: string | null; created_at: string;
};

export type VehicleInspectionItemIn = {
  category: string; item_key: string; is_ok: boolean; notes?: string | null;
};
export type VehicleInspectionItemOut = VehicleInspectionItemIn & { id: number };

export type VehicleInspectionCreate = {
  vehicle_id: number;
  inspection_date: string; // YYYY-MM-DD
  month?: string | null;
  week_number?: number | null;
  mileage?: string | null;
  driver_name?: string | null;
  license_number?: string | null;
  license_category?: string | null;
  damage_description?: string | null;
  observations?: string | null;
  signature_url?: string | null;
  items: VehicleInspectionItemIn[];
};

export type VehicleInspectionOut = {
  id: number;
  vehicle_id: number;
  inspector_id: string | null;
  inspection_date: string;
  month: string | null;
  week_number: number | null;
  mileage: string | null;
  driver_name: string | null;
  license_number: string | null;
  license_category: string | null;
  damage_description: string | null;
  observations: string | null;
  signature_url: string | null;
  created_at: string;
  updated_at: string;
  items: VehicleInspectionItemOut[];
  photos: InspectionPhotoOut[];
};

export type MotoInspectionItemIn = {
  section: "mecanica" | "proteccion";
  item_key: string;
  status?: "bueno" | "malo" | null;
  accion_correctiva?: string | null;
  observaciones?: string | null;
};
export type MotoInspectionItemOut = MotoInspectionItemIn & { id: number };

export type MotoInspectionCreate = {
  vehicle_id: number;
  inspection_date: string;
  driver_name?: string | null;
  cedula?: string | null;
  cilindraje?: string | null;
  modelo?: string | null;
  color?: string | null;
  marca?: string | null;
  seguro_obligatorio_has?: boolean | null;
  seguro_obligatorio_vencimiento?: string | null;
  licencia_transito_has?: boolean | null;
  licencia_transito_original?: boolean | null;
  licencia_conduccion_has?: boolean | null;
  licencia_conduccion_expedicion?: string | null;
  papeles_a_nombre_candidato?: boolean | null;
  papeles_a_nombre_de?: string | null;
  signature_url?: string | null;
  commitment_accepted: boolean;
  observations?: string | null;
  items: MotoInspectionItemIn[];
};

export type MotoInspectionOut = {
  id: number;
  vehicle_id: number;
  inspector_id: string | null;
  inspection_date: string;
  driver_name: string | null;
  cedula: string | null;
  cilindraje: string | null;
  modelo: string | null;
  color: string | null;
  marca: string | null;
  seguro_obligatorio_has: boolean | null;
  seguro_obligatorio_vencimiento: string | null;
  licencia_transito_has: boolean | null;
  licencia_transito_original: boolean | null;
  licencia_conduccion_has: boolean | null;
  licencia_conduccion_expedicion: string | null;
  papeles_a_nombre_candidato: boolean | null;
  papeles_a_nombre_de: string | null;
  signature_url: string | null;
  commitment_accepted: boolean;
  observations: string | null;
  created_at: string;
  updated_at: string;
  items: MotoInspectionItemOut[];
  photos: InspectionPhotoOut[];
};

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
    update: (id: string, data: { first_name?: string; last_name?: string; is_active?: boolean; license_category?: string | null; license_number?: string | null }) =>
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
    setActions: (id: string, action_ids: string[]) =>
      request<UserResponse>(`/users/${id}/actions`, { method: "PUT", body: JSON.stringify({ action_ids }) }),
    setMenuItems: (id: string, menu_item_ids: string[]) =>
      request<UserResponse>(`/users/${id}/menu-items`, { method: "PUT", body: JSON.stringify({ menu_item_ids }) }),
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
    metrics: (params?: { date_from?: string; date_to?: string }) => {
      const qs = new URLSearchParams();
      if (params?.date_from) qs.set("date_from", params.date_from);
      if (params?.date_to)   qs.set("date_to",   params.date_to);
      const q = qs.toString();
      return request<BotMetrics>(`/bot/metrics${q ? `?${q}` : ""}`);
    },
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
    sendDocument: (sessionId: string, data: { pdf_url: string; filename: string; caption?: string }) =>
      request<{ sent: boolean }>(`/bot/sessions/${sessionId}/send-document`, { method: "POST", body: JSON.stringify(data) }),
    leads: (params?: { industry?: string; client_type?: string; tier?: string; lead_type?: string; search?: string; page?: number; page_size?: number }) => {
      const qs = new URLSearchParams();
      if (params?.industry)    qs.set("industry",    params.industry);
      if (params?.client_type) qs.set("client_type", params.client_type);
      if (params?.tier)        qs.set("tier",        params.tier);
      if (params?.lead_type)   qs.set("lead_type",   params.lead_type);
      if (params?.search)      qs.set("search",      params.search);
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
    quotations: (params?: { status?: string; delivery_mode?: string; quotation_type?: string; page?: number; page_size?: number }) => {
      const qs = new URLSearchParams();
      if (params?.status)          qs.set("status",          params.status);
      if (params?.delivery_mode)   qs.set("delivery_mode",   params.delivery_mode);
      if (params?.quotation_type)  qs.set("quotation_type",  params.quotation_type);
      if (params?.page)            qs.set("page",            String(params.page));
      if (params?.page_size)       qs.set("page_size",       String(params.page_size));
      return request<PaginatedResponse<BotQuotationResponse>>(`/bot/quotations?${qs}`);
    },
    createManualQuotation: (data: ManualQuotationRequest) =>
      request<ManualQuotationResponse>("/quotations/generate", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    sendQuotationEmail: (quotationNumber: string, emails: string[]) =>
      request<{ sent: boolean; emails: string[] }>(`/quotations/${quotationNumber}/send-email`, {
        method: "POST",
        body: JSON.stringify({ emails }),
      }),
    pipeline: (params?: { lead_type?: string; search?: string }) => {
      const qs = new URLSearchParams();
      if (params?.lead_type) qs.set("lead_type", params.lead_type);
      if (params?.search)    qs.set("search",    params.search);
      return request<PipelineColumnResponse[]>(`/bot/leads/pipeline?${qs}`);
    },
    patchLeadStage: (leadId: number, data: { stage: string; close_result?: string | null; note?: string }) =>
      request<BotLeadResponse>(`/bot/leads/${leadId}/stage`, { method: "PATCH", body: JSON.stringify(data) }),
    leadStageHistory: (leadId: number) =>
      request<LeadStageHistoryResponse[]>(`/bot/leads/${leadId}/stage-history`),
  },
  quotations: {
    getPage: (quotationNumber: string) =>
      request<QuotationPageData>(`/cotizacion/${quotationNumber}`),
  },
  track: {
    clicks: () => request<EmailClickEvent[]>("/track/clicks"),
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
  suppliers: {
    list: (params?: { is_active?: boolean; search?: string }) => {
      const qs = new URLSearchParams();
      if (params?.is_active !== undefined) qs.set("is_active", String(params.is_active));
      if (params?.search) qs.set("search", params.search);
      return request<SupplierResponse[]>(`/suppliers/?${qs}`);
    },
    get:    (id: string) => request<SupplierResponse>(`/suppliers/${id}`),
    create: (data: object) => request<SupplierResponse>("/suppliers/", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: object) => request<SupplierResponse>(`/suppliers/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    deactivate: (id: string) => request<void>(`/suppliers/${id}`, { method: "DELETE" }),
  },
  machineOrders: {
    list: (params?: { is_active?: boolean; search?: string; year?: number; status?: string; supplier_id?: string }) => {
      const qs = new URLSearchParams();
      if (params?.is_active !== undefined) qs.set("is_active", String(params.is_active));
      if (params?.search)      qs.set("search",      params.search);
      if (params?.year)        qs.set("year",        String(params.year));
      if (params?.status)      qs.set("status",      params.status);
      if (params?.supplier_id) qs.set("supplier_id", params.supplier_id);
      return request<MachineOrderListResponse[]>(`/machine-orders/?${qs}`);
    },
    get:    (id: string) => request<MachineOrderDetailResponse>(`/machine-orders/${id}`),
    create: (data: object) => request<MachineOrderDetailResponse>("/machine-orders/", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: object) => request<MachineOrderDetailResponse>(`/machine-orders/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    deactivate: (id: string) => request<void>(`/machine-orders/${id}`, { method: "DELETE" }),
    addItem:    (orderId: string, data: object) => request<MachineOrderDetailResponse>(`/machine-orders/${orderId}/items`, { method: "POST", body: JSON.stringify(data) }),
    updateItem: (orderId: string, itemId: string, data: object) => request<MachineOrderDetailResponse>(`/machine-orders/${orderId}/items/${itemId}`, { method: "PATCH", body: JSON.stringify(data) }),
    removeItem: (orderId: string, itemId: string) => request<MachineOrderDetailResponse>(`/machine-orders/${orderId}/items/${itemId}`, { method: "DELETE" }),
    uploadMatricula: (orderId: string, itemId: string, file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return request<MachineOrderDetailResponse>(`/machine-orders/${orderId}/items/${itemId}/matricula`, { method: "POST", body: fd });
    },
    addPayment:    (orderId: string, data: object) => request<MachineOrderDetailResponse>(`/machine-orders/${orderId}/payments`, { method: "POST", body: JSON.stringify(data) }),
    updatePayment: (orderId: string, paymentId: string, data: object) => request<MachineOrderDetailResponse>(`/machine-orders/${orderId}/payments/${paymentId}`, { method: "PATCH", body: JSON.stringify(data) }),
    removePayment: (orderId: string, paymentId: string) => request<MachineOrderDetailResponse>(`/machine-orders/${orderId}/payments/${paymentId}`, { method: "DELETE" }),
  },
  appModules: {
    list: (includeInactive = false) =>
      request<AppModuleResponse[]>(`/app-modules/?include_inactive=${includeInactive}`),
    get: (id: string) => request<AppModuleResponse>(`/app-modules/${id}`),
    create: (data: { code: string; name: string; description?: string }) =>
      request<AppModuleResponse>("/app-modules/", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: { code?: string; name?: string; description?: string; is_active?: boolean }) =>
      request<AppModuleResponse>(`/app-modules/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    deactivate: (id: string) => request<void>(`/app-modules/${id}`, { method: "DELETE" }),
    addAction: (moduleId: string, data: { code: string; name: string; description?: string }) =>
      request<AppModuleResponse>(`/app-modules/${moduleId}/actions`, { method: "POST", body: JSON.stringify(data) }),
    updateAction: (moduleId: string, actionId: string, data: { code?: string; name?: string; description?: string; is_active?: boolean }) =>
      request<AppModuleResponse>(`/app-modules/${moduleId}/actions/${actionId}`, { method: "PATCH", body: JSON.stringify(data) }),
    deactivateAction: (moduleId: string, actionId: string) =>
      request<AppModuleResponse>(`/app-modules/${moduleId}/actions/${actionId}`, { method: "DELETE" }),
  },
  prospecting: {
    prospects: (params?: { status?: string; min_score?: number; limit?: number; offset?: number }) => {
      const qs = new URLSearchParams();
      if (params?.status)    qs.set("status",    params.status);
      if (params?.min_score) qs.set("min_score", String(params.min_score));
      if (params?.limit)     qs.set("limit",     String(params.limit));
      if (params?.offset)    qs.set("offset",    String(params.offset));
      return request<ProspectResponse[]>(`/prospecting/prospects?${qs}`);
    },
    getProspect: (id: string) => request<ProspectResponse>(`/prospecting/prospects/${id}`),
    updateProspect: (id: string, data: Partial<Pick<ProspectResponse, "status" | "assigned_to" | "next_followup" | "contact_name" | "email" | "phone">>) =>
      request<ProspectResponse>(`/prospecting/prospects/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    messages: (prospectId: string) => request<ProspectMessageResponse[]>(`/prospecting/prospects/${prospectId}/messages`),
    logs: (limit = 20) => request<RunLogResponse[]>(`/prospecting/logs?limit=${limit}`),
    runScrape: () => request<RunResult>("/prospecting/run/scrape", { method: "POST" }),
    runFollowups: () => request<RunResult>("/prospecting/run/followups", { method: "POST" }),
    runTest: (max_results = 5) => request<RunResult>("/prospecting/run/test", { method: "POST", body: JSON.stringify({ max_results }) }),
  },
  spareParts: {
    list: (params?: { search?: string; category?: string; brand?: string; machine_id?: string; is_active?: boolean; page?: number; page_size?: number }) => {
      const qs = new URLSearchParams();
      if (params?.search      !== undefined) qs.set("search",      params.search);
      if (params?.category    !== undefined) qs.set("category",    params.category);
      if (params?.brand       !== undefined) qs.set("brand",       params.brand);
      if (params?.machine_id  !== undefined) qs.set("machine_id",  params.machine_id);
      if (params?.is_active   !== undefined) qs.set("is_active",   String(params.is_active));
      if (params?.page        !== undefined) qs.set("page",        String(params.page));
      if (params?.page_size   !== undefined) qs.set("page_size",   String(params.page_size));
      return request<PaginatedResponse<SparePart>>(`/spare-parts/parts?${qs}`);
    },
    create: (data: SparePartCreate) =>
      request<SparePart>("/spare-parts/parts", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: SparePartUpdate) =>
      request<SparePart>(`/spare-parts/parts/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (id: number) =>
      request<SparePart>(`/spare-parts/parts/${id}`, { method: "DELETE" }),

    requests: (params?: { status?: string; search?: string; page?: number; page_size?: number }) => {
      const qs = new URLSearchParams();
      if (params?.status    !== undefined) qs.set("status",    params.status);
      if (params?.search    !== undefined) qs.set("search",    params.search);
      if (params?.page      !== undefined) qs.set("page",      String(params.page));
      if (params?.page_size !== undefined) qs.set("page_size", String(params.page_size));
      return request<PaginatedResponse<SparePartRequest>>(`/spare-parts/requests?${qs}`);
    },
    request: (id: number) =>
      request<SparePartRequest>(`/spare-parts/requests/${id}`),
    patchRequest: (id: number, data: SparePartRequestPatch) =>
      request<SparePartRequest>(`/spare-parts/requests/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    suggestions: (requestId: number, limit = 6) =>
      request<SparePartSuggestion[]>(`/spare-parts/requests/${requestId}/suggestions?limit=${limit}`),
    pipeline: async (search?: string): Promise<Record<string, SparePartRequest[]>> => {
      const qs = new URLSearchParams({ page_size: "500" });
      if (search) qs.set("search", search);
      const res = await request<PaginatedResponse<SparePartRequest>>(`/spare-parts/requests?${qs}`);
      const grouped: Record<string, SparePartRequest[]> = {};
      SPARE_PART_STAGES.forEach(s => { grouped[s] = []; });
      res.data.forEach(r => {
        const stage = SPARE_PART_STAGES.includes(r.status as SparePartStage)
          ? r.status
          : "solicitudes_recibidas";
        if (!grouped[stage]) grouped[stage] = [];
        grouped[stage].push(r);
      });
      return grouped;
    },
  },
  companyDocs: {
    listVehicles: () => request<VehicleOut[]>("/company-docs/vehicles"),
    createVehicle: (data: VehicleWritableFields & { plate: string; tipo: string }) =>
      request<VehicleOut>("/company-docs/vehicles", { method: "POST", body: JSON.stringify(data) }),
    updateVehicle: (id: number, data: VehicleWritableFields) =>
      request<VehicleOut>(`/company-docs/vehicles/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteVehicle: (id: number) =>
      request<void>(`/company-docs/vehicles/${id}`, { method: "DELETE" }),
    uploadVehicleDoc: (id: number, docType: string, file: File) => {
      const form = new FormData(); form.append("file", file);
      return request<VehicleOut>(`/company-docs/vehicles/${id}/documents/${docType}`, { method: "POST", body: form, headers: {} });
    },
    deleteVehicleDoc: (vehicleId: number, docId: number) =>
      request<void>(`/company-docs/vehicles/${vehicleId}/documents/${docId}`, { method: "DELETE" }),

    listEmployees: () => request<EmployeeOut[]>("/company-docs/employees"),
    createEmployee: (data: Partial<Omit<EmployeeOut, "id" | "created_at" | "updated_at" | "documents">>) =>
      request<EmployeeOut>("/company-docs/employees", { method: "POST", body: JSON.stringify(data) }),
    updateEmployee: (id: number, data: Partial<Omit<EmployeeOut, "id" | "created_at" | "updated_at" | "documents">>) =>
      request<EmployeeOut>(`/company-docs/employees/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteEmployee: (id: number) =>
      request<void>(`/company-docs/employees/${id}`, { method: "DELETE" }),
    uploadEmployeeDoc: (id: number, docType: string, file: File) => {
      const form = new FormData(); form.append("file", file);
      return request<EmployeeOut>(`/company-docs/employees/${id}/documents/${docType}`, { method: "POST", body: form, headers: {} });
    },
    deleteEmployeeDoc: (id: number, docType: string) =>
      request<void>(`/company-docs/employees/${id}/documents/${docType}`, { method: "DELETE" }),
  },
  vehicleInspections: {
    itemsCatalog: () => request<InspectionItemsCatalog>("/vehicle-inspections/items-catalog"),
    list: (params: { vehicle_id?: number; date_from?: string; date_to?: string } = {}) => {
      const qs = new URLSearchParams();
      if (params.vehicle_id !== undefined) qs.set("vehicle_id", String(params.vehicle_id));
      if (params.date_from) qs.set("date_from", params.date_from);
      if (params.date_to) qs.set("date_to", params.date_to);
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      return request<VehicleInspectionOut[]>(`/vehicle-inspections${suffix}`);
    },
    get: (id: number) => request<VehicleInspectionOut>(`/vehicle-inspections/${id}`),
    create: (data: VehicleInspectionCreate) =>
      request<VehicleInspectionOut>("/vehicle-inspections", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/vehicle-inspections/${id}`, { method: "DELETE" }),
    uploadSignature: (file: File | Blob, filename = "signature.png") => {
      const form = new FormData();
      form.append("file", file, filename);
      return request<{ url: string }>("/vehicle-inspections/upload-signature", { method: "POST", body: form, headers: {} });
    },
    uploadPhoto: (inspectionId: number, file: File, description?: string) => {
      const form = new FormData();
      form.append("file", file);
      if (description) form.append("description", description);
      return request<InspectionPhotoOut>(`/vehicle-inspections/${inspectionId}/photos`, { method: "POST", body: form, headers: {} });
    },
    downloadPdf: (id: number) => downloadBlobAs(`/vehicle-inspections/${id}/pdf`, `inspeccion-vehiculo-${id}.pdf`),
    notifyEmail: (id: number) =>
      request<{ queued: boolean }>(`/vehicle-inspections/${id}/notify-email`, { method: "POST" }),
  },
  motoInspections: {
    itemsCatalog: () => request<InspectionItemsCatalog>("/moto-inspections/items-catalog"),
    list: (params: { vehicle_id?: number; date_from?: string; date_to?: string } = {}) => {
      const qs = new URLSearchParams();
      if (params.vehicle_id !== undefined) qs.set("vehicle_id", String(params.vehicle_id));
      if (params.date_from) qs.set("date_from", params.date_from);
      if (params.date_to) qs.set("date_to", params.date_to);
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      return request<MotoInspectionOut[]>(`/moto-inspections${suffix}`);
    },
    get: (id: number) => request<MotoInspectionOut>(`/moto-inspections/${id}`),
    create: (data: MotoInspectionCreate) =>
      request<MotoInspectionOut>("/moto-inspections", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/moto-inspections/${id}`, { method: "DELETE" }),
    uploadSignature: (file: File | Blob, filename = "signature.png") => {
      const form = new FormData();
      form.append("file", file, filename);
      return request<{ url: string }>("/moto-inspections/upload-signature", { method: "POST", body: form, headers: {} });
    },
    uploadPhoto: (inspectionId: number, file: File, description?: string) => {
      const form = new FormData();
      form.append("file", file);
      if (description) form.append("description", description);
      return request<InspectionPhotoOut>(`/moto-inspections/${inspectionId}/photos`, { method: "POST", body: form, headers: {} });
    },
    downloadPdf: (id: number) => downloadBlobAs(`/moto-inspections/${id}/pdf`, `inspeccion-moto-${id}.pdf`),
    notifyEmail: (id: number) =>
      request<{ queued: boolean }>(`/moto-inspections/${id}/notify-email`, { method: "POST" }),
  },
  menuItems: {
    list: () => request<MenuItemResponse[]>("/menu-items"),
    myMenu: () => request<MenuItemResponse[]>("/menu/me"),
    create: (data: { label: string; icon?: string; path?: string; parent_id?: string; order_index?: number; group?: string }) =>
      request<MenuItemResponse>("/menu-items", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: { label?: string; icon?: string; path?: string; parent_id?: string; order_index?: number; group?: string; is_active?: boolean }) =>
      request<MenuItemResponse>(`/menu-items/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/menu-items/${id}`, { method: "DELETE" }),
    reorder: (orders: { id: string; order_index: number }[]) =>
      request<void>("/menu-items/reorder", { method: "POST", body: JSON.stringify({ orders }) }),
  },
};
