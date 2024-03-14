import { computeDomain } from 'custom-card-helpers';
import type { LovelaceCardConfig } from 'custom-card-helpers';
import { HassArea, HassContext, HassDevice, HassEntity } from './types';
import type { StrategyConfig } from './validations';
import get from 'lodash.get';

export function capitalizeFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function computeName(entity: HassEntity, areaName: string) {
  const entityName = entity.name ?? entity.original_name;

  if (!entityName) return '';

  return capitalizeFirstLetter(entityName.replace(areaName, '').trim());
}

export function generateCards(
  entities: HassEntity[],
  card_options: StrategyConfig['card_options'],
  context: HassContext
): LovelaceCardConfig[] {
  return entities.map((entity) => {
    const { entity_id } = entity;
    const domain = computeDomain(entity_id);
    const device = findDevice(context.device, entity!.device_id);
    const area = findArea(context.area, entity!.area_id ?? device?.area_id);

    const generalCardConfig = card_options?.['_'] ?? {};
    const domainCardConfig = card_options?.[domain] ?? {};
    const entityCardConfig = card_options?.[entity_id] ?? {};

    return {
      type: 'tile',
      name: computeName(entity, area?.name ?? ''),
      ...generalCardConfig,
      ...domainCardConfig,
      ...entityCardConfig,
      entity: entity.entity_id,
    };
  });
}

export function byKey(key: string) {
  return function sort(a: any, b: any) {
    return a[key].localeCompare(b[key]);
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

export function computeSectionTitle(
  sectionKey: string,
  config: StrategyConfig['group_name'],
  context: {
    area: HassArea[];
    device: HassDevice[];
    entity: HassEntity[];
  }
): string {
  if (!config) return sectionKey;

  const [domain, rest] = config.split('.');
  const [key, field] = rest.split('|');
  const ctx = get(context, domain);
  const title = ctx.find((obj: any) => obj[key] === sectionKey)[field];

  return title ?? sectionKey;
}
