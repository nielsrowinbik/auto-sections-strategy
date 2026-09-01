import { describe, expect, it } from 'vitest';
import type { HomeAssistant } from 'custom-card-helpers';
import { expandEntityIds } from './groups';

const hass = (
  states: Record<string, { entity_id?: string[] }>
): HomeAssistant =>
  ({
    states: Object.fromEntries(
      Object.entries(states).map(([entity_id, attributes]) => [
        entity_id,
        { entity_id, state: 'on', attributes },
      ])
    ),
  }) as unknown as HomeAssistant;

describe('expandEntityIds', () => {
  it('replaces a group with its members', () => {
    const states = hass({
      'light.accent': { entity_id: ['light.a', 'light.b'] },
      'light.a': {},
      'light.b': {},
    });

    expect(expandEntityIds(states, ['light.accent'])).toEqual([
      'light.a',
      'light.b',
    ]);
  });

  it('flattens nested groups', () => {
    const states = hass({
      'group.all': { entity_id: ['light.accent', 'light.c'] },
      'light.accent': { entity_id: ['light.a', 'light.b'] },
      'light.a': {},
      'light.b': {},
      'light.c': {},
    });

    expect(expandEntityIds(states, ['group.all'])).toEqual([
      'light.a',
      'light.b',
      'light.c',
    ]);
  });

  it('terminates on a group that contains itself', () => {
    const states = hass({
      'group.a': { entity_id: ['group.b'] },
      'group.b': { entity_id: ['group.a', 'light.a'] },
      'light.a': {},
    });

    expect(expandEntityIds(states, ['group.a'])).toEqual(['light.a']);
  });

  it('leaves a plain entity alone', () => {
    expect(expandEntityIds(hass({ 'light.a': {} }), ['light.a'])).toEqual([
      'light.a',
    ]);
  });

  it('keeps an entity it knows nothing about', () => {
    expect(expandEntityIds(hass({}), ['light.a'])).toEqual(['light.a']);
  });

  it('deduplicates members shared between groups', () => {
    const states = hass({
      'group.a': { entity_id: ['light.a'] },
      'group.b': { entity_id: ['light.a', 'light.b'] },
      'light.a': {},
      'light.b': {},
    });

    expect(expandEntityIds(states, ['group.a', 'group.b'])).toEqual([
      'light.a',
      'light.b',
    ]);
  });
});
