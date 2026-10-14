import { describe, expect, it } from "vitest";
import { resolveWebAuthnConfig, WebAuthnConfigError } from "./webauthn-config";

describe("resolveWebAuthnConfig", () => {
  it("usa localhost por defecto solo en dev", () => {
    expect(resolveWebAuthnConfig({}, true)).toEqual({
      rpID: "localhost",
      rpName: "Panel privado",
      origins: ["http://localhost:4321"],
    });
  });

  it("en produccion exige rpID y origenes", () => {
    expect(() => resolveWebAuthnConfig({}, false)).toThrow(WebAuthnConfigError);
    expect(() => resolveWebAuthnConfig({ WEBAUTHN_RP_ID: "ejemplo.com" }, false)).toThrow(WebAuthnConfigError);
  });

  it("parsea la lista de origenes separada por comas", () => {
    const config = resolveWebAuthnConfig(
      { WEBAUTHN_RP_ID: "ejemplo.com", WEBAUTHN_RP_NAME: "Mi panel", WEBAUTHN_ORIGINS: "https://ejemplo.com, https://www.ejemplo.com ," },
      false,
    );
    expect(config).toEqual({
      rpID: "ejemplo.com",
      rpName: "Mi panel",
      origins: ["https://ejemplo.com", "https://www.ejemplo.com"],
    });
  });
});
