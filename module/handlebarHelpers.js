export function registerHelpers() {
  Handlebars.registerHelper('ifequal', function (a, b, options) {
    if (a == b) {
      return options.fn(this);
    }
    return options.inverse(this);
  });


  Handlebars.registerHelper('ifnotequal', function (a, b, options) {
    if (a != b) {
      return options.fn(this);
    }
    return options.inverse(this);
  });


  Handlebars.registerHelper('gt', function (a, b) {
    return a > b;
  });


  Handlebars.registerHelper('gte', function (a, b) {
    return a >= b;
  });


  Handlebars.registerHelper('breaklines', function (text) {
    text = Handlebars.Utils.escapeExpression(text);
    text = text.replace(/(\r\n|\n|\r)/gm, '<span style="line-height: 0.5em"><br/></span>');
    return new Handlebars.SafeString(text);
  });
}
