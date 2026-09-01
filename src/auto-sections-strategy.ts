import type {
  LovelaceViewConfig,
  HomeAssistant,
  LovelaceCardConfig,
} from 'custom-card-helpers';
import { configSchema } from './lib/validations';
import type { LovelaceViewSection } from './lib/types';
import type { StrategyConfig } from './lib/validations';
import { filter, resolveFilter } from './lib/filters';
import {
  REGISTRY_DEPENDENCIES,
  loadHassContext,
  shouldRegenerate,
} from './lib/registry';
import {
  computeEntityContext,
  computeGroupKey,
  computeSectionTitle,
  generateCards,
} from './lib/utils';
import { sort } from './lib/sorts';

// Injected by rollup; see `intro` in rollup.config.mjs.
declare const __DEV__: boolean;

class AutoSectionsStrategy extends HTMLTemplateElement {
  static registryDependencies = REGISTRY_DEPENDENCIES;

  // Home Assistant calls this on every `hass` update and re-runs `generate`
  // when it returns true, debounced and with an equality check on the result.
  // Supported from Home Assistant 2026.7; older versions ignore it and fall
  // back to regenerating on registry changes only.
  static shouldRegenerate = shouldRegenerate;

  static async generate(
    userConfig: StrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const config = configSchema.parse(userConfig);

    const hassContext = await loadHassContext(hass);

    const [include, exclude] = await Promise.all([
      Promise.all(
        (config.filter?.include ?? []).map((f) => resolveFilter(hass, f))
      ),
      Promise.all(
        (config.filter?.exclude ?? []).map((f) => resolveFilter(hass, f))
      ),
    ]);

    const entities = hassContext.entity
      // Apply `include` filters:
      .filter((entity) => {
        const context = computeEntityContext(entity.entity_id, hassContext);

        return include.some((userFilter) => filter(hass, userFilter, context));
      })
      // Apply `exclude` filters:
      .filter((entity) => {
        const context = computeEntityContext(entity.entity_id, hassContext);

        return !exclude.some((userFilter) => filter(hass, userFilter, context));
      });

    const cards = generateCards(entities, config, hassContext);

    // @ts-expect-error
    const grouped: Record<string, LovelaceCardConfig[]> = Object.groupBy(
      cards,
      // Missing keys stringify to 'undefined'/'null', which is how the ungrouped
      // bucket is recognised below.
      (card: LovelaceCardConfig) =>
        String(
          computeGroupKey(
            computeEntityContext(card.entity, hassContext),
            config.group_by
          )
        )
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

const type = __DEV__ ? 'auto-sections-dev' : 'auto-sections';

customElements.define(`ll-strategy-view-${type}`, AutoSectionsStrategy);

console.info(
  `%c Auto Sections Strategy %c is installed as custom:${type}!`,
  'color: white; background: coral; font-weight: 700;',
  'color: coral; background: white; font-weight: 700;'
);
