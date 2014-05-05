Modus.namespace('examples.plugins').module('backbone', function (backbone) {

  // This is an example of how to shim backbone as a plugin.
  backbone.body(function (backbone) {
    Modus.plugin('backbone', function (request, next, error) {
      // Load Backbone's depencencies before loading Backbone.
      Modus.load([
        'bower_components/jquery/dist/jquery.min.js',
        'bower_components/underscore/underscore.js'
      ], function () {
        Modus.load('bower_components/backbone/Backbone.js', function () {
          // Backbone is now available in the global scope,
          // but we need to wrap it in a module to
          // make it accessable to Modus.
          Modus.publish('Backbone', window.Backbone);
          next();
        }, error);
      }, error);
    });
  });

});

// Example of use:
Modus.namespace('examples.plugins').module('view', function (view) {

  view.imports('Backbone').using('.backbone');

  view.body(function (view) {

    // We can now use Backbone in the global scope:
    var View = Backbone.View.extend({
      // code
    });

    // ... or in the module context:
    var View = view.Backbone.extend({
      // code
    });

  });

});