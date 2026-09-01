import type { HomeAssistant } from 'custom-card-helpers';

// Grouping entities list their members in an `entity_id` attribute regardless of
// the domain they live in: old-style `group.*` groups, the light/switch/cover
// group helpers, Sonos speaker groups. Resolving by attribute rather than by
// domain is what makes this work for all of them.
export function expandEntityIds(
  hass: HomeAssistant,
  entityIds: string[]
): string[] {
  const expanded: string[] = [];
  const seen = new Set<string>();

  function walk(entityId: string) {
    // Doubles as cycle protection: a group that contains itself terminates here.
    if (seen.has(entityId)) return;
    seen.add(entityId);

    const members = hass.states[entityId]?.attributes.entity_id;

    // Not a group, so keep the entity itself. A group is replaced by its
    // members, the way Home Assistant's own `expand()` template function does it.
    if (!Array.isArray(members)) {
      expanded.push(entityId);
      return;
    }

    members.forEach(walk);
  }

  entityIds.forEach(walk);

  return expanded;
}
