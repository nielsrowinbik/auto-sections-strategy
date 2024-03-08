# Lovelace Auto Sections Strategy

## What is the Auto Sections Strategy?

Auto Sections Strategy provides a strategy for Home Assistant to automatically generate a view within a Lovelace dashboard. It has some sensible defaults but allows for full customisation.

## Getting started

The strategy is easily installable from [HACS](https://hacs.xyz/) (Home Assistant Community Store). Just add this repository as a custom repository and install the strategy. Installing manually is also possible. We'll add more details on how to do this later.

## Usage

```yaml
views:
  - strategy:
      type: custom:auto-sections
      options:
        group_by: <group_by>
        filter:
          include:
            - <filter>
            - <filer>
          exclude:
            - <filter>
            - <filter>
        show_empty: <show_empty>
        unique: <unique>
        card_options:
          _:
            type: entity
          light:
            color: amber
          fan.master_bedroom_fan:
            type: custom:mushroom-fan-card
```

## Options

- `group_by`: **Required**. How to divide the filtered entities among the sections. Defaults to `area`. Possible options: `area` (we'll add more options soon).
- `filter`:
  - `include`: A list of filters specifying which entities to include in the view.
  - `exclude`: A list of filters specifying which entities to exclude from the view.
- `show_empty`: Whether to display a section if it has no entities in it. The default is `false`.
- `unique`: Whether to display an entity more than once if it appears in multiple groups. The default is `false`. Entities within a group will always be deduplicated.
- `card_options`: Options to add to certain cards.

### Filters

Both `include` and `exclude` take in a list of filters to determine which entities to display within the view.

Filters have the following options, and will match any entity fulfilling **ALL** options:

- `domain`: Match entity domain (such as `light`, `climate`, `media_player`)
- `state`: Match entity state (such as `on`, `off`, etc.)

### Card options

Within the `card_options` object you may specify how to alter the rendered cards. The specificity of your changes are determined by the configuration keys within the `card_options` object and are applied in this order:

1. Configuration within the special `_` key will be applied to all cards.
2. Specifying keys for a domain such as `light` will apply the configuration to all cards for entities within that domain.
3. Specifying keys for a specific entity such as `fan.master_bedroom_fan` will apply the configuration to all cards with that specific entity.
