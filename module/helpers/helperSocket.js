export default class taSocketHandler {
  constructor() {
    this.identifier = "system.triangleagency"
    this.registerSocketHandlers()
  }

  registerSocketHandlers() {
    game.socket.on(this.identifier, ({ type, payload }) => {
      //if (game.user !== game.users.activeGM) return;

      switch (type) {
        case "syncGlobals":
          this.#syncGlobals();
          break;

        case "setChaos":
          game.ta.applications.agencyOs.setChaos(payload);
          break;

        case "setBurnout":
          game.ta.applications.agencyOs.setBurnout(payload);
          break;

        case "setJournalTrack":
          this.#setJournalTrack(payload);
          break;

        case "setObjectPermissions":
          this.#setObjectPermissions(payload);
          break;

        case "addPlaywall":
          this.#addPlaywall(payload);
          break;

        case "removePlaywall":
          this.#removePlaywall(payload);
          break;
    
        default:
          throw new Error('unknown type');
      }
    });
  }

  emit(type, payload) {
    return game.socket.emit(this.identifier, { type, payload });
  }


  #addPlaywall(payload) {
    if (game.user !== game.users.activeGM) return;
    game.ta.helpers.taHelper.addPlaywall(payload.actorId, payload.playwall, payload.context, payload.extras);
  }


  #removePlaywall(payload) {
    if (game.user !== game.users.activeGM) return;
    game.ta.helpers.taHelper.removePlaywall(payload.actorId, payload.playwall);
  }


  #setObjectPermissions(payload) {
    if (game.user !== game.users.activeGM) return;
    game.ta.helpers.taHelper.setObjectPermissions(payload.type, payload.id, payload.player, payload.value);
  }


  #syncGlobals() {
    game.ta.applications.agencyOs.syncData();
  }

  #setJournalTrack(payload) {
    if (game.user !== game.users.activeGM) return;

    const page = game.journal.get(payload.journalId).pages.get(payload.pageId);
    page.update({
      "flags.ta.tracks.value": value
    });
  }

  #handleAction(arg) {
    console.log(arg);
  }
}