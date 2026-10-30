// Epigrafes del IAE habituales en el equipo. La seccion decide la retencion: la 2.ª (profesionales)
// la lleva al facturar a empresas y autonomos en España; la 1.ª (empresariales) no.
// Criterio de la DGT: consultas V0870-23 y V2396-22 (diseño grafico 399, desarrollo web 763) y V2899-16 (751).

export interface Activity {
  code: string;
  label: string;
  section: 1 | 2;
  professional: boolean;
}

const professional = (code: string, label: string): Activity => ({ code, label, section: 2, professional: true });
const business = (code: string, label: string): Activity => ({ code, label, section: 1, professional: false });

export const ACTIVITIES: Activity[] = [
  professional("763", "Programadores y analistas de informática"),
  professional("399", "Otros profesionales n.c.o.p. (diseño gráfico)"),
  professional("751", "Profesionales de la publicidad, relaciones públicas y similares"),
  business("845", "Explotación electrónica por cuenta de terceros"),
  business("844", "Servicios de publicidad, relaciones públicas y similares"),
  business("843.9", "Otros servicios técnicos n.c.o.p."),
];

export function findActivity(code: string): Activity | null {
  return ACTIVITIES.find((activity) => activity.code === code) ?? null;
}
