import {
  computeDomain,
  type HomeAssistant,
  type LovelaceCardConfig,
  type LovelaceConfig,
} from 'custom-card-helpers';
import {
  computeName,
  isDisabled,
  isEnabledDomain,
  isInArea,
} from './lib/utils';
import { configSchema } from './lib/validations';
import type { HassArea, HassDevice, HassEntity } from './lib/types';
import { defaultConfig, type StrategyConfig } from './const';
import { mergician } from 'mergician';

class AreaSectionsStrategy extends HTMLTemplateElement {
  static async generate(
    userConfig: StrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceConfig> {
    // Validate user-defined configuration:
    configSchema.parse(userConfig);

    // Merge user-defined configuration with default configuration:
    const config = mergician(defaultConfig, userConfig) as StrategyConfig;

    // Query all data we need:
    const [areas, devices, entities] = await Promise.all([
      hass.callWS<HassArea[]>({ type: 'config/area_registry/list' }),
      hass.callWS<HassDevice[]>({ type: 'config/device_registry/list' }),
      hass.callWS<HassEntity[]>({ type: 'config/entity_registry/list' }),
    ]);

    // Build the dashboard:
    return {
      layout: 'sections',
      views: [
        {
          title: 'Home',
          path: 'home',
          icon: 'mdi:home-assistant',
          // @ts-expect-error Field `type` is not in the type definitions yet but it's definitely supported
          type: 'sections',
          sections: areas
            .sort((a, b) => a.name.localeCompare(b.name))
            // FIXME: Explicit any
            .reduce<any>((result, area) => {
              const areaDevices = devices.reduce<string[]>((result, device) => {
                if (device.area_id === area.area_id)
                  return [...result, device.id];
                return result;
              }, []);

              const cards = entities.reduce<LovelaceCardConfig[]>(
                (result, entity) => {
                  if (
                    isDisabled(entity) ||
                    !isEnabledDomain(entity, config) ||
                    !isInArea(entity, area, areaDevices)
                  )
                    return result;

                  return [
                    ...result,
                    {
                      name: computeName(entity, area.name),
                      ...config.domains[computeDomain(entity.entity_id)]?.card,
                      entity: entity.entity_id,
                    },
                  ];
                },
                []
              );

              if (cards.length === 0) return result;

              return [
                ...result,
                {
                  title: area.name,
                  type: 'grid',
                  cards,
                },
              ];
            }, []),
        },
      ],
    };
  }
}

customElements.define(
  'll-strategy-dashboard-area-sections',
  AreaSectionsStrategy
);
