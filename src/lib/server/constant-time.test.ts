import { describe, expect, it } from "vitest";
import { safeEqual } from "./constant-time";

describe("safeEqual", () => {
  it("compara igualdad sin importar el largo", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "")).toBe(true);
  });
});
