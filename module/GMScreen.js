export default class GMScreen extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "GMScreen",
    tag: "div",
    window: {
      title: "GM",
      positioned: true
    },
    classes: ["GMScreen"],
    position: {
      "width": 600,
      "height": 639
    },
    form: {
      handler: GMScreen.myFormHandler,
      submitOnChange: false,
      closeOnSubmit: false
    },
    actions: {
      myAction: GMScreen.myAction
    },
    dragDrop: [{ dragSelector: '[draggable]', dropSelector: null }],    
  }
  
  static PARTS = {
    form: {
      template: "systems/triangleagency/templates/gmScreen.hbs"
    }
  }  

  constructor(options = {}) {
    super(options);
    this.#dragDrop = this.#createDragDropHandlers();
  }  

  /**
   * Process form submission for the sheet
   * @this {MyApplication}                      The handler is called with the application as its bound scope
   * @param {SubmitEvent} event                   The originating form submission event
   * @param {HTMLFormElement} form                The form element that was submitted
   * @param {FormDataExtended} formData           Processed data for the submitted form
   * @returns {Promise<void>}
   */
  static async myFormHandler(event, form, formData) {
    // Do things with the returned FormData
  }

  /**
   * @param {PointerEvent} event - The originating click event
   * @param {HTMLElement} target - the capturing HTML element which defined a [data-action]
   */
  static myAction(event, target) {
    console.log(this) // logs the specific application class instance
  }
  
  /**
   * Prepare context that is specific to only a single rendered part.
   *
   * It is recommended to augment or mutate the shared context so that downstream methods like _onRender have
   * visibility into the data that was used for rendering. It is acceptable to return a different context object
   * rather than mutating the shared context at the expense of this transparency.
   *
   * @param {string} partId                         The part being rendered
   * @param {ApplicationRenderContext} context      Shared context provided by _prepareContext
   * @returns {Promise<ApplicationRenderContext>}   Context data for a specific part
   * @protected
   */
  async _prepareContext(context) {
    context["isGM"] = game.user.isGM;

    const data = await game.ta.helpers.taHelper.getGMScreenData();
    const npcIds = game.actors.filter((actor) => actor.type === "Anomaly" || actor.type === "Bystander")
      .map(actor => actor.id);

    context.agents = game.actors.filter((actor) => actor.type === "Agent" && actor.hasPlayerOwner)
      .map(agent => {return {id: agent.id, name: agent.name}})
      .sort((a,b) => a.name.localeCompare(b.name));

    // check for anything in cache that has been deleted
    let changes = false;
    for (let id of Object.keys(data.antagonists).concat(Object.keys(data.others))) {
      if (!npcIds.includes(id)) {
        if (data.antagonists[id]) {
          delete data.antagonists[id];
        }
        else if (data.others[id]) {
          delete data.others[id];
        }
        changes = true;
      }
    }
    if (changes) {
      game.ta.helpers.taHelper.setGMScreenData(data);      
    }

    // get the pinned stuff
    context.antagonists = Object.keys(data.antagonists).map(id => {return {id: id, name: data.antagonists[id].name, type: data.antagonists[id].type}})
      .sort((a,b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));

    context.others = Object.keys(data.others).map(id => {return {id: id, name: data.others[id]}})
      .sort((a,b) => a.name.localeCompare(b.name));

    return context;
  }

  static calcPosition() {
    const gmScreen = game.ta.applications.GMScreen;

    const position = {
      top: gmScreen.position.top,
      left: gmScreen.position.left,
      width: gmScreen.position.width,
      height: gmScreen.position.height
    };

    position.top = window.innerHeight - position.height - 10;
    position.left = document.getElementById("ui-right").offsetLeft - position.width - 10;

    return position;
  }


  static setPosition() {
    const gmScreen = game.ta.applications.GMScreen;
    // Make sure the app is rendered or rendering
    if (!(gmScreen.state == foundry.applications.api.ApplicationV2.RENDER_STATES.RENDERING ||
      gmScreen.state == foundry.applications.api.ApplicationV2.RENDER_STATES.RENDERED)) {
        return;
    }

    // Store the current position before any modification
    const position = this.calcPosition();

    // Only post a position change if there are modifications
    if (
      position.top !== gmScreen.position.top ||
      position.left !== gmScreen.position.left ||
      position.width !== gmScreen.position.width ||
      position.height !== gmScreen.position.height
    ) {
      gmScreen.setPosition(position);
    }
  }

  async close() {
    const html = $(this.element);
    const data = html.find(".triangleagency").data();
    const gmData = await game.ta.helpers.taHelper.getGMScreenData();
    gmData.cache = html.find(".triangleagency").data();
    await game.ta.helpers.taHelper.setGMScreenData(gmData);
    return super.close()
  }


  /**
   * Actions performed after any render of the Application.
   * Post-render steps are not awaited by the render process.
   * @param {ApplicationRenderContext} context      Prepared context data
   * @param {RenderOptions} options                 Provided render options
   * @protected
   */
  _onRender(context, options) {
    if (!game.user.isGM) { return }

    $(this.element).find('.actor,.gmbutton').click(this._listenShowSomething.bind(this));
    $(this.element).find('#context-show').click(this.showActorSheet.bind(this));
    $(this.element).find('.removeActor').click(this._listenRemoveActor.bind(this));
    $(this.element).find('#resetMissionMetrics').click(this._listenResetMissionMetrics.bind(this));
    $(this.element).find('.weatherbutton').click(this._listenAdjustWeather.bind(this));

    const data = game.ta.helpers.taHelper.getGMScreenData();
    this.showSomething(data.cache);
  }


  async _listenAdjustWeather(event) {
    const data = event.currentTarget.dataset;
    if (!data.type) { return }

    switch (data.type) {
      case "clear": {
        const proceed = await foundry.applications.api.DialogV2.confirm({
          window: { title: game.i18n.localize("TA.Dialog.Confirm.Header") },
          content: game.i18n.localize("TA.ConfirmResetWeather"),
          position: {
            "width": 450
          },          
          rejectClose: false,
          modal: true
        });
        if (!proceed) { return }

        const weather = game.ta.settings.weather;
        weather.current = {};
        weather.history = {};
        await game.settings.set("triangleagency", "weather", weather);
        $(this.element).find("#branchweather").html("");
        break;
      }

      case "generate": {
        const proceed = await foundry.applications.api.DialogV2.confirm({
          window: { title: game.i18n.localize("TA.Dialog.Confirm.Header") },
          content: game.i18n.localize("TA.ConfirmGenerateWeather"),
          position: {
            "width": 450
          },          
          rejectClose: false,
          modal: true
        });
        if (!proceed) { return }

        const weather = game.ta.settings.weather;
        const looseends = game.settings.get("triangleagency", "looseends");
        let currentLooseEnds = looseends;
        let ref = game.ta.config.unraveling.looseEnds[this.floorLooseEnds(currentLooseEnds)];

        const work = {};
        for (let i = 1; i <= ref.weather; i++) {
          const roll = Math.floor(foundry.dice.MersenneTwister.random() * 20) + 1;
          if (roll % 3 == 0) {
            const count = roll / 3;
            currentLooseEnds -= count;
            if (currentLooseEnds < 0) { currentLooseEnds = 0 }
            ref = game.ta.config.unraveling.looseEnds[this.floorLooseEnds(currentLooseEnds)];
            work["3"] = (work["3"] || 0) + count;
          }
          else if (roll == 20) {
            currentLooseEnds += 3;
            ref = game.ta.config.unraveling.looseEnds[this.floorLooseEnds(currentLooseEnds)];
            work[roll] = (work[roll] || 0) + 3;
          }
          else {
            work[roll] = 1;
          }
        }

        // analyze the effects
        const effects = {};
        Object.keys(work).forEach(key => {
          if (key == "3") {
            effects[key] = work[key];
          }
          else if (key == "20") {
            effects[key] = work[key];
          }
          else {
            // is effect already in history?
            if (key == "13") {
              if (weather.history[key]) {
                effects[key] = 2;
              }
              else {
                effects[key] = 1;
                weather.history[key] = true;
              }
            }
            else {
              if (weather.history[key + "a"]) {
                if (weather.history[key + "b"]) {
                  if (weather.history[key + "c"]) {
                    effects[key + "c"] = 2;
                  }
                  else {
                    effects[key + "c"] = 1;
                    weather.history[key + "c"] = true;
                  }
                }
                else {
                  effects[key + "b"] = 1;
                  weather.history[key + "b"] = true;
                }
              }
              else {
                effects[key + "a"] = 1;
                weather.history[key + "a"] = true;
              }
            }
          }
        });

        game.ta.applications.agencyOs.setChaos(ref.chaos);
        if (currentLooseEnds != looseends) {
          await game.settings.set("triangleagency", "looseends", currentLooseEnds);
          game.system.socketHandler.emit("syncGlobals", null);
          game.ta.applications.agencyOs.syncData();
        }

        weather.current = {
          unraveling: this.floorLooseEnds(currentLooseEnds),
          effects: effects
        };
        this.displayWeatherEffects(weather.current);
        await game.settings.set("triangleagency", "weather", weather);
        break;
      }
    }
  }


  floorLooseEnds(looseends) {
    // round looseends down
    if (looseends <= 10) { looseends = 0 }
    else if (looseends >= 11 && looseends < 22) { looseends = 11 }
    else if (looseends >= 22 && looseends < 33) { looseends = 22 }
    else if (looseends >= 33 && looseends < 44) { looseends = 33 }
    else if (looseends >= 44 && looseends < 55) { looseends = 44 }
    else if (looseends >= 55 && looseends < 66) { looseends = 55 }
    else if (looseends >= 66 && looseends < 77) { looseends = 66 }
    else if (looseends >= 77) { looseends = 77 }
    return looseends
  }


  async displayWeatherEffects(weather) {
    let display = "";
    if ("unraveling" in weather) {
      display = '<div class="para">' + game.i18n.localize("TA.Unraveling.Restriction" + weather.unraveling) + "</div>";

      Object.keys(weather.effects).forEach(key => {
        const value = weather.effects[key];
        if (key == "3") {
          const msg = game.ta.helpers.taHelper.enhanceText(game.i18n.localize("TA.Weather.3" + (value > 1 ? "Multiple" : "")).replace("[count]", value));
          display += '<div class="para">' + msg + '</div>';
        }
        else if (key == "20") {
          const msg = game.ta.helpers.taHelper.enhanceText(game.i18n.localize("TA.Weather.20").replace("[count]", value));
          display += '<div class="para">' + msg + '</div>';
        }
        else {
          const msg = game.i18n.localize("TA.Weather." + key);
          if (value == 2) {
            msg += game.i18n.localize("TA.Weather.CMultiple");
          }
          display += '<div class="para">' + msg + "</div>";
        }
      });
    }
    $(this.element).find("#branchweather").html(display);
  }


  async _listenResetMissionMetrics(event) {
    const data = event.currentTarget.dataset;
    if (!data.id) { return }
    
    const agent = await game.actors.get(data.id);
    agent.update({
      "system.mission.commendations": 0,
      "system.mission.demerits": 0,
    });
    const html = $(this.element);
    html.find("#missionCommendation").html("0");
    html.find("#missionDemerit").html("0");
  }


  async _listenRemoveActor(event) {
    const data = event.currentTarget.dataset;
    if (!data.id) { return }
    const gmData = game.ta.helpers.taHelper.getGMScreenData();
    delete gmData.antagonists[data.id];
    delete gmData.others[data.id];
    await game.ta.helpers.taHelper.setGMScreenData(gmData);
    this.render();
  }


  async showActorSheet(event) {
    const data = event.currentTarget.dataset;
    if (!data.id) { return }
    game.actors.get(data.id).sheet.render(true);
  }


  async _listenShowSomething(event) {
    event.preventDefault();
    this.showSomething(event.target.dataset);
  }


  async showSomething(data) {
    switch(data.type) {
      case "agent": {
        this.showAgent(data.id);
        break;
      }

      case "antagonist": {
        this.showAntagonist(data.level, data.id);
        break;
      }

      case "other": {
        this.showOther(data.id);
        break;
      }

      case "missionreport": {
        const mission = await game.ta.helpers.taHelper.currentMission();
        if (mission) {
          mission.sheet.render(true);
        } 
        else {
          await foundry.applications.api.DialogV2.prompt({
            window: { title: game.i18n.localize("TA.Dialog.Notification") },
            content: game.i18n.localize("TA.Mission.NoActiveMission"),
            ok: {
              label: game.i18n.localize("TA.Action.Disappointed")
            }
          });
        }
        return;
      }

      case "weatherreport": {
        this.showWeather();
        break;
      }
    }

    const html = $(this.element);
    // remember the action
    html.find(".triangleagency").data(data);

    html.find("#context").show();
    html.find(".actorid").attr("data-id", data.id);
    html.find('.context-data[data-type!="' + data.type + '"]').hide();
    html.find('.context-data[data-type="' + data.type + '"]').show();
  }


  async showWeather() {
    const html = $(this.element);
    const context = html.find("#context-name");
    context.html(
      '<i class="fa-solid fa-cloud-bolt fa-sm" style="margin-right: 6px"></i>' +
      game.i18n.localize("TA.WeatherReport")
    );
    html.find("#context-show").hide();
    context.parent().removeClass().addClass("context-green");

    const weather = game.ta.settings.weather;
    this.displayWeatherEffects(weather.current);
  }


  async showOther(id) {
    const html = $(this.element);
    const agent = await game.actors.get(id);
    const context = html.find("#context-name");
    context.html(agent.name);
    html.find("#context-show").attr("data-id", id).show();
    context.parent().removeClass();

    html.find("#otherImage").attr("src", agent.img);
    html.find("#otherDescription").html(agent.system.description);
    html.find("#otherNotes").html(agent.system.notes);
  }


  async showAntagonist(type, id) {
    const html = $(this.element);
    const agent = await game.actors.get(id);
    const context = html.find("#context-name");
    context.html(agent.name);
    html.find("#context-show").attr("data-id", id).show();
    context.parent().removeClass().addClass("context-anomaly");

    html.find("#majorAnomaly").toggle(type == "major");
    html.find("#minorAnomaly").toggle(type == "minor");

    switch(type) {
      case "minor": {
        html.find("#minorImage").attr("src", agent.img);
        html.find("#antagThreat").html(agent.system.threat);
        let stability = "";
        for (let i = 1; i <= agent.system.stability; i++) {
          stability += '<i class="fa-solid fa-circle ' +
            (i <= agent.system.currentStability ? "color-red" : "color-grey-light") +
            '"' +
            (i < agent.system.stability ? ' style="margin-right: 6px"' : "") +
            '></i>';
        }
        html.find("#antagStability").html(stability);
        html.find("#minorDescription").html(agent.system.description);
        html.find("#minorAbilities").html(agent.system.ability);
        break;
      }

      case "major": {
        html.find("#majorImage").attr("src", agent.img);
        html.find("#majorDescription").html(agent.system.description);
        html.find("#majorFocus").html(agent.system.focus);
        html.find("#majorImpulse").html(agent.system.impulse);
        html.find("#majorDomain").html(agent.system.domain);
        break;
      }
    }
  }

  
  async showAgent(id) {
    const html = $(this.element);
    const agent = await game.actors.get(id);
    
    if (!agent) {
      // has been deleted
      return;
    }

    const context = html.find("#context-name");
    context.html(agent.name);
    html.find("#context-show").attr("data-id", id).show();
    context.parent().removeClass().addClass("context-competency");
    const data = agent.system;

    if (data.reality.type != "") {
      const reality = await fromUuid(data.reality.type);
      html.find("#reality-trigger").html(reality.system.realityTrigger.description);
    }
    if (data.competency.primeDirective != "") {
      html.find("#prime-directive").html(data.competency.primeDirective);
    }
    html.find("#commendation").html(data.agency.commendations);
    html.find("#demerit").html(data.agency.demerits);
    html.find("#burnout").html(data.burnout);
    html.find("#missionCommendation").html(data.mission.commendations);
    html.find("#missionDemerit").html(data.mission.demerits);

    const qaTarget = html.find("#qas").empty();
    const qas = Object.keys(data.qa)
    .map(qa => { return { name: game.i18n.localize("TA.Quality." + qa), data: data.qa[qa] }})
    .sort((a,b) => a.name.localeCompare(b.name));

    for (let qa of qas) {
      qaTarget.append("<div" + (qa.data.value == 0 ? ' class="color-red"' : "") + ">" + qa.name + "</div>");
      qaTarget.append('<div style="text-align: right">' + qa.data.value + " / " + qa.data.max + "</div>");
    }

    html.find("#rank").html(data.agency.title);
    html.find("#standing").html(game.i18n.localize("TA.Standing" + (data.agency.demerits > 10 ? 10 : data.agency.demerits)));
  }


  #dragDrop;

  /**
   * Returns an array of DragDrop instances
   * @type {DragDrop[]}
   */
  get dragDrop() {
    return this.#dragDrop;
  }  

  /**
 * Create drag-and-drop workflow handlers for this Application
 * @returns {DragDrop[]}     An array of DragDrop handlers
 * @private
 */
  #createDragDropHandlers() {
    return this.options.dragDrop.map((d) => {
      d.permissions = {
        //dragstart: this._canDragStart.bind(this),
        drop: this._canDragDrop.bind(this),
      };
      d.callbacks = {
        //dragstart: this._onDragStart.bind(this),
        //dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this),
      };
      return new foundry.applications.ux.DragDrop.implementation(d);
    });
  }

  /**
   * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector
   * @param {string} selector       The candidate HTML selector for the drop target
   * @returns {boolean}             Can the current user drop on this selector?
   * @protected
   */
  _canDragDrop(selector) {
    // game.user fetches the current user
    return true;
  }

  /**
   * Callback actions which occur when a dragged element is dropped on a target.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  async _onDrop(event) {
    return;
    const data = TextEditor.getDragEventData(event);

    // Handle different data types
    switch (data.type) {
        // write your cases
    }
  }  
}
