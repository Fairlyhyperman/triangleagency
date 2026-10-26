export class PlaywallSheet extends foundry.appv1.sheets.JournalTextPageSheet {
  static _warnedAppV1 = true;

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["triangleagency", "sheet", "playwall"],
      width: 1000,
      height: 800,
      resizable: false,
    });
  }

  get template() {
    return `systems/triangleagency/templates/journal-playwall-sheet-${this.isEditable ? "edit" : "view"}.hbs`;
  }


  /** @inheritDoc */
  async _renderOuter() {
    const html = await super._renderOuter();
    game.ta.helpers.taHelper.adjustHeaderButtons(html, false);
    return html;
  }

  
  async getData(options={}) {
    const context = await super.getData(options);
    foundry.utils.mergeObject(context, {
      isGM: game.user.isGM
    });

    const data = this.document.system;
    const flags = this.document.flags.ta || {};
    const config = game.ta.config;

    context.code = data.code;
    context.aspect = data.aspect || "undefined";
    context.content = await foundry.applications.ux.TextEditor.implementation.enrichHTML(data.content, {
      async: true,
      secrets: this.object.isOwner,
      relativeTo: this.object
    });
    context.data = flags;

    if (context.isGM && this.isEditable) {
      context.lists = {};
      context.lists.aspects = config.playwallLists.aspects;
  
      // find out who can access this
      const players = game.users.players.map(player => player.id);
      const access = Object.keys(this.object.ownership)
        .filter(id => this.object.ownership[id] > 0)
        .filter(x => players.includes(x));
 
      context.viewers = [... new Set(game.actors.filter(
        actor => actor.type === "Agent" && actor.hasPlayerOwner)
        .map(agent => {
          return {
            name: agent.name,
            owners: Object.keys(agent.ownership).filter(id => agent.ownership[id] > 0)
              .filter(x => access.includes(x))
          } 
        }
      )
      .filter(actor => actor.owners.length > 0)
      .map(actor => actor.name))].sort();

      // get the refrences
      if (data.code) { // is not null, undefined, blank
        let references = flags.abilities;

        let update = {};
        const abilities = game.items.filter(item => item.type == "AnomalyAbility" && item.system.reference == data.code);
        abilities.forEach(ability => {
          if (references[ability._id] == null) {
            update["flags.ta.abilities." + ability._id] = {
              mergeAction: "add",
              targetAnomalyId: ability.system.anomaly,
              targetAbilityId: ""
            }
          }
        });
        if (Object.keys(update).length > 0) {
          this.object.update(update)
        };

        // requisitions
        references = flags.requisitions;
        update = {};
        const requisitions = game.items.filter(item => item.type == "Requisition" && item.system.reference == data.code);
        requisitions.forEach(requisition => {
          if (references[requisition._id] == null) {
            update["flags.ta.requisitions." + requisition._id] = requisition.name;
          }
        });
        if (Object.keys(update).length > 0) {
          this.object.update(update)
        };
      }
    }


    // get ability details
    context.abilities = {};
    if (Object.keys(flags.abilities).length > 0) {
      // get anomaly and abilty lists
      context.anomalies = game.items.filter(item => item.type == "Anomaly")
        .map(anomaly => {return {id: anomaly.id, name: anomaly.name} })
        .sort((a,b) => a.name.localeCompare(b.name));

      /*
      context.anomalies.list = Object.assign(
        {}, 
        ...(game.items.filter(item => item.type == "Anomaly")).map(({id, name}) => ({ [id]: { "name": name } }))
      );
      */

      const abilities = game.items.filter(item => item.type == "AnomalyAbility" && Object.keys(flags.abilities).includes(item.id));
      abilities.forEach(async ability => {
        const data = flags.abilities[ability.id];
        context.hasAbilities = true;
 
        context.abilities[ability.id] = {
          name: ability.name
        }
  
        if (context.isGM && this.isEditable) {
          foundry.utils.mergeObject(context.abilities[ability.id], data);
          context.abilities[ability.id].showTargets = data.mergeAction != "add";

          if (data.mergeAction != "add") {
            // get the valid targets
            const exclusions = Object.keys(flags.abilities)
              .concat(
                Object.keys(flags.abilities).filter(tgt => tgt != ability.id && flags.abilities[tgt].targetAbilityId != "").map(tgt => flags.abilities[tgt].targetAbilityId)
              );
            context.abilities[ability.id].targetList = game.items.filter(
              item => item.type == "AnomalyAbility" &&
              item.system.anomaly == data.targetAnomalyId &&
              (!exclusions.includes(item.id))
            )
            .map(target => {return {id: target.id, name: target.name + (target.system.reference ? " (" + target.system.reference + ")" : "")}})
            .sort((a,b) => a.name.localeCompare(b.name));
            context.abilities[ability.id].targetList.unshift({ id: "", name: "" })
          }
        }
        else {
          context.abilities[ability.id].render = await game.ta.helpers.taHelper.renderAnomalyAbility ({
            ability,
            qas: null,
            anomaly: null,
            actionable: false,
            showTitle: true
          });
        }
      })
    }

    // get requisition details
    context.requisitions = [];
    if (Object.keys(flags.requisitions).length > 0) {
      context.requisitions = game.items.filter(item => item.type == "Requisition" && Object.keys(flags.requisitions).includes(item.id))
        .map(requisition => {return {
          id: requisition.id,
          name: requisition.name,
          description: requisition.system.description,
          cost: requisition.system.cost 
        }})
        .sort((a,b) => a.name.localeCompare(b.name));
    }

    // get track details
    context.hasTrack = Object.keys(flags.tracks).length > 0;
    if (context.hasTrack && !context.editable) {
      const track = flags.tracks;
      track.id = data.code;
      track.name = data.code;

      let value = 0;
      if (track.shared) {
        value = track.value || 0;
      }
      else {
        const actor = game.users.current.character;
        if (actor && actor.system.allPlaywall.includes(data.code)) {
          const trackRef = actor.getPlaywall(data.code);
          if (trackRef) {
            value = trackRef.extra.value || 0;
          }
        }
      }
      track.value = value;

      context.track = await game.ta.helpers.taHelper.renderTrack({
        track,
        columns: track.wrap,
        canstrike: false,
        connectors: true,
        startIcon: "&#9654;",
        showMilestoneContent: false,
        render: true,
        canaction: true,
        renderOptions: {
          trackClass: game.ta.config.aspects.anomaly.colorClass,
          trackType: "anomaly",
          boxClass: "playwall"
        }
      });
    }


    //console.log(context);

    return context;
  }


  /** @inheritdoc */
  activateListeners(html) {
    const flags = this.document.flags.ta || {};

    super.activateListeners(html);
    if (Object.keys(flags.tracks).length > 0) {
      html.find('.track-box.track-action').click(this._listenClickTrack.bind(this));
    }
    
    if (game.user.isGM) {
      html.find('.playwallContext').change(this._listenPlaywallContextt.bind(this));
      html.find('#playwallName').change(this._listenPlaywallName.bind(this));
      html.find('#playwallReference').change(this._listenPlaywallReference.bind(this));
      html.find('#gmnotes').change(this._listenChangeNotes.bind(this));
      html.find('.abilityAction').change(this._listenChangeAbilityAction.bind(this));
      html.find('.abilityTarget').change(this._listenChangeAbilityTarget.bind(this));
      html.find('.trackData').change(this._listenChangeTrack.bind(this));
      if (Object.keys(flags.tracks).length == 0) {
        html.find('.addTrack').click(this._listenAddTrack.bind(this));
      }
    }
  }


  async _listenAddTrack(event) {
    event.preventDefault();
    const target = event.target;
    const id = target.dataset.id;
    const update = {};
    update["flags.ta.tracks.size"] = 10;
    update["flags.ta.tracks.wrap"] = 10;
    update["flags.ta.tracks.value"] = 0;
    this.object.update(update);
  }


  async _listenClickTrack(event) {
    event.preventDefault();
    const target = event.target;
    const id = target.dataset.id;
    let value = Number(target.dataset.value);
    if (target.classList.contains("track-checked")) { value -= 1 }
    const flags = this.document.flags.ta || {};
    const update = {};

    if (flags.tracks.shared) {
      if (game.user == game.users.activeGM) {
        update["flags.ta.tracks.value"] = value;
        this.object.update(update);
      }
      else {
        game.system.socketHandler.emit("setJournalTrack", {
          journalId: this.object.parent.id,
          pageId: this.object.id,
          value: value
        });
      }
    }
    else {
      const actor = game.users.current.character;
      if (actor && actor.system.allPlaywall.includes(id)) {
        const trackRef = actor.getPlaywall(id);
        update["system.achievements." + trackRef.context + "." + id + ".value"] = value;
        actor.update(update);
      }
    }
  }


  async _listenChangeTrack(event) {
    event.preventDefault();
    const target = event.target;
    const id = target.dataset.id;
    let value = target.value;
    const tracks = this.document.flags.ta.tracks || {};

    const update = {};
    if (id == "shared") {
      value = target.checked;
    }
    if (id == "size" && value == 0) {
      Object.keys(tracks).forEach(key => {
        update["flags.ta.tracks." + key] = new foundry.data.operators.ForcedDeletion();
      })
    }
    else {
      update["flags.ta.tracks." + id] = Number(value);
    }
    //console.log(update)
    this.object.update(update);
  }


  async _listenChangeAbilityTarget(event) {
    event.preventDefault();
    const id = event.target.dataset.id;
    const target = event.target.value;
    if (target == "") { return }
    const update = {};
    update["flags.ta.abilities." + id + ".targetAbilityId"] = target;
    this.object.update(update);
  }
  

  async _listenPlaywallName(event) {
    event.preventDefault();
    const update = {};
    this.document.update({"name": event.target.value});
  }
  

  async _listenPlaywallReference(event) {
    event.preventDefault();
    const update = {};
    const flags = this.document.flags.ta || {};
    update["system.code"] = event.target.value;
    Object.keys(flags.abilities).forEach(id => {
      update["flags.ta.abilities." + id] = new foundry.data.operators.ForcedDeletion();
    });
    this.document.update(update);
  }
  

  async _listenChangeAbilityAction(event) {
    event.preventDefault();
    const id = event.target.dataset.id;
    const action = event.target.value;
    const update = {};
    update["flags.ta.abilities." + id + ".mergeAction"] = action;
    if (action == "add") {
      update["flags.ta.abilities." + id + ".targetAbilityId"] = "";
    }
    this.object.update(update);
  }
  

  async _listenChangeNotes(event) {
    event.preventDefault();
    const note = event.target.value;
    this.object.update({"flags.ta.gmnotes": note });
  }
  

  async _listenPlaywallContextt(event) {
    event.preventDefault();
    const context = event.target.value

    $("#playwallReference").parent().removeClass().addClass("color-background-" + context);
  }

  async _onDropItem(event, data) {
    const item = await fromUuid(data.uuid);
    //console.log("DROPPPPP")
  }
}