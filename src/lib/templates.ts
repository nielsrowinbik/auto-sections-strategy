import type { HomeAssistant } from 'custom-card-helpers';

type RenderTemplateResult = { result: unknown };

type CachedTemplate = {
  value: string[];
  dirty: boolean;
  unsubscribe?: Promise<() => Promise<void>>;
};

// Subscriptions outlive a single `generate()` run: that is what lets a template
// result change re-render the view. They are never closed, because a strategy
// gets no teardown hook and `generate()` has no identity, so a view has no way
// of telling its own templates apart from those of a second auto-sections view
// on the same dashboard. One subscription per distinct template, for as long as
// the page lives, is the cost. auto-entities makes the same trade.
const cache = new Map<string, CachedTemplate>();

export function hasTemplate(value: unknown): value is string {
  return (
    typeof value === 'string' && (value.includes('{{') || value.includes('{%'))
  );
}

// Home Assistant renders native types, so a template returning a list arrives as
// an actual array rather than as its string representation.
function toEntityIds(result: unknown, template: string): string[] {
  if (typeof result === 'string') return result ? [result] : [];
  if (Array.isArray(result))
    return result.filter((id): id is string => typeof id === 'string');

  console.warn(
    `Auto Sections Strategy: template did not return an entity id or a list of entity ids, ignoring it: ${template}`
  );

  return [];
}

export function renderTemplate(
  hass: HomeAssistant,
  template: string
): Promise<string[]> {
  const cached = cache.get(template);

  if (cached) {
    // The view is being rebuilt with this value, so it is no longer pending.
    cached.dirty = false;
    return Promise.resolve(cached.value);
  }

  const entry: CachedTemplate = { value: [], dirty: false };
  cache.set(template, entry);

  return new Promise((resolve) => {
    let settled = false;

    const settle = (value: string[]) => {
      if (settled) {
        entry.dirty = true;
        return;
      }

      settled = true;
      resolve(value);
    };

    entry.unsubscribe = hass.connection
      .subscribeMessage<RenderTemplateResult>(
        ({ result }) => {
          entry.value = toEntityIds(result, template);
          settle(entry.value);
        },
        { type: 'render_template', template }
      )
      .catch((err) => {
        console.warn(
          `Auto Sections Strategy: could not render template, ignoring it: ${template}`,
          err
        );

        cache.delete(template);
        settle([]);

        return async () => {};
      });
  });
}

// Whether any subscription pushed a new result since the view was last built.
export function templatesDirty(): boolean {
  return [...cache.values()].some((entry) => entry.dirty);
}

// Only the tests call this; see the note on `cache`.
export function resetTemplates() {
  for (const [template, entry] of cache) {
    cache.delete(template);
    entry.unsubscribe?.then((unsubscribe) => unsubscribe()).catch(() => {});
  }
}
