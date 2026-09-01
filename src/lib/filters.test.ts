import { describe, expect, it, vi } from 'vitest';
import type { HomeAssistant } from 'custom-card-helpers';
import type { EntityContext, HassEntity } from './types';
import { filter, resolveFilter, usesStateFilters } from './filters';
import { resetTemplates } from './templates';

const entity = (overrides: Partial<HassEntity> = {}) =>
  ({
    entity_id: 'light.kitchen',
    area_id: 'kitchen',
    device_id: 'device-1',
    hidden_by: null,
    labels: ['downstairs'],
    ...overrides,
  }) as HassEntity;

const context = (overrides: Partial<EntityContext> = {}): EntityContext => ({
  entity: entity(),
  device: undefined,
  area: { area_id: 'kitchen' } as EntityContext['area'],
  floor: { floor_id: 'ground_floor' } as EntityContext['floor'],
  ...overrides,
});

const hass = (
  states: Record<
    string,
    { state?: string; attributes?: Record<string, any> }
  > = {
    'light.kitchen': {},
  }
): HomeAssistant =>
  ({
    states: Object.fromEntries(
      Object.entries(states).map(([entity_id, value]) => [
        entity_id,
        {
          entity_id,
          state: value.state ?? 'on',
          attributes: value.attributes ?? {},
        },
      ])
    ),
  }) as unknown as HomeAssistant;

describe('filter', () => {
  it('matches a single value', () => {
    expect(filter(hass(), { domain: 'light' }, context())).toBe(true);
    expect(filter(hass(), { domain: 'switch' }, context())).toBe(false);
  });

  it('matches any value of a list', () => {
    expect(filter(hass(), { domain: ['switch', 'light'] }, context())).toBe(
      true
    );
    expect(filter(hass(), { domain: ['switch', 'fan'] }, context())).toBe(
      false
    );
  });

  it('takes a list for every scalar filter', () => {
    const ctx = context();

    expect(filter(hass(), { area: ['hallway', 'kitchen'] }, ctx)).toBe(true);
    expect(filter(hass(), { device: ['device-0', 'device-1'] }, ctx)).toBe(
      true
    );
    expect(filter(hass(), { entity_id: ['light.kitchen'] }, ctx)).toBe(true);
    expect(filter(hass(), { floor: ['attic', 'ground_floor'] }, ctx)).toBe(
      true
    );
    expect(filter(hass(), { label: ['upstairs', 'downstairs'] }, ctx)).toBe(
      true
    );
    expect(
      filter(
        hass({ 'light.kitchen': { state: 'off' } }),
        { state: ['on', 'off'] },
        ctx
      )
    ).toBe(true);
  });

  // The keys of one filter have always been an AND, but nobody could tell from
  // the docs, so pin it down.
  it('requires every key of a filter to match', () => {
    const states = hass({
      'binary_sensor.hall': { attributes: { device_class: 'occupancy' } },
    });
    const ctx = context({
      entity: entity({ entity_id: 'binary_sensor.hall' }),
    });

    expect(
      filter(
        states,
        { domain: 'binary_sensor', attribute: { device_class: 'occupancy' } },
        ctx
      )
    ).toBe(true);
    expect(
      filter(
        states,
        { domain: 'binary_sensor', attribute: { device_class: 'motion' } },
        ctx
      )
    ).toBe(false);
    expect(
      filter(
        states,
        { domain: 'light', attribute: { device_class: 'occupancy' } },
        ctx
      )
    ).toBe(false);
  });

  it('ignores an unresolved expand rather than matching nothing', () => {
    expect(filter(hass(), { domain: 'light', expand: true }, context())).toBe(
      true
    );
  });

  it('skips entities without a state', () => {
    expect(filter(hass({}), { domain: 'light' }, context())).toBe(false);
  });
});

describe('resolveFilter', () => {
  const groups = hass({
    'light.accent': { attributes: { entity_id: ['light.a', 'light.b'] } },
    'light.a': {},
    'light.b': {},
  });

  it('normalises a single entity id to a list', async () => {
    await expect(
      resolveFilter(groups, { entity_id: 'light.a' })
    ).resolves.toEqual({
      entity_id: ['light.a'],
    });
  });

  it('leaves the group entity itself in place without expand', async () => {
    await expect(
      resolveFilter(groups, { entity_id: 'light.accent' })
    ).resolves.toEqual({ entity_id: ['light.accent'] });
  });

  it('replaces a group with its members and drops the modifier', async () => {
    await expect(
      resolveFilter(groups, { entity_id: 'light.accent', expand: true })
    ).resolves.toEqual({ entity_id: ['light.a', 'light.b'] });
  });

  it('keeps the other filter keys', async () => {
    await expect(
      resolveFilter(groups, {
        entity_id: 'light.accent',
        expand: true,
        state: 'on',
      })
    ).resolves.toEqual({ entity_id: ['light.a', 'light.b'], state: 'on' });
  });

  it('leaves a filter without entity_id alone', async () => {
    await expect(resolveFilter(groups, { domain: 'light' })).resolves.toEqual({
      domain: 'light',
    });
  });

  it('renders a template and mixes the result with literal ids', async () => {
    const withTemplate = {
      ...groups,
      connection: {
        subscribeMessage: vi.fn(async (callback: any) => {
          callback({ result: ['light.a', 'light.b'] });
          return async () => {};
        }),
      },
    } as unknown as HomeAssistant;

    await expect(
      resolveFilter(withTemplate, { entity_id: ['light.c', '{{ accent }}'] })
    ).resolves.toEqual({ entity_id: ['light.c', 'light.a', 'light.b'] });

    resetTemplates();
  });
});

describe('usesStateFilters', () => {
  const config = (filter: unknown) => ({ filter });

  it('is true for state and attribute filters', () => {
    expect(usesStateFilters(config({ include: [{ state: 'on' }] }))).toBe(true);
    expect(
      usesStateFilters(
        config({ exclude: [{ attribute: { device_class: 'door' } }] })
      )
    ).toBe(true);
  });

  it('is true for expand, because membership lives in the group state', () => {
    expect(
      usesStateFilters(
        config({ include: [{ entity_id: 'group.a', expand: true }] })
      )
    ).toBe(true);
  });

  it('is false for registry-only filters', () => {
    expect(
      usesStateFilters(
        config({ include: [{ domain: 'light' }, { area: 'kitchen' }] })
      )
    ).toBe(false);
    expect(usesStateFilters({})).toBe(false);
  });

  it('errs towards regenerating on a config it cannot read', () => {
    expect(usesStateFilters({ filter: { include: ['nonsense'] } })).toBe(true);
  });
  // Home Assistant flattens `options` before calling `generate`, but not before
  // calling `shouldRegenerate`, and `options` is the documented config shape.
  it('reads the legacy options nesting too', () => {
    expect(
      usesStateFilters({ options: { filter: { include: [{ state: 'on' }] } } })
    ).toBe(true);
    expect(
      usesStateFilters({
        options: { filter: { include: [{ domain: 'light' }] } },
      })
    ).toBe(false);
  });
});
