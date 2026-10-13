import type { ImportedCredential } from "@/types/credential";

function parseRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function hostnameName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    const name = hostname.split(".")[0] || "Cuenta importada";
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return "Cuenta importada";
  }
}

export function parseGooglePasswordCsv(text: string): ImportedCredential[] {
  const rows = parseRows(text.replace(/^﻿/, ""));
  if (rows.length < 2) throw new Error("El CSV no contiene cuentas para importar.");

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const indexOf = (...names: string[]) => headers.findIndex((header) => names.includes(header));
  const indexes = {
    name: indexOf("name", "nombre"),
    url: indexOf("url", "website", "sitio"),
    username: indexOf("username", "usuario", "email"),
    password: indexOf("password", "contraseña", "contrasena"),
    notes: indexOf("note", "notes", "nota", "notas"),
  };

  if (indexes.password < 0) throw new Error("No se encontró la columna de contraseña.");

  return rows.slice(1).map((row) => {
    const url = indexes.url >= 0 ? (row[indexes.url] ?? "").trim() : "";
    const name = indexes.name >= 0 ? (row[indexes.name] ?? "").trim() : "";
    return {
      name: name || hostnameName(url),
      url,
      username: indexes.username >= 0 ? (row[indexes.username] ?? "").trim() : "",
      password: (row[indexes.password] ?? "").trim(),
      notes: indexes.notes >= 0 ? (row[indexes.notes] ?? "").trim() : "",
    };
  }).filter((credential) => credential.name && (credential.username || credential.password));
}
