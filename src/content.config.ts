import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const medium = z.object({
  src: z.string(),
  alt: z.string(),
  caption: z.string().optional(),
  type: z.enum(['image', 'video']).default('image'),
});

const galleryItem = z.object({
  id: z.string(),
  type: z.enum(['placeholder', 'image', 'video']),
  src: z.string(),
  poster: z.string().optional(),
  alt: z.string(),
  caption: z.string(),
  fit: z.enum(['contain', 'cover']),
  position: z.string(),
  placeholderLabel: z.string(),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/projects' }),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    summary: z.string(),
    caseStudy: z.object({
      summary: z.string(),
      services: z.array(z.string()),
      externalLabel: z.string(),
      challengeTitle: z.string(),
      approachTitle: z.string(),
      processTitle: z.string(),
      processSteps: z.array(z.object({ title: z.string(), description: z.string() })).length(5),
      gallery: z.object({
        title: z.string(),
        intro: z.string(),
        items: z.array(galleryItem).length(4),
      }),
      outcomeTitle: z.string(),
      outcomeButtonLabel: z.string(),
    }),
    category: z.enum(['Web', 'Diseño para redes', 'Vídeo']),
    services: z.array(z.string()),
    client: z.string(),
    year: z.string(),
    featured: z.boolean().default(false),
    order: z.number(),
    isDemo: z.boolean().default(true),
    cover: z.string(),
    coverAlt: z.string(),
    homePreviewVideo: z.object({ src: z.string(), alt: z.string(), poster: z.string().optional() }).optional(),
    challenge: z.string(),
    approach: z.string(),
    deliverablesTitle: z.string(),
    deliverables: z.array(z.object({ title: z.string(), description: z.string() })).min(1),
    outcome: z.string(),
    metrics: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
    testimonial: z.object({ quote: z.string(), name: z.string(), company: z.string(), image: z.string().optional(), url: z.url().optional() }).optional(),
    externalUrl: z.url().optional(),
    accentColor: z.string().optional(),
    templateVariant: z.enum(['web', 'social', 'video']),
    video: medium.optional(),
    beforeAfter: z.object({ before: medium, after: medium }).optional(),
  }),
});

export const collections = { projects };
