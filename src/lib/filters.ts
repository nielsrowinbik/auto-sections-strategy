import { HomeAssistant, computeDomain } from 'custom-card-helpers';
import { FilterConfig } from './validations';
import type { EntityContext } from './types';
import { expandEntityIds } from './groups';
import { hasTemplate, renderTemplate } from './templates';

// `expand` changes how `entity_id` is resolved before filtering starts, so it
// has no predicate of its own.
type PredicateKey = Exclude<keyof Required<FilterConfig>, 'expand'>;

type Filters = {
  [K in PredicateKey]: (
    hass: HomeAssistant,
    value: any,
    context: EntityContext
  ) => boolean;
};

function toArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

const matches = (value: unknown, actual: unknown) =>
  toArray(value).includes(actual);

const filters: Filters = {
  area: (_, value, { area }) => matches(value, area?.area_id),
  device: (_, value, { entity }) => matches(value, entity!.device_id),
  attribute: (hass, value, { entity }) =>
    Object.entries(value).every(
      ([key, val]) => hass.states[entity!.entity_id].attributes[key] === val
    ),
  domain: (_, value, { entity }) =>
    matches(value, computeDomain(entity!.entity_id)),
  entity_id: (_, value, { entity }) => matches(value, entity!.entity_id),
  floor: (_, value, { floor }) => matches(value, floor?.floor_id),
  hidden: (_, value, { entity }) => value === (entity!.hidden_by !== null),
  state: ({ states }, value, { entity }) =>
    matches(value, states[entity!.entity_id].state),
  label: (_, value, { entity }) =>
    toArray(value).some((label) => entity!.labels.includes(label)),
};

export function filter(
  hass: HomeAssistant,
  config: FilterConfig,
  context: EntityContext
): boolean {
  if (!context.entity || !hass.states[context.entity.entity_id]) return false;

  return (
    Object.entries(config)
      // `resolveFilter` already consumed `expand`; without this a caller passing
      // an unresolved filter would silently match nothing.
      .filter(([key]) => key !== 'expand')
      .map(([filter, value]) => {
        return filters[filter as PredicateKey]?.(hass, value, context);
      })
      .every((res) => res === true)
  );
}

// Templates and groups can only be resolved by asking Home Assistant, while
// `filter` is synchronous and runs once per entity. So both are resolved up
// front, leaving a filter whose `entity_id` is a plain list of entity ids.
export async function resolveFilter(
  hass: HomeAssistant,
  config: FilterConfig
): Promise<FilterConfig> {
  const { expand, entity_id, ...rest } = config;

  if (entity_id === undefined) return rest;

  const entityIds = (
    await Promise.all(
      toArray(entity_id).map((value) =>
        hasTemplate(value) ? renderTemplate(hass, value) : [value]
      )
    )
  ).flat();

  return {
    ...rest,
    entity_id: expand ? expandEntityIds(hass, entityIds) : entityIds,
  };
}

// Filters whose result depends on entity state rather than on the registries.
const STATE_DEPENDENT: string[] = ['state', 'attribute'];

// Runs on every `hass` update, so it reads the raw config instead of parsing
// it. Anything unexpected means "regenerate": a stale view is worse than an
// extra render.
export function usesStateFilters(config: any): boolean {
  try {
    return [
      ...(config?.filter?.include ?? []),
      ...(config?.filter?.exclude ?? []),
    ].some(
      // Group membership lives in the group entity's attributes, so `expand`
      // is state-dependent too.
      (filter) =>
        filter?.expand === true || STATE_DEPENDENT.some((key) => key in filter)
    );
  } catch {
    return true;
  }
}
