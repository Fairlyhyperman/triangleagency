export default class Playwall extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      code: new fields.StringField({required: true, initial: ""}),
      aspect: new fields.StringField({required: true, initial: "undefined"}),
      content: new fields.HTMLField({required: false, blank: true}),
      references: new fields.ObjectField()
    };
  }

  prepareDerivedData() {
    this.aspect = this.aspect || "undefined";
    this.references.abilities = this.references.abilities || {};
    this.references.requisitions = this.references.requisitions || {};
    this.references.tracks = this.references.tracks || {};
  }
}
