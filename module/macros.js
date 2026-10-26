export async function setupMacros() {
  let macro = null;

  //for (const id of game.macros.map(e => e.id)) await game.macros.get(id).delete();

  if (game.user.isGM) {
    // check if system macros exist
    let macros = await game.macros.filter(macro => macro.flags.ta.key == "GMScreen");
    if (macros.length == 0) {
      // create the GM Screen macro, for GMs only
      let macro = {
        name: game.i18n.localize("TA.GMScreen"),
        type: "script",
        author: game.userId,
        img: CONFIG.TA.assetPath + "/icons/gm.png",
        scope: "global",
        ownership: {
          default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE
        },
        command: "game.ta.helpers.taHelper.toggleGMScreen();",
        flags: {
          'ta.key': 'GMScreen'
        }
      };
      macro = await Macro.create(macro);
      macros = await game.macros.filter(macro => macro.flags.ta.key == "GMScreen");
    }

    macro = macros[0];
    if (!Object.values(game.user.hotbar).includes(macro.id)) {
      game.user.assignHotbarMacro(macro, 1);
    }


    macros = await game.macros.filter(macro => macro.flags.ta.key == "Playwall");
    if (macros.length == 0) {
      // create the GM Screen macro, for Players
      let macro = {
        name: game.i18n.localize("TA.Playwall"),
        type: 'script',
        author: game.userId,
        img: CONFIG.TA.assetPath + "/icons/playwall.png",
        scope: 'global',
        ownership: {
          default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
        },
        command: "game.ta.helpers.taHelper.togglePlaywall();",
        flags: {
          'ta.key': "Playwall"
        } 
      };
      await Macro.create(macro);
    }


    macros = await game.macros.filter(macro => macro.flags.ta.key == "MyAgent");
    if (macros.length == 0) {
      // create the GM Screen macro, for Players
      let macro = {
        name: game.i18n.localize("TA.MyAgent"),
        type: 'script',
        author: game.userId,
        img: CONFIG.TA.assetPath + "/icons/agent.png",
        scope: 'global',
        ownership: {
          default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
        },
        command: "game.toggleCharacterSheet();",
        flags: {
          'ta.key': "MyAgent"
        } 
      };
      await Macro.create(macro);
    }

    macros = await game.macros.filter(macro => macro.flags.ta.key == "PlayerScreen");
    if (macros.length == 0) {
      // create the Player Screen macro, for Players
      let macro = {
        name: game.i18n.localize("TA.Agent.MacroMyPlayedBy"),
        type: 'script',
        author: game.userId,
        img: CONFIG.TA.assetPath + "/icons/playedby.png",
        scope: 'global',
        ownership: {
          default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
        },
        command: "game.ta.helpers.taHelper.togglePlayerScreen();",
        flags: {
          'ta.key': "PlayerScreen"
        } 
      };
      await Macro.create(macro);
    }
  }

  else {
    // check if the player has the agent toggle in hotbar
    let macros = await game.macros.filter(macro => macro.flags.ta.key == "MyAgent");    
    if (macros.length > 0) {
      macro = macros[0];
      if (!Object.values(game.user.hotbar).includes(macro.id)) {
        await game.user.assignHotbarMacro(macro, 1);
      }
    }

    // check if the playwall macro is in hotbar
    macros = await game.macros.filter(macro => macro.flags.ta.key == "PlayerScreen");    
    if (macros.length > 0) {
      macro = macros[0];
      if (!Object.values(game.user.hotbar).includes(macro.id)) {
        await game.user.assignHotbarMacro(macro, 3);
      }
    }
  }

  // check if the playwall macro is in hotbar
  let macros = await game.macros.filter(macro => macro.flags.ta.key == "Playwall");    
  if (macros.length > 0) {
    macro = macros[0];
    if (!Object.values(game.user.hotbar).includes(macro.id)) {
      await game.user.assignHotbarMacro(macro, 2);
    }
  }
}