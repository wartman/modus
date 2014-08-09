modus.namespace('examples.shims').module('shims', function (done) {
  var self = this;
  var loader = modus.Loader.getInstance();
  // This is an example of how we can use the 'wait' option to
  // load scripts that aren't wrapped in a modus.Module. For this
  // example, we'll load the popular underscore and jquery libraies from
  // bower_components.
  loader.load([
    'bower_components/jquery/dist/jquery.min.js',
    'bower_components/underscore/underscore.js'
  ], function () {
    // The above scripts are now available in the global scope, as always.
    // However, we can also make them available as exports from this module:
    self._ = _;
    self.$ = jQuery;
    // Now the module is finished!
    done();
  }, done); // Use 'done' to catch an error.
});