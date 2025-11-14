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
  HassFloor,
  LovelaceViewSection,
} from './lib/types';
import type { StrategyConfig } from './lib/validations';
import { filter } from './lib/filters';
import {
  computeEntityContext,
  computeSectionTitle,
  generateCards,
} from './lib/utils';
import get from 'lodash.get';
import { sort } from './lib/sorts';

class AutoSectionsStrategy extends HTMLTemplateElement {
  static async generate(
    userConfig: StrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const config = configSchema.parse(userConfig);

    const [allEntities, allAreas, allDevices, allFloors] = await Promise.all([
      hass.callWS<HassEntity[]>({ type: 'config/entity_registry/list' }),
      hass.callWS<HassArea[]>({ type: 'config/area_registry/list' }),
      hass.callWS<HassDevice[]>({ type: 'config/device_registry/list' }),
      hass.callWS<HassFloor[]>({ type: 'config/floor_registry/list' }),
    ]);

    const hassContext: HassContext = {
      entity: allEntities,
      area: allAreas,
      device: allDevices,
      floor: allFloors,
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
            .some((val) => val === true)
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

    const { method, direction, ...options } = config.sort;

    const sections = Object.entries(grouped)
      .sort(sort(method, direction, options))
      .reduce<LovelaceViewSection[]>((sections, [key, cards]) => {
        if (key === 'undefined' || key === 'null') {
          if (config.show_ungrouped === false) return sections;

          return [
            ...sections,
            {
              title: config.show_ungrouped,
              type: 'grid',
              cards: [
                {
                  type: 'heading',
                  heading: config.show_ungrouped,
                  heading_style: 'title',
                },
                ...cards,
              ],
            },
          ];
        }

        return [
          ...sections,
          {
            title: computeSectionTitle(key, config.group_name, hassContext),
            type: 'grid',
            cards: [
              {
                type: 'heading',
                heading: computeSectionTitle(
                  key,
                  config.group_name,
                  hassContext
                ),
                heading_style: 'title',
              },
              ...cards,
            ],
          },
        ];
      }, []);

    if (sections.length === 0)
      console.warn(
        'Auto Sections Strategy rendered an empty view. Please check your configuration.'
      );

    return {
      // @ts-expect-error
      type: 'sections',
      max_columns: config.max_columns ?? 4,
      sections: [
        ...(config.sections?.top ?? []),
        ...sections,
        ...(config.sections?.bottom ?? []),
      ],
      badges: config.badges ?? [],
    };
  }
}

customElements.define('ll-strategy-view-auto-sections', AutoSectionsStrategy);

console.info(
  `%c Auto Sections Strategy %c is installed!`,
  'color: white; background: coral; font-weight: 700;',
  'color: coral; background: white; font-weight: 700;'
);
