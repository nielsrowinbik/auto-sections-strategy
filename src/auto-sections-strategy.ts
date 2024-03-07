import type { HomeAssistant } from 'custom-card-helpers';
import {
  capitalizeFirstLetter,
  isDisabled,
  isSupportedDomain,
} from './lib/utils';

class AutoSectionsStrategy extends HTMLElement {
  static async generate(config, hass: HomeAssistant) {
    // Query all data we need. We will make it available to views by storing it in strategy options.
    const [areas, devices, entities] = await Promise.all([
      hass.callWS({ type: 'config/area_registry/list' }),
      hass.callWS({ type: 'config/device_registry/list' }),
      hass.callWS({ type: 'config/entity_registry/list' }),
    ]);

    return {
      layout: 'sections',
      views: [
        {
          title: 'Home',
          path: 'home',
          icon: 'mdi:home-assistant',
          type: 'sections',
          sections: areas
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((area) => {
              const areaDevices = new Set();

              // Find all devices linked to this area
              for (const device of devices) {
                if (device.area_id === area.area_id) {
                  areaDevices.add(device.id);
                }
              }

              return {
                title: area.name,
                type: 'grid',
                cards: entities.reduce((cards, entity) => {
                  if (isDisabled(entity) || !isSupportedDomain(entity))
                    return cards;

                  if (
                    entity.area_id
                      ? entity.area_id === area.area_id
                      : areaDevices.has(entity.device_id)
                  ) {
                    const name = entity.name ?? entity.original_name;

                    return [
                      ...cards,
                      {
                        type: 'tile',
                        entity: entity.entity_id,
                        name,
                      },
                    ];
                  }

                  return cards;
                }, []),
              };
            }),
        },
      ],
    };
  }
}

customElements.define(
  'll-strategy-dashboard-auto-sections',
  AutoSectionsStrategy
);
