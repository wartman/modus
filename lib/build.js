// modus.Build
// -----------
// Compile modus modules into a single file for distribution.

var modus = require('../dist/modus');
var fs = require('fs');
var _ = require('lodash');

// Overwrite modus.Loader.load to get the full contents of each
// file for later compiling.
modus.Loader.prototype.load = function (moduleName, next, error) {
  var src = modus.getMappedPath(moduleName, modus.config('root')) + '.js';
  var build = modus.Build.getInstance();
  fs.readFile(build.options.root + src, 'utf-8', function (err, contents) {
    if (err) {
      error(err);
    }
    var factory = new Function('modus', contents);

    factory(modus);

    var mod = modus.getModule(moduleName);

    // Output the default data. Calling `build.output` again
    // using the current moduleName will overwrite this.
    build.output(moduleName, contents);

    // Run build events.
    modus.events.emit('build', moduleName, contents);
    mod.emit('build', moduleName, contents);

    next();  
  });
};

// Set mode to building.
modus.isBuilding = true;

// The builder.
var Build = modus.Build = function (options) {
  this._output = {};
  this._compiled = [];
  this._listeners = {};
  if (options) this.start(options);
};

// Extend modus.EventEmitter
Build.prototype = new modus.EventEmitter();
Build.prototype.constructor = Build;

var _buildInstance = null;

Build.getInstance = function (options) {
  if (!_buildInstance)
    _buildInstance = new modus.Build(options);
  return _buildInstance;
};

Build.prototype.options = {
  main: 'main',
  dest: 'build.js',
  root: ''
};

// Start compiling.
Build.prototype.start = function (options) {
  var self = this;
  var loader = modus.Loader.getInstance();
  this.reset();
  this.options = _.defaults(options || {}, this.options);
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
  return this;
};

// Alias for `require`, used in hooks.
modus.Build.prototype.require = require;

// Alias for `fs`, used in hooks.
modus.Build.prototype.fs = fs;

// Add output to the builder.
Build.prototype.output = function (name, output) {
  this._output[name] = output;
};

// Get raw output
Build.prototype.getOutput = function (name) {
  if (!name) return this._output;
  if (this._output[name]) return this._output[name];
  return false;
};

// Remove output with the given module name.
Build.prototype.removeOutput = function (name) {
  delete this._output[name];
};

// Write the output to a file.
Build.prototype.writeOutput = function (dest) {
  dest = dest || this.options.dest;
  var compiled = this._compiled.join('\n');
  var self = this;
  fs.writeFile(this.options.root + dest, compiled, function () {
    console.log('Finished.');
    self.emit('output.done');
  });
};

// Reset all data
Build.prototype.reset = function () {
  this._compiled = [];
  this._output = {};
};

// Compile everthing into a single file.
Build.prototype.compile = function () {
  var self = this;
  var compiled = [];
  _.each(this._output, function (contents) {
    compiled.push(contents);
  });
  // Compile the modus runtime (without intro/outro)
  var runtime = [];
  _([
    'src/helpers.js',
    'src/modus.js',
    'src/EventEmitter.js',
    'src/Loader.js',
    'src/Import.js',
    'src/Module.js'
  ]).each(function (file) {
    var file = fs.readFileSync(__dirname + '/../' + file);
    runtime.push(file);
  });
  compiled.unshift(runtime.join('\n'));
  // Finally, add a wrapper around things.
  compiled.unshift("(function (root, undefined) {\nvar modus = root.modus = root.modus || {};");
  compiled.push('})(this);');
  this._compiled = compiled;
  this.emit('done', this._compiled.join('\n'));
};