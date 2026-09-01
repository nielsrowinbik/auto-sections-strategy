// zod/mini rather than zod: same validation, functional API, a fraction of the
// bundle. This file ships to browsers as part of the dashboard resource.
import * as z from 'zod/mini';

const filter = z.partial(
  z.strictObject({
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
);

export type FilterConfig = z.infer<typeof filter>;

// Loose rather than strict: the shape belongs to Home Assistant, not to us, so
// any other property of a native grid section (`column_span`, `visibility`,
// `background`, ...) is accepted and passed through untouched.
const section = z.looseObject({
  title: z.optional(z.string()),
  type: z.literal('grid'),
  cards: z.array(z.any()),
});

const direction = z._default(
  z.union([z.literal('ascending'), z.literal('descending')]),
  'ascending'
);

export const configSchema = z.strictObject({
  type: z.union([
    z.literal('custom:auto-sections'),
    z.literal('custom:auto-sections-dev'),
  ]),
  max_columns: z.optional(z.number().check(z.minimum(1), z.maximum(10))),
  group_by: z.union([z.string(), z.array(z.string())]),
  group_name: z.optional(z.string()),
  filter: z.optional(
    z.object({
      include: z.optional(z.array(filter)),
      exclude: z.optional(z.array(filter)),
    })
  ),
  show_ungrouped: z._default(z.union([z.literal(false), z.string()]), false),
  sort: z._default(
    z.union([
      z.strictObject({
        method: z.literal('alphabetical'),
        direction,
      }),
      z.strictObject({
        method: z.literal('priority'),
        direction,
        priorities: z.record(z.string(), z.number()),
      }),
    ]),
    { method: 'alphabetical', direction: 'ascending' }
  ),
  card_options: z.optional(z.record(z.string(), z.any())),
  badges: z.optional(z.array(z.any())),
  sections: z.optional(
    z.partial(
      z.strictObject({
        top: z.array(section),
        bottom: z.array(section),
      })
    )
  ),
});

export type StrategyConfig = z.infer<typeof configSchema>;
