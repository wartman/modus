Modus.namespace('examples.shims').module('shims', function (shims) {

  // You can import any script that exports something to the
  // global scope. In this example, we're trying to set up
  // a Backbone project. We're using bower, so lets get jQuery
  // and underscore first:
  shims.imports('bower_components/jquery/dist/jquery.min.js').global('$');
  shims.imports('bower_components/underscore/underscore.js').global('_');

  // Backbone is a bit more tricky, as we need to be sure it has
  // all its deps ready first. We can use the 'using' method
  // to pipe a request through a callback, so lets do that.
  shims.imports('Backbone').using(function (next, error) {
    // Ensure each requirement is loaded before moving on to the next one.
    Modus.load([
      'bower_components/jquery/dist/jquery.min.js',
      'bower_components/underscore/underscore.js'
    ], function () {
      Modus.load('bower_components/backbone/Backbone.js', function () {
        // Backbone is now available in the global scope,
        // but we need to wrap it in a module to
        // make it accessable. This is the same
        // pattern you'd use when writing a plugin.
        Modus.publish('Backbone', window.Backbone);
        // Always remember to call 'next' when done!
        next();
      }, error);
    }, error);
  });

});