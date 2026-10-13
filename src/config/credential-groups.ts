export interface CredentialGroupAppearance {
  name: string;
  accent: string;
  soft: string;
  border: string;
  foreground: string;
  activeForeground: string;
}

export const credentialGroups: CredentialGroupAppearance[] = [];

export function normalizeCredentialGroup(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLocaleLowerCase("es");
}

function mixHex(first: string, second: string, secondWeight: number): string {
  const parse = (value: string) => [1, 3, 5].map((index) => Number.parseInt(value.slice(index, index + 2), 16));
  const firstRgb = parse(first);
  const secondRgb = parse(second);
  return `#${firstRgb.map((channel, index) =>
    Math.round(channel * (1 - secondWeight) + secondRgb[index] * secondWeight)
      .toString(16)
      .padStart(2, "0")).join("")}`;
}

export function getCredentialGroupAppearance(groupName: string, customColor?: string): CredentialGroupAppearance | null {
  const normalizedName = normalizeCredentialGroup(groupName);
  const configured = credentialGroups.find((group) => normalizeCredentialGroup(group.name) === normalizedName) ?? null;
  if (!customColor || !/^#[0-9a-f]{6}$/i.test(customColor)) return configured;

  const red = Number.parseInt(customColor.slice(1, 3), 16);
  const green = Number.parseInt(customColor.slice(3, 5), 16);
  const blue = Number.parseInt(customColor.slice(5, 7), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return {
    name: groupName,
    accent: customColor,
    soft: mixHex(customColor, "#ffffff", 0.88),
    border: mixHex(customColor, "#ffffff", 0.55),
    foreground: mixHex(customColor, "#000000", 0.35),
    activeForeground: luminance > 0.65 ? "#1f2937" : "#ffffff",
  };
}
