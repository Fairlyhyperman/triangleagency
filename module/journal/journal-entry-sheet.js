export class JournalEntryPlaywallSheet extends foundry.appv1.sheets.JournalSheet {
  static _warnedAppV1 = true;

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/triangleagency/templates/journal-sheet.hbs",
      width: 1000,
      height: 800,
      resizable: false,
    });
  }

  /** @inheritDoc */
  async _renderOuter() {
    const html = await super._renderOuter();
    game.ta.helpers.taHelper.adjustHeaderButtons(html, false);
    return html;
  }

  /** @override */
  async getData(options) {
    const context = super.getData(options);
    const data = this.data;

    foundry.utils.mergeObject(context, {
      isGM: game.user.isGM
    });

    // is this the playwall journal?
    const playwall = game.settings.get("triangleagency", "playwall");
    context.showPlaywallButton = (playwall == null || this.object.id == playwall);

    //console.log(context)

    return context;
  }

  
  /**
   * Prepare pages for display.
   * @returns {JournalEntryPage[]}  The sorted list of pages.
   * @protected
   * @override
   */
  _getPageData() {
    const _pageData = super._getPageData();
    let filtered = [];
    if (this.document.id == game.settings.get("triangleagency", "playwall")) {
      if (game.user.isGM) {
        filtered = _pageData;
      }
      else if (game.user.character && game.user.character.type == "Agent") {
        const active = game.user.character.system.allPlaywall || [];
        for (const page of _pageData) {
          if (active.includes(page.system.code)) {
            filtered.push(page);
          }
        }
      }
  
      filtered.sort((a, b) => (a.system.code || "").localeCompare((b.system.code || "")));
    }
    else {
      filtered = _pageData;
    }

    return filtered;
  }


  _getEntryContextOptions() {
    let menu = super._getEntryContextOptions();
    /*
    const anachronometerId = game.settings.get('tnt', 'anachronometer');
    if (this.object._id == anachronometerId) {
      menu = menu.filter((option) => option.name != 'SIDEBAR.Edit');
    }
    */
    return menu;
  }


  /**
   * Update child views inside the main sheet.
   * @returns {Promise<void>}
   * @protected
   */
  async _renderPageViews() {
    return super._renderPageViews();
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.find('.create[data-action="createPlaywall"]').click(this._listenAddPlaywall.bind(this));
  }

  async _listenAddPlaywall(event) {
    event.preventDefault();
    const target = $(event.target);
    const page = (await this.document.addPlaywall("333", "Playwall"))[0];
    page.sheet.render(true, {editable: true});
  }
}
