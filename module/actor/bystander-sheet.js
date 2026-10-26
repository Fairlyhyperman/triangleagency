export class taActorBystanderSheet extends foundry.appv1.sheets.ActorSheet {
  static _warnedAppV1 = true;

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["triangleagency", "sheet", "actor", "bystander"],
      width: 500,
      height: 500,
      resizable: false,
      tabs: [
        { navSelector: ".tabbed", contentSelector: ".tab-content", initial: "bystander" },
      ],
    });
  }

  /** @override */
  get template() {
    return "systems/triangleagency/templates/actor-bystander-sheet.hbs";
  }

  /** @override */
  async getData(options) {
    const data = this.actor.system;

    const context = super.getData(options);
    foundry.utils.mergeObject(context, {
      system: this.actor.system,
      isGM: game.user.isGM,
      //config: CONFIG.TA,
      extra: this.actor.extra || {},
    });

    context.showAgency = game.user.isGM || this.actor.isOwner;

    //console.log(context);

    return context;
  }

  async _renderOuter() {
    const html = await super._renderOuter();
    game.ta.helpers.taHelper.adjustHeaderButtons(html, false);

    // add extra buttons
    const header = html[0].querySelector(".window-header");
    const parser = new DOMParser();

    let edit = '<a class="control show-players" data-tooltip="' + game.i18n.localize("TA.ShowPlayersImage") +
      '"><i class="fa-solid fa-eye"></i></a>';
    edit = (parser.parseFromString(edit, 'text/html')).body.firstChild;
    edit.addEventListener("click", this._listenShowPlayers.bind(this));
    edit.addEventListener("dblclick", event => event.stopPropagation());
    let firstButton = header.querySelector(".header-button");
    firstButton?.insertAdjacentElement("beforebegin", edit);

    edit = '<a class="control pintogmscreen" data-tooltip="' + game.i18n.localize("TA.GM.PinToScreen") +
      '"><i class="fa-solid fa-thumbtack"></i></a>';
    edit = (parser.parseFromString(edit, 'text/html')).body.firstChild;
    edit.addEventListener("click", this._listenPinToGM.bind(this));
    edit.addEventListener("dblclick", event => event.stopPropagation());
    firstButton = header.querySelector(".header-button");
    firstButton?.insertAdjacentElement("beforebegin", edit);

    if (!game.ta.settings.transparentWindow) {
      html.find(".window-content").css("background", game.ta.settings.solidWindowColor)
    }

    return html;
  }


  setPosition(options = {}) {
    const position = super.setPosition(options);
    const sheetBody = this.element.find('.sheet-body');
    const bodyHeight = position.height + 100;
    const window = $(this.element);

    if (game.user.isGM || this.actor.isOwner) {
      sheetBody.css('height', bodyHeight);
    }
    else {
      window.css('height', "400px");
    }

    return position;
  }

  
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;
  }

  async _listenPinToGM(event) {
    event.preventDefault();
    const data = game.ta.helpers.taHelper.getGMScreenData();
    data.others[this.actor.id] = this.actor.name;
    game.ta.helpers.taHelper.setGMScreenData(data)
  }

  async _listenShowPlayers(event) {
    event.preventDefault();
    const ip = new ImagePopout(this.actor.img).render(true);
    ip.shareImage();
  }
}