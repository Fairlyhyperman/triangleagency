export async function preloadTemplates() {
  const templatePaths = [
    "systems/triangleagency/templates/part-d4-outcome.hbs",
    "systems/triangleagency/templates/part-d10-outcome.hbs",
    "systems/triangleagency/templates/part-d20-outcome.hbs",
    "systems/triangleagency/templates/part-track.hbs",
    "systems/triangleagency/templates/part-anomalyability.hbs",
    "systems/triangleagency/templates/agencyOs.hbs",
    "systems/triangleagency/templates/actor-agent-sheet.hbs",
    "systems/triangleagency/templates/actor-anomaly-sheet.hbs",
  ];

  return foundry.applications.handlebars.loadTemplates(templatePaths);
}
