export class taConnectionBenefitSheet extends foundry.appv1.sheets.ItemSheet {
  static _warnedAppV1 = true;

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['triangleagency', 'sheet', 'item'],
      width: 800,
      //height: 600,
      resizable: false,
      tabs: [{ navSelector: '.tabbed', contentSelector: '.tab-content', initial: 'main' }],
      defaultImage: CONFIG.TA.assetPath + "/icons/connection-icon.png",      
    });
  }


  /** @override */
  get template() {
    return 'systems/triangleagency/templates/item-connectionbenefit-sheet.hbs';
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
      system: this.item.system
    });

    // housekeeping
    const update = {};
    if (this.item.img != this.options.defaultImage) {
      update["img"] = this.options.defaultImage;
    }
    if (update != {}) { this.item.update(update) };

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
    if (!this.options.editable) return;
    //html.find('.addChannel,.editChannel').click(this._listenUpsertChannel.bind(this));
    //html.find('.deleteChannel').click(this._listenDeleteChannel.bind(this));
  }
}