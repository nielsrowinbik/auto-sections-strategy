import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HomeAssistant } from 'custom-card-helpers';
import {
  hasTemplate,
  resetTemplates,
  renderTemplate,
  templatesDirty,
} from './templates';

// Hands back the subscription callback so a test can push further results, the
// way Home Assistant does when a template's dependencies change.
function fakeHass() {
  let push: (result: { result: unknown }) => void = () => {};
  const unsubscribe = vi.fn(async () => {});

  const hass = {
    connection: {
      subscribeMessage: vi.fn(async (callback: any) => {
        push = callback;
        return unsubscribe;
      }),
    },
  } as unknown as HomeAssistant;

  return { hass, push: (result: unknown) => push({ result }), unsubscribe };
}

afterEach(() => {
  resetTemplates();
  vi.restoreAllMocks();
});

describe('hasTemplate', () => {
  it('recognises both delimiters', () => {
    expect(hasTemplate('{{ states.light }}')).toBe(true);
    expect(hasTemplate('{% if true %}a{% endif %}')).toBe(true);
    expect(hasTemplate('light.kitchen')).toBe(false);
  });
});

describe('renderTemplate', () => {
  it('resolves with the first result', async () => {
    const { hass, push } = fakeHass();

    const rendered = renderTemplate(hass, '{{ a }}');
    push(['light.a', 'light.b']);

    await expect(rendered).resolves.toEqual(['light.a', 'light.b']);
  });

  it('wraps a single entity id in a list', async () => {
    const { hass, push } = fakeHass();

    const rendered = renderTemplate(hass, '{{ a }}');
    push('light.a');

    await expect(rendered).resolves.toEqual(['light.a']);
  });

  it('ignores a result that is neither', async () => {
    const { hass, push } = fakeHass();
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const rendered = renderTemplate(hass, '{{ a }}');
    push(42);

    await expect(rendered).resolves.toEqual([]);
  });

  it('reuses the subscription for a repeated template', async () => {
    const { hass, push } = fakeHass();

    const rendered = renderTemplate(hass, '{{ a }}');
    push(['light.a']);
    await rendered;

    await expect(renderTemplate(hass, '{{ a }}')).resolves.toEqual(['light.a']);
    expect(hass.connection.subscribeMessage).toHaveBeenCalledTimes(1);
  });

  it('yields an empty list when the subscription fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const hass = {
      connection: {
        subscribeMessage: vi.fn(async () => {
          throw new Error('invalid template');
        }),
      },
    } as unknown as HomeAssistant;

    await expect(renderTemplate(hass, '{{ nope }}')).resolves.toEqual([]);
  });
});

describe('templatesDirty', () => {
  it('flags a result that arrived after the view was built', async () => {
    const { hass, push } = fakeHass();

    const rendered = renderTemplate(hass, '{{ a }}');
    push(['light.a']);
    await rendered;

    expect(templatesDirty()).toBe(false);

    push(['light.a', 'light.b']);

    expect(templatesDirty()).toBe(true);
  });

  it('clears once the new value has been read', async () => {
    const { hass, push } = fakeHass();

    const rendered = renderTemplate(hass, '{{ a }}');
    push(['light.a']);
    await rendered;
    push(['light.b']);

    await expect(renderTemplate(hass, '{{ a }}')).resolves.toEqual(['light.b']);
    expect(templatesDirty()).toBe(false);
  });
});

describe('resetTemplates', () => {
  it('closes every subscription', async () => {
    const { hass, push, unsubscribe } = fakeHass();

    const rendered = renderTemplate(hass, '{{ a }}');
    push(['light.a']);
    await rendered;

    resetTemplates();
    await vi.waitFor(() => expect(unsubscribe).toHaveBeenCalled());
  });
});
