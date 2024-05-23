import { z } from 'zod';

const filter = z
  .strictObject({
    area: z.string(),
    device: z.string(),
    domain: z.string(),
    entity_id: z.string(),
    hidden: z.boolean(),
    state: z.string(),
  })
  .partial();

export type FilterConfig = z.infer<typeof filter>;

export const configSchema = z.strictObject({
  type: z.union([
    z.literal('custom:auto-sections'),
    z.literal('custom:auto-sections-dev'),
  ]),
  max_columns: z.number().min(1).max(10).optional(),
  group_by: z.union([z.string(), z.array(z.string())]),
  group_name: z.string().optional(),
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
