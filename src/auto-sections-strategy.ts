import type {
  LovelaceViewConfig,
  HomeAssistant,
  LovelaceCardConfig,
} from 'custom-card-helpers';
import { configSchema } from './lib/validations';
import type {
  HassArea,
  HassContext,
  HassDevice,
  HassEntity,
  LovelaceViewSection,
} from './lib/types';
import type { StrategyConfig } from './lib/validations';
import { filter } from './lib/filters';
import {
  byKey,
  computeEntityContext,
  computeSectionTitle,
  findArea,
  findDevice,
  findEntity,
  generateCards,
} from './lib/utils';
import get from 'lodash.get';
import { version } from '../package.json';

class AutoSectionsStrategy extends HTMLTemplateElement {
  static async generate(
    config: StrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    configSchema.parse(config);

    const [allEntities, allAreas, allDevices] = await Promise.all([
      hass.callWS<HassEntity[]>({ type: 'config/entity_registry/list' }),
      hass.callWS<HassArea[]>({ type: 'config/area_registry/list' }),
      hass.callWS<HassDevice[]>({ type: 'config/device_registry/list' }),
    ]);

    const hassContext: HassContext = {
      entity: allEntities,
      area: allAreas,
      device: allDevices,
    };

    const entities = allEntities
      // Apply `include` filters:
      .filter((entity) => {
        const context = computeEntityContext(entity.entity_id, hassContext);

        return (
          config.filter?.include
            ?.map((userFilter) => filter(hass, userFilter, context))
            .some((val) => val === true) ?? false
        );
      })
      // Apply `exclude` filters:
      .filter((entity) => {
        const context = computeEntityContext(entity.entity_id, hassContext);

        return (
          !config.filter?.exclude
            ?.map((userFilter) => filter(hass, userFilter, context))
            .some((val) => val === true) ?? true
        );
      });

    const cards = generateCards(entities, config.card_options, hassContext);

    const { group_by } = config;

    // @ts-expect-error
    const grouped: Record<string, LovelaceCardConfig[]> = Object.groupBy(
      cards,
      (card: LovelaceCardConfig) => {
        const context = computeEntityContext(card.entity, hassContext);

        if (typeof group_by === 'string') return get(context, group_by);

        return group_by
          .map((option) => get(context, option))
          .filter((option) => !!option)[0];
      }
    );

    const sections = Object.entries(grouped)
      .reduce<LovelaceViewSection[]>((sections, [key, cards]) => {
        if (key === 'undefined' || key === 'null') return sections;

        return [
          ...sections,
          {
            title: computeSectionTitle(key, config.group_name, hassContext),
            type: 'grid',
            cards,
          },
        ];
      }, [])
      .sort(byKey('title'));

    if (sections.length === 0)
      console.warn(
        'Auto Sections Strategy rendered an empty view. Please check your configuration.'
      );

    return {
      // @ts-expect-error
      type: 'sections',
      max_columns: config.max_columns ?? 4,
      sections,
    };
  }
}

customElements.define('ll-strategy-view-auto-sections', AutoSectionsStrategy);

console.info(
  '%c Auto Sections Strategy %c v'.concat(version, ' '),
  'color: white; background: coral; font-weight: 700;',
  'color: coral; background: white; font-weight: 700;'
);
