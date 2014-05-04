Modus.namespace('examples.shims').module('app', function (app) {
  // Simply import the 'shims' module.
  app.imports('.shims');
  // You could also import specific components from the shim,
  // as normal:
  app.imports('$').from('.shims');

  app.body(function (app) {

    // Global vars are available in the global scope, as usual.
    $('.foo').html('This works!');

    // They should also be applied to the current module as expected.
    var View = app.shims.Backbone.View.extend({
      // code
    });

  });
  
});