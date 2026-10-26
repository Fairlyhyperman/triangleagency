export class taDice {

  // Roll 6d4 and return the result as a true/false array
  static roll(dice = 6, faces = 4) {
    const result = {
      dice: [],
      triscendence: false
    };

    result.success = 0;
    for (let i = 1; i <= dice; i++) {
      const pip = Math.floor(foundry.dice.MersenneTwister.random() * faces) + 1;
      if (pip == 3) result.success += 1;
      result.dice.push(pip == 3);
    }
    result.triscendence = (result.success == 3);
    result.failure = 6 - result.success;

    return result;
  }


  static rollSet(count, faces) {
    const result = {
      roll: [],
      success: 0
    };
    for (let i = 1; i <= count; i++) {
      const pip = Math.floor(foundry.dice.MersenneTwister.random() * faces) + 1;
      result.roll.push(pip);
      result.success += (pip % 3 == 0) ? (pip / 3) : 0
    }
    return result;
  }


  static rollGroup(primary, supplement) {
    const result = {
      primary: {
        type: primary,
        result: {}
      },
      supplement: {
        active: supplement ? true : false,
        type: supplement,
        result: {}
      }
    }

    switch(primary) {
      case "d4":
        result.primary.result = this.rollSet(6,4);
        break;
      case "d10":
        result.primary.result = this.rollSet(1,10);
        break;
      case "d20":
        result.primary.result = this.rollSet(1,20);
        break;
    }
    
    if (result.supplement.active) {
      switch(supplement) {
        case "d6":
          result.supplement.result = this.rollSet(1,6);
          break;
        case "d8":
          result.supplement.result = this.analyzeD8(this.rollSet(1,8));
          break;
      }
    }

    if (game.dice3d) {
      const data = { throws:[{ dice:[] }] };
      const throws = data.throws[0].dice;
      result.primary.result.roll.forEach((pips, idx) => {
        throws.push({
          result: pips,
          resultLabel: pips,
          type: primary,
          vectors:[],
          options:{}          
        });
      });
      if (result.supplement.active && result.supplement.result) {
        throws.push({
          result: result.supplement.result.roll[0],
          resultLabel: result.supplement.result.roll[0],
          type: supplement,
          vectors:[],
          options:{}          
        });        
      }
      game.dice3d.show(data);
    }

    return result;
  }


  static rollD4({
    actor,
    quality,
    supplement = undefined,
    burnout = 0,
    action = "",
    message = "",
    ability = null
  }) {
    const pool = this.rollGroup("d4", supplement);

    const success = [];
    const other = [];
    for (let i = 0; i < 6; i++) {
      const roll = pool.primary.result.roll[i];
      if (roll == 3) {
        success.push(roll)
      }
      else {
        other.push(roll)
      }
    }
    pool.primary.result.roll = success.concat(other);

    pool.message = message;
    pool.qa = {
      max: quality.value,
      active: quality.value > 0,
      spent: 0,
      up: 0,
      down: 0
    };
    pool.demerit = {
      max: actor.system.agency.demerits,
      active: actor.system.agency.demerits >= 3,
      spent: 0,
      up: 0,
      down: 0
    };

    this.analyzeD4(pool.primary.result);
    pool.burnout = burnout;
    pool.primary.result.quality = quality;
    pool.lock = false;
    pool.action = action;
    pool.canUnl3ash = true;
    pool.unl3ash = false;

    if (pool.supplement.active && pool.supplement.type == "d6") {
      this.analyzeD6(pool.supplement.result);
    }

    const supplementSuccess = pool.supplement.active ? pool.supplement.result.success : 0;
    // check for Triscendence
    if (
      pool.primary.result.success == 3 ||
      (pool.primary.result.success + supplementSuccess == 3) ||
      (pool.primary.result.success - supplementSuccess == 3)
    ) {
      pool.primary.result.triscendence = true;
      pool.primary.result.success = 3;
      pool.primary.result.message = game.i18n.localize("TA.Agent.TricendenceOptions");
      pool.lock = true;
      pool.supplement.active = false;
    }

    // check for Unl3ash
    if (
      pool.supplement.active &&
      pool.supplement.type == "d6" &&
      (pool.primary.result.success + supplementSuccess == 7) ||
      (pool.primary.result.success - supplementSuccess == 7)
    ) {
      pool.primary.result.unleash = true;
      pool.unleash = true;
      pool.primary.result.success = 7;
      pool.primary.result.message = '<div class="isagency center">' + game.i18n.localize("TA.UNL3ASH") + "</div>" +
        game.ta.helpers.taHelper.enhanceText(game.i18n.localize("TA.Chat.UNL3ASH"));
      pool.lock = true;
      pool.supplement.active = false;
      pool.burnout = 0;
      pool.primary.result.chaos = 0;
    }

    // check for result with no options and auto-lock
    if ((!pool.qa.active) && (!pool.lock)) {
      pool.lock = true;
      let chaos = pool.primary.result.chaos + pool.burnout;
      if (pool.supplement.active) {
        chaos += pool.supplement.chaos;
      }
      if (pool.supplement.active && pool.supplement.type == "d6" && pool.demerit.active) {
        pool.lock = false;
      }

      if (pool.action == "ata" && game.ta.settings.autoATABurnout) {
        let effective = pool.primary.result.success + supplementSuccess - pool.burnout;
        if (effective <= 0) {
          let burnout = Number(game.settings.get("triangleagency", "burnout")) + 1;
          if (game.user !== game.users.activeGM) {
            game.system.socketHandler.emit("setBurnout", burnout);
          }
          else {
            game.ta.applications.agencyOs.setBurnout(burnout);
          }
        }
      }
  
      if (chaos > 0) {
        chaos += Number(game.settings.get("triangleagency", "chaos"));
        if (game.user !== game.users.activeGM) {
          game.system.socketHandler.emit("setChaos", chaos);
        }
        else {
          game.ta.applications.agencyOs.setChaos(chaos);
        }
      }
    }

    const template = "systems/triangleagency/templates/part-d4-outcome.hbs";

    game.ta.entities.taChatMessage.create({
      user: game.user.id,
      style: CONST.CHAT_MESSAGE_STYLES.OOC,
      sound: CONFIG.sounds.notify,
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flags: {
        ta: {
          dice: "d4",
          outcome: pool,
          template: template,
          ability: {
            outcomes: ability ? Object.keys(ability.system.outcomes) : null
          }
        }
      },
    });    
  }


  static rollD10({
    actor,
    quality,
    supplement = undefined,
    burnout = 0,
    message = "",
    ability = null
  }) {
    const pool = this.rollGroup("d10", supplement);
    pool.message = message;
    pool.qa = {
      max: quality.value,
      active: quality.value > 0,
      spent: 0,
      up: 0,
      down: 0
    };
    pool.demerit = {
      max: actor.system.agency.demerits,
      active: actor.system.agency.demerits >= 3,
      spent: 0,
      up: 0,
      down: 0
    };

    this.analyzeD10(pool.primary.result);
    pool.burnout = burnout;
    pool.primary.result.quality = quality;
    pool.primary.result.pip = pool.primary.result.roll[0];
    pool.canUnl3ash = true;
    pool.unl3ash = false;
    pool.lock = false;

    if (pool.supplement.active) {
      this.analyzeD6(pool.supplement.result);
    }

    if (pool.primary.result.autofail) {
      // automatic fail
      pool.lock = true;
      pool.primary.result.message = game.i18n.localize("TA.Chat.D10FailOn3");
      const chaos = Number(game.settings.get("triangleagency", "chaos")) +
        pool.primary.result.chaos +
        pool.burnout +
        (pool.supplement.active ? pool.supplement.result.chaos : 0);
      if (game.user !== game.users.activeGM) {
        game.system.socketHandler.emit("setChaos", chaos);
      }
      else {
        game.ta.applications.agencyOs.setChaos(chaos);
      }
    }
    else if (pool.primary.result.pip + (pool.supplement.active ? pool.supplement.result.pip : 0) == 7) {
      // UNL3ASH
      pool.lock = true;
      pool.unl3ash = true;
      pool.primary.result.message = '<div class="isagency center">' +
        game.i18n.localize("TA.UNL3ASH") + '</div><div style="margin-top: 3px">' +
        game.ta.helpers.taHelper.enhanceText(game.i18n.localize("TA.Chat.UNL3ASH")) + "</div>";

      const chaos = Number(game.settings.get("triangleagency", "chaos")) +
        pool.primary.result.chaos +
        pool.burnout +
        (pool.supplement.active ? pool.supplement.result.chaos : 0);
      if (game.user !== game.users.activeGM) {
        game.system.socketHandler.emit("setChaos", chaos);
      }
      else {
        game.ta.applications.agencyOs.setChaos(chaos);
      }
    }
    else if ((!pool.qa.active) && (!pool.demerit.active) && (!pool.lock)) { // check for result with no options and auto-lock
      pool.lock = true;
    }

    const template = "systems/triangleagency/templates/part-d10-outcome.hbs";

    game.ta.entities.taChatMessage.create({
      user: game.user.id,
      style: CONST.CHAT_MESSAGE_STYLES.OOC,
      sound: CONFIG.sounds.notify,
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flags: {
        ta: {
          dice: "d10",
          outcome: pool,
          template: template,
          ability: {
            outcomes: Object.keys(ability.system.outcomes)
          }
        }
      },  
    });
  }


  static async rollD20({
    actor,
    quality,
    supplement = null,
    burnout = 0
  }) {
    const qas = actor.system.qa;
    const context = {};

    context.allQAs = Object.keys(qas)
      .map(qa => {
        return {
          qa: qa,
          name: game.i18n.localize("TA.Quality." + qa),
          value: qas[qa].value 
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    
    context.payWith = context.allQAs.filter(qa => qa.value > 0);

    let template = "systems/triangleagency/templates/dialog-d20-options.hbs";
    const part = await foundry.applications.handlebars.renderTemplate(template, context);
    let riskQA = null;

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
            const payFrom = button.form.elements.payFrom.value;
            riskQA = button.form.elements.riskQA.value;

            // decrement the QA used to pay for the action
            const update = {};
            update["system.qa." + payFrom + ".value"] = actor.system.qa[payFrom].value - 1;
            actor.update(update);
          }
        },
        {
          action: "exit",
          label: game.i18n.localize("TA.Action.Cancel")
        }
      ]
    });

    if (riskQA == null) { return }

    const pool = this.rollGroup("d20", supplement);
    pool.primary.result.quality = riskQA;
    pool.primary.result.pip = pool.primary.result.roll[0];
    pool.primary.result.boost = Number(actor.system.qa[riskQA].value);

    this.analyzeD20(pool.primary.result);

    if (pool.primary.result.autofail) {
      const update = {};
      update["system.qa." + riskQA + ".value"] = 0;
      actor.update(update);
    }
    
    template = "systems/triangleagency/templates/part-d20-outcome.hbs";
    let msg = "<span>" + game.i18n.localize("TA.Agent.SkillCheckMsg") + "</span>" +
      await foundry.applications.handlebars.renderTemplate(template, pool);

    game.ta.entities.taChatMessage.create({
      user: game.user.id,
      style: CONST.CHAT_MESSAGE_STYLES.OOC,
      sound: CONFIG.sounds.notify,
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flags: {
        ta: {
          //title: "",
          dice: "d20",
          outcome: pool,
          message: msg
        }
      },
    });

    if (pool.primary.result.chaos > 0) {
      const chaos = Number(game.settings.get("triangleagency", "chaos")) + pool.primary.result.chaos;
      if (game.user !== game.users.activeGM) {
        game.system.socketHandler.emit("setChaos", chaos);
      }
      else {
        game.ta.applications.agencyOs.setChaos(chaos);
      }
    }
  }


  static analyzeD4(result) {
    result.isfailure = result.success == 0;
    result.triscendence = result.success == 3;
    result.chaos = result.triscendence ? 0 : 6 - result.success;
    result.message = "";

    result.adjust = {
      qa: 1,
      demerit: 0,
      step: 1,
      setface: false
    }
  }


  static analyzeD6(result) {
    result.pip = result.roll[0];
    result.success = (result.pip % 3 == 0) ? (result.pip / 3) : 0;
    result.isfailure = result.success == 0;
    result.chaos = result.isfailure ? 1 : 0;
    result.message = "";

    result.adjust = {
      qa: 1,
      demerit: 3,
      step: 0,
      setface: true
    }
  }


  static analyzeD8(result) {
    result.pip = result.roll[0];
    result.success = (result.pip % 3 == 0) ? (result.pip / 3) : 0;
    result.chaos = 0;
    result.isfailure = result.success == 0;
    result.message = "";

    if (result.isfailure) {
      // get the first Sponsorship item
      let sponsor = game.items.filter(item => item.type == "Sponsorship");
      if (sponsor.length > 0) {
        sponsor = sponsor[0].system.requirements["s" + result.pip];
        if (sponsor) {
          result.message = game.i18n.localize("TA.Dialog.SponsorsRequire") + " " +
          sponsor.charAt(0).toLowerCase() +
          sponsor.slice(1);
        }
      }
    }
    return result;
  }


  static analyzeD10(result) {
    result.pip = result.roll[0];
    result.success = result.pip == 3 ? 0 : Number(result.pip);
    result.triscendence = false;
    result.isfailure = result.pip == 3;
    result.autofail = result.pip == 3;
    result.chaos = Number(result.pip);

    result.adjust = {
      qa: 1,
      demerit: 3,
      step: 1,
      setface: false
    }
  }


  static analyzeD20(result) {
    result.pip = result.roll[0];
    
    result.triscendence = result.pip == 3;
    result.autofail = result.pip == 7;
    result.success = (result.triscendence || result.pip + result.boost > 10) && (!result.autofail) ? 1 : 0;
    result.isfailure = result.autofail || (result.success == 0);
    result.chaos = result.isfailure ? result.pip : 0;

    result.message = result.success ?
      game.i18n.localize("TA.D20.Success") :
      game.i18n.localize("TA.D20.Failure").replace("[chaos]", result.chaos);
  }

  /*
  static async display({
      result,
      onlysuccess = false,
      showinfo = false,
      qaspent = 0,
      lock = false
    } = {}) {
    result.effectiveBurnout = result.burnout;
    if (result.effectiveBurnout > result.success) { result.effectiveBurnout = result.success }

    result.effectiveSuccess = result.success + qaspent - result.effectiveBurnout;
    if (result.effectiveSuccess < 0) { result.effectiveSuccess = 0 }

    result.effectiveChaos = result.burnout + result.failure;
    if (result.effectiveSuccess > result.success) {
      result.effectiveChaos -= (result.effectiveSuccess - result.success);
    }
    if (result.triscendence || result.effectiveSuccess == 3) { result.effectiveChaos = 0 }

    let max = (onlysuccess || result.triscendence) ? result.effectiveSuccess : 6;
    if (onlysuccess && max == 0) { max = 1 }
    if (result.triscendence) { showinfo = false }

    //console.log(result);

    const template = "systems/triangleagency/templates/chat-outcome-worksheet.hbs";;
    const context = {
      showinfo: showinfo,
      burnout: result.burnout,
      chaos: result.effectiveChaos,
      qaShowAdjust: (!lock) && (result.qualityMax > 0),
      qaAvailable: result.qualityCurrent,
      qaSpent: qaspent,
      lock: lock
    };

    let display = "<div>";
    for (let i = 1; i <= max; i++) {
      let state = "fail";
      let icon = "d4-blank.png";

      if (onlysuccess && result.effectiveSuccess == 0) {
        icon = "d4-none.png";
      }
      else if (i <= result.effectiveSuccess) {
        state = "success";
        icon = "d4-red.png";
      }
      else if (i > result.effectiveSuccess && i <= result.success) {
        state = "burnout"
        icon = "d4-burnout.png";
      }

      display += '<img class="d4" data-state="' + state + '" ' +
        'src="systems/triangleagency/assets/icons/' +  icon + '"/>';
    }
    display += "</div>";

    // icons
    display += await foundry.applications.handlebars.renderTemplate(template, context);

    return display;
  }
  */
}