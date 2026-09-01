import type { HomeAssistant } from 'custom-card-helpers';
import type {
  HassArea,
  HassContext,
  HassDevice,
  HassEntity,
  HassFloor,
} from './types';
import { usesStateFilters } from './filters';
import { templatesDirty } from './templates';

// The registries Home Assistant offers strategies as regeneration signals. It
// swaps the reference on `hass` whenever one of them changes.
export const REGISTRY_DEPENDENCIES = [
  'entities',
  'devices',
  'areas',
  'floors',
] as const;

// Not on the `HomeAssistant` type shipped by custom-card-helpers, and we only
// need their identity, never their contents.
const registryKeys = (hass: HomeAssistant) =>
  REGISTRY_DEPENDENCIES.map(
    (key) => (hass as unknown as Record<string, unknown>)[key]
  );

let cache: { keys: unknown[]; context: HassContext } | undefined;

// The view is regenerated on every state change once a state-dependent filter
// is in play, so four websocket round trips per run is not affordable. The
// registries only change when Home Assistant says they did.
export async function loadHassContext(
  hass: HomeAssistant
): Promise<HassContext> {
  const keys = registryKeys(hass);

  if (cache?.keys.every((key, index) => key === keys[index]))
    return cache.context;

  const [entity, area, device, floor] = await Promise.all([
    hass.callWS<HassEntity[]>({ type: 'config/entity_registry/list' }),
    hass.callWS<HassArea[]>({ type: 'config/area_registry/list' }),
    hass.callWS<HassDevice[]>({ type: 'config/device_registry/list' }),
    hass.callWS<HassFloor[]>({ type: 'config/floor_registry/list' }),
  ]);

  cache = { keys, context: { entity, area, device, floor } };

  return cache.context;
}

export function shouldRegenerate(
  config: unknown,
  oldHass: HomeAssistant,
  newHass: HomeAssistant
): boolean {
  const [oldKeys, newKeys] = [registryKeys(oldHass), registryKeys(newHass)];

  if (oldKeys.some((key, index) => key !== newKeys[index])) return true;
  if (templatesDirty()) return true;

  return oldHass.states !== newHass.states && usesStateFilters(config);
}
