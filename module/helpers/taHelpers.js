import { taJournalEntry } from "../journal/journal-entry-entity";

export const taHelper = {};


taHelper.addPlaywall = async (actorId, playwall, context, extras) => {
  //if (game.user.isGM) {
    const actor = await game.actors.get(actorId);
    if (actor) {
      actor.addPlaywall(playwall, context, extras);
    }
  /*}
  else {
    const data = {
      actorId: actorId,
      playwall: playwall,
      context: context,
      extras: extras
    }
    game.system.socketHandler.emit("addPlaywall", data);
  }
  */
}


taHelper.removePlaywall = async (actorId, playwall) => {
  //if (game.user.isGM) {
    const actor = await game.actors.get(actorId);
    if (actor) {
      actor.removePlaywall(playwall);
    }
  /*}
  else {
    const data = {
      actorId: actorId,
      playwall: playwall
    }
    game.system.socketHandler.emit("removePlaywall", data);
  }
  */
}


taHelper.setObjectPermissions = (type, id, player, value) => {
  if (game.user.isGM) {
    const update = {};
    update["ownership." + (value ? "" : "-=") + player] = value;
    switch (type) {
      case "Page": {
        //console.log(update)
        break;
      }
      case "Actor": {
        const actor = game.actors.get(id);
        if (actor) {
          actor.update(update);
          //console.log(update)
        }
        break;
      }
    }
    return;
  }
  else {
    const data = {
      type: type,
      id: id,
      player: player,
      value: value
    }
    game.system.socketHandler.emit("setObjectPermissions", data);
  }
}


taHelper.enhanceText = (text, quality = null, qas = {}, data = {}) => {
  const highlight = ["3", "three", "Agency", "Triangle", "Sponsors"];

  highlight.forEach(tag => {
    text = text.replaceAll(tag, '<span class="isagency">' + tag + '</span>');
  });

  if (quality) {
    text = text.replaceAll("[quality]", "[" + quality + "]");
  }
  if (CONFIG.TA.qualities.some(quality => text.includes(quality))) {
    CONFIG.TA.qualities.forEach(quality => {
      const tag = "[" + quality + "]";
      
      if (Object.keys(data).length > 0) {
        let triggerData = "";
        data["data-qa"] = quality;
        Object.keys(data).forEach(key => {
          triggerData += key + '="' + data[key] + '" ';
        });
      
        let highlight = (qas[quality].value == 0 ? "color-red" : "color-blue");
        if (game.ta.settings.highlightAction) {
          highlight = (qas[quality].value == 0 ? "highlightRed" : "highlightBlue");
        }
        text = text.replaceAll(
          tag,
          '<span class="articulat-bold qa-check ' + highlight + '" ' + triggerData +
          '>' + game.i18n.localize('TA.Quality.' + quality) + '</span>'
        )
      }
      else {
        text = text.replaceAll(
          tag,
          '<span class="articulat-bold">' + game.i18n.localize('TA.Quality.' + quality) + '</span>'
        )
      }
    });
  }

  return text;
};


/************************************************************************
 * Reduces the form buttons to icons. Optionally adds a Lock button 
************************************************************************/
taHelper.adjustHeaderButtons = (html, addLock, sheet) => {
  const header = html[0].querySelector(".window-header");
 
  /*
  header.querySelectorAll(".document-id-link").forEach(btn => {
    btn.remove();
  });
  */

  header.querySelectorAll(".header-button").forEach(btn => {
    if (btn.classList.contains("configure-sheet")) {
      btn.remove();
      return;
    }
    const label = btn.querySelector(":scope > i").nextSibling;
    btn.dataset.tooltip = label.textContent;
    btn.setAttribute("aria-label", label.textContent);
    label.remove();
  });

  if (addLock) {
    const parser = new DOMParser();
    let edit = '<a class="control toggle-edit-sheet" data-tooltip="' + 
      (sheet.actor.system.lock ? game.i18n.localize('TA.Edit') : game.i18n.localize('TA.Lock')) +
      '"><i id="toggle-edit-status" class="fas fa-lock' + (sheet.actor.system.lock ? '' : '-open') + '"></i></a>';
    edit = (parser.parseFromString(edit, 'text/html')).body.firstChild;
    edit.addEventListener("click", sheet._listenSheetEditToggle.bind(sheet));
    edit.addEventListener("dblclick", event => event.stopPropagation());
    const firstButton = header.querySelector(".header-button");
    firstButton?.insertAdjacentElement("beforebegin", edit);
  }
};


/************************************************************************
 * preps and optionally renders a track
************************************************************************/
taHelper.renderTrack = ({
  track,
  columns = 8,
  canstrike = false,
  connectors = true,
  startIcon = null,
  endIcon = null,
  showMilestoneContent = false,
  render = false,
  canaction = false,
  renderOptions = {}
}) => {

  if (game.ta.settings.playerPlaywallTracks) {
    canaction = canaction || (["worklife", "peerreview"].includes(renderOptions.boxClass));
  }

  const trackData = {
    columns: columns,
    canstrike: canstrike,
    rows: []
  };

  const oneLine = track.size == columns;
  const loops = Math.ceil(track.size / columns);
  const value = track.value || 0;
  const strikes = track.strikes || 0;
  const milestones = track.milestones || {};
  let remaining = track.size;

  for (let row = 1; row <= loops; row++) {
    const newRow = {
      rowStart: "&nbsp;",
      rowEnd: "&nbsp;",
      rowStartArrowDown: false,
      rowEndArrowDown: false,
      columns: []
    };
    const reverse = row % 2 == 0;

    let colStart = ((row - 1) * columns) + 1;
    let colEnd = ((row - 1) * columns) + (row < loops ? columns : remaining);
    let colAdj = 1;
    
    if (reverse) {
      const wrk = colStart;
      colStart = colEnd;
      colEnd = wrk;
      colAdj = -1;
    }

    newRow["rowStart"] = row == 1 ? (startIcon || "&nbsp;") : (reverse && row < loops ? "&#9484;&#9472;" : "&nbsp;");

    newRow["rowStart"] = "&nbsp;";
    if (row == 1) {
      newRow["rowStart"] = startIcon || "&nbsp;";
    }
    else if (row < loops) {
      if (reverse) {
        newRow["rowStart"] = "&#9484;&#9472;";
        newRow["rowStartArrowDown"] = true;
      }
      else {
        newRow["rowStart"] = "&#9492;&#9472;";
      }
    }
    else if (row == loops && !reverse) {
      newRow["rowStart"] = "&#9492;&#9472;";
    }

    if (reverse) {
      newRow["rowEnd"] = "&#9496;"; // reverse always has a connector and a down arrow
    }
    else {
      if (row < loops) {
        newRow["rowEnd"] = "&#9488;";
        newRow["rowEndArrowDown"] = true;
      }
      else if (row == loops && endIcon) {
        newRow["rowEnd"] = endIcon;
      }
    }

    for (let col = colStart; (!reverse && col <= colEnd) || (reverse && col >= colEnd); col = col + colAdj) {
      const milestone = milestones[String(col)] || null;

      newRow.columns.push({
        value: col,
        id: track.id,
        name: track.name,
        checked: value >= col,
        struck: canstrike && (col >= track.size + 1 - strikes),
        canaction: (game.user.isGM || canaction) && (
          (col == value + 1) ||
          (col == value) ||
          (canstrike && (col == track.size + 1 - strikes)) ||
          (canstrike && (col == track.size - strikes))
        ),
        lineAfter: connectors && (remaining > 1 || endIcon || reverse),
        isMilestone:  milestone != null,
        milestone: milestone != null && showMilestoneContent && (value >= col) && (!(canstrike && (col >= track.size + 1 - strikes))) ? milestones[String(col)] : ""
      });

      remaining--;
    }
   
    trackData.rows.push(newRow);
  }

  if (!render) { return trackData; }

  renderOptions.highlightMilestones = (renderOptions.highlightMilestones ?? true) && showMilestoneContent;

  // render the track
  const template = "systems/triangleagency/templates/part-track.hbs";

  foundry.utils.mergeObject(trackData, renderOptions);
  const result = foundry.applications.handlebars.renderTemplate(template, trackData);

  return result;
};


/************************************************************************
 * renders an anomaly ability
************************************************************************/
taHelper.renderAnomalyAbility = async ({
  ability,
  qas = null,
  anomaly = "",
  actionable = false,
  showTitle = true
}) => {
  const template = "systems/triangleagency/templates/part-anomalyability.hbs";
  const data = ability.system;
  const context = {
    id: ability.id,
    showTitle: showTitle,
    name: ability.name,
    description: data.description,
    reference: data.reference,
    triggers: {}
  };

  if (actionable && qas) {
    const triggerData = {
      "data-qa" : data.quality,
      "data-action": "anomaly-ability",
      "data-anomaly": anomaly,
      "data-abilityid": ability.id
    };

    context.description = taHelper.enhanceText(
      data.description,
      data.quality,
      qas,
      triggerData
    );
  }
  else {
    context.description = taHelper.enhanceText(
      context.description,
      data.quality
    );
  }

  if (data.track.size > 0) {
    data.track.id = ability.id,
    context.track = await game.ta.helpers.taHelper.renderTrack({
      track: data.track,
      columns: data.track.size,
      canstrike: false,
      startIcon: "&#9654;",
      render: true,
      canaction: actionable,
      renderOptions: {
        trackClass: CONFIG.TA.aspects.anomaly.colorClass,
        trackType: "anomaly",
        boxClass: "abilitytrack"
      }
    });
  }

  for (let [key, value] of Object.entries(data.outcomes)) {
    context.triggers[CONFIG.TA.outcomes[key].order] = {
      "id": key,
      "label": game.i18n.localize('TA.Outcome.' + key + '.prefix'),
      "description": data.outcomes[key],
      "img": CONFIG.TA.assetPath + "/icons/" + CONFIG.TA.outcomes[key].image
    };
  }

  const result = foundry.applications.handlebars.renderTemplate(template, context);
  return result;
}


/************************************************************************
 * Playwall functionsa
************************************************************************/
/*
taHelper.cleanPlaywall = async () => {
  if (!game.user.isGM) { return }
  const playwall = game.ta.helpers.taHelper.playwallJournal();
  if (!playwall) { return null }

  // get Playwall
  const pages = playwall.pages.filter(page => page.type == "Playwall" && page.system.code)
    .reduce(function(list, page) {
      list[page.system.code] = page;
      return list;
    }, {}
  );

  // get Players who have Agents
  const players = game.users.players.filter((player) => 
    player.hasPlayerOwner &&
    player.character &&
    player.character.type === "Agent" &&
    player.character.ownership[player.id] === CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
  ).reduce(function(list, player) {
      list[player.id] = {
        id: player.id,
        codes: [...new Set([...(list[player.id] ? (list[player.id].codes || []) : []),...player.character.system.allPlaywall])]
      };
      return list;
    }, {}
  );

  // evaluate all pages
  for (let [code, page] of Object.entries(pages)) {
    const update = {};
    for (let owner of Object.keys(page.ownership)) {
      if (owner == "default") { continue }
      const player = players[owner];
      if (player && player.codes.includes(code)) {
        if (page.ownership[owner] != CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER) {
          update["ownership." + owner] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
        }
      }
      else {
        update["ownership.-=" + owner] = null;
      }
    }

    page.update(update);
  }

  return {
    pages: pages,
    players: players
  };
}


taHelper.resyncPlaywall = async (agentId, silent = true) => {
  if (!game.user.isGM) { return }
  if (!silent) {
    await foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n.localize("TA.Dialog.Notification") },
      position: {
        "width": 450
      },
      content: game.i18n.localize("TA.PlaywallSyncWarning"),
      ok: {
        label: game.i18n.localize("TA.Action.Okay")
      },
      rejectClose: false,
      modal: true
    });
  }

  const clean = await game.ta.helpers.taHelper.cleanPlaywall();
  if (!clean) { return }
  const playwall = clean.pages;
  let players = clean.players;

  if (agentId) {
    let player = game.users.players.filter((player) => 
      player.hasPlayerOwner &&
      player.character &&
      player.character.id === agentId &&
      player.character.ownership[player.id] === CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
    ).map(player => player.id);
    if (player.length == 0) { return }
    player = player[0];
    const agent = game.actors.get(agentId);

    players = {};
    players[player] = {
      id: player,
      codes: agent.system.allPlaywall
    };
  }
  
  for (let player of Object.values(players)) {
    for (let code of player.codes) {
      const page = playwall[code];
      if (page) {
        // add missing player permissions
        if ((!Object.keys(page.ownership).includes(player.id)) || page.ownership[player.id] != CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER) {
          const update = {};
          update["ownership." + player.id] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
          page.update(update);
        }
      }
    }
  }
}
*/

taHelper.togglePlaywall = async () => {
  const playwall = game.ta.helpers.taHelper.playwallJournal();
  if (playwall) {
    if (playwall.sheet.rendered) {
      playwall.sheet.close()
    }
    else {
      playwall.sheet.render(true);
    } 
  }
}


taHelper.gotoPlaywall = async (playwall) => {
  // find the Playwall journal
  const pageRef = game.ta.helpers.taHelper.playwallPage(playwall);

  if (pageRef === undefined) {
    const proceed = await foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n.localize("TA.Dialog.Notification") },
      content: game.i18n.localize("TA.Journal.MissingPlaywall"),
      label: game.i18n.localize("TA.Action.Disappointed"),
      rejectClose: false,
      modal: true
    });
    return;
  }

  const journal = game.journal.get(pageRef.journal);
  journal.sheet.render(true, {pageId: pageRef.page})
}


taHelper.playwallPage = (playwall) => {
  const journal = game.journal.get(game.settings.get("triangleagency", "playwall"));
  if (!journal) { return }
  const pages = journal.pages.filter(page => page.type == "Playwall" && page.system.code == playwall).map(page => page.id);
  if (pages.length > 0) {
    return {
      journal: journal.id,
      page: pages[0]
    }
  }
  return {
    journal: journal.id,
    page: null
  };
}


taHelper.playwallJournal = () => {
  const playwall = game.settings.get("triangleagency", "playwall");
  if (playwall) {
    return game.journal.get(playwall);
  }
  return null;
}


taHelper.checkPlaywall = () => {
  if (!game.user.isGM) { return null }

  const playwall = game.settings.get("triangleagency", "playwall");
  if (playwall != null) {
    // check that the playwall journal exists
    const journal = game.journal.get(playwall);
    if (journal) { return journal }
  }

  // find the playwall journal
  for (const journal of game.journal) {
    if (journal.pages.filter(page => page.type == "Playwall" && page.system.code != "").length > 0) {
      game.settings.set("triangleagency", "playwall", journal.id);
      return game.journal.get(journal.id);
    }
  }

  return null;
}


taHelper.syncAssets = async () => {
  let playwall = await game.ta.helpers.taHelper.checkPlaywall();
  if (!game.user.isGM) { return }

  // check that the Agency assets have been imported
  let check = game.items.filter(ability => ability.name == "Focus Group" && ability.type == "AnomalyAbility");
  if (check.length == 0) {
    // import the Agency Data from the Compendium
    console.log("Importing Agency Data");
    const compendium = game.packs.get("triangleagency.item-agency-data");
    compendium.importAll({keepId: true});
  }

  if (!playwall) {
    console.log("Importing Playwall");
    const pack = game.packs.find((pack) => pack.metadata.id === 'triangleagency.journalentry-gm-documents');
    const journal = await pack.getDocument(pack.index.find((i) => i.name === 'Playwall')._id);
    await taJournalEntry.create(journal.toObject());

    playwall = await game.ta.helpers.taHelper.checkPlaywall();
    if (playwall) {
      for(const page of playwall.pages.filter(page => page.type == "Playwall" && page.system.code)) {
        const updates = {};
        for(const key of Object.keys(page.ownership)) {
          if (key == "default") {
            if (page.ownership.default != CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER) {
              page.update({ownership: {["default"]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER}});
              //updates["ownership.default"] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
            }
          }
          else {
            //page.update({ownership: {[key]: new foundry.data.operators.ForcedDeletion()}});
            //updates["ownership." + key] = new foundry.data.operators.ForcedDeletion();
          }
        }
        //page.update(updates, { render: false });
      }
    }
    console.log("Playwall imported");
  }

  check = game.journal.filter(journal => journal.name == "GM Reference");
  if (check.length == 0) {
    const pack = game.packs.find((pack) => pack.metadata.id === 'triangleagency.journalentry-gm-documents');
    const journal = await pack.getDocument(pack.index.find((i) => i.name === 'GM Reference')._id);
    await taJournalEntry.create(journal.toObject());
    console.log("Importing GM Reference");
  }

  check = game.actors.filter(actor => actor.name == "Thieving Minor Anomaly");
  if (check.length == 0) {
    const folderName = "Antagonists";
    // either gets the folder id of that name or creates one if it doesnt exist.
    const folderId = await game.actors.folders.getName(folderName)?.id || (await Folder.create({name: folderName, type: "Actor"})).id; 
    const pack = await game.packs.get('triangleagency.actor-minor-anomalies');
    const options = {
      folderId: folderId,
      keepId: true
    };
    pack.importAll(options);
    console.log("Importing Minor Anomalies");
  }
}


taHelper.getGMScreenData = () => {
  const data = game.settings.get("triangleagency", "gmscreen") || {};
  data.antagonists = data.antagonists || {};
  data.others = data.others || {};
  return data;
}


taHelper.setGMScreenData = async (data) => {
  await game.settings.set("triangleagency", "gmscreen", data);
  const gmScreen = game.ta.applications.GMScreen;
  if (gmScreen.state == foundry.applications.api.ApplicationV2.RENDER_STATES.RENDERING ||
    gmScreen.state == foundry.applications.api.ApplicationV2.RENDER_STATES.RENDERED) {
      gmScreen.render();
  }  
}


taHelper.toggleGMScreen = async () => {
  const gmScreen = game.ta.applications.GMScreen;
  if (gmScreen.state == foundry.applications.api.ApplicationV2.RENDER_STATES.RENDERED) {
    gmScreen.close();
  }
  else {
    gmScreen.render(true);
  } 
}


taHelper.togglePlayerScreen = async () => {
  const playerScreen = new game.ta.applications.PlayerScreen();
  playerScreen.options.window.title = game.i18n.localize("TA.Agent.MyPlayedBy");

  playerScreen.render(true);
}


taHelper.currentMission = () => {
  const missions = game.items.filter((item) => item.type === "MissionReport" && item.system.resolved == false);
  return (missions.length == 1 ? missions[0] : null);
}
