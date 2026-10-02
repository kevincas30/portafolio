const whatsappNumber = '34625959676';

/** Enlace de WhatsApp con un mensaje ya escrito, para que el cliente solo tenga que enviarlo. */
export const waLink = (text = 'Hola, quiero una demo gratis de mi web.') =>
  `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;

export const site = {
  name: 'Diseño Creativo',
  shortName: 'DC',
  description: 'Webs para restaurantes y alojamientos rurales: carta online con pedidos por WhatsApp y reservas directas, sin comisiones de plataformas.',
  url: import.meta.env.PUBLIC_SITE_URL || '',
  email: import.meta.env.PUBLIC_CONTACT_EMAIL || 'disenocreativo04@gmail.com',
  whatsapp: import.meta.env.PUBLIC_WHATSAPP_URL || waLink(),
  whatsappDisplay: '+34 625 959 676',
  locations: ['España'],
  area: 'Trabajamos en toda España · en remoto',
  socials: [] as Array<{ label: string; url: string }>,
  form: {
    enabled: false,
    showBudget: true,
    budgetOptions: ['Por definir', 'Quiero orientación', 'Tengo una cifra y la contaré en el mensaje'],
  },
  testimonialsEnabled: false,
  team: [] as Array<{ name: string; role: string; bio?: string; image?: string }>,
  /**
   * Precio de lanzamiento. Desactívalo (enabled: false) cuando se cubran las plazas:
   * anunciar plazas limitadas que no lo son engaña al cliente.
   */
  launchOffer: { enabled: false, discount: 30, slots: 5 },
  packs: [
    {
      id: 'restaurantes',
      href: '/restaurantes',
      label: 'Restaurantes',
      title: 'Carta digital + pedidos por WhatsApp',
      price: 160,
      monthly: 15,
      delivery: 'Lista en 5 días',
      pitch: 'Tus clientes ven la carta en el móvil y el pedido te llega completo al WhatsApp. Sin comisiones por pedido.',
      includes: [
        'Carta online con fotos, precios y alérgenos',
        'Pedidos que llegan directos a tu WhatsApp',
        'Cambias platos y precios tú mismo, desde una hoja de Google',
        'Código QR para mesas y flyers',
        'Zonas de reparto y horarios',
        'Tu propio dominio (.es o .com)',
      ],
      waText: 'Hola, tengo un restaurante y quiero una demo gratis de mi carta online.',
      extra: '',
    },
    {
      id: 'alojamientos',
      href: '/alojamientos',
      label: 'Alojamientos rurales',
      title: 'Web para tu alojamiento',
      price: 205,
      monthly: 15,
      delivery: 'Lista en 10 días',
      pitch: 'Una web que enseña tu casa, tu entorno y cómo llegar, y que convierte visitas en reservas directas por WhatsApp o email.',
      includes: [
        'Hasta 5 secciones: inicio, espacios, entorno, cómo llegar y contacto',
        'Galería de fotos pensada para el móvil',
        'Mapa interactivo para llegar y explorar la zona',
        'Botón de contacto directo por WhatsApp o email',
        'SEO básico: títulos, descripciones y sitemap',
        'Tu propio dominio (.es o .com)',
      ],
      waText: 'Hola, tengo un alojamiento rural y quiero una demo gratis de mi web.',
      extra: '¿Necesitas un sistema de reservas con calendario? Consúltanos y te lo presupuestamos.',
    },
  ],
  monthlyIncludes: 'Alojamiento web, dominio, certificado SSL y cambios pequeños (precios, horarios, fotos). Sin permanencia.',
  navigation: [
    { label: 'Restaurantes', href: '/restaurantes' },
    { label: 'Alojamientos', href: '/alojamientos' },
    { label: 'Proyectos', href: '/proyectos' },
    { label: 'Precios', href: '/servicios#precios' },
    { label: 'Contacto', href: '/contacto' },
  ],
} as const;

export type SiteConfig = typeof site;
export type Pack = (typeof site.packs)[number];

export const launchPrice = (price: number) => Math.round(price * (1 - site.launchOffer.discount / 100));
