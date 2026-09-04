import { z, defineCollection } from 'astro:content';

const imageSchema = z.object({
  src: z.string().startsWith('/'),
  alt: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

const videoSchema = z.object({
  youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  title: z.string().min(1),
  description: z.string().min(1),
  uploadDate: z.string().datetime({ offset: true }),
  duration: z.string().regex(/^PT(?:(?:\d+)H)?(?:(?:\d+)M)?(?:(?:\d+)S)?$/),
  thumbnail: imageSchema,
});

const posts = defineCollection({
  type: 'content',
  schema: z
    .object({
      title: z.string(),
      date: z.coerce.date(),
      updated: z.coerce.date().optional(),
      draft: z.boolean().default(false),
      tags: z.array(z.string()).default([]),
      toc: z.boolean().default(false),
      description: z.string().min(1),
      image: imageSchema.optional(),
      takeaways: z.array(z.string().min(1)).default([]),
      videos: z.array(videoSchema).default([]),
    })
    .superRefine((post, context) => {
      if (post.updated && post.updated < post.date) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['updated'],
          message: 'Updated date must not precede publication date',
        });
      }

      if (post.draft) return;

      if (!post.image && post.videos.length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['image'],
          message: 'Published posts need an image or a video thumbnail',
        });
      }

      if (post.videos.length > 0 && (post.takeaways.length < 2 || post.takeaways.length > 5)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['takeaways'],
          message: 'Published video posts need between two and five takeaways',
        });
      }
    }),
});

export const collections = { posts };
