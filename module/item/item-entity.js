export class taItem extends Item {
  prepareData() {
    super.prepareData();

    //CONFIG.debug.hooks = true;
  }

  /** @override */
  prepareBaseData() {
    super.prepareBaseData();
    switch (this.type) {
      case "Anomaly":
        return this._prepareAnomalyData(this);
      case "AnomalyAbility":
        return this._prepareAnomalyAbilityData(this);
      case "ChaosEffect":
        return this._prepareChaosEffectData(this);
      case "Competency":
        return this._prepareCompetencyData(this);
      case "Reality":
        return this._prepareRealityData(this);
      case "Requisition":
        return this._prepareRequisitionData(this);
      case "MissionReport":
        return this._prepareMissionReportData(this);
      case "Sponsorship":
        return this._prepareSponsorshipData(this);
    }
  }

  /** @override */
  prepareDerivedData() {
    //data.isadmin = game.isAdmin();

    switch (this.type) {
      case "MissionReport":
        return this._prepareMissionReportDerivedData(this);
    }
  }

  /* -------------------------------------------- */
  /*  Data Preparation Helpers                    */
  /* -------------------------------------------- */

  _prepareAnomalyData(itemData) {
    const data = itemData;
  }

  _prepareAnomalyAbilityData(itemData) {
    const data = itemData;
  }

  _prepareChaosEffectData(itemData) {
    const data = itemData;
  }

  _prepareCompetencyData(itemData) {
    const data = itemData;
  }

  _prepareRealityData(itemData) {
    const data = itemData;
  }

  _prepareRequisitionData(itemData) {
    const data = itemData;
  }

  _prepareMissionReportData(itemData) {
    const data = itemData;
  }

  _prepareSponsorshipData(itemData) {
    const data = itemData;
  }


  /* -------------------------------------------- */
  /*  Derived Data Preparation Helpers            */
  /* -------------------------------------------- */

  _prepareMissionReportDerivedData(itemData) {
    const data = itemData.system;

    Object.keys(data.objectives).forEach((id) => {
      const objective = data.objectives[id];
      switch (objective.type) {
        case "commendation":
          objective.display = "<b>+" + objective.value + " " +
            (objective.value > 1 ? game.i18n.localize("TA.Agent.Commendations") : game.i18n.localize("TA.Agent.Commendation")) +
            "</b> " + objective.description;
          break;
        case "demerit":
          objective.display = "<b>+" + objective.value + " " +
            (objective.value > 1 ? game.i18n.localize("TA.Agent.Demerits") : game.i18n.localize("TA.Agent.Demerit")) +
            "</b> " + objective.description;
          break;
        case "custom":
          objective.display = objective.description;
          break;
      }
    });
  }
}