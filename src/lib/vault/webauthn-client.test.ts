import { describe, expect, it } from "vitest";
import { extractPrfFirst, sanitizeResponse } from "./webauthn-client";

describe("extractPrfFirst", () => {
  it("devuelve los bytes del ArrayBuffer de prf.results.first", () => {
    const first = new Uint8Array([1, 2, 3]).buffer;
    expect(Array.from(extractPrfFirst({ prf: { enabled: true, results: { first } } })!)).toEqual([1, 2, 3]);
  });

  it("devuelve null sin PRF o con resultado vacio", () => {
    expect(extractPrfFirst({})).toBeNull();
    expect(extractPrfFirst(undefined)).toBeNull();
    expect(extractPrfFirst({ prf: { enabled: false } })).toBeNull();
    expect(extractPrfFirst({ prf: { results: { first: new ArrayBuffer(0) } } })).toBeNull();
  });

  it("copia los bytes de una vista parcial", () => {
    const view = new Uint8Array([9, 8, 7, 6]).subarray(1, 3);
    expect(Array.from(extractPrfFirst({ prf: { results: { first: view } } })!)).toEqual([8, 7]);
  });
});

describe("sanitizeResponse", () => {
  it("quita la salida PRF y conserva solo prf.enabled", () => {
    const response = {
      id: "abc",
      clientExtensionResults: { prf: { enabled: true, results: { first: new ArrayBuffer(32) } }, credProps: { rk: true } },
    };
    const clean = sanitizeResponse(response);
    expect(clean.clientExtensionResults).toEqual({ prf: { enabled: true } });
    expect(JSON.stringify(clean)).not.toContain("results");
    expect(clean.id).toBe("abc");
  });

  it("deja el objeto vacio si no hay prf.enabled", () => {
    expect(sanitizeResponse({ clientExtensionResults: { prf: { results: { first: new ArrayBuffer(4) } } } }).clientExtensionResults).toEqual({});
  });
});
