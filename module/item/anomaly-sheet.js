export class taAnomalySheet extends foundry.appv1.sheets.ItemSheet {
  static _warnedAppV1 = true;

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["triangleagency", "sheet", "item"],
      width: 800,
      //height: 600,
      resizable: false,
      tabs: [
        { navSelector: ".tabbed", contentSelector: ".tab-content", initial: "main" },
        { navSelector: ".abilities-nav", contentSelector: ".abilities-content", initial: "" },
      ],
      defaultImage: CONFIG.TA.assetPath + "/icons/anomaly-icon.png",      
    });
  }


  /** @override */
  get template() {
    return "systems/triangleagency/templates/item-anomaly-sheet.hbs";
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
      extra: this.item.extra || {}
    });

    
    // housekeeping
    const update = {};
    if (this.item.img != this.options.defaultImage) {
      update["img"] = this.options.defaultImage;
    }
    if (update != {}) { this.item.update(update) };


    context.extra.abilities = [];
    await (game.items.filter(item => item.type === "AnomalyAbility" && item.system.anomaly == this.item.id).sort((a, b) => a.name.localeCompare(b.name))).forEach(async item => {
      const ability = {
        id: item.id,
        name: item.name,
        reference: item.system.reference,
        quality: game.i18n.localize('TA.Quality.' + item.system.quality),
        description: item.system.description,
        rendered: ""
      };

      ability.rendered = await game.ta.helpers.taHelper.renderAnomalyAbility ({
        ability: item,
        anomaly: this.item.name,
        actionable: false,
        showTitle: false
      });

      context.extra.abilities.push(ability);
    });

    return context;
  }

  /** @override */
  setPosition(options = {}) {
    const position = super.setPosition(options);
    const sheetBody = this.element.find(".sheet-body");
    const bodyHeight = position.height + 100;
    sheetBody.css("height", bodyHeight);
    return position;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;
  }
}