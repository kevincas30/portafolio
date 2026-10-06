const whatsappNumber = '34625959676';

/** Enlace de WhatsApp con un mensaje ya escrito, para que el cliente solo tenga que enviarlo. */
export const waLink = (text = 'Hola, me gustaría ver una muestra visual para la web de mi negocio.') =>
  `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
export const redesWhatsAppText = 'Hola, necesito contenido para redes y me gustaría consultar opciones y presupuesto.';
export const teamWhatsAppText = 'Hola, me gustaría hablar con vosotros sobre un proyecto para mi negocio.';

export interface TeamMember {
  name: string;
  initial: string;
  specialty: string;
  bio: string;
  /** Ruta a la foto (p. ej. "/equipo/kevs.jpg"). Vacío = se muestra la composición con la inicial. */
  photo?: string;
  photoAlt?: string;
  /** object-position de la foto, para encuadrar sin cortar la cara (p. ej. "center top"). */
  photoPosition?: string;
}

export const site = {
  name: 'Diseño Creativo',
  shortName: 'DC',
  description: 'Diseñamos webs para hoteles y restaurantes que presentan sus servicios, responden dudas y facilitan el contacto.',
  url: import.meta.env.PUBLIC_SITE_URL || '',
  email: import.meta.env.PUBLIC_CONTACT_EMAIL || 'disenocreativo04@gmail.com',
  whatsapp: import.meta.env.PUBLIC_WHATSAPP_URL || waLink(),
  whatsappDisplay: '+34 625 959 676',
  locations: ['España'],
  area: 'Trabajamos en remoto',
  socials: [] as Array<{ label: string; url: string }>,
  form: {
    enabled: false,
    showBudget: true,
    budgetOptions: ['Por definir', 'Quiero orientación', 'Tengo una cifra y la contaré en el mensaje'],
  },
  testimonialsEnabled: false,
  /** Para añadir una foto real: poné la ruta en "photo" (p. ej. "/equipo/kevs.jpg") y un "photoAlt" descriptivo. */
  team: [
    {
      name: 'Kevs',
      initial: 'K',
      specialty: 'Diseño web y para redes',
      bio: 'Doy forma a cómo se presenta tu negocio: desde las pantallas de tu web hasta las piezas que compartes en redes. Cuido que la información se entienda y que todo mantenga una misma identidad.',
      photo: '/equipos/kevs.jpg',
      photoAlt: 'Retrato de Kevs',
      photoPosition: 'center',
    },
    {
      name: 'Gabriel',
      initial: 'G',
      specialty: 'Desarrollo web',
      bio: 'Convierto el diseño en una web que puedas usar en el día a día. Me encargo de que navegar, consultar información y contactar sea sencillo, y de incorporar las funciones que necesite tu negocio.',
      photo: '/equipos/gabriel.jpg',
      photoAlt: 'Retrato de Gabriel',
      photoPosition: 'center',
    },
    {
      name: 'Mar',
      initial: 'M',
      specialty: 'Fotografía',
      bio: 'Me encargo de mostrar lo que hace especial a tu negocio: sus productos, espacios y detalles. Creo fotografías para que tus clientes puedan conocerlo antes de visitarte.',
      photo: '/equipos/mar.jpg',
      photoAlt: 'Retrato de Mar',
      photoPosition: '95% center',
    },
  ] as TeamMember[],
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
      title: 'Web esencial para restaurantes',
      price: 220,
      monthly: 15,
      delivery: 'Lista en 5 días',
      pitch: 'Presenta tu restaurante, tu carta y la información práctica. Si recibes pedidos, pueden enviarte productos y total por WhatsApp.',
      includes: [
        'Carta online con fotos, precios y alérgenos',
        'Contacto por WhatsApp; pedido con productos y total si lo necesitas',
        'Cambias platos y precios tú mismo, desde una hoja de Google',
        'Código QR para mesas y flyers',
        'Horarios, ubicación y, si procede, zonas de reparto',
        'Tu propio dominio (.es o .com)',
      ],
      waText: 'Hola, tengo un restaurante y me gustaría ver una demo de vuestra propuesta para mi web.',
      extra: 'La carta y el contacto están incluidos. Un sistema automático de reservas de mesa o pagos online se presupuesta aparte.',
    },
    {
      id: 'alojamientos',
      href: '/alojamientos',
      label: 'Hoteles',
      title: 'Web esencial para hoteles',
      price: 280,
      monthly: 15,
      delivery: 'Lista en 10 días',
      pitch: 'Presenta las habitaciones, instalaciones y servicios de tu hotel, con información práctica y contacto directo.',
      includes: [
        'Hasta 5 secciones para presentar habitaciones, servicios y contacto',
        'Galería de fotos pensada para el móvil',
        'Mapa interactivo para mostrar cómo llegar',
        'Botón de contacto directo por WhatsApp o email',
        'Preparación básica para buscadores: títulos, descripciones y sitemap',
        'Tu propio dominio (.es o .com)',
      ],
      waText: 'Hola, tengo un hotel y me gustaría ver una demo de vuestra propuesta para mi web.',
      extra: 'El pack incluye contacto directo por WhatsApp o email. Si necesitas un motor de reservas, pagos online o conexión con tu sistema actual, lo presupuestamos aparte.',
    },
  ],
  monthlyIncludes: 'Alojamiento web, certificado SSL y cambios pequeños (precios, horarios, fotos). Sin permanencia.',
  navigation: [
    { label: 'Restaurantes', href: '/restaurantes' },
    { label: 'Hoteles', href: '/alojamientos' },
    { label: 'Proyectos', href: '/proyectos' },
    { label: 'Redes', href: '/servicios/diseno-para-redes' },
    { label: 'Contacto', href: '/contacto' },
  ],
} as const;

export type SiteConfig = typeof site;
export type Pack = (typeof site.packs)[number];

export const launchPrice = (price: number) => Math.round(price * (1 - site.launchOffer.discount / 100));
