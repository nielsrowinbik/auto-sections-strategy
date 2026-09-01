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

1. Download [`auto-sections-strategy.js`](https://github.com/nielsrowinbik/auto-sections-strategy/releases/latest/download/auto-sections-strategy.js) from the latest release.
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
        strip_group_name: <true or false>
        max_columns: <number between 1 and 10>
        filter:
          include:
            - <filter>
            - <filer>
          exclude:
            - <filter>
            - <filter>
        show_ungrouped: <show_ungrouped>
        sort: <sort>
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
        badges:
          - <badge_config>
```

## Options

- `group_by`: **Required**. How to divide the filtered entities among the sections.
- `group_name`: How to determine the section's name.
- `strip_group_name`: Remove the section's name from the names of the entities within it. Defaults to `true`.
- `filter`:
  - `include`: A list of filters specifying which entities to include in the view.
  - `exclude`: A list of filters specifying which entities to exclude from the view.
- `show_ungrouped`: Show or hide entities that were included by the filter rules but could not be grouped using the `group_by` setting. Defaults to `false`.
- `card_options`: Options to add to certain cards.
- `sections`: Add your own custom sections to the top or bottom of the generated list.
- `badges`: Add badges to your automatically generated dashboard.

### Group by

You may either specify a single string or an array of strings here. They should all follow this format: `<domain>.<field>`. These aren't your typical Home Assistant domains though. The supported domains are: `entity`, `area`, `device`. We group by looping through all entities resulting from your configured filters. For each entity, we get the related device and area (both may not exist). By specifying `area.area_id` for example, you're instructing the strategy to group entities by their corresponding area using the `area_id` key.

By suppling multiple strings in an array you're instructing the strategy to consider multiple sources for a group key. It will collect all of them, disregard any undefined/null values, and then use the first one. This is useful for grouping by area, because an entity may not be within an area (`entity.area_id` could be empty), while its device might be (`device.area_id`), hence it's useful to supply both `entity.area_id` and `device.area_id`.

### Group name

By default, the strategy will use the value returned by the `group_by` setting as the section name, but this may not always be what you want.

Setting the group name happens by supplying a single string in a given format: `<domain>.<field1>|<field2>`. What you're configuring here is "what field within a certain domain does the group ID represent (`<domain>.<field1>`), and what field should from that object should we use instead (`<field2>`)?".

In the area example, we group by `area_id`, and so we tell the strategy to find area's by their `area_id`, but use the `name` field for the section title instead, hence our configuration is `area.area_id|name`.

I'm open to suggestions on how to make this easier and/or make more sense, just open an issue.

### Strip group name

Entities are often named after the thing you're grouping by, which gets repetitive: a section titled "Kitchen" full of cards reading "Kitchen lights", "Kitchen blinds", "Kitchen motion". By default the strategy removes the section's name from the names of the cards within it, leaving "Lights", "Blinds" and "Motion". Set `strip_group_name: false` to keep the full names.

The name is only removed when it sits at the start or the end of the entity's name, and the match ignores case. If removing it would leave the card without a name at all, the full name is kept.

What gets removed is the section's *displayed* name, which means this only does something when that name actually appears in your entity names. If you group by `area.area_id` without setting `group_name`, the section is titled `kitchen` (the area's ID), and no entity is called "kitchen lights", so nothing is removed. Set `group_name: area.area_id|name` and you get "Kitchen" as the section title, which does match.

### Filters

Both `include` and `exclude` take in a list of filters to determine which entities to display within the view.

Filters have the following options, and will match any entity fulfilling **ALL** options:

- `area`: Match entities belonging to a certain area (this does also take their device's area into consideration)
- `attribute`: Expects an object of attributes. Will match for entities matching all attributes exactly. Useful for filtering by `device_class`, for example
- `device`: Match entities belonging to a certain device
- `domain`: Match entity domain (such as `light`, `climate`, `media_player`)
- `entity_id`: Match a specific entity
- `expand`: Not a filter of its own. See [Groups](#groups)
- `floor`: Match entities belonging to a certain floor
- `state`: Match entity state (such as `on`, `off`, etc.)
- `hidden`: Match entities that have been hidden from the UI or not
- `label`: Match entities that have a certain label

Every option except `attribute` and `hidden` also takes a list, which matches when **ANY** of its values does. So instead of a separate entry per domain, you can write:

```yaml
filter:
  include:
    - domain:
        - light
        - switch
        - climate
```

#### Combining options

Because a filter matches only when all of its options match, putting two options on the same list entry narrows the result. This, for example, matches occupancy sensors and nothing else:

```yaml
filter:
  include:
    - domain: binary_sensor
      attribute:
        device_class: occupancy
```

Put them on separate entries and you get every binary sensor plus everything with an occupancy device class instead.

#### Groups

Set `expand: true` to use a group's members rather than the group entity itself:

```yaml
filter:
  include:
    - entity_id: light.all_valid_lights
      expand: true
```

This reads the `entity_id` attribute of whatever entity you name, so it works for the group helpers in the `light`, `switch`, `cover`, `fan` and `media_player` domains, for old-style `group.*` groups, and for anything else that lists its members that way. Groups within groups are flattened. Naming an entity that isn't a group leaves it as it is.

#### Templates

`entity_id` also takes a [Jinja template](https://www.home-assistant.io/docs/configuration/templating/), which should return an entity id or a list of them. The result behaves like any other `entity_id` value, so it still combines with the rest of the filter:

```yaml
filter:
  include:
    - entity_id: "{{ area_entities('living_room') }}"
      domain: light
```

The strategy keeps the template subscribed and rebuilds the view when its result changes, so you don't need to reload the dashboard. The same goes for the `state` and `attribute` filters, and for `expand`. This needs Home Assistant 2026.7 or later; on older versions everything still works, it's just evaluated once per dashboard load.

### Sort

By default, the generated sections are sorted alphabetically by their key (resulting from the `group_by` configuration). You can change the direction or manually sort the generated sections through priority sorting.

#### Alphabetically

Set the method to `alphabetical` and optionally set the direction to either `ascending` or `descending`. There are no other options to configure.

```yaml
sort:
  method: alphabetical
  direction: ascending # or descending
```

#### Priority

Set the method to `priority` and optionally set the direction to either `ascending` or `descending`. Then, provide an object of priorities to consider, like so:

```yaml
sort:
  method: priority
  direction: ascending # or descending
  priorities:
    living_room: 1
    bedroom: 2
```

Any section that is not provided a priority through the above configuration will be assigned a priority of 9999.

### Card options

Within the `card_options` object you may specify how to alter the rendered cards. The specificity of your changes are determined by the configuration keys within the `card_options` object and are applied in this order:

1. Configuration within the special `_` key will be applied to all cards.
2. Specifying keys for a domain such as `light` will apply the configuration to all cards for entities within that domain.
3. Specifying keys for a specific entity such as `fan.master_bedroom_fan` will apply the configuration to all cards with that specific entity.

Card names are generated from the entity's name, with the section's name removed unless you turn that off. See [Strip group name](#strip-group-name). Setting `name` through `card_options` overrides this entirely.

### Sections

Use `sections.top` and `sections.bottom` to place your own sections before or after the generated ones. Each entry is a regular Home Assistant grid section, so it must have `type: grid` and a list of `cards`, and every other option a native section accepts is passed through to the view unchanged. That includes `column_span`, `visibility` and `background`, as well as anything Home Assistant adds later.

```yaml
max_columns: 3
sections:
  top:
    - type: grid
      column_span: 3
      cards:
        - type: heading
          heading: Good morning
  bottom:
    - type: grid
      visibility:
        - condition: user
          users:
            - 581fbc5cfc854f9a86b3d7d5f5b0d6f0
      cards:
        - type: entities
          entities:
            - input_boolean.guest_mode
```
