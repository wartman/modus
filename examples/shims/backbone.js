// We can make a module async by simply passing a second argument to the
// factory. You can call this whatever you'd like, but typically
// it's called 'done'.
Modus.namespace('examples.shims').module('backbone', function (backbone, done) {
  // Load Backbone's depencencies before loading Backbone.
  // Note that we're passing 'done' as the error callback. This ensures
  // that Modus won't just hang forever if something goes wrong.
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
      done();
    }, done);
  }, done);
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