import { z } from 'zod';

const filter = z
  .strictObject({
    area: z.string(),
    attribute: z.record(z.string(), z.string()),
    device: z.string(),
    domain: z.string(),
    entity_id: z.string(),
    floor: z.string(),
    hidden: z.boolean(),
    state: z.string(),
    label: z.string(),
  })
  .partial();

export type FilterConfig = z.infer<typeof filter>;

// Loose rather than strict: the shape belongs to Home Assistant, not to us, so
// any other property of a native grid section (`column_span`, `visibility`,
// `background`, ...) is accepted and passed through untouched.
const section = z.looseObject({
  title: z.string().optional(),
  type: z.literal('grid'),
  cards: z.array(z.any()),
});

const direction = z
  .union([z.literal('ascending'), z.literal('descending')])
  .default('ascending');

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
  show_ungrouped: z.union([z.literal(false), z.string()]).default(false),
  sort: z
    .union([
      z.strictObject({
        method: z.literal('alphabetical'),
        direction,
      }),
      z.strictObject({
        method: z.literal('priority'),
        direction,
        priorities: z.record(z.string(), z.number()),
      }),
    ])
    .default({ method: 'alphabetical', direction: 'ascending' }),
  card_options: z.record(z.string(), z.any()).optional(),
  badges: z.array(z.any()).optional(),
  sections: z
    .strictObject({
      top: z.array(section),
      bottom: z.array(section),
    })
    .partial()
    .optional(),
});

export type StrategyConfig = z.infer<typeof configSchema>;
