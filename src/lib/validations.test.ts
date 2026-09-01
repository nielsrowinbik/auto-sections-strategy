import { describe, expect, it } from 'vitest';
import { configSchema } from './validations';

const base = {
  type: 'custom:auto-sections' as const,
  group_by: 'area.area_id',
};

const grid = (extra: Record<string, unknown> = {}) => ({
  type: 'grid' as const,
  cards: [{ type: 'entity', entity: 'light.kitchen' }],
  ...extra,
});

describe('custom sections', () => {
  it('accepts native grid options and keeps them on the result', () => {
    const config = configSchema.parse({
      ...base,
      sections: {
        top: [
          grid({
            column_span: 3,
            visibility: [{ condition: 'user', users: ['abc'] }],
            background: { color: 'red' },
          }),
        ],
      },
    });

    expect(config.sections?.top?.[0]).toMatchObject({
      column_span: 3,
      visibility: [{ condition: 'user', users: ['abc'] }],
      background: { color: 'red' },
    });
  });

  // The point of the loose schema is to stay in sync with whatever HA adds next,
  // so a key we've never heard of has to survive too.
  it('passes through keys the strategy does not know about', () => {
    const config = configSchema.parse({
      ...base,
      sections: { bottom: [grid({ some_future_option: 'yes' })] },
    });

    expect(config.sections?.bottom?.[0]).toHaveProperty(
      'some_future_option',
      'yes'
    );
  });

  it('still requires type: grid', () => {
    expect(() =>
      configSchema.parse({
        ...base,
        sections: { top: [{ ...grid(), type: 'masonry' }] },
      })
    ).toThrow();
  });

  it('still requires cards', () => {
    expect(() =>
      configSchema.parse({
        ...base,
        sections: { top: [{ type: 'grid' }] },
      })
    ).toThrow();
  });
});

describe('config schema', () => {
  it('rejects unknown top-level options', () => {
    expect(() => configSchema.parse({ ...base, group_bye: 'oops' })).toThrow();
  });

  it('rejects unknown keys under sections', () => {
    expect(() =>
      configSchema.parse({ ...base, sections: { middle: [grid()] } })
    ).toThrow();
  });

  it('applies defaults', () => {
    const config = configSchema.parse(base);

    expect(config.show_ungrouped).toBe(false);
    expect(config.strip_group_name).toBe(true);
    expect(config.sort).toEqual({
      method: 'alphabetical',
      direction: 'ascending',
    });
  });

  it('enforces the max_columns bounds', () => {
    expect(configSchema.parse({ ...base, max_columns: 3 }).max_columns).toBe(3);
    expect(() => configSchema.parse({ ...base, max_columns: 0 })).toThrow();
    expect(() => configSchema.parse({ ...base, max_columns: 11 })).toThrow();
  });

  it('validates the records that changed shape in zod 4', () => {
    const config = configSchema.parse({
      ...base,
      filter: { include: [{ attribute: { device_class: 'door' } }] },
      card_options: { light: { color: 'amber' } },
      sort: {
        method: 'priority',
        direction: 'descending',
        priorities: { kitchen: 1 },
      },
    });

    expect(config.filter?.include?.[0].attribute).toEqual({
      device_class: 'door',
    });
    expect(config.card_options).toEqual({ light: { color: 'amber' } });
    expect(config.sort).toMatchObject({ priorities: { kitchen: 1 } });
  });
});
