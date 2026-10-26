//Extend the base JournalEntry Class
export class taJournalEntry extends JournalEntry {
  /** @override */
  prepareData() {
    super.prepareData();
  }


  /** @override */
  prepareBaseData() {
    super.prepareBaseData();
  }


  /** @override */
  prepareDerivedData() {
    const journal = this;
    const pages = journal.pages;
  }


  async _prepareCommonData(data) {
  }


  addPlaywall(code, name) {
    return this.createEmbeddedDocuments('JournalEntryPage', [
      {
        name: name,
        type: 'Playwall',
        text: '',
        title: {
          level: 1,
        },
        editable: false,
        ownership: {
          default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER,
        },
        flags: {
          ta: {
            nextCode: "",
            gmnotes: "",
            abilities: {},
            requisitions: {},
            tracks: {}
          }
        }
      },
    ]);

    /*
    result.update({
      "system.aspect": "undefined"
    });
    */
  };
}
