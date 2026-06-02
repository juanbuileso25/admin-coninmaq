import { useState } from "react";
import type { Machine } from "../types/machine";

const INITIAL: Machine[] = [
  {
    id: "1", codigo: "CDM6225", marca: "LONKING", categoria: "Excavadora",
    modelo: "Excavadora CDM6225",
    descripcion: 'Motor Cummins B6.7 de 129 kW (173 HP), peso operativo 21.8 ton. Cabina ROPS y pantalla LCD 8".',
    precio: 605000000, mostrar_precio: false,
    garantia: "12 meses o 2.000 horas", tiempo_entrega: "30 – 45 días hábiles",
    specs: [
      { label: "Motor",               value: "Cummins B6.7 — 129 kW (173 HP)", icon: "mdi:engine-outline" },
      { label: "Peso operativo",       value: "21.800 kg",                       icon: "mdi:weight" },
      { label: "Capacidad cucharón",  value: "1,1 m³",                           icon: "mdi:bucket-outline" },
      { label: "Longitud pluma",       value: "5.675 mm",                         icon: "mdi:arrow-expand-horizontal" },
      { label: "Velocidad de traslado",value: "3,1 / 5,3 km/h",                  icon: "mdi:speedometer" },
      { label: "Tanque de combustible",value: "600 L",                            icon: "mdi:fuel" },
    ],
    highlights: [
      "Motor Cummins B6.7 certificado Euro V y Tier 4F",
      'Pantalla LCD de 8" multipropósito para monitoreo completo',
      "Cabina ROPS con espacio operacional de 2,7 m³",
      "Estructura de trabajo en acero de alta resistencia y baja aleación",
    ],
    imagen_url: "/machines/cdm6225.webp", pdf_url: "",
    visible_web: true, destacado: true, slug: "cdm6225",
    created_at: "2024-01-15", updated_at: "2024-01-15",
  },
  {
    id: "2", codigo: "CDM6150F", marca: "LONKING", categoria: "Excavadora",
    modelo: "Excavadora CDM6150F",
    descripcion: "Motor Cummins QSF3.8 de 90 kW (121 HP), peso operativo 14 ton. Excavadora de 15T ideal para proyectos medianos.",
    precio: 420000000, mostrar_precio: false,
    garantia: "12 meses o 2.000 horas", tiempo_entrega: "30 – 45 días hábiles",
    specs: [
      { label: "Motor",               value: "Cummins QSF3.8 — 90 kW (121 HP)", icon: "mdi:engine-outline" },
      { label: "Peso operativo",       value: "14.000 kg",                        icon: "mdi:weight" },
      { label: "Capacidad cucharón",  value: "0,65 m³",                           icon: "mdi:bucket-outline" },
      { label: "Velocidad de traslado",value: "2,8 / 4,8 km/h",                  icon: "mdi:speedometer" },
      { label: "Tanque de combustible",value: "400 L",                            icon: "mdi:fuel" },
    ],
    highlights: [
      "Motor Cummins de bajo consumo certificado Tier 4",
      "Sistema hidráulico de alta eficiencia con control electrónico",
      "Cabina espaciosa con visibilidad panorámica",
    ],
    imagen_url: "/machines/cdm6150f.webp", pdf_url: "",
    visible_web: true, destacado: false, slug: "cdm6150f",
    created_at: "2024-01-15", updated_at: "2024-01-15",
  },
  {
    id: "3", codigo: "CDM6306", marca: "LONKING", categoria: "Excavadora",
    modelo: "Excavadora CDM6306",
    descripcion: "Motor Cummins QSL9 de 209 kW (280 HP), peso operativo 32.8 ton. Excavadora de gran tonelaje para minería y obra civil.",
    precio: 0, mostrar_precio: false,
    garantia: "12 meses o 2.000 horas", tiempo_entrega: "45 – 60 días hábiles",
    specs: [
      { label: "Motor",               value: "Cummins QSL9 — 209 kW (280 HP)", icon: "mdi:engine-outline" },
      { label: "Peso operativo",       value: "32.800 kg",                       icon: "mdi:weight" },
      { label: "Capacidad cucharón",  value: "1,6 m³",                           icon: "mdi:bucket-outline" },
      { label: "Velocidad de traslado",value: "3,0 / 5,0 km/h",                 icon: "mdi:speedometer" },
      { label: "Tanque de combustible",value: "900 L",                           icon: "mdi:fuel" },
    ],
    highlights: [
      "Motor Cummins QSL9 de alta potencia para trabajos pesados",
      "Estructura reforzada para condiciones extremas de trabajo",
      "Sistema de monitoreo remoto incluido",
    ],
    imagen_url: "/machines/cdm6306.webp", pdf_url: "",
    visible_web: true, destacado: false, slug: "cdm6306",
    created_at: "2024-01-15", updated_at: "2024-01-15",
  },
  {
    id: "4", codigo: "CDM6060N", marca: "LONKING", categoria: "Excavadora",
    modelo: "Excavadora CDM6060N",
    descripcion: "Motor Weichai de 36 kW (49 HP), peso operativo 5.85 ton. Excavadora compacta para espacios reducidos.",
    precio: 201600000, mostrar_precio: false,
    garantia: "12 meses o 2.000 horas", tiempo_entrega: "20 – 35 días hábiles",
    specs: [
      { label: "Motor",               value: "Weichai — 36 kW (49 HP)",  icon: "mdi:engine-outline" },
      { label: "Peso operativo",       value: "5.850 kg",                  icon: "mdi:weight" },
      { label: "Capacidad cucharón",  value: "0,25 m³",                   icon: "mdi:bucket-outline" },
      { label: "Velocidad de traslado",value: "2,5 / 4,2 km/h",           icon: "mdi:speedometer" },
      { label: "Tanque de combustible",value: "135 L",                     icon: "mdi:fuel" },
    ],
    highlights: [
      "Diseño compacto ideal para trabajo en zonas urbanas",
      "Giro de 360° con radio mínimo",
      "Bajo costo operativo y mantenimiento simplificado",
    ],
    imagen_url: "/machines/cdm6060n.webp", pdf_url: "",
    visible_web: true, destacado: true, slug: "cdm6060n",
    created_at: "2024-01-15", updated_at: "2024-01-15",
  },
  {
    id: "5", codigo: "CDM6035", marca: "LONKING", categoria: "Miniexcavadora",
    modelo: "Miniexcavadora CDM6035",
    descripcion: "Motor Kubota de 17.8 kW (24 HP), peso operativo 3.85 ton. Miniexcavadora de cola cero para máxima maniobrabilidad.",
    precio: 145000000, mostrar_precio: false,
    garantia: "12 meses o 2.000 horas", tiempo_entrega: "20 – 30 días hábiles",
    specs: [
      { label: "Motor",               value: "Kubota — 17,8 kW (24 HP)", icon: "mdi:engine-outline" },
      { label: "Peso operativo",       value: "3.850 kg",                  icon: "mdi:weight" },
      { label: "Capacidad cucharón",  value: "0,11 m³",                   icon: "mdi:bucket-outline" },
      { label: "Velocidad de traslado",value: "2,4 / 4,0 km/h",           icon: "mdi:speedometer" },
      { label: "Tanque de combustible",value: "80 L",                      icon: "mdi:fuel" },
    ],
    highlights: [
      "Diseño de cola cero — opera en espacios muy reducidos",
      "Motor Kubota de bajo consumo y alta durabilidad",
      "Apta para obras en interiores y jardines",
    ],
    imagen_url: "/machines/cdm6035.webp", pdf_url: "",
    visible_web: true, destacado: false, slug: "cdm6035",
    created_at: "2024-01-15", updated_at: "2024-01-15",
  },
  {
    id: "6", codigo: "CDM835H", marca: "LONKING", categoria: "Cargador de Ruedas",
    modelo: "Cargador de Ruedas CDM835H",
    descripcion: "Motor Weichai de 99 kW (133 HP), peso operativo 11 ton. Cargador de ruedas versátil para carga y transporte.",
    precio: 209500000, mostrar_precio: false,
    garantia: "12 meses o 2.000 horas", tiempo_entrega: "30 – 45 días hábiles",
    specs: [
      { label: "Motor",               value: "Weichai — 99 kW (133 HP)", icon: "mdi:engine-outline" },
      { label: "Peso operativo",       value: "11.000 kg",                 icon: "mdi:weight" },
      { label: "Capacidad cucharón",  value: "1,8 m³",                    icon: "mdi:bucket-outline" },
      { label: "Carga nominal",        value: "3.500 kg",                  icon: "mdi:weight-lifter" },
      { label: "Velocidad máxima",     value: "38 km/h",                   icon: "mdi:speedometer" },
      { label: "Tanque de combustible",value: "200 L",                     icon: "mdi:fuel" },
    ],
    highlights: [
      "Transmisión automática de 4 velocidades ZF",
      "Articulación central de 40° para alta maniobrabilidad",
      "Sistema de frenado hidráulico en las 4 ruedas",
    ],
    imagen_url: "/machines/cdm835h.webp", pdf_url: "",
    visible_web: true, destacado: true, slug: "cdm835h",
    created_at: "2024-01-15", updated_at: "2024-01-15",
  },
  {
    id: "7", codigo: "CDM856H", marca: "LONKING", categoria: "Cargador de Ruedas",
    modelo: "Cargador de Ruedas CDM856H",
    descripcion: "Motor Weichai de 170 kW (228 HP), peso operativo 17.2 ton. Cargador de gran capacidad para minería y puertos.",
    precio: 580000000, mostrar_precio: false,
    garantia: "12 meses o 2.000 horas", tiempo_entrega: "45 – 60 días hábiles",
    specs: [
      { label: "Motor",               value: "Weichai — 170 kW (228 HP)", icon: "mdi:engine-outline" },
      { label: "Peso operativo",       value: "17.200 kg",                  icon: "mdi:weight" },
      { label: "Capacidad cucharón",  value: "3,6 m³",                     icon: "mdi:bucket-outline" },
      { label: "Carga nominal",        value: "5.000 kg",                   icon: "mdi:weight-lifter" },
      { label: "Velocidad máxima",     value: "40 km/h",                    icon: "mdi:speedometer" },
      { label: "Tanque de combustible",value: "380 L",                      icon: "mdi:fuel" },
    ],
    highlights: [
      "Alta capacidad de carga para operaciones intensivas",
      "Cabina de lujo con aire acondicionado y asiento con suspensión",
      "Sistema electrónico de monitoreo de carga en tiempo real",
    ],
    imagen_url: "/machines/cdm856h.webp", pdf_url: "",
    visible_web: false, destacado: false, slug: "cdm856h",
    created_at: "2024-01-15", updated_at: "2024-01-15",
  },
  {
    id: "8", codigo: "CDM312", marca: "LONKING", categoria: "Minicargador",
    modelo: "Minicargador CDM312",
    descripcion: "Motor Kubota V3307 de 54.6 kW (73 HP), carga nominal 1.230 kg. Skid steer con cambio rápido de aditamentos.",
    precio: 180900000, mostrar_precio: false,
    garantia: "12 meses o 2.000 horas", tiempo_entrega: "20 – 35 días hábiles",
    specs: [
      { label: "Motor",          value: "Kubota V3307 — 54,6 kW (73 HP)", icon: "mdi:engine-outline" },
      { label: "Peso operativo",  value: "3.500 kg",                        icon: "mdi:weight" },
      { label: "Carga nominal",   value: "1.230 kg",                        icon: "mdi:weight-lifter" },
      { label: "Capacidad cucharón", value: "0,54 m³",                      icon: "mdi:bucket-outline" },
      { label: "Velocidad máxima", value: "12,1 km/h",                      icon: "mdi:speedometer" },
      { label: "Tanque de combustible", value: "80 L",                      icon: "mdi:fuel" },
    ],
    highlights: [
      "Sistema de cambio rápido de aditamentos (quick-attach)",
      "Tracción en las 4 ruedas con control de deslizamiento",
      "Cabina ROPS/FOPS con control electrónico proporcional",
    ],
    imagen_url: "/machines/cdm312.webp", pdf_url: "",
    visible_web: true, destacado: true, slug: "cdm312",
    created_at: "2024-01-15", updated_at: "2024-01-15",
  },
  {
    id: "9", codigo: "LONKING83D", marca: "LONKING", categoria: "Retrocargadora",
    modelo: "Retrocargadora 83D",
    descripcion: "Motor Perkins de 74.5 kW (100 HP), peso operativo 8.3 ton. Retrocargadora versátil para construcción y obra civil.",
    precio: 310900000, mostrar_precio: false,
    garantia: "12 meses o 2.000 horas", tiempo_entrega: "20 – 35 días hábiles",
    specs: [
      { label: "Motor",               value: "Perkins — 74,5 kW (100 HP)", icon: "mdi:engine-outline" },
      { label: "Peso operativo",       value: "8.300 kg",                    icon: "mdi:weight" },
      { label: "Cucharón cargador",   value: "1,0 m³",                       icon: "mdi:bucket-outline" },
      { label: "Cucharón excavador",  value: "0,2 m³",                       icon: "mdi:shovel" },
      { label: "Profundidad de excavación", value: "4.270 mm",               icon: "mdi:ruler" },
      { label: "Velocidad máxima",    value: "40 km/h",                      icon: "mdi:speedometer" },
      { label: "Tanque de combustible", value: "160 L",                      icon: "mdi:fuel" },
    ],
    highlights: [
      "Motor Perkins de reconocida durabilidad y bajo mantenimiento",
      "Doble función: cargadora frontal y excavadora trasera",
      "Transmisión powershift de 4x4 con bloqueo de diferencial",
      "Estabilizadores hidráulicos para máxima estabilidad en excavación",
    ],
    imagen_url: "/machines/83d.webp", pdf_url: "",
    visible_web: true, destacado: false, slug: "83d",
    created_at: "2024-01-15", updated_at: "2024-01-15",
  },
];

export function useMachines() {
  const [machines, setMachines] = useState<Machine[]>(INITIAL);

  const addMachine = (m: Omit<Machine, "id" | "created_at" | "updated_at">) => {
    const now = new Date().toISOString().split("T")[0];
    setMachines((prev) => [
      ...prev,
      { ...m, id: crypto.randomUUID(), created_at: now, updated_at: now },
    ]);
  };

  const updateMachine = (id: string, data: Partial<Omit<Machine, "id" | "created_at">>) => {
    const now = new Date().toISOString().split("T")[0];
    setMachines((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...data, updated_at: now } : m))
    );
  };

  const removeMachine = (id: string) =>
    setMachines((prev) => prev.filter((m) => m.id !== id));

  const toggleField = (id: string, field: "visible_web" | "destacado") =>
    setMachines((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: !m[field] } : m))
    );

  return { machines, addMachine, updateMachine, removeMachine, toggleField };
}
