// Hoja de ruta de la guia (pag. 02): el orden importa, no se emite ninguna factura antes del paso 6.
export const ROADMAP = [
  { step: 1, title: "Verificar el permiso de residencia", detail: "Confirmar que te habilita para trabajar por cuenta propia." },
  { step: 2, title: "Conseguir certificado digital o Cl@ve", detail: "Para cualquier trámite online en Hacienda y en la Seguridad Social." },
  { step: 3, title: "Elegir gestoría", detail: "Preguntar a dos o tres y quedarte con la que mejor entienda tu caso." },
  { step: 4, title: "Alta en Hacienda (modelo 036/037)", detail: "Con el epígrafe del IAE correcto y el domicilio fiscal." },
  { step: 5, title: "Alta en la Seguridad Social (RETA)", detail: "Con el código CNAE y pidiendo la tarifa plana." },
  { step: 6, title: "Elegir programa de facturación", detail: "Compatible con Verifactu y con facturas recurrentes." },
  { step: 7, title: "Firmar el acuerdo con tus socios", detail: "Reparto, quién factura, de quién es la marca y qué pasa si alguien se va." },
  { step: 8, title: "Emitir las primeras facturas", detail: "Con IVA y retención si corresponde." },
  { step: 9, title: "Configurar los cobros recurrentes", detail: "Hosting y mantenimiento por domiciliación SEPA." },
  { step: 10, title: "Agendar impuestos y recordatorios", detail: "IVA e IRPF cada trimestre, resúmenes anuales y alertas." },
] as const;
