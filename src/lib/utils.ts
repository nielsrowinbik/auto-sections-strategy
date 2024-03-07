import { computeDomain } from 'custom-card-helpers';
import { HassArea, HassDevice, HassEntity } from './types';
import { defaultConfig } from '../const';

export function capitalizeFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function isDisabled(entity: HassEntity): boolean {
  return entity.disabled_by !== null;
}

export function isEnabledDomain(
  entity: HassEntity,
  config: typeof defaultConfig
): boolean {
  const domain = computeDomain(entity.entity_id);
  return config.domains[domain]?.hidden === false;
}

export function isInArea(
  entity: HassEntity,
  area: HassArea,
  areaDevices?: HassDevice['id'][]
): boolean {
  if (entity.area_id && entity.area_id === area.area_id) return true;
  if (entity.device_id && areaDevices?.includes(entity.device_id)) return true;
  return false;
}

export function computeName(entity: HassEntity, areaName: string) {
  const entityName = entity.name ?? entity.original_name;

  if (!entityName) return '';

  return capitalizeFirstLetter(entityName.replace(areaName, '').trim());
}
