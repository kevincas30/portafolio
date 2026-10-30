// Parametros fiscales por año. Cambian con cada ley de presupuestos: al empezar un año nuevo se
// agrega su entrada (verificada en la sede de la AEAT) en vez de tocar los calculos.

export interface TaxRules {
  /** Pago fraccionado del 130 sobre el rendimiento neto acumulado (casilla 04). */
  paymentRate: number;
  /** Provisiones y gastos de dificil justificacion en estimacion directa simplificada. */
  difficultExpensesRate: number;
  /** Tope anual de esos gastos, en centimos. */
  difficultExpensesCap: number;
  /** Minoracion del 130 por trimestre (casilla 13) segun el rendimiento neto del año anterior, en centimos. */
  reductionTiers: { upTo: number; amount: number }[];
}

// Fuente: instrucciones del modelo 130 y manual de actividades economicas de la AEAT (octubre 2026).
const RULES_2026: TaxRules = {
  paymentRate: 0.2,
  difficultExpensesRate: 0.05,
  difficultExpensesCap: 200_000,
  reductionTiers: [
    { upTo: 900_000, amount: 10_000 },
    { upTo: 1_000_000, amount: 7_500 },
    { upTo: 1_100_000, amount: 5_000 },
    { upTo: 1_200_000, amount: 2_500 },
  ],
};

const RULES_BY_YEAR: Record<number, TaxRules> = { 2026: RULES_2026 };

/** Reglas del año; si todavia no estan cargadas, las del ultimo año conocido (o el primero, hacia atras). */
export function taxRules(year: number): TaxRules {
  const years = Object.keys(RULES_BY_YEAR).map(Number).sort((a, b) => a - b);
  const known = years.filter((item) => item <= year).at(-1) ?? years[0];
  return RULES_BY_YEAR[known];
}
