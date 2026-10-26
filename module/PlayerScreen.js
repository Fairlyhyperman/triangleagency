export default class PlayerScreen extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "PlayerScreen",
    tag: "div",
    window: {
      title: "Player",
      positioned: true
    },
    classes: ["PlayerScreen"],
    position: {
      "width": 280,
      "height": 400
    },
    form: {
      handler: PlayerScreen.myFormHandler,
      submitOnChange: false,
      closeOnSubmit: false
    },
    actions: {
      myAction: PlayerScreen.myAction
    },
  }
  
  static PARTS = {
    form: {
      template: "systems/triangleagency/templates/playerScreen.hbs"
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
    context.isGM = game.user.isGM;

    const valid = game.actors.filter(actor => actor.type === "Bystander" && actor.hasPlayerOwner).map(actor => actor.id);

    context.npcs = [];
    const unique = [];
    const myName = game.user.name;
    for(let agent of game.actors.filter(actor => actor.type === "Agent" && actor.hasPlayerOwner)) {
      if (agent.system.reality) {
        for (let relationship of Object.values(agent.system.reality.relationships)) {
          if (relationship.playedby != myName) { continue; }
          if (relationship.bystanderId && valid.includes(relationship.bystanderId)) {
            if (!unique.includes(relationship.bystanderId)) {
              context.npcs.push({
                id: relationship.bystanderId,
                name: relationship.name
              });
              unique.push(relationship.bystanderId);
            }
          }
        }
      }
    }
    context.npcs.sort((a,b) => a.name.localeCompare(b.name));
    return context;
  }

  static calcPosition() {
  }


  static setPosition() {
  }


  /**
   * Actions performed after any render of the Application.
   * Post-render steps are not awaited by the render process.
   * @param {ApplicationRenderContext} context      Prepared context data
   * @param {RenderOptions} options                 Provided render options
   * @protected
   */
  _onRender(context, options) {
    $(this.element).find('.npc').click(this.showNPC.bind(this));
  }

  async showNPC(event) {
    const data = event.currentTarget.dataset;
    if (!data.bystander) { return }
    const npc = game.actors.get(data.bystander);
    if (npc) {
      npc.sheet.render(true);
    }
  }

}
