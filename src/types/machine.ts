export const CATEGORIES = [
  "Excavadora",
  "Miniexcavadora",
  "Cargador de Ruedas",
  "Minicargador",
  "Retrocargadora",
] as const;

export type MachineCategory = (typeof CATEGORIES)[number];

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
  image_url:     string;
  pdf_url:       string;
  visible_web:   boolean;
  featured:      boolean;
  is_new:        boolean;
  created_at:    string;
  updated_at:    string;
}
