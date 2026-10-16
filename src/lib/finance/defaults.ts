// Categorias con las que arranca una boveda sin ajustes de finanzas. Despues se editan libremente.
import type { FinanceCategory, FinanceSettings } from "@/types/finance";

/** 15 € */
export const DEFAULT_ANT_THRESHOLD = 1500;

/** Categorias por defecto que cuentan como hormiga: lo chico y evitable, no lo necesario. */
export const DEFAULT_ANT_CATEGORIES = new Set(["comida", "cafe", "suscripciones", "ocio"]);

export const UNCATEGORIZED_COLOR = "#9ca3af";

export const CATEGORY_COLORS = [
  "#e2543a", "#f08c2e", "#e8b931", "#8cc63f", "#3fae6a", "#2bb3a3",
  "#3a8fd9", "#5b6ee1", "#8a5cd6", "#c95bb8", "#8c6b52", "#6b7280",
];

const expense = (id: string, name: string, color: string): FinanceCategory =>
  ({ id, name, kind: "expense", color, budget: null, archived: false, ant: DEFAULT_ANT_CATEGORIES.has(id) });
const income = (id: string, name: string, color: string): FinanceCategory =>
  ({ id, name, kind: "income", color, budget: null, archived: false, ant: false });

export function defaultFinanceSettings(): FinanceSettings {
  return {
    categories: [
      expense("supermercado", "Supermercado", "#3fae6a"),
      expense("comida", "Comer fuera", "#f08c2e"),
      expense("cafe", "Café y snacks", "#8c6b52"),
      expense("transporte", "Transporte", "#3a8fd9"),
      expense("casa", "Casa y alquiler", "#5b6ee1"),
      expense("servicios", "Luz, agua e internet", "#2bb3a3"),
      expense("suscripciones", "Suscripciones", "#8a5cd6"),
      expense("ocio", "Ocio", "#c95bb8"),
      expense("salud", "Salud", "#e2543a"),
      expense("ropa", "Ropa", "#e8b931"),
      expense("trabajo", "Trabajo", "#6b7280"),
      expense("otros-gastos", "Otros", UNCATEGORIZED_COLOR),
      income("clientes", "Clientes", "#8cc63f"),
      income("sueldo", "Sueldo", "#3fae6a"),
      income("ventas", "Ventas", "#2bb3a3"),
      income("otros-ingresos", "Otros", UNCATEGORIZED_COLOR),
    ],
    recurring: [],
    antThreshold: DEFAULT_ANT_THRESHOLD,
  };
}
