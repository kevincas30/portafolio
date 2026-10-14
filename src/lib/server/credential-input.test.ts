import { describe, expect, it } from "vitest";
import { parseCredentialInput } from "./credential-input";

const valid = {
  id: "3f0c1f6e-2b1a-4c1e-9a53-0d6a3a4b5c6d",
  name: "  GitHub ",
  payload: "AAAAAAAAAAAAAAAAAAAAAAAA",
  payloadIv: "AAAAAAAAAAAAAAAA",
};

describe("parseCredentialInput", () => {
  it("acepta la forma valida, recorta el nombre e ignora user_id (S-VS-3)", () => {
    expect(parseCredentialInput({ ...valid, user_id: "otro", userId: "otro" })).toEqual({ ...valid, name: "GitHub" });
  });

  it("rechaza id, nombre, payload o iv invalidos", () => {
    expect(parseCredentialInput({ ...valid, id: "x" })).toBeNull();
    expect(parseCredentialInput({ ...valid, name: "   " })).toBeNull();
    expect(parseCredentialInput({ ...valid, name: "a".repeat(201) })).toBeNull();
    expect(parseCredentialInput({ ...valid, payload: "no es base64!" })).toBeNull();
    expect(parseCredentialInput({ ...valid, payloadIv: "corto" })).toBeNull();
    expect(parseCredentialInput(null)).toBeNull();
  });
});
