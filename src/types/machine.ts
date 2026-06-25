export interface MachineTypeOption {
  id:        number;
  name:      string;
  slug:      string;
  is_active: boolean;
}

export const CATEGORIES = [
  "Excavadora",
  "Miniexcavadora",
  "Cargador de Ruedas",
  "Minicargador",
  "Retrocargadora",
] as const;

export type MachineCategory = (typeof CATEGORIES)[number];

export const CONDITIONS = ["Excelente", "Muy bueno", "Bueno"] as const;
export type MachineCondition = (typeof CONDITIONS)[number];

export interface MachineSpec {
  id?:    string;
  label:  string;
  value:  string;
  icon:   string;
  order?: number;
}

export interface MachineHighlight {
  id?:    string;
  text:   string;
  order?: number;
}

export interface MachineImage {
  id:         string;
  url:        string;
  is_primary: boolean;
  order:      number;
}

export interface MachineMedia {
  id:         string;
  url:        string;
  file_name:  string;
  media_type: "image" | "video";
  title:      string | null;
  file_size:  number | null;
  order:      number;
  uploaded_at: string;
}

export interface Machine {
  id:            string;
  code:          string;
  brand:         string;
  category:      MachineCategory;
  model:         string;
  slug:          string;
  description:   string;
  price:         number;
  show_price:    boolean;
  warranty:      string;
  delivery_time: string;
  specs:         MachineSpec[];
  highlights:    MachineHighlight[];
  images:        MachineImage[];
  media:         MachineMedia[];
  image_url:     string;
  pdf_url:       string;
  visible_web:   boolean;
  featured:      boolean;
  machine_type_id: number;
  machine_type:    MachineTypeOption;
  // Used/rental machinery fields
  year:          number | null;
  hours_used:    string | null;
  condition:     string | null;
  inspection:    string | null;
  created_at:    string;
  updated_at:    string;
}
