import { HomeAssistant, computeDomain } from 'custom-card-helpers';
import { FilterConfig } from './validations';
import type { HassEntity } from './types';

type Filters = {
  [K in keyof Required<FilterConfig>]: (
    hass: HomeAssistant,
    value: any,
    entity: HassEntity
  ) => boolean;
};

const filters: Filters = {
  device: (_, value, { device_id }) => value === device_id,
  domain: (_, value, { entity_id }) => value === computeDomain(entity_id),
  entity_id: (_, value, { entity_id }) => value === entity_id,
  hidden: (_, value, { hidden_by }) => value === (hidden_by !== null),
  state: ({ states }, value, { entity_id }) =>
    value === states[entity_id].state,
};

export function filter(
  hass: HomeAssistant,
  config: FilterConfig,
  entity: HassEntity
): boolean {
  const { entity_id } = entity;

  if (!hass.states[entity_id]) return false;

  return Object.entries(config)
    .map(([filter, value]) => {
      return filters[filter]?.(hass, value, entity);
    })
    .every((res) => res === true);
}
