import { describe, expect, it } from "vitest";
import { iconCandidates, isPublicAddress } from "@/lib/server/site-logo";

describe("isPublicAddress", () => {
  it("acepta direcciones publicas", () => {
    expect(isPublicAddress("76.76.21.21")).toBe(true);
    expect(isPublicAddress("2606:4700::6810:84e5")).toBe(true);
  });

  it("rechaza loopback, privadas, link-local, CGNAT y metadatos de la nube", () => {
    for (const address of [
      "127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254",
      "100.64.0.1", "0.0.0.0", "224.0.0.1", "::1", "::", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "no-es-ip",
    ]) {
      expect(isPublicAddress(address), address).toBe(false);
    }
  });
});

describe("iconCandidates", () => {
  const page = "https://www.tinasibiza.com/";

  it("prioriza apple-touch-icon y despues el icono mas grande, con favicon.ico al final", () => {
    const html = `
      <link rel="icon" href="/favicon.ico" sizes="48x48">
      <link rel="icon" type="image/png" href="/icon-192.png" sizes="192x192">
      <link rel="apple-touch-icon" href="/apple-touch-icon.png">`;
    expect(iconCandidates(html, page)).toEqual([
      "https://www.tinasibiza.com/apple-touch-icon.png",
      "https://www.tinasibiza.com/icon-192.png",
      "https://www.tinasibiza.com/favicon.ico",
    ]);
  });

  it("resuelve rutas relativas y absolutas, e ignora data: y rels ajenos", () => {
    const html = `
      <link href='https://cdn.example.com/logo.svg' rel='icon' type='image/svg+xml'>
      <link rel="stylesheet" href="/style.css">
      <link rel="icon" href="data:image/png;base64,AAAA">`;
    expect(iconCandidates(html, "https://example.com/es/")).toEqual([
      "https://cdn.example.com/logo.svg",
      "https://example.com/favicon.ico",
    ]);
  });

  it("sin iconos declarados solo queda /favicon.ico", () => {
    expect(iconCandidates("<html></html>", "https://example.com/a/b")).toEqual(["https://example.com/favicon.ico"]);
  });
});
