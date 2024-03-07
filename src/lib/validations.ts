import { z } from 'zod';

export const configSchema = z.object({
  type: z.literal('custom:area-sections'),
  domains: z.object({}).partial(),
});
