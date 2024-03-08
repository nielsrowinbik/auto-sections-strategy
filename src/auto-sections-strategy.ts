import {
  LovelaceViewConfig,
  type HomeAssistant,
  LovelaceCardConfig,
  computeDomain,
} from 'custom-card-helpers';
import { configSchema } from './lib/validations';
import type { HassArea, HassDevice, HassEntity } from './lib/types';
import type { StrategyConfig } from './lib/validations';
import { filter } from './lib/filters';
import { computeName, groupBy, isInArea } from './lib/utils';

class AutoSectionsStrategy extends HTMLTemplateElement {
  static async generate(
    config: StrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    configSchema.parse(config);

    const entities = await hass.callWS<HassEntity[]>({
      type: 'config/entity_registry/list',
    });

    const filtered = entities
      // Apply `include` filters:
      .filter((entity) => {
        return config.filter?.include
          ?.map((userFilter) => {
            return filter(hass, userFilter, entity.entity_id);
          })
          .some((val) => val === true);
      })
      // Apply `exclude` filters:
      .filter((entity) => {
        return config.filter?.exclude
          ?.map((userFilter) => {
            return filter(hass, userFilter, entity.entity_id);
          })
          .some((val) => val === false);
      });

    // TODO: Clean up the mess below here...
    if (config.group_by === 'area') {
      const [areas, devices] = await Promise.all([
        hass.callWS<HassArea[]>({
          type: 'config/area_registry/list',
        }),
        hass.callWS<HassDevice[]>({ type: 'config/device_registry/list' }),
      ]);

      return {
        // @ts-expect-error
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

            const cards = filtered.reduce<LovelaceCardConfig[]>(
              (result, entity) => {
                if (!isInArea(entity, area, areaDevices)) return result;

                const entityId = entity.entity_id;
                const domain = computeDomain(entityId);

                const generalCardConfig = config.card_options?.['_'] ?? {};
                const domainCardConfig = config.card_options?.[domain] ?? {};
                const entityCardConfig = config.card_options?.[entityId] ?? {};

                return [
                  ...result,
                  {
                    type: 'tile',
                    name: computeName(entity, area.name),
                    ...generalCardConfig,
                    ...domainCardConfig,
                    ...entityCardConfig,
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
      };
    }

    return {};
  }
}

customElements.define('ll-strategy-view-auto-sections', AutoSectionsStrategy);
