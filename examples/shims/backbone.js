// We can make a module async by simply passing a second argument to the
// factory. You can call this whatever you'd like, but typically
// it's called 'done'.
modus.namespace('examples.shims').module('backbone', function (done) {
  var self = this;
  var loader = modus.Loader.getInstance();
  // Load Backbone's depencencies before loading Backbone.
  // Note that we're passing 'done' as the error callback. This ensures
  // that modus won't just hang forever if something goes wrong.
  loader.load([
    // The following assumes that we don't already have
    // a shims module that loads these scripts. If you do,
    // you can just do:
    //   backbone.imports('shims').from('app.shims');
    // ... or whatever you nammed your module.
    'bower_components/jquery/dist/jquery.min.js',
    'bower_components/underscore/underscore.js'
  ], function () {
    loader.load('bower_components/backbone/Backbone.js', function () {
      // Backbone is now available in the global scope,
      // but we want it to be accessable from this module too:
      self.default = window.Backbone;
      // Tell the module that it now finished.
      done();
    }, done);
  }, done);
}, {
  hooks: {
    build: function (raw) {
      // When compiling, we need to get the actual content of our requested files.
      var build = modus.Build.getInstance();
      var jquery = build.fs.readFileSync('bower_components/jquery/dist/jquery.min.js', 'utf-8');
      var underscore = build.fs.readFileSync('bower_components/underscore/underscore.js', 'utf-8');
      var backbone = build.fs.readFileSync('bower_components/backbone/Backbone.js', 'utf-8');
      var compiled = "modus.module('examples.shims', function() {\n"
        + jquery + '\n' + underscore + '\n' + backbone
        + "\nthis.default = Backbone;\n});"
      return compiled;
    }
  }
});

// Example of use:
modus.namespace('examples.shims').module('view', function () {

  this.imports('backbone').from('.backbone');

  // We can now use the global Backbone:
  var View = Backbone.View.extend({
    // code
  });

  // ... or as a module property:
  var View = this.backbone.extend({
    // code
  });

});