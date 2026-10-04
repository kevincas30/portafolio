type Theme = 'light' | 'dark';

const systemPreference = matchMedia('(prefers-color-scheme: dark)');
const storedTheme = (): Theme | undefined => {
  try {
    const saved = localStorage.getItem('dc-theme');
    return saved === 'light' || saved === 'dark' ? saved : undefined;
  } catch { return undefined; }
};
// Keep an explicit choice during navigation even when storage is unavailable.
let manualTheme = storedTheme();
const currentPreference = (): Theme => manualTheme ?? (systemPreference.matches ? 'dark' : 'light');

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  const dark = theme === 'dark';
  document.querySelector<HTMLMetaElement>('#theme-color')?.setAttribute('content', dark ? '#121412' : '#f3f1eb');
  document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((button) => {
    const label = dark ? 'Activar modo claro' : 'Activar modo oscuro';
    button.setAttribute('aria-pressed', String(dark));
    button.setAttribute('aria-label', label);
    button.title = label;
  });
}

export function setupTheme(): void {
  applyTheme(currentPreference());
  document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((button) => {
    if (button.dataset.ready) return;
    button.dataset.ready = 'true';
    button.addEventListener('click', () => {
      manualTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('dc-theme', manualTheme); } catch {}
      applyTheme(manualTheme);
    });
  });
}

// This module runs once; Astro navigation only initializes the new buttons.
document.addEventListener('astro:before-swap', (event) => {
  // Set the incoming root before Astro swaps it, avoiding a light-cursor flash.
  const root = event.newDocument.documentElement;
  const theme = currentPreference();
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
});
systemPreference.addEventListener('change', () => {
  if (!manualTheme) applyTheme(currentPreference());
});
window.addEventListener('storage', (event) => {
  if (event.key !== 'dc-theme' && event.key !== null) return;
  manualTheme = storedTheme();
  applyTheme(currentPreference());
});
