import { HomeAssistant } from 'custom-card-helpers';
import { FilterConfig } from './validations';
import type { HassEntity } from 'home-assistant-js-websocket';

function match(pattern: any, value: any) {
  return pattern === value;
}

type Filters = {
  [K in keyof Required<FilterConfig>]: (
    hass: HomeAssistant,
    value: any,
    entity: HassEntity
  ) => boolean;
};

const filters: Filters = {
  domain: (_, value, entity) => match(value, entity.entity_id.split('.')[0]),
  entity_id: (_, value, entity) => match(value, entity.entity_id),
  state: (_, value, entity) => match(value, entity.state),
};

export function filter(
  hass: HomeAssistant,
  config: FilterConfig,
  entity_id: string
): boolean {
  if (!hass.states[entity_id]) return false;

  return Object.entries(config)
    .map(([filter, value]) => {
      return filters[filter]?.(hass, value, hass.states[entity_id]);
    })
    .every((res) => res === true);
}
