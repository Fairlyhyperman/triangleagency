export class taAgentSheet extends foundry.appv1.sheets.ActorSheet {
  static _warnedAppV1 = true;

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["triangleagency", "sheet", "actor"],
      width: 1000,
      height: 666,
      resizable: false,
      tabs: [
        { navSelector: ".tabbed", contentSelector: ".tab-content", initial: "profile" },
        { navSelector: ".anomaly-nav", contentSelector: ".anomaly-content", initial: "" },
        { navSelector: ".requisition-nav", contentSelector: ".requisition-content", initial: "" },
        { navSelector: ".relationships-nav", contentSelector: ".relationships-content", initial: "" }
      ],
    });
  }

  /** @override */
  get template() {
    return "systems/triangleagency/templates/actor-agent-sheet.hbs";
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
      editable: !this.actor.system.lock
    });

    context.extra.manualStanding = game.ta.settings.manualStanding;
    let standing = data.agency.career.demerits > 10 ? 10 : data.agency.career.demerits;
    if (context.extra.manualStanding) {
      standing = data.agency.standing;
    }
    context.extra.standing = game.i18n.localize("TA.Standing" + standing);
    
    context.extra.playerExtra = game.user.isGM || game.ta.settings.playerExtra;
    context.extra.playerPlaywallTracks = game.user.isGM || game.ta.settings.playerPlaywallTracks;

    /*
    **********************************************************
    QAs
    **********************************************************
    */
    
    context.extra.qas = Object.keys(data.qa)
      .map(qa => { return { qa: qa, name: game.i18n.localize("TA.Quality." + qa), data: data.qa[qa] }})
      .sort((a,b) => a.name.localeCompare(b.name));


    /*
    **********************************************************
    MISSION OBJECTIVES
    **********************************************************
    */
    const mission = await game.ta.helpers.taHelper.currentMission();
    if (mission) {
      const objectives = mission.system.objectives;
      context.extra.missionObjectives = Object.values(objectives).map((obj) => obj.display);
    }


    /*
    **********************************************************
    ANOMALY
    **********************************************************
    */
    if (data.anomaly.type != "") {
      context.extra["anomaly"] = {};
      context.extra.anomaly.name = data.anomaly.name;

      const abilities = this.actor.items.filter((item) => item.type === "AnomalyAbility").sort((a, b) => a.name.localeCompare(b.name));
      const work = [];

      abilities.forEach(async (item) => {
        const improvement = item.system.improvement;
        const qas = data.qa;
        const ability = {
          id: item.id,
          name: item.name,
          reference: item.system.reference,
          practiced: improvement.practiced,
          canImprove: improvement.question != "",
          improvement: {
            visible: improvement.visible,
            showReview: improvement.visible,
            question: improvement.question
          },
          rendered: ""
        };

        const review = ability.improvement;
        review.answers = {}
        let i = 1;

        const answers = item.system.improvement.answers;
        Object.keys(answers).sort().forEach(async (answer) => {
          review.answers[answer] = {
            text: answers[answer].text
          }
          const track = answers[answer].track;
          track.id = item.id;
          track.name = answer;
          track.milestones[String(track.size)] = answers[answer].nextStage;

          review.answers[answer].track = await game.ta.helpers.taHelper.renderTrack({
            track: track,
            columns: track.size,
            startIcon: "&#9654;",
            render: true,
            showMilestoneContent: true,
            renderOptions: {
              trackClass: CONFIG.TA.aspects.anomaly.colorClass,
              trackType: "anomaly",
              boxClass: "peerreview"
            }
          });
          
          i++;
        });

        ability.rendered = await game.ta.helpers.taHelper.renderAnomalyAbility ({
          ability: item,
          qas: qas,
          anomaly: data.anomaly.name,
          actionable: true,
          showTitle: false
        });
  
        work.push(ability);
      });
      context.extra.anomaly.abilities = work;
    }


    /*
    **********************************************************
    create the Work/Life tracks
    **********************************************************
    */

    const worklife = {};
    ["anomaly", "reality", "competency"].forEach(async (aspect) => {
      if (data[aspect].type != "") {
        const track = data[aspect].workLife;
        track.size = 30;
        track.milestones = CONFIG.TA.playwall[aspect].worklife;
        worklife[aspect] = await game.ta.helpers.taHelper.renderTrack({
          track: track,
          columns: 15,
          canstrike: true,
          startIcon: "&#9654;",
          render: true,
          showMilestoneContent: true,
          renderOptions: {
            trackClass: CONFIG.TA.aspects[aspect].colorClass,
            trackType: aspect,
            boxClass: "worklife"
          }
        });
      }
    });
    context.extra.worklife = worklife;


    /*
    **********************************************************
    REALITY
    **********************************************************
    */

    if (data.reality.type != "") {
      const reality = await fromUuid(data.reality.type);
      context.extra["reality"] = {};
      context.extra.reality.name = reality.name;
      context.extra.reality.system = reality.system;
      const track = reality.system.realityTrigger.track;

      track.value = data.reality.triggerValue;
      context.extra.triggerTrack = await game.ta.helpers.taHelper.renderTrack({
        track: track,
        columns: 5,
        showMilestoneContent: true,
        canstrike: false,
        startIcon: "&#9654;",
        render: true,
        canaction: true,
        renderOptions: {
          trackClass: CONFIG.TA.aspects.reality.colorClass + " center",
          trackType: "reality",
          boxClass: "realitytrigger"
        }
      });
    }


    /*
    **********************************************************
    COMPETENCY
    **********************************************************
    */

    if (data.competency.type != "") {
      const competency = await fromUuid(data.competency.type);
      context.extra["competency"] = {};
      context.extra.competency.name = competency.name;
      context.extra.competency.system = competency.system;

      context.extra.primeDirectiveBlurb = competency.system.primeDirectiveBlurb;
      context.extra.sanctionedBehaviors = competency.system.sanctionedBehaviors;
    }

    // REQUISITIONS
    const requisitions = this.actor.items.filter((item) => item.type === "Requisition").sort((a,b) => a.name.localeCompare(b.name));
    requisitions.forEach(async (requisition) => {
      if (!requisition.unlimited) {
        requisition.trackDisplay = await game.ta.helpers.taHelper.renderTrack({
          track: {
            id: requisition.id,
            value: requisition.system.used,
            size: requisition.system.missionUses,
          },
          columns: requisition.system.missionUses,
          canstrike: false,
          startIcon: "&#9654;",
          render: true,
          canaction: true,
          renderOptions: {
            trackClass: CONFIG.TA.aspects.competency.colorClass + " center",
            trackType: "competency",
            boxClass: "requisition-box"
          }
        });
      }
    });
    context.extra.requisitions = requisitions;


    // RELATIONSHIPS
    const relationships = Object.values(data.reality.relationships).sort((a,b) => a.name.localeCompare(b.name));
    context.extra.relationships = relationships;
    context.extra.networkSize = 0;
    relationships.forEach(async (relationship) => {
      relationship.active = relationship.network || relationship.active;
      relationship.bonusName = game.i18n.localize("TA.Agent.ConnectionBonus");
      if (relationship.bonus != "") {
        const benefit = game.items.get(relationship.bonus);
        if (benefit) {
          relationship.bonusName = benefit.name;
          relationship.bonusDescription = benefit.system.description;
        }
      }

      relationship.track.id = relationship.id;
      if (relationship.network) { context.extra.networkSize += 1 }

      switch(relationship.type) {
        case "relationship": {
          relationship.typeDisplay = game.i18n.localize("TA.Agent.Connection");
          relationship.typeContext = "reality";
          relationship.track.milestones["9"] = '<i class="fa-solid fa-globe fa-lg" style="vertical-align: middle; margin: auto"></i>';
          break;
        }
        case "fugitive": {
          relationship.typeDisplay = game.i18n.localize("TA.Agent.Connection");
          relationship.typeContext = "anomaly";
          relationship.track.milestones["9"] = '<i class="fa-solid fa-bolt fa-lg" style="vertical-align: middle; margin: auto"></i>';
          break;
        }
        case "tether": {
          relationship.typeDisplay = game.i18n.localize("TA.Agent.Tether");
          relationship.typeContext = "reality";
          relationship.track.milestones["30"] = '<i class="fa-solid fa-thumbtack fa-lg" style="vertical-align: middle; margin: auto"></i>';
          break;
        }
      }

      relationship.trackDisplay = await game.ta.helpers.taHelper.renderTrack({
        track: relationship.track,
        columns: relationship.type == "tether" ? 15 : 9,
        canstrike: false,
        startIcon: "&#9654;",
        render: true,
        canaction: true,
        showMilestoneContent: true,
        renderOptions: {
          trackClass: CONFIG.TA.aspects[relationship.typeContext].colorClass,
          trackType: "reality",
          boxClass: "connection-box"
        }
      });
    });
    context.extra.canTether = Object.keys(data.achievements["reality"]).includes("V2");
    context.extra.canSeek = Object.keys(data.achievements["anomaly"]).includes("H3");
    context.extra.RelationshipOptions = context.extra.canTether || context.extra.canSeek;

    context.extra.users = {};
    for(const user of game.users.players.sort((a,b) => a.name.localeCompare(b.name))) {
      context.extra.users[user.name] = user.name;
    }
    context.extra.users["GM"] = "GM";


    /*
    **********************************************************
    PLAYWALL
    **********************************************************
    */
    context.extra.playwall = {};
    Object.keys(data.achievements).forEach((aspect) => {
      context.extra.playwall[aspect] = Object.keys(data.achievements[aspect]).sort().join(", ");
    });
    context.extra.showPlaywallButton = data.allPlaywall.length > 0;

    /*
    **********************************************************
    NOTES
    **********************************************************
    */

    const timeline = {};
    for (let i = 1; i <= 30; i++) { timeline[i] = i }

    context.extra.timeTrack = await game.ta.helpers.taHelper.renderTrack({
      track: {
        id: "time",
        name: "Time",
        size: 30,
        value: data.agency.time,
        milestones: timeline
      },
      columns: 15,
      render: true,
      startIcon: "&#9654;",
      showMilestoneContent: true,
      canaction: true,
      renderOptions: {
        trackClass: "color-purple",
        trackType: "timetrack",
        boxClass: "timebox",
        highlightMilestones: false
      }
    });

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
    game.ta.helpers.taHelper.adjustHeaderButtons(html, false);
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
    html.find(".qa-pips").click(this._listenSetQAPip.bind(this));
    html.find("#conflictResolution").click(this._listenConflictResolution.bind(this));
    html.find("#lifeInsurance").click(this._listenLifeInsurance.bind(this));
    html.find(".qa-check").click(this._listenQualityCheck.bind(this));
    html.find(".realitytrigger.track-box.track-action").click(this._listenRealityTrigger.bind(this));
    html.find(".connectionBonusAction.context-clickable").click(this._listenConnectionBonusAction.bind(this));
    html.find(".requisition-box.track-action").click(this._listenRequisitionUse.bind(this));
    html.find("#showPlaywall").click(this._listenShowPlaywall.bind(this));
    html.find(".gotoPlaywall").click(this._listenGotoPlaywall.bind(this));
    html.find(".specialDice").click(this._listenSpecialDice.bind(this));
    html.find(".abilitytrack.track-action").click(this._listenAbilityTrack.bind(this));
    html.find(".recordPerformance").change(this._listenRecordPerformance.bind(this));
    html.find(".requisitionNote").change(this._listenRequisitionNote.bind(this));
    html.find(".qacurr").change(this._listenQACurrent.bind(this));
    html.find(".togglePeerReview").click(this._listenTogglePeerReview.bind(this));
    html.find(".timebox.track-action").click(this._listenTimeTrack.bind(this));
    
    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;
    html.find("#resetQAs").click(this._listenResetQAs.bind(this));
    html.find(".worklife.track-box.track-action").click(this._listenWorklife.bind(this));
    html.find(".delete-requisition").click(this._listenDeleteRequisition.bind(this));
    html.find(".add-relationship").click(this._listenAddRelationship.bind(this));
    html.find(".delete-relationship").click(this._listenDeleteRelationship.bind(this));
    html.find(".connection-box.track-action").click(this._listenConnectionTrack.bind(this));
    html.find(".setPracticed").change(this._listenSetPracticed.bind(this));
    html.find(".delete-ability").click(this._listenDeleteAbility.bind(this));
    html.find(".peerreview.track-action").click(this._listenPeerReview.bind(this));
    html.find("#togglePlaywallLock").click(this._listenTogglePlaywallLock.bind(this));
    //html.find("#resyncPaywall").click(this._listenResyncPlaywall.bind(this));
    html.find(".qamax").change(this._listenQAMax.bind(this));
    html.find(".playwallReference").change(this._listenPlaywallReferenceChange.bind(this));
    html.find(".showBystander").click(this._listenAssociatedBystander.bind(this));
    html.find(".playedby").change(this._listenPlayedBy.bind(this));
  }


  async _listenPlayedBy(event) {
    event.preventDefault();
    const relationshipId = event.currentTarget.dataset.relationshipid;
    const playerName = event.currentTarget.value;
    const update = {};
    const relationship = this.actor.system.reality.relationships[relationshipId];

    if (relationship.bystanderId) {
      // set the Bystander permissions, if necessary
      const bystander = game.actors.get(relationship.bystanderId);
      if (bystander) {
        if (relationship.playedby && relationship.playedby != "GM") {
          const player = game.users.getName(relationship.playedby);
          if (player) {
            game.ta.helpers.taHelper.setObjectPermissions("Actor", relationship.bystanderId, player.id, null);
          }
        }
        if (playerName != "GM") {
          const player = game.users.getName(playerName);
          if (player) {
            game.ta.helpers.taHelper.setObjectPermissions("Actor", relationship.bystanderId, player.id, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
          }
        }
      }
    }
    //console.log(relationship)

    update["system.reality.relationships." + relationshipId + ".playedby"] = playerName;
    this.actor.update(update);
  }


  async _listenAssociatedBystander(event) {
    event.preventDefault();
    const relationshipId = event.currentTarget.dataset.relationship;
    if (!relationshipId) { return }
    const relationship = this.actor.system.reality.relationships[relationshipId];
    let bystanderId = event.currentTarget.dataset.bystander;

    if (bystanderId) {
      const bystander = await game.actors.get(bystanderId);
      if (bystander) {
        bystander.sheet.render(true);
        return;
      }
      else {
        const update = {};
        update["system.reality.relationships." + relationshipId + ".bystanderId"] = null;
        this.actor.update(update);
        bystanderId = null;
      }
    }

    const buttons = [
      {
        action: 'create',
        label: game.i18n.localize("TA.Agent.BystanderCreate")
      },
      {
        action: 'cancel',
        label: game.i18n.localize("TA.Action.Cancel")
      }
    ];

    // check if there is an existing Bystander with the same name
    bystanderId = null;
    if (relationship.name != "Relationship") {
     const matches = game.actors.filter(actor => actor.type === "Bystander" && actor.name == relationship.name);
      if (matches.length > 0) {
        bystanderId = matches[0].id;
        buttons.unshift({
          action: 'match',
          label: game.i18n.localize("TA.Agent.BystanderMatch")
        });
      }
      else {
        bystanderId = null;
      }
    }

    let player = game.users.getName(relationship.playedby);
    if (player) {
      player = player.id;
    }
    else {
      player = null;
    }

    new foundry.applications.api.DialogV2({
      window: { title: game.i18n.localize("TA.Dialog.Notification") },
      modal: true,
      content: bystanderId ? game.i18n.localize("TA.Agent.BystanderMatched") : game.i18n.localize("TA.Agent.BystanderUnmatched"),
      position: {
        "width": 600
      },
      buttons: buttons,
      submit: result => {
        switch (result) {
          case "match": {
            const update = {};
            update["system.reality.relationships." + relationshipId + ".bystanderId"] = bystanderId;
            this.actor.update(update);
            // set permissions
            if (relationship.playedby != "GM") {
              if (player && game.user.isGM) {
                const permission = {};
                permission["ownership." + player] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
                const npc = game.actors.get(bystanderId);
                npc.update(permission);
              }
            }
            game.actors.get(bystanderId).sheet.render(true);
            break;
          }

          case "create": {
            const params = {
              name: relationship.name,
              type: "Bystander",
              "system.description": relationship.description
            }
            if (player && game.user.isGM) {
              params["ownership." + player] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
            }

            const bystander = Actor.create(params);
            bystander.then(result => {
              const update = {};
              update["system.reality.relationships." + relationshipId + ".bystanderId"] = result.id;
              this.actor.update(update);
              game.actors.get(result.id).sheet.render(true);
            })
            break;
          }

          case "cencel":
            break;
          }
      }
    }).render({ force: true });
  }


  async _listenTimeTrack(event) {
    event.preventDefault();
    const value = Number(event.currentTarget.dataset.value);
    const context = event.currentTarget.parentElement.dataset.type;
    const track = this.actor.system.agency.time;
    const update = {};

    if (value == track) { // unselect value
      update["system.agency.time"] = value - 1;
    }
    else if (value == track + 1) { // select new value
      update["system.agency.time"] = value;
    }
    this.actor.update(update);
  }

  /* // no longer needed
  async _listenResyncPlaywall(event) {
    game.ta.helpers.taHelper.resyncPlaywall(this.actor.id, false);
  }
  */


  async _listenPlaywallReferenceChange(event) {
    event.preventDefault();
    const oldSet = new Set(event.target.dataset.list.split(/\s*[,;]\s*/).filter(item => item != ""));
    const newSet = new Set(event.target.value.split(/\s*[,;]\s*/).filter(item => item != ""));
    const added = [...newSet].filter((item) => !oldSet.has(item));
    const deleted = [...oldSet].filter((item) => !newSet.has(item));

    // adds
    for(let pw of added) {
      const journal = game.ta.helpers.taHelper.playwallPage(pw);
      if (journal.page) {
        const page = game.journal.get(journal.journal).pages.get(journal.page);
        let context = page.system.aspect;
        this.actor.addPlaywall(pw, context, {});
      }
    }

    // deletes
    for(let pw of deleted) {
      this.actor.removePlaywall(pw);
    }
  }
  

  async _listenRequisitionNote(event) {
    event.preventDefault();
    const id = event.target.dataset.id;
    const requisition = this.actor.items.get(id);
    if (requisition) {
      const value = event.target.value;
      requisition.update({"system.notes": value});
    }
  }


  async _listenRecordPerformance(event) {
    const actor = this.actor;
    const context = event.target.dataset.context;
    const old = Number(event.target.dataset.old);
    const value = Number(event.target.value);
    const update = {};

    if (value > old) {
      update["system.mission." + context] = Number(actor.system.mission[context]) + value - old;
    }
    if (value > Number(actor.system.agency.career[context])) {
      update["system.agency.career." + context] = value;
    }
    actor.update(update);
  }


  async _listenAbilityTrack(event) {
    event.preventDefault();
    const context = event.currentTarget.dataset;
    const value = Number(context.value);
    const ability = this.actor.items.get(context.id);
    const track = ability.system.track;

    const update = {};
    if (value == track.value) { // unselect value
      update["system.track.value"] = value - 1;
    }
    else if (value == track.value + 1) { // select new value
      update["system.track.value"] = value;
    }
    ability.update(update);
  }

  
  async _listenSpecialDice(event) {
    event.preventDefault();
    const target = $(event.target);
    const parent = $(event.currentTarget);
    const type = target.data("type");
    if (!type) { return }

    if (type == "d20") {
      game.ta.helpers.taDice.rollD20({
        actor: this.actor,
        quality: null,
        supplement: null,
        burnout: 0
      });
    }
    else if (type != "d8") {
      if (target.hasClass("blink")) {
        target.removeClass("blink")
        parent.data(type, false);
      }
      else {
        target.addClass("blink")
        parent.data(type, true);
      }
    }
  }

  
  async _listenQACurrent(event) {
    event.preventDefault();
    const target = event.target;
    const data = this.actor.system;
    const quality = target.dataset.quality;
    const update = {};
    if (target.value > data.qa[quality].max) {
      target.value = data.qa[quality].max;
    }
    update["system.qa." + quality + ".value"] = Number(target.value);
    this.actor.update(update);
  }

  
  async _listenQAMax(event) {
    event.preventDefault();
    const target = event.target;
    const data = this.actor.system;
    const quality = target.dataset.quality;
    const update = {};
    update["system.qa." + quality + ".max"] = Number(target.value);
    if (data.qa[quality].value > target.value) {
      update["system.qa." + quality + ".value"] = Number(target.value);
    }
    this.actor.update(update);
  }

  
  async _listenShowPlaywall(event) {
    event.preventDefault();
    game.ta.helpers.taHelper.togglePlaywall();
  }


  async _listenGotoPlaywall(event) {
    event.preventDefault();
    const playwall = event.target.dataset.playwall;
    game.ta.helpers.taHelper.gotoPlaywall(playwall);
  }


  async _listenTogglePlaywallLock(event) {
    event.preventDefault();
    const status = this.actor.system.achievementsLocked;
    this.actor.update({
      "system.achievementsLocked": !status
    });
  }


  async _listenPeerReview(event) {
    event.preventDefault();
    const context = event.currentTarget.dataset;
    const value = Number(context.value);
    const ability = this.actor.items.get(context.id);
    const track = ability.system.improvement.answers[context.name].track;
    const playwall = track.milestones[String(value)];

    const update = {};
    const actorUpdate = {};
    if (value == track.value) { // unselect value
      update["system.improvement.answers." + context.name + ".track.value"] = value - 1;
      if (playwall) {
        //actorUpdate["system.achievements.anomaly.-=" + playwall] = null;
        game.ta.helpers.taHelper.removePlaywall(this.actor.id, playwall);
        //this.actor.removePlaywall(playwall);
      }
    }
    else if (value == track.value + 1) { // select new value
      update["system.improvement.answers." + context.name + ".track.value"] = value;
      if (playwall) {
        //actorUpdate["system.achievements.anomaly." + playwall] = {};
        game.ta.helpers.taHelper.addPlaywall(this.actor.id, playwall, "anomaly", {});
        //this.actor.addPlaywall(playwall, "anomaly", {});
      }
    }
    ability.update(update);
    this.actor.update(actorUpdate);
  }


  async _listenTogglePeerReview(event) {
    event.preventDefault();
    const id = event.currentTarget.dataset.id;
    const ability = this.actor.items.get(id);
    ability.update({
      "system.improvement.visible": !ability.system.improvement.visible
    });
  }


  async _listenDeleteAbility(event) {
    event.preventDefault();

    const proceed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("TA.Dialog.Confirm.Header") },
      content: game.i18n.localize("TA.Dialog.DeleteConfirm"),
      rejectClose: false,
      modal: true
    });

    if (proceed) {
      const id = event.target.dataset.id;
      const playwall = this.actor.items.get(id).system.reference;
      if (playwall == "") {
        this.actor.deleteEmbeddedDocuments('Item', [id]);
      }
      else {
        this.actor.removePlaywall(playwall);
      }
    };
  }


  async _listenSetPracticed(event) {
    event.preventDefault();
    const id = event.target.dataset.id;
    const state = event.target.checked;
    const ability = this.actor.items.get(id);
    ability.update({
      "system.improvement.practiced": state
    });
  }


  async _listenRequisitionUse(event) {
    event.preventDefault();
    const data = event.currentTarget.dataset;
    const value = Number(data.value);
    const id = data.id;
    const requisition = this.actor.items.get(id);
    const uses = requisition.system.used;
    
    if (value == uses) { // unselect value
      requisition.update({"system.used": value - 1});
    }
    else if (value == uses + 1) { // select new value
      requisition.update({"system.used": value});
    }
  }


  async _listenConnectionTrack(event) {
    event.preventDefault();
    const value = Number(event.currentTarget.dataset.value);
    const id = event.currentTarget.dataset.id;
    const relationship = this.actor.system.reality.relationships[id];
    const trackValue = relationship.track.value;
    const update = {};
    const updatePath = "system.reality.relationships." + id;

    if (value == trackValue) { // unselect value
      update[updatePath + ".track.value"] = value - 1;
      if (relationship.type == "relationship" && (value - 1 == relationship.track.size - 1)) {
        update[updatePath + ".network"] = false;
      }
    }
    else if (value == trackValue + 1) { // select new value
      update[updatePath + ".track.value"] = value;
      if (relationship.type == "relationship" && value == relationship.track.size) {
        update[updatePath + ".network"] = true;
      }
    }
    this.actor.update(update);
  }


  async _listenConnectionBonusAction(event) {
    event.preventDefault();
    const id = event.currentTarget.dataset.id;
    const relationship = this.actor.system.reality.relationships[id];

    let msg = game.i18n.localize("TA.Agent.ActivateConnectionBonus");
    msg = msg.replaceAll("[relationship]", relationship.name);
    msg = msg.replaceAll("[bonus]", event.currentTarget.innerText);
    msg = '<span>' + msg + '</span>';

    game.ta.entities.taChatMessage.create({
      user: game.user.id,
      style: CONST.CHAT_MESSAGE_STYLES.OOC,
      sound: CONFIG.sounds.notify,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flags: {
        ta: {
          message: msg
        }
      },
    });

    const update = {};
    update["system.reality.relationships." + id + '.active'] = false;
    this.actor.update(update);
  }


  async _listenDeleteRelationship(event) {
    event.preventDefault();
    const proceed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("TA.Dialog.Confirm.Header") },
      content: '<div style="text-align: center">' + game.i18n.localize("TA.Dialog.DeleteConfirm") + "</div>",
      rejectClose: false,
      modal: true
    });

    if (proceed) {
      const update = {};
      update["system.reality.relationships." + event.target.dataset.id] = new foundry.data.operators.ForcedDeletion();
      this.actor.update(update);
    };
  }

  async _listenAddRelationship(event) {
    event.preventDefault();
    const update = {};
    const type = event.target.dataset.type;
    const id = foundry.utils.randomID();
    const track = foundry.utils.deepClone(game.ta.config.templates.track);

    let name = "";
    switch(type) {
      case "relationship": {
        name = game.i18n.localize("TA.Agent.Relationship");
        track.size = 9;
        track.milestones = {"9": "Network"};
        break;
      }
      case "tether": {
        name = game.i18n.localize("TA.Agent.Tether");
        track.size = 30;
        track.milestones = {"30": "Permanent"};
        break;
      }
      case "fugitive": {
        name = game.i18n.localize("TA.Agent.FugitiveAnomaly");
        track.size = 9;
        track.milestones = {"9": "Ability"};
        break;
      }
    }

    update["system.reality.relationships." + id] = {
      id: id,
      name: name,
      description: "",
      track: track,
      active: false,
      network: false,
      type: type,
      hasBenefit: type == "relationship",
      bonus: "",
      bystanderId: null,
      playedby: "GM"
    };
    this.actor.update(update);
  }


  async _listenRealityTrigger(event) {
    event.preventDefault();
    const value = Number(event.currentTarget.dataset.value);
    const context = event.currentTarget.parentElement.dataset.type;
    const track = this.actor.system.reality.triggerValue;
    const update = {};

    if (value == track) { // unselect value
      update["system.reality.triggerValue"] = value - 1;
    }
    else if (value == track + 1) { // select new value
      update["system.reality.triggerValue"] = value;
    }
    this.actor.update(update);
  }


  async _listenDeleteRequisition(event) {
    event.preventDefault();

    const proceed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("TA.Dialog.Confirm.Header") },
      content: game.i18n.localize("TA.Dialog.DeleteConfirm"),
      rejectClose: false,
      modal: true
    });

    if (proceed) {
      const id = event.target.dataset.id;
      this.actor.deleteEmbeddedDocuments('Item', [id])
    };
  }


  async _listenWorklife(event) {
    event.preventDefault();
    const value = Number(event.currentTarget.dataset.value);
    const context = event.currentTarget.parentElement.dataset.type;
    const worklife = this.actor.system[context].workLife;
    const playwall = game.ta.config.playwall[context].worklife[String(value)];
    const update = {};

    if (value == worklife.value) { // unselect value
      update["system." + context + ".workLife.value"] = value - 1;
      if (playwall) { 
        game.ta.helpers.taHelper.removePlaywall(this.actor.id, playwall);
        //this.actor.removePlaywall(playwall)
      }
    }
    else if (31 - value == worklife.strikes) { // unselect strike
      update["system." + context + ".workLife.strikes"] = worklife.strikes - 1;
    }
    else if ((value == worklife.value + 1) && (31 - value == worklife.strikes + 1)) { // last box left
      new foundry.applications.api.DialogV2({
        window: { title: game.i18n.localize("TA.Dialog.Notification") },
        modal: true,
        content: '<div class="center">Do you want this box to be checked or struck?</div>',
        buttons: [
          {
            action: 'check',
            label: 'Checked',
            default: true,
          },
          {
            action: 'struck',
            label: 'Struck'
          }
        ],
        submit: result => {
          switch (result) {
            case "check":
              update["system." + context + ".workLife.value"] = value;
              if (playwall) {
                game.ta.helpers.taHelper.addPlaywall(this.actor.id, playwall, context, {});
                //this.actor.addPlaywall(playwall, context, {});
              }
              break;
            case "struck":
              update["system." + context + ".workLife.strikes"] = worklife.strikes + 1;
              break;
            }
            this.actor.update(update);
        }
      }).render({ force: true });    
    }
    else if (value == worklife.value + 1) { // select new value
      update["system." + context + ".workLife.value"] = value;
      if (playwall) {
        game.ta.helpers.taHelper.addPlaywall(this.actor.id, playwall, context, {});
        //this.actor.addPlaywall(playwall, context, {});
      }
    }
    else if (31 - value == worklife.strikes + 1) { // select new strike
      update["system." + context + ".workLife.strikes"] = worklife.strikes + 1;
    }
    this.actor.update(update);
  }


  async resolveDiceAction(dicetype, options) {
    const actorData = this.actor.system;
    const data = options.data;
    const quality = actorData.qa[options.quality];
    quality.id = options.quality;
    const burnout = this.actor.system.burnoutRelease ? 0 :
      (quality.value == 0 ? 1 : 0) +
      this.actor.system.burnout +
      (data.action == "ata" ? Number(game.settings.get("triangleagency", "burnout")) : 0);

    let msg = "";

    switch (data.action) {
      case "ata": { // Ask the Agency
        msg = game.i18n.localize("TA.Agent.AskTheAgencyMsg");
        msg = msg.replaceAll("[quality]", game.i18n.localize("TA.Quality." + data.qa));
        game.ta.helpers.taDice.rollD4({
          actor: this.actor,
          quality: quality,
          supplement: actorData.dice.d8 ? "d8" : undefined,
          burnout: burnout,
          message: msg,
          action: "ata"
        });
        break;
      }

      case "anomaly-ability": {// what it says on the tin
        const ability = this.actor.items.get(data.abilityid);
        msg = game.i18n.localize("TA.Agent.UseAbilityMsg");
        msg = msg.replaceAll("[quality]", game.i18n.localize("TA.Quality." + data.qa));
        msg = msg.replaceAll("[anomaly]", data.anomaly);
        msg = msg.replaceAll("[ability]", ability.name);
        if (ability.system.chat != "") {
          msg += "<div>" + ability.system.chat + "</div>";
        }

        let hasD6 = false;
        if (actorData.dice.d6) {
          hasD6 = $(this.form).find("#hasD6").hasClass("blink");
        }
        if (actorData.dice.d10 && $(this.form).find("#hasD10").hasClass("blink")) {
          game.ta.helpers.taDice.rollD10({
            actor: this.actor,
            quality: quality,
            supplement: hasD6 ? "d6" : undefined,
            burnout: burnout,
            message: msg,
            action: "anomaly",
            ability: ability
          });
          $(this.form).find("#hasD10").removeClass("blink");
        }
        else {
          game.ta.helpers.taDice.rollD4({
            actor: this.actor,
            quality: quality,
            supplement: hasD6 ? "d6" : undefined,
            burnout: burnout,
            message: msg,
            action: "anomaly",
            ability: ability
          });
        }

        if (hasD6) {
          $(this.form).find("#hasD6").removeClass("blink");
        }

        ability.update({"system.improvement.practiced": true});
        break;
      }
    }

    if (this.actor.system.burnoutRelease) {
      this.actor.update({"system.burnoutRelease": false});
    }
  }


  async _listenQualityCheck(event) {
    event.preventDefault();
    document.activeElement.blur();
    const data = event.currentTarget.dataset;

    this.resolveDiceAction(
      "d4",
      {
        data: data,
        quality: data.qa
      }
    );
  }


  async _listenLifeInsurance(event) {
    event.preventDefault();
    //document.activeElement.blur();

    let msg = '<span>' + game.i18n.localize("TA.Agent.LifeInsuranceMsg") + '</span>';
    game.ta.entities.taChatMessage.create({
      user: game.user.id,
      style: CONST.CHAT_MESSAGE_STYLES.OOC,
      sound: CONFIG.sounds.notify,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flags: {
        ta: {
          message: msg
        }
      },
    });

    this.actor.update({
      "system.agency.commendations": this.actor.system.agency.commendations - 5
    });
  }


  async _listenConflictResolution(event) {
    event.preventDefault();
    //document.activeElement.blur();

    const msg = '<span style="margin-bottom: 4px">' +
      game.i18n.localize("TA.Agent.ConflictResolutionMsg") +
      '</span><div id="outcome"></div>';

    const pool = game.ta.helpers.taDice.rollGroup("d4", undefined);
    pool.primary.type = "conflict";

    const template = "systems/triangleagency/templates/part-conflict-outcome.hbs";

    game.ta.entities.taChatMessage.create({
      user: game.user.id,
      style: CONST.CHAT_MESSAGE_STYLES.OOC,
      sound: CONFIG.sounds.notify,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flags: {
        ta: {
          dice: "conflict",
          outcome: pool,
          template: template,
          message: msg
        }
      },
    });    
  }


  async _listenResetQAs(event) {
    event.preventDefault();
    //document.activeElement.blur();

    const updates = {};
    Object.keys(this.actor.system.qa).forEach(quality => {
      const max = this.actor.system.qa[quality].max;
      if (this.actor.system.qa[quality].value != max) {
        updates["system.qa." + quality + ".value"] = max;
      }
    });
    this.actor.update(updates);
  }


  async _listenSetQAPip(event) {
    event.preventDefault();
    //document.activeElement.blur();

    const quality = event.currentTarget.dataset.qa;
    let pip = Number(event.target.dataset.value);
    const currentPip = this.actor.system.qa[quality].value;
    const updates = {};

    // can QAs go higher than max?
    const max = Number(this.actor.system.qa[quality].max);
    if (pip > max) { return };

    // was the last pip clicked and active?
    if (pip == currentPip) { pip = pip - 1 }

    updates["system.qa." + quality + ".value"] = pip;
    this.actor.update(updates);
  }


  async _onDropItem(event, data) {
    const item = await fromUuid(data.uuid);
    const actor = this.actor;
    const updates = {};

    switch (item.type) {
      case 'Anomaly':
        // remove any previous anomaly data
        let abilities = this.actor.items.filter((item) => item.type === "AnomalyAbility").map(item => item.id);
        actor.deleteEmbeddedDocuments("Item", abilities);

        // add the default anomaly abilities
        const embeds = [];
        game.items.filter((ability) => 
          ability.type === "AnomalyAbility" &&
          ability.system.anomaly == item.id &&
          ability.system.reference == ""
        ).forEach(async ability => {
          const newAbility = await foundry.utils.duplicate(ability);
          newAbility.flags.ta = {
            originalId: ability.id
          }
          embeds.push(newAbility);
        });
        await actor.createEmbeddedDocuments('Item', embeds);

        updates["system.anomaly.name"] = item.name;
        updates["system.anomaly.type"] = data.uuid;
        actor.update(updates);
        break;

      case 'Reality':
        updates["system.reality.type"] = data.uuid;
        updates["system.reality.triggerValue"] = 0;
        actor.update(updates);
        break;

      case 'Competency':
        const competency = await fromUuid(data.uuid);
        updates["system.competency.type"] = data.uuid;
        updates["system.competency.primeDirective"] = item.system.primeDirective;
        
        // add the initial requisition
        if (competency.system.initialRequisition != "") {
          const requisition = game.items.get(competency.system.initialRequisition);
          await actor.createEmbeddedDocuments('Item', [
              foundry.utils.duplicate(await game.items.get(competency.system.initialRequisition))
            ]
          );
        }
        actor.update(updates);
        break;

      case 'Requisition':
        // only one of distinct Requisition
        if (actor.items.filter((doc) => doc.type == item.type && doc.name == item.name).length > 0) {
          return;
        }
        await actor.createEmbeddedDocuments('Item', [await foundry.utils.duplicate(item)]);
        break;

      case 'ConnectionBenefit':
        // find the current active relationship
        const tab = this._tabs.filter((tab) => tab._navSelector == ".relationships-nav");
        if (tab.length > 0 && tab[0].active != "") {
          const connectionId = tab[0].active;
          const relationship = this.actor.system.reality.relationships[connectionId];
          if (relationship.hasBenefit) {
            const benefit = await fromUuid(data.uuid);
            const update = {};
            update["system.reality.relationships." + connectionId + ".bonus"] = benefit.id;
            this.actor.update(update);
          }
        }
        break;

      case 'AnomalyAbility':
        // only one of each
        if ((await actor.items.filter((doc) => doc.type == item.type && doc.flags.ta.originalId == item.id)).length > 0) {
          return;
        }
        if (item.system.reference != "") {
          this.actor.addPlaywall(item.system.reference, "anomaly", {})
        }
        else {
          const ability = await foundry.utils.duplicate(item);
          ability.flags.ta = {
            originalId: item.id
          }
          await actor.createEmbeddedDocuments('Item', [ability]);
        }
        break;
    }
  }
}