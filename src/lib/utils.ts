import { computeDomain } from 'custom-card-helpers';
import type { LovelaceCardConfig } from 'custom-card-helpers';
import type {
  EntityContext,
  HassArea,
  HassContext,
  HassDevice,
  HassEntity,
  HassFloor,
} from './types';
import type { StrategyConfig } from './validations';
import { get } from 'lodash-es';

export function capitalizeFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Entities tend to be named "<group> <thing>" or "<thing> <group>", so only strip
// at the edges: a match in the middle is part of the name itself ("Kitchen Island
// Kitchen Timer" should keep its island).
function stripName(name: string, strip: string) {
  const lower = name.toLowerCase();
  const target = strip.toLowerCase();

  let stripped = name;

  if (lower.startsWith(target)) stripped = name.slice(strip.length);
  else if (lower.endsWith(target))
    stripped = name.slice(0, name.length - strip.length);

  stripped = stripped.replace(/^[\s\-\u2013:]+|[\s\-\u2013:]+$/g, '');

  // The name was nothing but the group name, so a nameless card is all we'd have left.
  return stripped || name;
}

export function computeName(
  entity: HassEntity,
  device: HassDevice | undefined,
  strip?: string
) {
  const entityName =
    entity.name ?? entity.original_name ?? device?.name_by_user ?? device?.name;

  if (!entityName) return '';

  return capitalizeFirstLetter(strip ? stripName(entityName, strip) : entityName);
}

export function generateCards(
  entities: HassEntity[],
  config: StrategyConfig,
  context: HassContext
): LovelaceCardConfig[] {
  const { card_options } = config;

  return entities
    .map((entity) => {
      const { entity_id } = entity;
      const domain = computeDomain(entity_id);
      const entityContext = computeEntityContext(entity_id, context);

      const groupKey = config.strip_group_name
        ? computeGroupKey(entityContext, config.group_by)
        : undefined;
      // Strip the group's displayed name, not its key: the key is usually a slug
      // that never appears in an entity's name.
      const strip = groupKey
        ? computeSectionTitle(groupKey, config.group_name, context)
        : undefined;

      const generalCardConfig = card_options?.['_'] ?? {};
      const domainCardConfig = card_options?.[domain] ?? {};
      const entityCardConfig = card_options?.[entity_id] ?? {};

      return {
        type: 'tile',
        name: computeName(entity, entityContext.device, strip),
        ...generalCardConfig,
        ...domainCardConfig,
        ...entityCardConfig,
        entity: entity.entity_id,
      };
    })
    .sort(byKey('name'));
}

export function byKey(
  key: string,
  direction: 'ascending' | 'descending' = 'ascending'
) {
  return function sort(a: Record<string, any>, b: Record<string, any>) {
    if (direction === 'ascending')
      return (a[key] as string).localeCompare(b[key]);
    return (b[key] as string).localeCompare(a[key]);
  };
}

export function findEntity(allEntities: HassEntity[], entityId: string) {
  return allEntities.find((obj) => obj.entity_id === entityId);
}

export function findDevice(
  allDevices: HassDevice[],
  deviceId: string | null | undefined
) {
  return allDevices.find((obj) => obj.id === deviceId);
}

export function findArea(
  allAreas: HassArea[],
  areaId: string | null | undefined
) {
  return allAreas.find((obj) => obj.area_id === areaId);
}

export function findFloor(
  allFloors: HassFloor[],
  floorId: string | null | undefined
) {
  return allFloors.find((obj) => obj.floor_id === floorId);
}

export function computeSectionTitle(
  sectionKey: string,
  config: StrategyConfig['group_name'],
  context: HassContext
): string {
  if (!config) return sectionKey;

  const [domain, rest] = config.split('.');
  const [key, field] = rest.split('|');
  const ctx = get(context, domain);
  const title = ctx.find((obj: any) => obj[key] === sectionKey)?.[field];

  return title ?? sectionKey;
}

export function computeGroupKey(
  context: EntityContext,
  group_by: StrategyConfig['group_by']
): string | null | undefined {
  if (typeof group_by === 'string') return get(context, group_by);

  return group_by
    .map((option) => get(context, option))
    .filter((option) => !!option)[0];
}

export function computeEntityContext(
  entity_id: string,
  context: HassContext
): EntityContext {
  const entity = findEntity(context.entity, entity_id);
  const device = findDevice(context.device, entity?.device_id);
  const area = findArea(context.area, entity?.area_id ?? device?.area_id);
  const floor = findFloor(context.floor, area?.floor_id);

  return {
    entity,
    device,
    area,
    floor,
  };
}
