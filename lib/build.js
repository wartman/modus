// Modus.Build
// -----------
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
  var src = Modus.getMappedPath(module, Modus.config('root')) + '.js';
  fs.readFile(src, 'utf-8', function (err, contents) {
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
  this._compiled = [];
  this.options = _.defaults(options || {}, this.options);
  Modus.config('root', this.options.root);
  console.log(this.options);
  Modus.load(options.main, function () {
    Modus.env[options.main].enable();
    Modus.env[options.main].once('done', function () {
      self.compile();
    });
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
  dest: 'build.js',
  root: ''
};

// Reset all data
Build.prototype.reset = function () {
  this._compiled = [];
  _raw = {};
};

// Compile everthing into a single file.
Build.prototype.compile = function () {
  var self = this;
  var compiled = [];
  _.each(_raw, function (contents) {
    compiled.push(contents);
  });
  // Compile the Modus runtime (without intro/outro)
  var runtime = [];
  _([
    'src/helpers.js',
    'src/Modus.js',
    'src/EventEmitter.js',
    'src/Import.js',
    'src/Module.js',
    'src/client/loader.js',
    'src/server/loader.js',
  ]).each(function (file) {
    var file = fs.readFileSync(__dirname + '/../' + file);
    runtime.push(file);
  });
  compiled.unshift(runtime.join('\n'));
  // Finally, add a wrapper around things.
  compiled.unshift("(function (root, undefined) {\nvar Modus = root.Modus = {};");
  compiled.push('})(this);');
  this._compiled = compiled;
  this.output();
};

Build.prototype.output = function () {
  var compiled = this._compiled.join('\n');
  fs.writeFile(this.options.dest, compiled, function () {
    console.log('Finished.');
  });
};