export class taActorAnomalySheet extends foundry.appv1.sheets.ActorSheet {
  static _warnedAppV1 = true;

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["triangleagency", "sheet", "actor"],
      width: 800,
      height: 548,
      resizable: false,
      tabs: [
        { navSelector: ".tabbed", contentSelector: ".tab-content", initial: "anomaly" },
        { navSelector: ".chaos-nav", contentSelector: ".chaos-content", initial: "" }
      ],
    });
  }

  /** @override */
  get template() {
    return "systems/triangleagency/templates/actor-anomaly-sheet.hbs";
  }

  /** @override */
  async getData(options) {
    const data = this.actor.system;

    const context = super.getData(options);
    foundry.utils.mergeObject(context, {
      system: this.actor.system,
      //config: CONFIG.TA,
      extra: this.actor.extra || {},
      editable: !this.actor.system.lock
    });

    context["domain-status"] = this.actor.name + " " + game.i18n.localize(
      data.indomain ? "TA.AnomalyDomainStatusIn" : "TA.AnomalyDomainStatusOut"
    );

    switch (data.type) {
      case "major":
        context["type-major-status"] = "-select";
        context["type-minor-status"] = "-unselect";
        context["type-name"] = game.i18n.localize("TYPES.Actor.Anomaly");
        break;
      case "minor":
        context["type-major-status"] = "-unselect";
        context["type-minor-status"] = "-select";
        context["type-name"] = game.i18n.localize("TA.MinorAnomaly");
        break;
    }

    const availableChaos = Number(game.settings.get("triangleagency", "chaos") || 0);
    const effects = [];
    if (context.system.chaosEffects) {
    Object.entries(context.system.chaosEffects).forEach(([key, effect]) => {
      let cost = Number(effect.cost);
      if (data.indomain && !context.editable) {
        cost = cost <= 3 ? 0 : Math.ceil(cost / 3);
      }
      effects.push({
        id: key,
        name: effect.name,
        cost: cost,
        description: effect.description,
        available: cost <= availableChaos || context.editable
      });
    });
    }
    effects.sort((a,b) => (a.cost - b.cost || a.name.localeCompare(b.name)));
    context.extra.chaosEffects = effects;

    context.extra["stabilityTrack"] = [];
    for (let i = 1; i <= data.stability; i++) {
      context.extra.stabilityTrack.push(
        i <= data.currentStability ? true : false
      );
    }

    //console.log(context);

    return context;
  }

  /** @override **/
  setPosition(options = {}) {
    const position = super.setPosition(options);
    const sheetBody = this.element.find('.sheet-body');
    const bodyHeight = position.height + 100;
    sheetBody.css('height', bodyHeight);
    return position;
  }

  /** @inheritDoc */
  async _renderOuter() {
    const html = await super._renderOuter();
    game.ta.helpers.taHelper.adjustHeaderButtons(html, true, this);

    // add extra buttons
    const header = html[0].querySelector(".window-header");
    const parser = new DOMParser();

    let edit = '<a class="control pintogmscreen" data-tooltip="' + game.i18n.localize("TA.GM.PinToScreen") +
      '"><i class="fa-solid fa-thumbtack"></i></a>';
    edit = (parser.parseFromString(edit, 'text/html')).body.firstChild;
    edit.addEventListener("click", this._listenPinToGM.bind(this));
    edit.addEventListener("dblclick", event => event.stopPropagation());
    let firstButton = header.querySelector(".header-button");
    firstButton?.insertAdjacentElement("beforebegin", edit);

    if (!game.ta.settings.transparentWindow) {
      html.find(".window-content").css("background", game.ta.settings.solidWindowColor)
    }

    return html;
  }
  
  
  /** @override */
  async close(options={}) {
    await super.close(options);
    if (game.user.isGM && !this.actor.system.lock) {
      this.actor.update({"system.lock": true});
    }
  }


  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".indomain").change(this._listenSetInDomain.bind(this));
    html.find(".chaos-effect-activate").click(this._listenActivateChaosEffect.bind(this));

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;
    html.find(".AnomalyType").click(this._listenSetAnomalyType.bind(this));
    html.find("#stabilityTrack").click(this._listenSetCurrentStability.bind(this));
    html.find("#stability").change(this._listenSetCurrentStability.bind(this));
    html.find(".chaos-effect-delete").click(this._listenDeleteChaosEffect.bind(this));
    html.find("#chaos-effect-add").click(this._listenAddChaosEffect.bind(this));
  }


  async _listenPinToGM(event) {
    event.preventDefault();
    const data = game.ta.helpers.taHelper.getGMScreenData();
    data.antagonists[this.actor.id] = {
      name: this.actor.name,
      type: this.actor.system.type
    };
    game.ta.helpers.taHelper.setGMScreenData(data);
  }


  async _listenAddChaosEffect(event) {
    event.preventDefault();
    if (this.actor.system.lock) { return }

    const update = {};
    const id = foundry.utils.randomID();
    update["system.chaosEffects." + id] = {
      "name": "New Chaos Effect",
      "cost": 1,
      "description": "Description goes here"
    };
    this.actor.update(update);
  }


  async _listenActivateChaosEffect(event) {
    event.preventDefault();
    if (!this.actor.system.lock) { return }
    
    const target = event.currentTarget;
    const cost = Number(target.dataset.cost);
    let currentChaos = Number(game.settings.get("triangleagency", "chaos") || 0);
    if (cost > currentChaos) { return }

    const effect = this.actor.system.chaosEffects[event.currentTarget.dataset.id];

    const speaker = this.actor.system.hideName ? ChatMessage.getSpeaker({ alias: game.i18n.localize("TYPES.Actor.Anomaly") }) : ChatMessage.getSpeaker({ actor: this.actor });

    let msg = speaker.alias + " " + game.i18n.localize("TA.Anomaly.PerformChaosEffect");
    msg = msg.replace("[effect]", effect.name);
    msg = '<span>' + msg + '</span>';

    game.ta.entities.taChatMessage.create({
      user: game.user.id,
      style: CONST.CHAT_MESSAGE_STYLES.OOC,
      sound: CONFIG.sounds.notify,
      speaker: speaker,
      flags: {
        ta: {
          message: msg
        }
      },
    });

    currentChaos -= cost;
    game.ta.applications.agencyOs.setChaos(currentChaos);
  }


  async _listenDeleteChaosEffect(event) {
    event.preventDefault();

    const target = event.target;

    const proceed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("TA.Dialog.Confirm.Header") },
      content: game.i18n.localize("TA.Dialog.DeleteConfirm"),
      rejectClose: false,
      modal: true
    });

    if (proceed) {
      const updates = {};
      updates["system.chaosEffects." + target.dataset.id] = new foundry.data.operators.ForcedDeletion();
      this.actor.update(updates);
    };
  }


  async _listenSetInDomain(event) {
    event.preventDefault();
    event.stopPropagation();
    this.actor.update({"system.indomain": event.target.checked});
  }


  async _listenSheetEditToggle(event) {
    document.activeElement.blur();
    event.preventDefault();
    event.stopPropagation();

    this.element.find("#toggle-edit-status")
      .removeClass(this.actor.system.lock ? "fa-lock" : "fa-lock-open")
      .addClass(this.actor.system.lock ? "fa-lock-open" : "fa-lock");
    this.actor.update({"system.lock": !this.actor.system.lock});
  }


  async _listenSetAnomalyType(event) {
    event.preventDefault();
    const target = event.currentTarget;
    const data = this.actor.system;
    const targetType = target.dataset.type;

    if (targetType != data.type) {
      this.actor.update({"system.type": targetType});
    }
  }


  async _listenSetCurrentStability(event) {
    event.preventDefault();
    const target = event.target;
    const data = this.actor.system;

    switch (target.dataset.type) {
      case "set":
        let value = Number(target.dataset.id) + 1;
        if (value == data.currentStability) { value -= 1; }
        this.actor.update({"system.currentStability": value});
        break;
      case "max":
        if (data.currentStability != 0) {
          this.actor.update({"system.currentStability": 0});
        }
        break;
    }
  }


  async _onDropItem(event, data) {
    if (this.actor.system.lock) { return }

    const item = await fromUuid(data.uuid);
    const effects = this.actor.system.chaosEffects;

    switch (item.type) {
      case 'ChaosEffect':
        // only one of each effect
        if(!(item.id in effects)) {
          effects[item.id] = {
            "name": item.name,
            "cost": Number(item.system.cost),
            "description": item.system.description
          };
          this.actor.update({"system.chaosEffects": effects});
        }
        break;
    }
  }  
}