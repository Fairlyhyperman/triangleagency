export function registerSettings() {
  game.settings.register("triangleagency", "systemMigrationVersion", {
    default: "",
    scope: "world",
    type: String,
    config: false,
  });

  game.settings.register("triangleagency", "chaos", {
    name: game.i18n.localize("TA.chaos"),
    default: 0,
    scope: "world",
    type: Number,
    config: false,
  });

  game.settings.register("triangleagency", "burnout", {
    name: game.i18n.localize("TA.burnout"),
    default: 0,
    scope: "world",
    type: Number,
    config: false,
  });

  game.settings.register("triangleagency", "looseends", {
    name: game.i18n.localize("TA.looseends"),
    default: 0,
    scope: "world",
    type: Number,
    config: false,
  });

  game.settings.register('triangleagency', 'playwall', {
    name: game.i18n.localize("TA.Playwall"),
    default: null,
    scope: "world",
    type: String,
    config: false,
  });

  game.settings.register('triangleagency', 'gmscreen', {
    name: game.i18n.localize("TA.GMScreen"),
    default: null,
    scope: "world",
    type: Object,
    config: false,
  });

  game.settings.register('triangleagency', 'transparentWindow', {
    name: game.i18n.localize("TA.Setting.TransparentWindow"),
    hint: game.i18n.localize("TA.Setting.TransparentWindowHint"),
    default: true,
    scope: "world",
    type: Boolean,
    config: true,
    requiresReload: true,
  });

  game.settings.register('triangleagency', 'highlightAction', {
    name: game.i18n.localize("TA.Setting.HighlightAction"),
    hint: game.i18n.localize("TA.Setting.HighlightActionHint"),
    default: false,
    scope: "world",
    type: Boolean,
    config: true,
    requiresReload: true,
  });

  game.settings.register('triangleagency', 'manualStanding', {
    name: game.i18n.localize("TA.Setting.ManualStanding"),
    hint: game.i18n.localize("TA.Setting.ManualStandingHint"),
    default: false,
    scope: "world",
    type: Boolean,
    config: true,
    requiresReload: true,
  });

  game.settings.register('triangleagency', 'playerExtra', {
    name: game.i18n.localize("TA.Setting.PlayerExtra"),
    hint: game.i18n.localize("TA.Setting.PlayerExtraHint"),
    default: false,
    scope: "world",
    type: Boolean,
    config: true,
    requiresReload: true,
  });

  game.settings.register('triangleagency', 'playerExtraPlaywall', {
    name: game.i18n.localize("TA.Setting.PlayerExtraPlaywall"),
    hint: game.i18n.localize("TA.Setting.PlayerExtraPlaywallHint"),
    default: false,
    scope: "world",
    type: Boolean,
    config: true,
    requiresReload: true,
  });

  game.settings.register('triangleagency', 'sceneBurnout', {
    name: game.i18n.localize("TA.Setting.SceneBurnout"),
    hint: game.i18n.localize("TA.Setting.SceneBurnoutHint"),
    default: false,
    scope: "world",
    type: Boolean,
    config: true,
    requiresReload: true,
  });

  game.settings.register('triangleagency', 'autoATABurnout', {
    name: game.i18n.localize("TA.Setting.autoATABurnout"),
    hint: game.i18n.localize("TA.Setting.autoATABurnoutHint"),
    default: false,
    scope: "world",
    type: Boolean,
    config: true,
    requiresReload: true,
  });

  game.settings.register('triangleagency', 'weather', {
    name: game.i18n.localize("TA.Setting.ManualStanding"),
    default: { current: {}, history: {} },
    scope: "world",
    type: Object,
    config: false,
  });
}
