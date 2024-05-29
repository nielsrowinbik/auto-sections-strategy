import { LovelaceCardConfig } from 'custom-card-helpers';

export type HassArea = {
  aliases: unknown[];
  area_id: string;
  icon: string | null;
  name: string;
  picture: string | null;
  floor_id: string | null;
};

export type HassEntity = {
  area_id: string | null;
  config_entry_id: string;
  device_id: string | null;
  disabled_by: 'device' | 'integration' | 'user' | null;
  entity_category: unknown | null;
  entity_id: string;
  has_entity_name: boolean;
  hidden_by: 'device' | 'integration' | 'user' | null;
  icon: string | null;
  id: string | null;
  labels: unknown[];
  name: string | null;
  original_name: string;
  platform: string;
  unique_id: string;
};

export type HassDevice = {
  area_id: string | null;
  configuration_url: string | null;
  config_entries: string[];
  name: string;
  name_by_user: string | null;
  id: string;
};

export type HassFloor = {
  aliases: unknown[];
  floor_id: string;
  icon: string | null;
  level: number;
  name: string;
};

export type HassContext = {
  area: HassArea[];
  entity: HassEntity[];
  device: HassDevice[];
  floor: HassFloor[];
};

export type EntityContext = {
  area: HassArea | undefined;
  entity: HassEntity | undefined;
  device: HassDevice | undefined;
  floor: HassFloor | undefined;
};

export type LovelaceViewSection = {
  title?: string;
  type: 'grid';
  cards: LovelaceCardConfig[];
};
