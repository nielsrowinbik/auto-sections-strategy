import { describe, expect, it } from 'vitest';
import { computeGroupKey, computeName, generateCards } from './utils';
import type { HassContext, HassEntity } from './types';
import { configSchema } from './validations';

const entity = (overrides: Partial<HassEntity> = {}) =>
  ({
    entity_id: 'light.kitchen_lights',
    area_id: 'kitchen',
    device_id: null,
    name: null,
    original_name: 'Kitchen lights',
    ...overrides,
  }) as HassEntity;

const context: HassContext = {
  entity: [entity()],
  area: [
    {
      area_id: 'kitchen',
      name: 'Kitchen',
      floor_id: 'ground_floor',
      aliases: [],
      icon: null,
      picture: null,
    },
  ],
  device: [],
  floor: [
    {
      floor_id: 'ground_floor',
      name: 'Ground floor',
      aliases: [],
      icon: null,
      level: 0,
    },
  ],
};

function contextFor() {
  return {
    entity: entity(),
    device: undefined,
    area: context.area[0],
    floor: context.floor[0],
  };
}

const config = (overrides: Record<string, unknown> = {}) =>
  configSchema.parse({
    type: 'custom:auto-sections',
    group_by: 'area.area_id',
    group_name: 'area.area_id|name',
    ...overrides,
  });

describe('computeName', () => {
  it('strips the group name from the start', () => {
    expect(computeName(entity(), undefined, 'Kitchen')).toBe('Lights');
  });

  it('strips the group name from the end', () => {
    expect(
      computeName(entity({ original_name: 'Lights kitchen' }), undefined, 'Kitchen')
    ).toBe('Lights');
  });

  it('matches case-insensitively', () => {
    expect(
      computeName(entity({ original_name: 'kitchen lights' }), undefined, 'Kitchen')
    ).toBe('Lights');
  });

  it('leaves a match in the middle of the name alone', () => {
    expect(
      computeName(
        entity({ original_name: 'Kitchen island kitchen timer' }),
        undefined,
        'Kitchen'
      )
    ).toBe('Island kitchen timer');
  });

  it('keeps the full name when stripping would leave nothing', () => {
    expect(
      computeName(entity({ original_name: 'Kitchen' }), undefined, 'Kitchen')
    ).toBe('Kitchen');
  });

  it('trims separators left behind by stripping', () => {
    expect(
      computeName(entity({ original_name: 'Kitchen - lights' }), undefined, 'Kitchen')
    ).toBe('Lights');
  });

  it('leaves the name untouched without a string to strip', () => {
    expect(computeName(entity(), undefined)).toBe('Kitchen lights');
  });

  it('falls back to the device name', () => {
    expect(
      computeName(
        entity({ original_name: null as unknown as string }),
        { id: 'a', name: 'Kitchen lights', name_by_user: null, area_id: null, config_entries: [], configuration_url: null },
        'Kitchen'
      )
    ).toBe('Lights');
  });
});

describe('computeGroupKey', () => {
  it('resolves a single path', () => {
    expect(computeGroupKey(contextFor(), 'area.area_id')).toBe('kitchen');
  });

  it('takes the first non-empty path of an array', () => {
    expect(
      computeGroupKey(contextFor(), ['entity.area_id', 'device.area_id'])
    ).toBe('kitchen');
    expect(
      computeGroupKey({ ...contextFor(), entity: entity({ area_id: null }) }, [
        'entity.area_id',
        'area.area_id',
      ])
    ).toBe('kitchen');
  });
});

describe('generateCards', () => {
  it('strips the group name by default', () => {
    expect(generateCards([entity()], config(), context)[0].name).toBe('Lights');
  });

  it('keeps the full name when strip_group_name is false', () => {
    expect(
      generateCards([entity()], config({ strip_group_name: false }), context)[0].name
    ).toBe('Kitchen lights');
  });

  it('strips the group name when grouping by floor, not the area name', () => {
    const cards = generateCards(
      [entity({ original_name: 'Ground floor kitchen lights' })],
      config({ group_by: 'floor.floor_id', group_name: 'floor.floor_id|name' }),
      context
    );

    expect(cards[0].name).toBe('Kitchen lights');
  });
});
