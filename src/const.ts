export const defaultConfig = {
  type: 'custom:area-sections',
  domains: {
    _: {
      hide_config_entities: false,
    },
    default: {
      hidden: false,
      card: {
        type: 'tile',
      },
    },
    light: {
      hidden: false,
      card: {
        type: 'tile',
      },
    },
    fan: {
      hidden: false,
      card: {
        type: 'tile',
      },
    },
    cover: {
      hidden: false,
      card: {
        type: 'tile',
      },
    },
    switch: {
      hidden: false,
      card: {
        type: 'tile',
      },
    },
    camera: {
      hidden: false,
      card: {
        type: 'tile',
      },
    },
    lock: {
      hidden: false,
      card: {
        type: 'tile',
      },
    },
    climate: {
      hidden: false,
      card: {
        type: 'tile',
      },
    },
    media_player: {
      hidden: false,
      card: {
        type: 'tile',
      },
    },
    sensor: {
      hidden: true,
      card: {
        type: 'tile',
      },
    },
    binary_sensor: {
      hidden: true,
      card: {
        type: 'tile',
      },
    },
    number: {
      hidden: true,
      card: {
        type: 'tile',
      },
    },
    vacuum: {
      hidden: false,
      card: {
        type: 'tile',
      },
    },
  },
} as const;

export type StrategyConfig = typeof defaultConfig;
