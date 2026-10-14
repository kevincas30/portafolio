import { describe, expect, it } from "vitest";
import {
  base32ToBytes,
  base64ToBytes,
  base64UrlToBytes,
  bytesToBase32,
  bytesToBase64,
  bytesToBase64Url,
  concatBytes,
  normalizeBase32,
  utf8Decode,
  utf8Encode,
} from "./encoding";

const sample = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255, 62, 63]);

describe("encoding", () => {
  it("round-trips base64", () => {
    expect(base64ToBytes(bytesToBase64(sample))).toEqual(sample);
  });

  it("base64url has no +, / or padding and round-trips", () => {
    const encoded = bytesToBase64Url(sample);
    expect(encoded).not.toMatch(/[+/=]/);
    expect(base64UrlToBytes(encoded)).toEqual(sample);
  });

  it("rejects invalid base64url", () => {
    expect(() => base64UrlToBytes("ab+c")).toThrow();
  });

  it("round-trips base32 for 20 random bytes", () => {
    const bytes = crypto.getRandomValues(new Uint8Array(20));
    const encoded = bytesToBase32(bytes);
    expect(encoded).toHaveLength(32);
    expect(base32ToBytes(encoded)).toEqual(bytes);
  });

  it("base32 parsing ignores case, whitespace and dashes and maps I/L/O", () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const encoded = bytesToBase32(bytes);
    const messy = ` ${encoded.toLowerCase().replace(/(.{4})/g, "$1-")} `;
    expect(base32ToBytes(messy)).toEqual(bytes);
    expect(normalizeBase32("iLoO")).toBe("1100");
  });

  it("rejects characters outside the alphabet", () => {
    expect(() => base32ToBytes("ABC$")).toThrow();
  });

  it("round-trips utf8 and concatenates bytes", () => {
    expect(utf8Decode(utf8Encode("ñandú 🔐"))).toBe("ñandú 🔐");
    expect(concatBytes(new Uint8Array([1]), new Uint8Array([2, 3]))).toEqual(new Uint8Array([1, 2, 3]));
  });
});
