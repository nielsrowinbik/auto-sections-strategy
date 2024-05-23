# Lovelace Auto Sections Strategy

## What is the Auto Sections Strategy?

Auto Sections Strategy provides a strategy for Home Assistant to automatically generate a view within a Lovelace dashboard. It has some sensible defaults but allows for full customisation.

## Getting started

The strategy is easily installable via [HACS](https://hacs.xyz/) (Home Assistant Community Store), just not via the default repository. Manually installing is also possible.

### Installation through My Home Assistant Link

<a href="https://my.home-assistant.io/redirect/hacs_repository/?owner=nielsrowinbik&category=Lovelace&repository=auto-sections-strategy" target="_blank"><img src="https://my.home-assistant.io/badges/hacs_repository.svg" alt="Open your Home Assistant instance and open a repository inside the Home Assistant Community Store." /></a>

### Installation through custom HACS repository

1. Open HACS (installation instructions are [here](https://hacs.xyz/docs/installation/installation/)).
2. Open the menu in the upper-right and select "Custom repositories".
3. Enter the repository: `https://github.com/nielsrowinbik/auto-sections-strategy`
4. Search for the strategy and install it.
5. Add the downloaded resource to your dashboard resources. There's a number of ways to do this, so I won't go into detail.

### Manual installation

1. Download the latest release from [`dist/auto-sections-strategy.js`](https://github.com/nielsrowinbik/auto-sections-strategy/blob/main/dist/auto-sections-strategy.js).
2. Copy the file to your Home Assistant instance and place it in the `config/www` folder.
3. Go to Configuration -> Lovelace Dashboards -> Resources -> Add Resource.
4. Set the URL to `/local/auto-sections-strategy.js` and the Resource Type as `Javascript Module`.
5. Refresh.

## Usage

```yaml
views:
  - strategy:
      type: custom:auto-sections
      options:
        group_by: <group_by>
        group_name: <group_name>
        max_columns: <number between 1 and 10>
        filter:
          include:
            - <filter>
            - <filer>
          exclude:
            - <filter>
            - <filter>
        card_options:
          _:
            type: entity
          light:
            color: amber
          fan.master_bedroom_fan:
            type: custom:mushroom-fan-card
        sections:
          top:
            - <section_config>
          bottom:
            - <section_config>
```

## Options

- `group_by`: **Required**. How to divide the filtered entities among the sections.
- `group_name`: How to determine the section's name.
- `filter`:
  - `include`: A list of filters specifying which entities to include in the view.
  - `exclude`: A list of filters specifying which entities to exclude from the view.
- `card_options`: Options to add to certain cards.
- `sections`: Add your own custom sections to the top or bottom of the generated list. Sections defined here must be of `type: grid`.

### Group by

You may either specify a single string or an array of strings here. They should all follow this format: `<domain>.<field>`. These aren't your typical Home Assistant domains though. The supported domains are: `entity`, `area`, `device`. We group by looping through all entities resulting from your configured filters. For each entity, we get the related device and area (both may not exist). By specifying `area.area_id` for example, you're instructing the strategy to group entities by their corresponding area using the `area_id` key.

By suppling multiple strings in an array you're instructing the strategy to consider multiple sources for a group key. It will collect all of them, disregard any undefined/null values, and then use the first one. This is useful for grouping by area, because an entity may not be within an area (`entity.area_id` could be empty), while its device might be (`device.area_id`), hence it's useful to supply both `entity.area_id` and `device.area_id`.

### Group name

By default, the strategy will use the value returned by the `group_by` setting as the section name, but this may not always be what you want.

Setting the group name happens by supplying a single string in a given format: `<domain>.<field1>|<field2>`. What you're configuring here is "what field within a certain domain does the group ID represent (`<domain>.<field1>`), and what field should from that object should we use instead (`<field2>`)?".

In the area example, we group by `area_id`, and so we tell the strategy to find area's by their `area_id`, but use the `name` field for the section title instead, hence our configuration is `area.area_id|name`.

I'm open to suggestions on how to make this easier and/or make more sense, just open an issue.

### Filters

Both `include` and `exclude` take in a list of filters to determine which entities to display within the view.

Filters have the following options, and will match any entity fulfilling **ALL** options:

- `area`: Match entities belonging to a certain area (this does also take their device's area into consideration)
- `device`: Match entities belonging to a certain device
- `domain`: Match entity domain (such as `light`, `climate`, `media_player`)
- `state`: Match entity state (such as `on`, `off`, etc.)
- `hidden`: Match entities that have been hidden from the UI or not

### Card options

Within the `card_options` object you may specify how to alter the rendered cards. The specificity of your changes are determined by the configuration keys within the `card_options` object and are applied in this order:

1. Configuration within the special `_` key will be applied to all cards.
2. Specifying keys for a domain such as `light` will apply the configuration to all cards for entities within that domain.
3. Specifying keys for a specific entity such as `fan.master_bedroom_fan` will apply the configuration to all cards with that specific entity.
