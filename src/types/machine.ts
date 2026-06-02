export const CATEGORIES = [
  "Excavadora",
  "Miniexcavadora",
  "Cargador de Ruedas",
  "Minicargador",
  "Retrocargadora",
] as const;

export type MachineCategory = (typeof CATEGORIES)[number];

export interface MachineSpec {
  label: string;
  value: string;
  icon:  string;
}

export interface Machine {
  id:             string;
  codigo:         string;
  marca:          string;
  categoria:      MachineCategory;
  modelo:         string;
  descripcion:    string;
  precio:         number;
  mostrar_precio: boolean;
  garantia:       string;
  tiempo_entrega: string;
  specs:          MachineSpec[];
  highlights:     string[];
  imagen_url:     string;
  pdf_url:        string;
  visible_web:    boolean;
  destacado:      boolean;
  slug:           string;
  created_at:     string;
  updated_at:     string;
}
