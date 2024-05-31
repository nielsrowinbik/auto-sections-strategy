import { HomeAssistant, computeDomain } from 'custom-card-helpers';
import { FilterConfig } from './validations';
import type { EntityContext } from './types';

type Filters = {
  [K in keyof Required<FilterConfig>]: (
    hass: HomeAssistant,
    value: any,
    context: EntityContext
  ) => boolean;
};

const filters: Filters = {
  area: (_, value, { area }) => value === area?.area_id,
  device: (_, value, { entity }) => value === entity!.device_id,
  attribute: (hass, value, { entity }) =>
    Object.entries(value).every(
      ([key, val]) => hass.states[entity!.entity_id].attributes[key] === val
    ),
  domain: (_, value, { entity }) => value === computeDomain(entity!.entity_id),
  entity_id: (_, value, { entity }) => value === entity!.entity_id,
  floor: (_, value, { floor }) => value === floor?.floor_id,
  hidden: (_, value, { entity }) => value === (entity!.hidden_by !== null),
  state: ({ states }, value, { entity }) =>
    value === states[entity!.entity_id].state,
};

export function filter(
  hass: HomeAssistant,
  config: FilterConfig,
  context: EntityContext
): boolean {
  if (!context.entity || !hass.states[context.entity.entity_id]) return false;

  return Object.entries(config)
    .map(([filter, value]) => {
      return filters[filter]?.(hass, value, context);
    })
    .every((res) => res === true);
}
