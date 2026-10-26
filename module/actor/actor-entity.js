export class taActor extends Actor {
  prepareData() {
    super.prepareData();
    //CONFIG.debug.hooks = true;
  }

  /** @override */
  prepareBaseData() {
    super.prepareBaseData();
    switch (this.type) {
      case 'Agent':
        return this._prepareAgentData(this);
      case 'Anomaly':
        return this._prepareAnomalyData(this);
      case 'Bystander':
        return this._prepareBystanderData(this);
    }
  }

  /** @override */
  prepareDerivedData() {
    switch (this.type) {
      case 'Agent':
        return this._prepareDerivedAgentData(this);
      case 'Anomaly':
        return this._prepareDerivedAnomalyData(this);
      case 'Bystander':
        return this._prepareDerivedBystanderData(this);
    }
  }

  /* -------------------------------------------- */
  /*  Data Preparation Helpers                    */
  /* -------------------------------------------- */

  _prepareAgentData(actorData) {
    const data = actorData;
  }

  _prepareAnomalyData(actorData) {
    //this.isEditable = false;
    const data = actorData;
  }

  _prepareBystanderData(actorData) {
    //this.isEditable = false;
    const data = actorData;
  }


  /* -------------------------------------------- */
  /*  Derived Data Preparation Helpers            */
  /* -------------------------------------------- */

  _prepareDerivedAgentData(actorData) {
    const data = actorData.system;

    // get the agent's title
    const competencyValue = data.competency.workLife.value;
    const ranks = game.ta.config.agencyRanks;
    const rank = Object.keys(ranks).filter(rank => competencyValue >= ranks[rank].order).pop();
    data.agency.title = game.i18n.localize(ranks[rank].name);

    // get a merged playwall refernce list
    data.allPlaywall = [];
    Object.keys(data.achievements).forEach((context) => {
      data.allPlaywall = data.allPlaywall.concat(Object.keys(data.achievements[context]));
    });

    data.dice = { d6: false, d8: false, d10: false, d20: false }
    // special dice
    if (data.allPlaywall.includes("U2")) { data.dice.d6 = true }
    if (data.allPlaywall.includes("G3")) { data.dice.d8 = true }
    if (data.allPlaywall.includes("N1")) { data.dice.d10 = true }
    if (data.allPlaywall.includes("T3")) { data.dice.d20 = true }

    data.hasDice = data.dice.d6 || data.dice.d8 || data.dice.d10 || data.dice.d20;
    data.ataDice = (data.dice.d8 ? 1 : 0) + (data.dice.d20 ? 1 : 0);
    data.anomalyDice = (data.dice.d6 ? 1 : 0) + (data.dice.d10 ? 1 : 0);
  }

  
  _prepareDerivedAnomalyData(actorData) {
    const data = actorData.system;
  }

  _prepareDerivedBystanderData(actorData) {
    const data = actorData.system;
  }


  getPlaywall(reference) {
    const data = this.system;
    reference = reference.toUpperCase();
    
    const achievements = Object.keys(data.achievements);
    for (let i = 0; i < achievements.length; i++) {
      const context = achievements[i];
      if (data.achievements[context][reference]) {
        return {
          playwall: reference,
          context: context,
          extra: data.achievements[context][reference]
        };
      }
    }
    return {};
  }


  async addPlaywall(playwall, context, extras) {
    playwall = playwall.toUpperCase()
    //if (this.system.allPlaywall.includes(playwall)) { return }

    const key = ["anomaly", "reality", "competency"].includes(context) ? context : "other";
    const update = {};
    update["system.achievements." + key + "." + playwall] = extras;
    this.update(update);

    const pageRef = await game.ta.helpers.taHelper.playwallPage(playwall);
    if (pageRef === undefined) { return }

    const journal = await game.journal.get(pageRef.journal);
    const page = await journal.pages.get(pageRef.page);

    // set permissions
    if (game.user.isGM) {
      const pageUpdate = {};
    /* // no longer neeeded
      const journalUpdate = {};
      this.myOwners().forEach(owner => {
        if (!Object.keys(journal.ownership).includes(owner)) {
          journalUpdate["ownership." + owner] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
        }
        pageUpdate["ownership." + owner] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
      });
      await journal.update(journalUpdate);
    */
   /*
      pageUpdate["ownership.-=" + game.user.id] = null;
      console.log(page);
      await page.update(pageUpdate);
    */
    }
    else if (game.user.character && game.user.character.id == this.id && journal && journal.sheet.rendered) {
      game.ta.helpers.taHelper.togglePlaywall();
    }
    
    this.alignPlaywallAbilities(page, false);
  }


  async removePlaywall(playwall) {
    playwall = this.getPlaywall(playwall);
    if (Object.keys(playwall).length == 0) { return false }

    const update = {};
    update["system.achievements." + playwall.context + "." + playwall.playwall] = new foundry.data.operators.ForcedDeletion();
    this.update(update);

    const pageRef = await game.ta.helpers.taHelper.playwallPage(playwall.playwall);
    if (pageRef === undefined) { return }

    const journal = await game.journal.get(pageRef.journal);
    const page = await game.journal.get(pageRef.journal).pages.get(pageRef.page);

    // set permissions
    if (game.user.isGM) {
      const pageUpdate = {};
      //pageUpdate["ownership.-=" + game.user.id] = null;
      /*
      this.myOwners().forEach(owner => {
        pageUpdate["ownership.-=" + owner] = null;
      });
      */
      //await page.update(pageUpdate);
    }
    else if (game.user.character && game.user.character.id == this.id && journal && journal.sheet.rendered) {
      game.ta.helpers.taHelper.togglePlaywall();
    }

    this.alignPlaywallAbilities(page, true);
  }


  myOwners() {
    return Object.entries(this.ownership).filter(
        ([id, level]) => !game.users.get(id)?.isGM && id != "default" && level === CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
      )
      .map(([id]) => id);
  }


  alignPlaywallAbilities(page, remove = false) {
    const playwall = page.flags.ta.abilities;
    const createItems = [];
    const deleteItems = [];

    Object.keys(playwall).forEach(id => {
      const ref = playwall[id];
      let ability = game.items.get(id);

      switch(ref.mergeAction) {
        case "add": {
          const check = this.items.filter((doc) => doc.type == ability.type && doc.flags.ta.originalId == ability.id);
          if (remove) {
            if (check.length == 0) { return }
            deleteItems.push(check[0].id);
          }
          else {
            if (check.length > 0) { return }
            const newAbility = foundry.utils.duplicate(ability);
            newAbility.flags.ta = {
              originalId: ability.id
            }
            createItems.push(newAbility);
          }
          break;
        }

        case "replace": {
          if (remove) { // remove the current ability and put the target back
            let check = this.items.filter((doc) => doc.type == ability.type && doc.flags.ta.originalId == ability.id);
            if (check.length > 0) {
              deleteItems.push(check[0].id);
            }
            check = this.items.filter((doc) => doc.type == ability.type && doc.flags.ta.originalId == ref.targetAbilityId);
            if (check.length == 0) {
              ability = game.items.get(ref.targetAbilityId);
              const newAbility = foundry.utils.duplicate(ability);
              newAbility.flags.ta = {
                originalId: ability.id
              }
              createItems.push(newAbility);
            }
          }
          else { // remove the target ability and put the new one in
            let check = this.items.filter((doc) => doc.type == ability.type && doc.flags.ta.originalId == ref.targetAbilityId);
            if (check.length > 0) {
              deleteItems.push(check[0].id);
            }
            check = this.items.filter((doc) => doc.type == ability.type && doc.flags.ta.originalId == ability.id);
            if (check.length == 0) {
              const newAbility = foundry.utils.duplicate(ability);
              newAbility.flags.ta = {
                originalId: ability.id
              }
              createItems.push(newAbility);
            }
          }
          break;
        }

        case "merge":
          // find the targeted ability
          let target = this.items.filter((doc) => doc.type == ability.type && doc.flags.ta.originalId == ref.targetAbilityId);
          if (target.length == 0) { return }

          target = target[0];
          const update = {};

          if (remove) {
            // remove the description from the target's description
            const desc = ability.system.description;
            if (desc != "" && target.system.description.includes(desc)) {
              update["system.description"] = target.system.description.replace(desc,"");
            }
            // get the original ability that the target is based on, to establish a baseline for outcomes
            const original = game.items.get(target.flags.ta.originalId);
            // if we don't find it, there's not much we can do

            if (original != null) {
              // restore the original outcomes
              Object.keys(ability.system.outcomes).forEach(key => {
                if (Object.keys(original.system.outcomes).includes(key)) {
                  update["system.outcomes." + key] = original.system.outcomes[key];
                }
                else {
                  update["system.outcomes." + key] = new foundry.data.operators.ForcedDeletion();
                }
              });
            }
          }
          else {
            // add the description to the end of the target's description, if it isn't already there
            const desc = ability.system.description;
            if (desc != "" && !target.system.description.includes(desc)) {
              update["system.description"] = target.system.description + desc;
            }
            // add or replace outcomes
            Object.keys(ability.system.outcomes).forEach(key => {
              update["system.outcomes." + key] = ability.system.outcomes[key];
            });
          }
          target.update(update);
          break;
      }
    });

    this.deleteEmbeddedDocuments("Item", deleteItems);
    this.createEmbeddedDocuments("Item", createItems);
  }

  /* // No longer needed
  async _onUpdate(data, options, userId) {
    await super._onUpdate(data, options, userId);
    if (this.type == "Agent" && game.user.isGM && data.ownership) {
      game.ta.helpers.taHelper.resyncPlaywall(this.id, true);
    }
  }
  */
}