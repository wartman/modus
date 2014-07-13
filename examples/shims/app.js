Modus.module('examples.shims.app', function (app) {
  // Simply import the 'shims' module.
  app.imports('shims').from('.shims');
  // You could also import specific components from the shim,
  // as normal:
  app.imports('$', '_').from('.shims');

  // Global vars are available in the global scope, as usual.
  $('.foo').html('This works!');

  // You can also access them as module properties:
  app.foo = app.$('.foo');
  app.foo.html('This also works!');
});