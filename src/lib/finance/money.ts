// Montos en centimos de euro: lo que se escribe en el formulario y lo que se muestra.

/** Tope razonable por movimiento: 10 millones de euros. */
export const MAX_AMOUNT = 10_000_000_00;

const formatter = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const compactFormatter = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export function formatAmount(cents: number): string {
  return formatter.format(cents / 100);
}

/** Sin decimales, para graficos y totales grandes. */
export function formatAmountCompact(cents: number): string {
  return compactFormatter.format(Math.round(cents / 100));
}

/** Monto para precargar un input: "3,50", sin simbolo. */
export function amountToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/**
 * Lee lo que escribe una persona ("3,50", "3.5", "1.234,56", "12 €") y lo pasa a centimos.
 * Con un solo separador: la coma siempre es decimal; el punto tambien, salvo que agrupe miles ("1.234").
 * Devuelve null si no es un monto positivo con hasta dos decimales.
 */
export function parseAmount(input: string): number | null {
  const value = input.replace(/[\s€]/g, "");
  if (!/^\d[\d.,]*$/.test(value)) return null;

  const lastComma = value.lastIndexOf(",");
  const lastDot = value.lastIndexOf(".");
  let normalized: string;
  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? "," : ".";
    const thousands = decimal === "," ? "." : ",";
    normalized = value.split(thousands).join("").replace(decimal, ".");
  } else if (lastComma >= 0) {
    normalized = value.replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(value)) {
    normalized = value.split(".").join("");
  } else {
    normalized = value;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return cents > 0 && cents <= MAX_AMOUNT ? cents : null;
}
