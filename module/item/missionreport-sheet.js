export class taMissionReportSheet extends foundry.appv1.sheets.ItemSheet {
  static _warnedAppV1 = true;

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["triangleagency", "sheet", "item", "missionreport"],
      width: 900,
      //height: 600,
      resizable: false,
      tabs: [{ navSelector: '.tabbed', contentSelector: '.tab-content', initial: 'main' }],
      defaultImage: CONFIG.TA.assetPath + "/icons/missionreport-icon.png",      
    });
  }

  /** @override */
  get template() {
    return 'systems/triangleagency/templates/item-missionreport-sheet.hbs';
  }


  /** @inheritDoc */
  async _renderOuter() {
    const html = await super._renderOuter();
    game.ta.helpers.taHelper.adjustHeaderButtons(html, false);
    return html;
  }


  /** @override */
  async getData(options) {
    const data = this.item.system;

    const context = super.getData(options);
    foundry.utils.mergeObject(context, {
      system: data,
      isGM: game.user.isGM,
      extra: this.item.extra || {}
    });

    // housekeeping
    const update = {};
    if (this.item.img != this.options.defaultImage) {
      update["img"] = this.options.defaultImage;
    }
    if (update != {}) { this.item.update(update) };

    // format incident code
    const incidentCode = this.item.id.toUpperCase().match(/.{1,9}/g);
    context.incidentCode = incidentCode[0].match(/.{1,3}/g).join("-") +" / " + incidentCode[1];

    // team
    context.extra.team = [];
    context.extra.mvpName = "N/A";
    context.extra.probationName = "N/A";
    Object.keys(data.agents).forEach((id) => {
      if (id == data.mvp) { context.extra.mvpName = data.agents[id] }
      if (id == data.probation) { context.extra.probationName = data.agents[id] }
      context.extra.team.push({ "id" : id, "name": data.agents[id] })
    });
    context.extra.team.sort((a,b) => a.name.localeCompare(b.name));
    context.extra.canimport = game.actors.filter((actor) => actor.type === "Agent" && actor.hasPlayerOwner && (!Object.keys(data.agents).includes(actor.id))).length > 0;

    context.extra.awardTeam = foundry.utils.deepClone(context.extra.team);
    context.extra.awardTeam.unshift({ "id": "", "name": "N/A"})

    context.extra.objectives = [];
    Object.keys(data.objectives).forEach((id) => {
      data.objectives[id].id = id;
      context.extra.objectives.push(data.objectives[id]);
    });

    context.extra.looseends = [];
    Object.keys(data.looseends).forEach((id) => {
      data.looseends[id].id = id;
      context.extra.looseends.push(data.looseends[id]);
    });

    context.extra.paperworkStatus = [
      { id: "exemplary", name: "TA.Paperwork.exemplary" },
      { id: "complete", name: "TA.Paperwork.complete" },
      { id: "incomplete", name: "TA.Paperwork.incomplete" },
      { id: "inaccurate", name: "TA.Paperwork.inaccurate" },
    ];
    context.extra.paperwork = game.i18n.localize("TA.Paperwork." + data.paperwork)

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

    html.find('#anomalyStatus').click(this._listenAnomalyStatus.bind(this));
    html.find('#addLooseEnd').click(this._listenAddLooseEnd.bind(this));
    html.find('.looseEndDesc').blur(this._listenLooseEndDesc.bind(this));

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;
    html.find("#missionResolved").change(this._listenMissionStatus.bind(this));
    html.find('#importTeam').click(this._listenImportTeam.bind(this));
    html.find('#addObjective').click(this._listenAddObjective.bind(this));
    html.find('.objectiveType').click(this._listenToggleObjectiveType.bind(this));
    html.find('.deleteObjective').click(this._listenDeleteObjective.bind(this));
    html.find('.objectiveDesc').blur(this._listenObjectiveDesc.bind(this));
    html.find('.deleteLooseEnd').click(this._listenDeleteLooseEnd.bind(this));
  }

  
  async _listenMissionStatus(event) {
    event.preventDefault();
    const data = this.item.system;
    const target = event.target;
    const state = target.checked;
    if (state == data.resolved) { return }
    if (state == false && data.resolved) {

      // set all other active missions to resolved. only one active at a time
      const missions = game.items.filter((item) => item.type === "MissionReport" && item.system.resolved == false);
      missions.forEach((mission) => {
        if (mission.id != this.item.id) {
          mission.update({"system.resolved": true});
        }
      });
      this.item.update({"system.resolved": false});
      return;
    }

    // validate and inform
    if (
      data.finalgrade == "" ||
      Object.keys(data.agents).length == 0 ||
      data.status == "" ||
      this.item.name.trim() == "" ||
      data.behavior.trim() == "" ||
      data.focus.trim() == "" ||
      data.domain.trim() == ""
    ) {
      //console.log(data);
      new foundry.applications.api.DialogV2({
        window: { title: game.i18n.localize("TA.Dialog.Notification") },
        modal: true,
        content: game.i18n.localize("TA.Mission.Incomplete"),
        buttons: [
          {
            action: "ok",
            label: game.i18n.localize("TA.Action.Okay"),
            default: true,
          }
        ],
        submit: result => {
          target.checked = false;
        }
      }).render({ force: true });    
    }

    else {
      let msg = '<div class="displayarea" style="width: 700px; padding: 10px; color: black">' +
        '<div>' + game.i18n.localize("TA.Mission.AwardLeadIn") + "</div>" +
        '<ul style="margin: 10px 0 0 0">';
      let commendation = 3;
      switch (data.paperwork) {
        case "exemplary": commendation = 6; break;
        case "incomplete":
        case "inaccurate":
          commendation = 0; break;
      }
      if (commendation > 0) {
        msg += "<li>" + game.i18n.localize("TA.Mission.CommendationAward").replace("[commendation]", commendation) + "</li>";
      }
      if (data.mvp != "") {
        msg += "<li>" + game.i18n.localize("TA.Mission.MVPAward").replace("[agent]", data.agents[data.mvp]) + "</li>";
      }
      if (data.probation != "") {
        msg += "<li>" + game.i18n.localize("TA.Mission.ProbationAward").replace("[agent]", data.agents[data.probation]) + "</li>";
      }
      Object.keys(data.agents).forEach((id) => {
        if (id != data.mvp && id != data.probation) {
          msg += "<li>" + game.i18n.localize("TA.Mission.ParticipationAward").replace("[agent]", data.agents[id]) + "</li>";
        }
      });

      msg += "</ul></div>";

      new foundry.applications.api.DialogV2({
        window: {
          title: game.i18n.localize("TA.Dialog.Notification")
        },
        modal: true,
        content: msg,
        buttons: [
          {
            action: "okay",
            label: game.i18n.localize("TA.Action.Okay")
          },
          {
            action: "cancel",
            label: game.i18n.localize("TA.Action.Cancel"),
            default: true,
          },
        ],
        submit: result => {
          if (result == "okay") {
            this.item.update({"system.resolved": true});
          } else {
            target.checked = false;
          }
        }
      }).render({ force: true });    
    }
  }


  async _listenDeleteLooseEnd(event) {
    const target = event.target;
    const id = target.dataset.id;
    const update = {};
    update["system.looseends." + id] = new foundry.data.operators.ForcedDeletion();
    this.item.update(update);
  }


  async _listenLooseEndDesc(event) {
    const target = event.target;
    const id = target.dataset.id;
    const data = this.item.system.looseends[id];
    const content = target.innerHTML.trim();
    if (content != data.description) {
      const update = {};
      update["system.looseends." + id + ".description"] = content;
      this.item.update(update);
    }
  }

  
  async _listenAddLooseEnd(event) {
    event.preventDefault();

    const id = foundry.utils.randomID();
    const update = {};
    update["system.looseends." + id] = {
      "name": "Loose End",
      "value": 1,
      "description": ""
    };
    this.item.update(update);
  }


  async _listenDeleteObjective(event) {
    const target = event.target;
    const id = target.dataset.id;
    const update = {};
    update["system.objectives." + id] = new foundry.data.operators.ForcedDeletion();
    this.item.update(update);
  }


  async _listenObjectiveDesc(event) {
    const target = event.target;
    const id = target.dataset.id;
    const data = this.item.system.objectives[id];
    const content = target.innerHTML.trim();
    if (content != data.description) {
      const update = {};
      update["system.objectives." + id + ".description"] = content;
      this.item.update(update);
    }
  }


  async _listenToggleObjectiveType(event) {
    event.preventDefault();

    const update = {};
    const id = event.currentTarget.dataset.id;
    let next = "commendation";
    switch (this.item.system.objectives[id].type) {
      case "commendation":
        next = "demerit";
        break;
      case "demerit":
        next = "custom";
        break;
    }
    update["system.objectives." + id + ".type"] = next;
    this.item.update(update);
  }

  
  async _listenAddObjective(event) {
    event.preventDefault();

    const id = foundry.utils.randomID();
    const update = {};
    update["system.objectives." + id] = {
      "type": "commendation",
      "value": 1,
      "description": ""
    };
    this.item.update(update);
  }

  
  async _listenAnomalyStatus(event) {
    event.preventDefault();
    let status = event.target.dataset.status;
    if (status) {
      if (status == this.item.system.status) { status = "" } // clear the selection if re-clicked
      this.item.update({"system.status": status});
    }
  }


  async _listenImportTeam(event) {
    event.preventDefault();

    // add available PCs
    const agents = game.actors.filter((actor) => actor.type === "Agent" && actor.hasPlayerOwner && (!Object.keys(this.item.system.agents).includes(actor.id)))
      .map((actor) => { return { "id": actor.id, "name": actor.name } });
    if (agents.length == 0) { return }

    //console.log(agents)
    const update = {};
    agents.forEach((agent) => {
      update["system.agents." + agent.id] = agent.name;
    });
    this.item.update(update);
  }


}