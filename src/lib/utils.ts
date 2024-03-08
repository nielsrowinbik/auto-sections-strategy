import { HassArea, HassDevice, HassEntity } from './types';

export function capitalizeFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function groupBy(list: any[], key: string) {
  return list.reduce(
    (hash, obj) => ({
      ...hash,
      [obj[key]]: (hash[obj[key]] || []).concat(obj),
    }),
    {}
  );
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
