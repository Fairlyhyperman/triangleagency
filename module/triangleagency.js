// Import general
import { TA } from "./config.js";
import { registerSettings } from "./settings.js";
import { taDice } from "./helpers/taDice.js";
import { taHelper } from "./helpers/taHelpers.js";
import taSocketHandler from "./helpers/helperSocket.js";
import agencyOs from "./agencyOs.js";
import GMScreen from "./GMScreen.js";
import PlayerScreen from "./PlayerScreen.js";
import { preloadTemplates } from "./preloadTemplates.js";
import { setupMacros } from "./macros.js";
import { migrate } from "./migrate.js";
import Playwall from "./journal/data-playwall.js";


// Import entities
import { taActor } from "./actor/actor-entity.js";
import { taItem } from "./item/item-entity.js";
import { taJournalEntry } from "./journal/journal-entry-entity.js";
import { taChatMessage } from "./chat/chat-entity.js";

// Import sheets
import { taAgentSheet } from "./actor/agent-sheet.js";
import { taActorAnomalySheet } from "./actor/anomaly-sheet.js";
import { taActorBystanderSheet } from "./actor/bystander-sheet.js";

import { taAnomalySheet } from "./item/anomaly-sheet.js";
import { taAnomalyAbilitySheet } from "./item/anomalyability-sheet.js";
import { taChaosEffectSheet } from "./item/chaoseffect-sheet.js";
import { taCompetencySheet } from "./item/competency-sheet.js";
import { taRealitySheet } from "./item/reality-sheet.js";
import { taRequisitionSheet } from "./item/requisition-sheet.js";
import { taConnectionBenefitSheet } from "./item/connectionbenefit-sheet.js";
import { taMissionReportSheet } from "./item/missionreport-sheet.js";
import { taSponsorshipSheet } from "./item/sponsorship-sheet.js";

import { JournalEntryPlaywallSheet } from "./journal/journal-entry-sheet.js";
import { PlaywallSheet } from "./journal/journal-playwall-sheet.js";


// Handlebars
import { registerHelpers } from "./handlebarHelpers.js";

// Initialize system
Hooks.once("init", async () => {
  console.log(`TA | Initializing Triangle Agency System\n${TA.ASCII}`);

  //CONFIG.debug.hooks = true;

  // Create a namespace within the game global
  game.ta = {
    applications: {
      taAgentSheet,
      taActorAnomalySheet,
      taActorBystanderSheet,
      taJournalEntry,

      taAnomalySheet,
      taAnomalyAbilitySheet,
      taChaosEffectSheet,
      taCompetencySheet,
      taRealitySheet,
      taRequisitionSheet,
      taConnectionBenefitSheet,
      taMissionReportSheet,
      taSponsorshipSheet,

      taChatMessage,

      agencyOs: void 0,
      GMScreen: void 0,
      PlayerScreen: PlayerScreen,
    },
    canvas: {
      //AbilityTemplate
    },
    config: TA,
    entities: {
      taActor,
      taItem,
      taJournalEntry,
      taChatMessage
    },

    helpers: {
      taHelper,
      taDice,
    },

    settings: {},
    //macros: macros,
    //migrations: migrations,
  };


  // Register custom system settings
  registerSettings();

  // Handlebars
  registerHelpers();
  await preloadTemplates();

  // Initilize the sockets
  game.system.socketHandler = new taSocketHandler();

  // Assign custom classes and constants here
  CONFIG.TA = TA;
  CONFIG.Actor.documentClass = taActor;
  CONFIG.Item.documentClass = taItem;
  CONFIG.JournalEntry.documentClass = taJournalEntry;
  CONFIG.ChatMessage.documentClass = taChatMessage;

  Object.assign(CONFIG.JournalEntryPage.dataModels, {
    "triangleagency.Playwall": Playwall
  });


  // Register custom sheets
  foundry.documents.collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);
  foundry.documents.collections.Actors.registerSheet("triangleagency", taAgentSheet, { types: ["Agent"], makeDefault: true, });
  foundry.documents.collections.Actors.registerSheet("triangleagency", taActorAnomalySheet, { types: ["Anomaly"], makeDefault: true, });
  foundry.documents.collections.Actors.registerSheet("triangleagency", taActorBystanderSheet, { types: ["Bystander"], makeDefault: true, });
  
  foundry.documents.collections.Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet);
  foundry.documents.collections.Items.registerSheet("triangleagency", taAnomalySheet, { types: ["Anomaly"], makeDefault: true, });
  foundry.documents.collections.Items.registerSheet("triangleagency", taAnomalyAbilitySheet, { types: ["AnomalyAbility"], makeDefault: true, });
  foundry.documents.collections.Items.registerSheet("triangleagency", taChaosEffectSheet, { types: ["ChaosEffect"], makeDefault: true, });
  foundry.documents.collections.Items.registerSheet("triangleagency", taCompetencySheet, { types: ["Competency"], makeDefault: true, });
  foundry.documents.collections.Items.registerSheet("triangleagency", taRealitySheet, { types: ["Reality"], makeDefault: true, });
  foundry.documents.collections.Items.registerSheet("triangleagency", taRequisitionSheet, { types: ["Requisition"], makeDefault: true, });
  foundry.documents.collections.Items.registerSheet("triangleagency", taConnectionBenefitSheet, { types: ["ConnectionBenefit"], makeDefault: true, });
  foundry.documents.collections.Items.registerSheet("triangleagency", taMissionReportSheet, { types: ["MissionReport"], makeDefault: true, });
  foundry.documents.collections.Items.registerSheet("triangleagency", taSponsorshipSheet, { types: ["Sponsorship"], makeDefault: true, });

  // eslint-disable-next-line no-undef
  foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntry, 'triangleagency', JournalEntryPlaywallSheet, {
    makeDefault: true,
    label: "Playwall",
  });
  
  foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntryPage, "triangleagency", PlaywallSheet, {
    types: ["Playwall"],
    makeDefault: true
  });

});


// Setup system
Hooks.once("setup", async () => {
  // set up the AgencyOS app
  const agency = new agencyOs();
  game.ta.applications.agencyOs = agency;
});


// When ready
Hooks.once("ready", async () => {
  // set path helpers
  TA.assetPath = "systems/" + game.system.id + "/assets";

  // replace the default logo
  const logo = $("#logo");
  logo.attr("src", TA.assetPath + "/icons/ta-logo.png");
  logo.removeAttr("height")
  logo.css("object-fit", "cover");

  game.ta.helpers.taHelper.syncAssets();

  if (game.user.isGM) {
    const currentVersion = game.settings.get("triangleagency", "systemMigrationVersion");
    const NEEDS_MIGRATION_VERSION = "1.1.00";
    const needsMigration = !currentVersion || foundry.utils.isNewerVersion(NEEDS_MIGRATION_VERSION, currentVersion);
    if (needsMigration) {
      console.log("Migrating " + currentVersion + " to Current Version");
      await migrate();
    }
  }
  
  // Macros
  setupMacros();

  game.ta.applications.agencyOs.render({
    force: true,
    position: agencyOs.calcPosition()
  });

  // cache the settings
  game.ta.settings.transparentWindow = game.settings.get("triangleagency", "transparentWindow");
  game.ta.settings.solidWindowColor = "#899499";
  game.ta.settings.highlightAction = game.settings.get("triangleagency", "highlightAction");
  game.ta.settings.manualStanding = game.settings.get("triangleagency", "manualStanding");
  game.ta.settings.weather = game.settings.get("triangleagency", "weather");
  game.ta.settings.playerExtra = game.settings.get("triangleagency", "playerExtra");
  game.ta.settings.playerPlaywallTracks = game.settings.get("triangleagency", "playerExtraPlaywall");
  game.ta.settings.sceneBurnout = game.settings.get("triangleagency", "sceneBurnout");
  game.ta.settings.autoATABurnout = game.settings.get("triangleagency", "autoATABurnout");

  // set up the GM Screen
  if (game.user.isGM) {
    const gmScreen = new GMScreen();
    gmScreen.options.window.title = game.i18n.localize("TA.GeneralManager");
    game.ta.applications.GMScreen = gmScreen;
  }
});


Hooks.on("renderItemDirectory", (app, html, data) => {
  const items = app.collection.filter(
    (item) => (["AnomalyAbility","Requisition"].includes(item.type) && item.system.reference != "")).map(entry => {
      return {
        id: entry.id,
        name: entry.name,
        context: entry.type == "AnomalyAbility" ? "anomaly" : "requisition",
        reference: entry.system.reference 
      }
    }
  );

  items.forEach(item => {
    const tag = '<span class="color-background-' + item.context + ' playwallTag">' + item.reference + '</span>' + item.name;
    html.querySelector("li.directory-item.entry.document.item[data-entry-id='" + item.id + "'] a.entry-name").innerHTML = tag;
  });
});


Hooks.on("renderGamePause", function () {
  $("#pause.paused img").attr("src", "systems/" + game.system.id + "/assets/ui/pause.png");
});


Hooks.on('updateScene', function(scene, data, stats) {
  if (game.user.isGM && data.active && game.ta.settings.sceneBurnout) {
    const value = scene.flags.ta ? Number(scene.flags.ta.burnout ?? 0) : 0;
    game.ta.applications.agencyOs.setBurnout(value);
  }
});


Hooks.once('diceSoNiceReady', (dice3d) => {
  dice3d.addSystem({
    id: "triangleagency",
    name: "Triangle Agency",
  }, true); // true = system will use this as the default d4 without user needing to activate it, false make it a selectable dice-so-nice system but not activate it by default.

  dice3d.addDicePreset({
    type: "d4",
    modelFile: "systems/triangleagency/assets/dice/d4-no-numbers.glb",
    system: "triangleagency"
  });
  dice3d.addDicePreset({
    type: "d6",
    modelFile: "systems/triangleagency/assets/dice/d6-ta.glb",
    system: "triangleagency"
  });
  dice3d.addDicePreset({
    type: "d8",
    modelFile: "systems/triangleagency/assets/dice/d8-ta.glb",
    system: "triangleagency"
  });
  dice3d.addDicePreset({
    type: "d10",
    modelFile: "systems/triangleagency/assets/dice/d10-ta.glb",
    system: "triangleagency"
  });
  dice3d.addDicePreset({
    type: "d20",
    modelFile: "systems/triangleagency/assets/dice/d20-ta.glb",
    system: "triangleagency"
  });
});


// Handle browser resizes
window.addEventListener("resize", s_WINDOW_RESIZE);
function s_WINDOW_RESIZE() {
  agencyOs.setPosition();
}
