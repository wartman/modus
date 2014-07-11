// Modus.Build
// ===========
// Compile modus modules into a single file for
// distribution.

var Modus = require('../dist/Modus');
var fs = require('fs');
var _ = require('lodash');

// The raw content of the module files.
var _raw = {};

// Overwrite Modus.load to get the full contents of each
// file for later compiling.
Modus.load = function (module, next, error) {
  var src = Modus.getMappedPath(module, Modus.config('root'));
  fs.readFile(src, function (err, contents) {
    if (err) {
      error(err);
    }
    _raw[module] = contents;
    var factory = new Function('Modus', contents);
    factory(Modus);
    next();  
  });
};

// The builder.
var Build = Modus.Build = function (options) {
  var self = this;
  this.options = _.defaults(options || {}, this.options);
  Modus.load(options.main, function () {
    self.compile();
  }, function (err) {
    if (err instanceof Error) {
      throw err;
    } else {
      throw new Error(err);
    }
  });
};

Build.prototype.options = {
  main: 'main',
  dest: 'build.js'
};

// Compile everthing into a single file.
Build.prototype.compile = function() {

};