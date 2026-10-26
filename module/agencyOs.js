export default class agencyOs extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "agencyOs",
    tag: "div",
    window: {
      positioned: true
    },
    classes: ["agencyOs"],
    position: {
      "width": 300,
      "height": 55
    },
    form: {
      handler: agencyOs.myFormHandler,
      submitOnChange: false,
      closeOnSubmit: false
    },
    actions: {
      myAction: agencyOs.myAction
    }
  }
  
  static PARTS = {
    form: {
      template: "systems/triangleagency/templates/agencyOs.hbs"
    }
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
    context["chaos"] = game.settings.get("triangleagency", "chaos");
    context["chaosDec"] = context["chaos"] > 0; 
    context["burnout"] = game.settings.get("triangleagency", "burnout");
    context["burnoutDec"] = context["burnout"] > 0; 
    context["looseends"] = game.settings.get("triangleagency", "looseends");
    context["looseendsDec"] = context["looseends"] > 0; 
    context["isGM"] = game.user.isGM;
    return context;
  }

  static calcPosition() {
    const agency = game.ta.applications.agencyOs;

    const position = {
      top: agency.position.top,
      left: agency.position.left,
      width: agency.position.width,
      height: agency.position.height
    };


    const hotbar = document.getElementById("hotbar");
    //position.top = hotbar.offsetTop - position.height - 10;
    position.top = 15;
    position.left = Math.floor((window.innerWidth - hotbar.offsetWidth) / 2) + ((hotbar.offsetWidth - position.width) / 2);


    return position;
  }


  static setPosition() {
    const agency = game.ta.applications.agencyOs;

    // Make sure the app is rendered or rendering
    if (!(agency.state == foundry.applications.api.ApplicationV2.RENDER_STATES.RENDERING ||
      agency.state == foundry.applications.api.ApplicationV2.RENDER_STATES.RENDERED)) {
        return;
    }

    // Store the current position before any modification
    const position = this.calcPosition();

    // Only post a position change if there are modifications
    if (
      position.top !== agency.position.top ||
      position.left !== agency.position.left ||
      position.width !== agency.position.width ||
      position.height !== agency.position.height
    ) {
      agency.setPosition(position);
    }
  }


  async syncData() {
    this.render();
  }

  async close() {
    return true;
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

    const ajusters = this.element.querySelectorAll('.agencyOsAjust')
    for (const global of ajusters) {
      global.addEventListener("change", this._adjustGlobals.bind(this));
    }
  }


  async setChaos(value) {
    if (game.user !== game.users.activeGM) return;

    await game.settings.set("triangleagency", "chaos", value);
    game.system.socketHandler.emit("syncGlobals", this);

    Object.values(ui.windows).filter(w => w instanceof foundry.appv1.sheets.ActorSheet && w.constructor.name == "taActorAnomalySheet").forEach(w => {
      w.render();
    });

    this.syncData();
  }


  async setBurnout(value) {
    if (game.user !== game.users.activeGM) return;

    if (game.ta.settings.sceneBurnout) {
      const scene = game.scenes.active;
      if (scene) {
        scene.update({"flags.ta.burnout": value}, { render: false });
      }
    }

    await game.settings.set("triangleagency", "burnout", value);
    game.system.socketHandler.emit("syncGlobals", this);
    this.syncData();
  }


  async _adjustGlobals(event) {
    event.preventDefault();

    const type = event.currentTarget.dataset.type;
    const value = Number(event.target.value);

    switch (type) {
      case "chaos":
        this.setChaos(value);
        break;
      case "burnout":
        this.setBurnout(value);
        break;
      case "looseends":
        await game.settings.set("triangleagency", type, value);
        game.system.socketHandler.emit("syncGlobals", this);
        this.syncData();
        break;
    }
  }
}
