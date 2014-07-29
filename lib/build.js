// modus.Build
// -----------
// Compile modus modules into a single file for distribution.

var modus = require('../dist/modus');
var fs = require('fs');
var _ = require('lodash');

// The raw content of the module files.
modus._raw = {};

// Overwrite modus.Loader.load to get the full contents of each
// file for later compiling.
modus.Loader.prototype.load = function (moduleName, next, error) {
  var src = modus.getMappedPath(moduleName, modus.config('root')) + '.js';
  fs.readFile(src, 'utf-8', function (err, contents) {
    if (err) {
      error(err);
    }
    var factory = new Function('modus', contents);
    factory(modus);
    var mod = modus.getModule(moduleName);
    var compiled = mod.emit('build', contents);
    modus._raw[moduleName] = (compiled || contents);
    next();  
  });
};

// The builder.
var Build = modus.Build = function (options) {
  this._compiled = [];
  if (options) this.start(options);
};

var _buildInstance = null;

Build.getInstance = function (options) {
  if (!_buildInstance)
    _buildInstance = new Build(options);
  return _buildInstance;
};

// Alias for `require`, used in hooks.
modus.Build.require = require;

// Alias for `fs`, used in hooks.
modus.Build.fs = fs;

Build.prototype.options = {
  main: 'main',
  dest: 'build.js',
  root: ''
};

Build.prototype.start = function (options) {
  var self = this;
  var loader = modus.Loader.getInstance();
  this.reset();
  this.options = _.defaults(options || {}, this.options);
  modus.config('root', this.options.root);
  console.log('Starting');
  loader.load(this.options.main, function () {
    var mod = modus.getModule(self.options.main);
    mod.enable();
    mod.once('done', function () {
      self.compile();
    });
  }, function (err) {
    if (err instanceof Error) {
      throw err;
    } else {
      throw new Error(err);
    }
  });
}

// Reset all data
Build.prototype.reset = function () {
  this._compiled = [];
  modus._raw = {};
};

// Compile everthing into a single file.
Build.prototype.compile = function () {
  var self = this;
  var compiled = [];
  _.each(modus._raw, function (contents) {
    compiled.push(contents);
  });
  // Compile the modus runtime (without intro/outro)
  var runtime = [];
  _([
    'src/helpers.js',
    'src/modus.js',
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
  compiled.unshift("(function (root, undefined) {\nvar modus = root.modus = {};");
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