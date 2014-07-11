Modus.namespace('examples.shims').module('backbone', function (backbone) {
  // Load Backbone's depencencies before loading Backbone.
  Modus.load([
    // The following assumes that we don't already have
    // a shims module that loads these scripts. If you do,
    // you can just do:
    //   backbone.imports('shims').from('app.shims');
    // ... or whatever you nammed your module.
    'bower_components/jquery/dist/jquery.min.js',
    'bower_components/underscore/underscore.js'
  ], function () {
    Modus.load('bower_components/backbone/Backbone.js', function () {
      // Backbone is now available in the global scope,
      // but we want it to be accessable from this module too:
      backbone.default = window.Backbone;
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
Modus.namespace('examples.shims').module('view', function (view) {

  view.imports('backbone').from('.backbone');

  // We can now use the global Backbone:
  var View = Backbone.View.extend({
    // code
  });

  // ... or as a module property:
  var View = view.backbone.extend({
    // code
  });

});