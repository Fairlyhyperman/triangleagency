export class taSponsorshipSheet extends foundry.appv1.sheets.ItemSheet {
  static _warnedAppV1 = true;

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['triangleagency', 'sheet', 'item'],
      width: 600,
      //height: 600,
      resizable: false,
      tabs: [{ navSelector: '.tabbed', contentSelector: '.tab-content', initial: 'main' }],
      defaultImage: CONFIG.TA.assetPath + "/icons/sponsorship-icon.png",
    });
  }

  /** @override */
  get template() {
    return 'systems/triangleagency/templates/item-sponsorship-sheet.hbs';
  }


  /** @inheritDoc */
  async _renderOuter() {
    const html = await super._renderOuter();
    game.ta.helpers.taHelper.adjustHeaderButtons(html, false);
    if (!game.ta.settings.transparentWindow) {
      html.find(".window-content").css("background", game.ta.settings.solidWindowColor)
    }
    return html;
  }

  
  /** @override */
  async getData(options) {
    const context = super.getData(options);
    foundry.utils.mergeObject(context, {
      system: this.item.system,
      //config: CONFIG.TA,
      isGM: game.user.isGM,
      extra: this.item.extra || {},
    });

    // housekeeping
    const update = {};
    if (this.item.img != this.options.defaultImage) {
      update["img"] = this.options.defaultImage;
    }
    if (update != {}) { this.item.update(update) };

    //console.log(context);

    return context;
  }

  /** @override */
  setPosition(options = {}) {
    const position = super.setPosition(options);
    const sheetBody = this.element.find('.sheet-body');
    const bodyHeight = position.height + 100;
    sheetBody.css('height', bodyHeight);
    return position;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    //if (!this.options.editable) return;
    //html.find('.editOutcome').click(this._listenEditOutcome.bind(this));
  }

}