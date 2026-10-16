import { describe, expect, it } from "vitest";
import { amountToInput, formatAmount, parseAmount } from "@/lib/finance/money";

describe("parseAmount", () => {
  it("entiende coma o punto decimal y el simbolo del euro", () => {
    expect(parseAmount("3,50")).toBe(350);
    expect(parseAmount("3.5")).toBe(350);
    expect(parseAmount("12 €")).toBe(1200);
    expect(parseAmount(" 0,99 ")).toBe(99);
  });

  it("separa miles del decimal", () => {
    expect(parseAmount("1.234,56")).toBe(123456);
    expect(parseAmount("1,234.56")).toBe(123456);
    expect(parseAmount("1.234")).toBe(123400);
    expect(parseAmount("1.234.567")).toBe(123456700);
  });

  it("rechaza vacios, negativos, cero, texto y mas de dos decimales", () => {
    for (const input of ["", "0", "0,00", "-5", "abc", "3,555", "1,2,3", "1e3", "10000001", "12.345.678"]) {
      expect(parseAmount(input), input).toBeNull();
    }
  });
});

describe("formato", () => {
  it("muestra euros a la espanola y precarga el input con coma", () => {
    expect(formatAmount(350).replace(/\s/g, " ")).toBe("3,50 €");
    expect(amountToInput(123456)).toBe("1234,56");
    expect(parseAmount(amountToInput(123456))).toBe(123456);
  });
});
