import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HomeAssistant } from 'custom-card-helpers';
import { loadHassContext, shouldRegenerate } from './registry';
import { resetTemplates, renderTemplate } from './templates';

const registries = { entities: {}, devices: {}, areas: {}, floors: {} };

const hass = (overrides: Record<string, unknown> = {}) =>
  ({
    ...registries,
    states: {},
    callWS: vi.fn(async () => []),
    ...overrides,
  }) as unknown as HomeAssistant;

afterEach(() => {
  resetTemplates();
});

describe('loadHassContext', () => {
  it('only refetches when a registry reference changed', async () => {
    const first = hass();

    await loadHassContext(first);
    expect(first.callWS).toHaveBeenCalledTimes(4);

    // Same registries, new `hass` object, as on any state change.
    const unchanged = hass();
    await loadHassContext(unchanged);
    expect(unchanged.callWS).not.toHaveBeenCalled();

    const changed = hass({ areas: {} });
    await loadHassContext(changed);
    expect(changed.callWS).toHaveBeenCalledTimes(4);
  });
});

describe('shouldRegenerate', () => {
  const stateFilter = { filter: { include: [{ state: 'on' }] } };
  const registryFilter = { filter: { include: [{ domain: 'light' }] } };

  it('regenerates when a registry changed', () => {
    expect(
      shouldRegenerate(registryFilter, hass(), hass({ entities: {} }))
    ).toBe(true);
  });

  it('regenerates on a state change when the config depends on state', () => {
    const states = {};

    expect(shouldRegenerate(stateFilter, hass({ states }), hass())).toBe(true);
  });

  it('stays put on a state change the config cannot care about', () => {
    expect(shouldRegenerate(registryFilter, hass({ states: {} }), hass())).toBe(
      false
    );
  });

  it('stays put when nothing at all changed', () => {
    const states = {};

    expect(
      shouldRegenerate(stateFilter, hass({ states }), hass({ states }))
    ).toBe(false);
  });

  it('regenerates when a template pushed a new result', async () => {
    let push: (result: { result: unknown }) => void = () => {};
    const withTemplate = hass({
      connection: {
        subscribeMessage: async (callback: any) => {
          push = callback;
          return async () => {};
        },
      },
    });

    const rendered = renderTemplate(withTemplate, '{{ a }}');
    push({ result: ['light.a'] });
    await rendered;

    const states = {};
    expect(
      shouldRegenerate(registryFilter, hass({ states }), hass({ states }))
    ).toBe(false);

    push({ result: ['light.b'] });

    expect(
      shouldRegenerate(registryFilter, hass({ states }), hass({ states }))
    ).toBe(true);
  });
});
