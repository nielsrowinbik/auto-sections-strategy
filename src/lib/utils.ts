import { computeDomain } from 'custom-card-helpers';

export function capitalizeFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function isDisabled(entity: any) {
  return entity.disabled_by !== null;
}

const SUPPORTED_DOMAINS = ['climate', 'light', 'media_player'];

export function isSupportedDomain(entity: any) {
  return SUPPORTED_DOMAINS.includes(computeDomain(entity.entity_id));
}
