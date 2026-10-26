export async function migrate() {
  if (!game.user.isGM) { return; }

  // delete v12 macros
  for (const id of game.macros.map(e => e.id)) await game.macros.get(id).delete();

  // may need to clear old chat messages
  ChatMessage.deleteDocuments(game.messages.map(i=>i.id));

  /*
  // reset all Playwall page permissions to Observer
  const playwall = game.ta.helpers.taHelper.playwallJournal();
  if (playwall) {
    for(const page of playwall.pages.filter(page => page.type == "Playwall" && page.system.code)) {
      const updates = {};
      for(const key of Object.keys(page.ownership)) {
        if (key == "default") {
          if (page.ownership.default != CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER) {
            updates["ownership.default"] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
          }
        }
        else {
          updates["ownership.-=" + key] = null;
        }
      }
      page.update(updates, { render: false });
    }
  }
  */

  // set compendiums player permissions
  /*
  const compendium = game.packs.get("triangleagency.item-agency-data");
  let update = {
    "ownership.ASSISTANT": "OWNER",
    "ownership.GAMEMASTER": "OWNER",
    "ownership.PLAYER": "NONE"
  }
  compendium.update(update);
  console.log(compendium)
  */

  // set migration control for the current version
  game.settings.set("triangleagency", "systemMigrationVersion", game.system.version);
}