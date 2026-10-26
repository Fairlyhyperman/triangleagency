export class taAnomalyAbilitySheet extends foundry.appv1.sheets.ItemSheet {
  static _warnedAppV1 = true;

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['triangleagency', 'sheet', 'item'],
      width: 800,
      //height: 600,
      resizable: false,
      tabs: [{ navSelector: '.tabbed', contentSelector: '.tab-content', initial: 'main' }],
      defaultImage: CONFIG.TA.assetPath + "/icons/anomalyability-icon.png",
    });
  }

  /** @override */
  get template() {
    return 'systems/triangleagency/templates/item-anomalyability-sheet.hbs';
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
    
    // prime the quality choices
    context.extra.qualities = {};
    CONFIG.TA.qualities.forEach((quality) => context.extra.qualities[quality] = "TA.Quality." + quality);

    // prime the anomaly choices
    context.extra.anomalies = { "": "Unaffiliated" };
    (game.items.filter(item => item.type === "Anomaly").sort((a, b) => a.name.localeCompare(b.name))).forEach(item => {
      context.extra.anomalies[item.id] = item.name;
    });

    // localize the outcome labels
    context.extra.outcomes = {};
    for (let [key, value] of Object.entries(this.item.system.outcomes)) {
      context.extra.outcomes[CONFIG.TA.outcomes[key].order] = {
        "id": key,
        "label": game.i18n.localize('TA.Outcome.' + key + '.prefix'),
        "description": context.system.outcomes[key]
      };
    }

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
    html.find(".editOutcome").click(this._listenEditOutcome.bind(this));
    html.find(".addAnswer").click(this._listenAddAnswer.bind(this));
  }


  async _listenAddAnswer(event) {
    event.preventDefault();
    const TEMPLATE = 'systems/triangleagency/templates/item-anomalyability-outcome-sheet.hbs';
    const answers = this.item.system.improvement.answers;
    const update = {};
    for (let i = 1; i <= 4; i++) {
      if (answers["answer" + i]) { continue }
      update["system.improvement.answers.answer" + i] = {
        text: "",
        track: {
          id: "",
          reference: "",
          name: "",
          description: "",
          size: 3,
          value: 0,
          strikes: 0,
          milestones: {}
        },
        nextStage: ""
      }
      this.item.update(update);
      break;
    }
  }


  async _listenEditOutcome(event) {
    event.preventDefault();
    const TEMPLATE = 'systems/triangleagency/templates/item-anomalyability-outcome-sheet.hbs';
    const item = this.item;
    const data = {};

    const target = $(event.currentTarget);
    const action = target.data('action');

    switch(action) {
      case 'edit':
      case 'delete':
        data['triggerOn'] = target.parent().data('id');
        break;
    }

    if (action == 'delete') {
      const proceed = await foundry.applications.api.DialogV2.confirm({
        window: { title: game.i18n.localize("TA.Dialog.Confirm.Header") },
        content: game.i18n.localize("TA.Dialog.DeleteConfirm"),
        rejectClose: false,
        modal: true
      });
  
      if (proceed) {
        const updates = {};
        updates['system.outcomes.' + data['triggerOn']] = new foundry.data.operators.ForcedDeletion();
        item.update(updates);
      };
      return;
    }


    data.triggers = {};
    const currentTriggers = Object.keys(item.system.outcomes);
    for (const [key, value] of Object.entries(CONFIG.TA.outcomes)) {
      if ((!currentTriggers.includes(key)) || (action == 'edit' && key == data['triggerOn'])) {
        data.triggers[key] = 'TA.Outcome.' + key + '.prefix'
      }
    }

    if (action == 'edit') {
      data['outcomeDescription'] = item.system.outcomes[data['triggerOn']];
    }

    const content = await foundry.applications.handlebars.renderTemplate(TEMPLATE, data);

    new foundry.applications.api.DialogV2({
      window: { title: game.i18n.localize("TA.Anomaly.AbilityOutcome") },
      modal: true,
      content: content,
      buttons: [
        {
          action: "submit",
          label: game.i18n.localize("TA.Submit"),
          default: true,
          callback: (event, button, dialog) => {
            let trigger = button.form.elements.triggerOn.value;
            let outcomeDescription = button.form.elements.outcomeDescription.value.trim();

            if (outcomeDescription != '') {
              const updates = {};
              if (action == 'edit' && trigger != data['triggerOn']) {
                updates['system.outcomes.' + data['triggerOn']] = new foundry.data.operators.ForcedDeletion();
              }
              updates['system.outcomes.' + trigger] = outcomeDescription;
              item.update(updates);
            }
          }
        },
        {
          action: "cancel",
          label: game.i18n.localize("TA.Cancel")
        }
      ],
    }).render({ force: true });    
  }

}