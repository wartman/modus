Modus.namespace('examples.shims').module('shims', function (shims) {
  // This is an example of how we can use the 'wait' option to
  // load scripts that aren't wrapped in a Modus.Module. For this
  // example, we'll load the popular underscore and jquery libraies from
  // bower_components.
  Modus.load([
    'bower_components/jquery/dist/jquery.min.js',
    'bower_components/underscore/underscore.js'
  ], function () {
    // The above scripts are now available in the global scope, as always.
    // However, we can also make them available as exports from this module:
    shims._ = _;
    shims.$ = jQuery;
    // Now all we need to do is emit 'done' and all dependent modules can continue
    // enabling.
    shims.emit('done');
  }, function (err) {
    // Always a good idea to catch an error! If you don't do this,
    // your script might just hang forever without telling you why.
    shims.emit('error', err);
  });
}, {
  wait: true
});