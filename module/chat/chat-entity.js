export class taChatMessage extends ChatMessage {
  /** @override */
  prepareData() {
    super.prepareData();
  }

  /** @override */
  async getHTML() {
    const html = await super.getHTML();
    if (this.flags.ta) {
      await this.renderOutcome(html);
      this.activateListeners(html);
    }
    return html;
  }


  /** @override */
  async renderHTML() {
    const html = await super.renderHTML();
    if (this.flags.ta) {
      await this.renderOutcome(html);
      this.activateListeners(html);
    }
    return html;
  }


  activateListeners(html) {
    if (this instanceof taChatMessage && this.flags.ta) {
      $(html).find('#qa-adjust').click(this._listenAdjustQA.bind(this));
      $(html).find('#lockOutcome').click(this._listenLockOutcome.bind(this));

      if (["d4","d10"].includes(this.flags.ta.dice)) {
        $(html).find('.adjustDie').click(this._listenAdjustDie.bind(this));
        if (this.flags.ta.outcome.supplement.active && this.flags.ta.outcome.supplement.type == "d8" && this.flags.ta.outcome.supplement.result.success > 0) {
          $(html).find('.adjustSupplement').click(this._listenAdjustSupplement.bind(this));
        }
      }
    }
  }


  async _listenAdjustSupplement(event) {
    event.preventDefault();
    document.activeElement.blur();

    const dice = event.currentTarget.dataset.dice;
    let action = event.target.dataset.adjust;
    if (!action) { return }

    const flags = this.flags.ta;
    const outcome = flags.outcome;
    const supplement = outcome.supplement;
    const updates = {};

    switch(action) {
      case "up": {
        updates["flags.ta.outcome.qa.spent"] = supplement.result.success;
        break;
      }
      case "down": {
        updates["flags.ta.outcome.qa.spent"] = supplement.result.success * -1;
        break;
      }
      case "ignore": {
        updates["flags.ta.outcome.qa.spent"] = 0;
        break;
      }
    }
    this.update(updates);
  }


  async _listenAdjustDie(event) {
    event.preventDefault();
    document.activeElement.blur();
    const type = event.currentTarget.dataset.adjust;
    const dice = event.currentTarget.dataset.dice;
    let action = event.target.dataset.adjust;
    if (!action) { return }

    const flags = this.flags.ta;
    const outcome = flags.outcome;
    const updates = {};
    const adjustBy = type == "demerit" ? 3 : 1;

    switch(action) {
      case "up": {
        if (dice == "d10") {
          updates["flags.ta.outcome.primary.result.pip"] = outcome.primary.result.pip + 1;
        }
        if (outcome[type].down > 0) {
          updates["flags.ta.outcome." + type + ".down"] = outcome[type].down - 1;
        }
        else {
          updates["flags.ta.outcome." + type + ".up"] = outcome[type].up + 1;
        }
        break;
      }

      case "down": {
        if (dice == "d10") {
          updates["flags.ta.outcome.primary.result.pip"] = outcome.primary.result.pip - 1;
        }
        if (outcome[type].up > 0) {
          updates["flags.ta.outcome." + type + ".up"] = outcome[type].up - 1;
        }
        else {
          updates["flags.ta.outcome." + type + ".down"] = outcome[type].down + 1;
        }
        break;
      }

      case "setFace": {
        let template = "systems/triangleagency/templates/dialog-d6-options.hbs";
        let msg = game.i18n.localize("TA.Dialog.D6Options" + (event.target.dataset.type == "qa" ? "QA" : "Demerit"));
        let selected = outcome.supplement.result.pip;

        const part = await foundry.applications.handlebars.renderTemplate(template, {
          selectedFace: selected,
          message: msg
        });

        const dlg = await foundry.applications.api.DialogV2.wait({
          window: { title: game.i18n.localize("TA.Dialog.Notification") },
          modal: true,
          rejectClose: false,
          content: part,
          buttons: [
            {
              action: "go",
              label: game.i18n.localize("TA.Action.Okay"),
              default: true,
              callback: (event, button, dialog) => {
                selected = Number(button.form.elements.selectedFace.value);
              }
            },
            {
              action: "exit",
              label: game.i18n.localize("TA.Action.Cancel")
            }
          ],
          render: (event, html) => {
            const dice = event.target.element.querySelector("#diceList");
            dice.querySelector('div[data-id="' + outcome.supplement.result.pip + '"]').classList.add("faceSelect");
            dice.addEventListener('click', function(die) {
              if (die.target.dataset.id) {
                const selected = dice.querySelector('#selectedFace');
                dice.querySelector('div[data-id="' + selected.value + '"]').classList.remove("faceSelect");
                die.target.classList.add("faceSelect");
                selected.value = die.target.dataset.id;
              }
            });
          },
        });

        if (selected != outcome.supplement.result.pip) {
          updates["flags.ta.outcome.supplement.result.pip"] = selected;
          updates["flags.ta.outcome." + event.target.dataset.type + ".spent"] = outcome[event.target.dataset.type].spent + 1;
          this.update(updates);
        }

        break;
      }

      case "reset": {
        updates["flags.ta.outcome.qa.spent"] = 0;
        updates["flags.ta.outcome.qa.up"] = 0;
        updates["flags.ta.outcome.qa.down"] = 0;
        updates["flags.ta.outcome.demerit.spent"] = 0;
        updates["flags.ta.outcome.demerit.up"] = 0;
        updates["flags.ta.outcome.demerit.down"] = 0;
        updates["flags.ta.outcome.primary.result.pip"] = outcome.primary.result.roll[0];
        if (outcome.supplement.active) {
          updates["flags.ta.outcome.supplement.result.pip"] = outcome.supplement.result.roll[0];
        }
        break;
      }
    }
    this.update(updates);


  }


  async _listenLockOutcome(event) {
    event.preventDefault();
    document.activeElement.blur();
    const outcome = this.flags.ta.outcome;

    this.update({"flags.ta.outcome.lock": true});

    if (this.speaker.actor) {
      const actor = game.actors.get(this.speaker.actor);
      const quality = outcome.primary.result.quality.id;
      const update = {};

      if (outcome.qa.used > 0) {
        update["system.qa." + quality + ".value"] = actor.system.qa[quality].value - outcome.qa.used;
      }
      if (outcome.demerit && outcome.demerit.used > 0) {
        update["system.agency.demerits"] = actor.system.agency.demerits - outcome.demerit.used;
      }
      if (actor.system.burnoutRelease) {
        update["system.burnoutRelease"] = false;
      }

      actor.update(update);
    }

    if (outcome.action == "ata" && game.ta.settings.autoATABurnout && outcome.effective.success == 0) {
      let burnout = Number(game.settings.get("triangleagency", "burnout")) + 1;
      if (game.user !== game.users.activeGM) {
        game.system.socketHandler.emit("setBurnout", burnout);
      }
      else {
        game.ta.applications.agencyOs.setBurnout(burnout);
      }
    }

    if (outcome.effective.chaos > 0) {
      let chaos = Number(game.settings.get("triangleagency", "chaos")) + outcome.effective.chaos;
      if (game.user !== game.users.activeGM) {
        game.system.socketHandler.emit("setChaos", chaos);
      }
      else {
        game.ta.applications.agencyOs.setChaos(chaos);
      }
    }
  }


  async _listenAdjustQA(event) {
    event.preventDefault();
    document.activeElement.blur();

    const flags = this.flags.ta;
    const result = flags.outcome;
    const updates = {};

    switch (event.target.dataset.action) {
      case "spend":
        if (result.qualityCurrent > 0 && result.effectiveSuccess < 6) {
          updates["flags.ta.outcome.qualityCurrent"] = Number(result.qualityCurrent) - 1;
          updates["flags.ta.qaspent"] = Number(flags.qaspent) + 1;
          this.update(updates);
        }
        break;
      case "reclaim":
        if (flags.qaspent > 0) {
          updates["flags.ta.outcome.qualityCurrent"] = Number(result.qualityCurrent) + 1;
          updates["flags.ta.qaspent"] = Number(flags.qaspent) - 1;
          this.update(updates);
        }
        break;
    }
  }


  async renderOutcome(html) {
    let template = 'systems/triangleagency/templates/chat-outcome.hbs';
    const flags = this.flags.ta;

    const action = flags.action;

    const context = {
      title: flags.title,
      message: flags.message
    };

    const part = $(await foundry.applications.handlebars.renderTemplate(template, context));

    switch(flags.dice) {
      case "conflict": {
        const outcome = flags.outcome || {};
        outcome.conflictResult = [];
        if (outcome.primary.result.success == 0) {
          outcome.conflictResult.push("none");
        }
        else {
          for (let i = 1; i <= outcome.primary.result.success; i++) {
            outcome.conflictResult.push("success");
          }
        }

        let result = $(await foundry.applications.handlebars.renderTemplate(flags.template, outcome));
        console.log(result);
        part.find(".chatMessage").append(result);
        break;
      }

      case "d4": {
        const outcome = flags.outcome || {};
        outcome.qa.used = outcome.qa.up + outcome.qa.down;
        if (outcome.supplement.active && outcome.supplement.type == "d8") {
        }
        else {
          outcome.qa.used += outcome.qa.spent;
        }
        outcome.qa.remaining = outcome.qa.max - outcome.qa.used;
        outcome.demerit.used = (outcome.demerit.spent + outcome.demerit.up + outcome.demerit.down) * 3;
        outcome.demerit.remaining = outcome.demerit.max - outcome.demerit.used;
        outcome.effective = {
          d4display: ["blank","blank","blank","blank","blank","blank"],
          success: outcome.primary.result.success - outcome.burnout + outcome.qa.up
        }

        let supplementSuccess = 0;
        outcome.showDemerits = false;
        if (outcome.supplement.active) {
          const supplement = outcome.supplement;
          supplementSuccess = (supplement.result.pip % 3 == 0) ? (supplement.result.pip / 3) : 0;
          
          if (supplement.type == "d6") {
            //outcome.primary.result.success += supplementSuccess;
            outcome.showDemerits = true;
          }
          else if (supplement.type == "d8") {
            if (outcome.qa.spent != 0) {
              outcome.primary.result.success += outcome.qa.spent;
              if (outcome.primary.result.success < 0) { outcome.primary.result.success = 0 }
            }
          }
        }

        let displaySuccess = outcome.primary.result.success;

        /*
        burnout: 2, success: 1, displaySuccess: -1 (0), displayBurnout: 1
        burnout: 2, success: 5, displaySuccess: 3 (3), displayBurnout: 5
        burnout: 5, success: 3, displaySuccess: -2 (3), displayBurnout: 3
        burnout: 5, success: 5, displaySuccess: 0, displayBurnout: 5
        */

        let displayBurnout = outcome.primary.result.success;
        if (displaySuccess > outcome.burnout) {
          displaySuccess = displaySuccess - outcome.burnout;
        }
        else if (outcome.burnout >= displaySuccess) {
          displaySuccess = 0;
        }
        //displaySuccess += outcome.qa.up;
        displaySuccess += outcome.qa.up - outcome.qa.down;

        outcome.effective.success = displaySuccess + (outcome.supplement.type != "d8" ? supplementSuccess : 0);

        for (let i = 1; i <= displayBurnout && i <= 6; i++) {
          outcome.effective.d4display[i-1] = "burnout";
        }
        for (let i = displayBurnout; i >= 1; i--) {
          if (i > displayBurnout - outcome.qa.down) {
            outcome.effective.d4display[i-1] = "blank";
          }
        }
        for (let i = 1; i <= displaySuccess && i <= 6; i++) {
          outcome.effective.d4display[i-1] = "red";
        }

        const hash = Object.fromEntries([ ...outcome.effective.d4display.reduce((map, key) => map.set(key, (map.get(key) || 0) + 1), new Map()) ]);
        if (displaySuccess + (outcome.supplement.active && outcome.supplement.type == "d6" ? supplementSuccess : 0) == 3) {
          outcome.effective.chaos = 0;
        }
        else {
          outcome.effective.chaos = outcome.burnout + (hash["blank"] ?? 0);
          if (outcome.supplement.active && outcome.supplement.type == "d6" && supplementSuccess == 0) {
            // add 1 chaos from the d6 failure
            outcome.effective.chaos += 1;
          }
        }

        // set numbers for failed dice
        for (let i = 0; i < 6; i++) {
          if (outcome.effective.d4display[i] == "blank") { 
            outcome.effective.d4display[i] += "-" + outcome.primary.result.roll[i];
          }
        }

        // Triscendence override
        if (outcome.primary.result.triscendence) {
          outcome.effective.success = 3;
          outcome.effective.chaos = 0;
        }

        if (outcome.primary.result.message == "") {
          let msg = "";
          if (displaySuccess > 0) {
            switch(outcome.action) {
              case "ata":
                msg = game.i18n.localize("TA.Chat.ATASuccess");
                msg = msg.replace("[success]", outcome.effective.success);
                break;
              case "anomaly":
                msg = game.i18n.localize("TA.Chat.AbilitySuccess");
                msg = msg.replace("[success]", outcome.effective.success);
                break;
            }
          }
          else {
            switch(outcome.action) {
              case "ata":
                msg = game.i18n.localize("TA.Chat.ATAFailure");
                break;
              case "anomaly":
                msg = game.i18n.localize("TA.Chat.AbilityFailure");
                break;
            }
          }
          msg = msg.replace("[chaos]", outcome.effective.chaos);
          outcome.primary.result.message = msg;
        }

        if (flags.ability && flags.ability.outcomes && !outcome.unl3ash) {
          outcome.abilityMessage = this.anomalyOutcomes(
            flags.ability.outcomes,
            outcome.effective.success,
            outcome.primary.result.triscendence
          );
        }

        let result = $(await foundry.applications.handlebars.renderTemplate(flags.template, outcome));

        // set the adjment options for d4
        if (outcome.qa.active) {
          const adjust = result.find('.adjustDie[data-adjust="qa"]');

          const up = adjust.find('i[data-adjust="up"]');
          if (displaySuccess == 6) {
            up.addClass("disabled");
          }
          else if (outcome.qa.remaining == 0 && outcome.qa.down == 0) {
            up.addClass("disabled");
          }
          else {
            up.css("cursor", "pointer");
          }

          const down = adjust.find('i[data-adjust="down"]');

          if (displaySuccess == 0) {
            down.addClass("disabled");
          }
          /*
          if (outcome.primary.result.success + outcome.qa.up == outcome.primary.result.success) {
            down.addClass("disabled");
          }
          */
          else if (outcome.qa.remaining == 0 && outcome.qa.up == 0) {
            down.addClass("disabled");
          }
          else {
            down.css("cursor", "pointer");
          }

          if (outcome.supplement.active && outcome.supplement.type == "d6") {
            const adjust = result.find('.adjustDie[data-adjust="setFace"][data-type="qa"]');
            if (outcome.qa.remaining == 0 || outcome.qa.spent > 0 || outcome.demerit.spent > 0) {
              adjust.addClass("disabled");
            }
          }
        }
        else {
          result.find('.adjustDie[data-type="qa"]').addClass("disabled");
        }

        if (outcome.supplement.active && outcome.supplement.type == "d6") {
          const adjust = result.find('.adjustDie[data-adjust="setFace"][data-type="demerit"]');
          if (outcome.demerit.remaining < 3 || outcome.qa.spent > 0 || outcome.demerit.spent > 0) {
            adjust.addClass("disabled");
          }
        }
        
        if (outcome.supplement.active) {
          const supplement = outcome.supplement;

          // set the adjment options for d8
          if (supplement.type == "d8" && supplement.result.success > 0) {
            const adjust = result.find(".adjustSupplement");

            const up = adjust.find('i[data-adjust="up"]');
            if (displaySuccess == 6 || Math.abs(outcome.qa.spent) == supplement.result.success) {
              up.addClass("disabled");
            }

            const down = adjust.find('i[data-adjust="down"]');
            if (displaySuccess == 0 || Math.abs(outcome.qa.spent) == supplement.result.success) {
              down.addClass("disabled");
            }

            const ignore = adjust.find('div[data-adjust="ignore"]');
            if (outcome.qa.spent == 0) {
              ignore.addClass("disabled");
            }
          }
        }
        
        //console.log(outcome)

        part.find(".chatMessage").append(result);
        break;
      }

      case "d10": {
        const outcome = flags.outcome || {};
        outcome.qa.used = outcome.qa.spent + outcome.qa.up + outcome.qa.down;
        outcome.qa.remaining = outcome.qa.max - outcome.qa.used;
        outcome.demerit.used = (outcome.demerit.spent + outcome.demerit.up + outcome.demerit.down) * 3;
        outcome.demerit.remaining = outcome.demerit.max - outcome.demerit.used;
        outcome.effective = {
          success: outcome.primary.result.autofail ? 0 : outcome.primary.result.pip - outcome.burnout,
          chaos: outcome.primary.result.pip + outcome.burnout
        }
        if (outcome.supplement.active) {
          const pip = outcome.supplement.result.pip;
          outcome.effective.success += outcome.primary.result.autofail ? 0 : ((pip % 3 == 0) ? (pip / 3) : 0);
          outcome.effective.chaos += [3,6].includes(pip) ? 0 : 1;
        }
        outcome.effective.success = outcome.effective.success < 0 ? 0 : outcome.effective.success;
        if (outcome.unl3ash) {
          outcome.effective.success = 7;
        }

        if ((outcome.primary.result.message ?? "") == "") {
          let msg = "";
          if (outcome.effective.success > 0) {
            msg = game.i18n.localize("TA.Chat.AbilitySuccess");
            msg = msg.replace("[success]", outcome.effective.success);
          }
          else {
            msg = game.i18n.localize("TA.Chat.AbilityFailure");
          }
          msg = msg.replace("[chaos]", outcome.effective.chaos);
          outcome.primary.result.message = msg;
        }

        if (flags.ability && flags.ability.outcomes && !outcome.unl3ash) {
          outcome.abilityMessage = this.anomalyOutcomes(
            flags.ability.outcomes,
            outcome.effective.success,
            outcome.primary.result.triscendence
          );
        }
        
        let result = $(await foundry.applications.handlebars.renderTemplate(flags.template, outcome));
        // disable adjust options with insufficient points
        if (outcome.demerit.active) {
          const adjust = result.find('.adjustDie[data-adjust="demerit"]');

          const up = adjust.find('i[data-adjust="up"]');
          if (outcome.primary.result.pip == 10) {
            up.addClass("disabled");
          }
          else if (outcome.demerit.remaining < 3 && outcome.demerit.down == 0) {
            up.addClass("disabled");
          }
          else {
            up.css("cursor", "pointer");
          }

          const down = adjust.find('i[data-adjust="down"]');
          if (outcome.primary.result.pip == 1) {
            down.addClass("disabled");
          }
          else if (outcome.demerit.remaining < 3 && outcome.demerit.up == 0) {
            down.addClass("disabled");
          }
          else {
            down.css("cursor", "pointer");
          }

          if (outcome.supplement.active && outcome.supplement.type == "d6") {
            const adjust = result.find('.adjustDie[data-adjust="setFace"][data-type="demerit"]');
            if (outcome.demerit.remaining < 3 || outcome.qa.spent > 0 || outcome.demerit.spent > 0) {
              adjust.addClass("disabled");
            }
          }
        }
        else {
          result.find('.adjustDie[data-type="demerit"]').addClass("disabled");
        }


        if (outcome.qa.active) {
          const adjust = result.find('.adjustDie[data-adjust="qa"]');

          const up = adjust.find('i[data-adjust="up"]');
          if (outcome.primary.result.pip == 10) {
            up.addClass("disabled");
          }
          else if (outcome.qa.remaining == 0 && outcome.qa.down == 0) {
            up.addClass("disabled");
          }
          else {
            up.css("cursor", "pointer");
          }

          const down = adjust.find('i[data-adjust="down"]');
          if (outcome.primary.result.pip == 1) {
            down.addClass("disabled");
          }
          else if (outcome.qa.remaining == 0 && outcome.qa.up == 0) {
            down.addClass("disabled");
          }
          else {
            down.css("cursor", "pointer");
          }

          if (outcome.supplement.active && outcome.supplement.type == "d6") {
            const adjust = result.find('.adjustDie[data-adjust="setFace"][data-type="qa"]');
            if (outcome.qa.remaining == 0 || outcome.qa.spent > 0 || outcome.demerit.spent > 0) {
              adjust.addClass("disabled");
            }
          }
        }
        else {
          result.find('.adjustDie[data-type="qa"]').addClass("disabled");
        }

        part.find(".chatMessage").append(result);
        break;
      }

      case "d20": {
        break;
      }
    }

    $(html).find('.message-content').append(part);
  }


  anomalyOutcomes(outcomes, success, triscendence) {
    if (outcomes.length == 0) { return "" };
    if (!(this.author.isSelf || game.user.isGM)) { return "" }
    if (success == 0) {
      return game.i18n.localize("Ta.Chat.AbilityFailure");
    }

    const config = game.ta.config.outcomes;
    outcomes.sort((a,b) => config[a].order - config[b].order);

    const results = [];
    results.push(game.i18n.localize("Ta.Chat.AbilitySuccess"));

    outcomes.forEach(effect => {
      switch(effect) {
        case "success": break; // already handled in the result setup

        case "spend3s": {
          results.push("<b>" + game.i18n.localize(config[effect].name) + "</b> " +
            (
              triscendence
                ? "3 " + game.i18n.localize("Ta.Chat.AbilityOrMore") + " " + game.i18n.localize("Ta.Chat.AbilityTimes")
                : success + " " + game.i18n.localize("Ta.Chat.AbilityTime" + (success > 1 ? "s" : ""))
            )
          );
          break;
        }
        
        case "eachplus3": {
          const times = success - 1;
          if (times == 0) { break }

          results.push("<b>" + game.i18n.localize(config[effect].name) + "</b> " +
            (
              triscendence
                ? "2 " + game.i18n.localize("Ta.Chat.AbilityOrMore") + " " + game.i18n.localize("Ta.Chat.AbilityTimes")
               : times + " " + game.i18n.localize("Ta.Chat.AbilityTime" + (times > 1 ? "s" : ""))
            )
          );
          break;
        }
        
        case "triscendence": {
          if (triscendence) {
            results.push("<b>" + game.i18n.localize(config[effect].name) + "</b>");
          }
          break;
        }
        
        case "every3rd3": {
          const times = Math.floor(success / 3);
          if (times == 0) { break }

          results.push("<b>" + game.i18n.localize(config[effect].name) + "</b> " +
            (
              triscendence
                ? "1 " + game.i18n.localize("Ta.Chat.AbilityOrMore") + " " + game.i18n.localize("Ta.Chat.AbilityTimes")
               : times + " " + game.i18n.localize("Ta.Chat.AbilityTime" + (times > 1 ? "s" : ""))
            )
          );
          break;
        }
        
        case "sixplus3s": {
          if ((!triscendence) && success < 6) { break }

          results.push(
            (triscendence ? game.i18n.localize("Ta.Chat.AbilityPotentially") + " " : "") +
              "<b>" + game.i18n.localize(config[effect].name) + "</b> "
          );
          break;
        }
      }
    });
    
    let result = "";
    for(let i = 0; i < results.length; i++) {
      if (i > 0) { result += ", " }
      if (results.length > 1 && i == results.length - 1) {
        result += game.i18n.localize("Ta.Chat.And") + " ";
      }
      result += results[i];
    }

    return result + ".";
  }
}