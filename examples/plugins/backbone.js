Modus.namespace('examples.plugins').module('backbone', function (backbone) {
  // Load Backbone's depencencies before loading Backbone.
  Modus.load([
    'bower_components/jquery/dist/jquery.min.js',
    'bower_components/underscore/underscore.js'
  ], function () {
    Modus.load('bower_components/backbone/Backbone.js', function () {
      // Backbone is now available in the global scope,
      // but we want it to be accessable from this module too:
      backbone.Backbone = window.Backbone;
      // Tell the module that it now finished.
      backbone.emit('done');
    }, error);
  }, error);
}, {
  // Configure this module to NOT automatically
  // mark itself as 'enabled' when it runs its factory.
  // Instead, it will wait until 'done' is emitted inside
  // the module. This allows for async stuff.
  wait: true
});

// Example of use:
Modus.namespace('examples.plugins').module('view', function (view) {

  view.imports('Backbone').from('.backbone');

  // We can now use Backbone in the global scope:
  var View = Backbone.View.extend({
    // code
  });

  // ... or in the module context:
  var View = view.Backbone.extend({
    // code
  });

});