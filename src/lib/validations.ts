import { z } from 'zod';

const filter = z
  .strictObject({
    domain: z.string(),
    entity_id: z.string(),
    state: z.string(),
  })
  .partial();

export type FilterConfig = z.infer<typeof filter>;

export const configSchema = z.strictObject({
  type: z.literal('custom:auto-sections'),
  group_by: z.enum(['area']),
  filter: z
    .object({
      include: z.array(filter).optional(),
      exclude: z.array(filter).optional(),
    })
    .optional(),
  show_empty: z.boolean().default(false),
  unique: z.boolean().default(false),
  card_options: z.record(z.any()).optional(),
});

export type StrategyConfig = z.infer<typeof configSchema>;
