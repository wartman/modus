// modus.Build
// -----------
// Compile modus modules into a single file for distribution.

var modus = require('../dist/modus');
var fs = require('fs');
var _ = require('lodash');
var UglifyJs = require('uglify-js');

// Overwrite modus.Loader.load to get the full contents of each
// file for later compiling.
var _load = function (moduleName, next, error) {
  var src = modus.getMappedPath(moduleName, modus.config('root')) + '.js';
  var build = modus.Build.getInstance();
  fs.readFile(build.options.root + src, 'utf-8', function (err, contents) {
    if (err) {
      error(err);
    }
    var factory = new Function('modus', contents);
    factory(modus);

    moduleName = modus.normalizeModuleName(moduleName);
    var mod = modus.getModule(moduleName);

    if (!mod)
      error('Could not find module: ' + moduleName + ' from path: ' + build.options.root + src);

    // Output the default data. Calling `build.output` again
    // using the current moduleName will overwrite this.
    build.output(moduleName, contents);

    // Run build events.
    modus.events.emit('build', moduleName, contents);
    mod.emit('build', moduleName, contents);

    next();  
  });
};

// The builder.
var Build = modus.Build = function (options) {
  this._output = {};
  this._compiled = [];
  this._header = [];
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
  root: process.cwd() + '/',
  minify: false
};

// Start compiling.
Build.prototype.start = function (options) {
  var self = this;
  var loader = modus.Loader.getInstance();
  this.reset();
  this.options = _.defaults(options || {}, this.options);

  // Setup modus for building:
  // A reference to the default loader (for when building is done):
  var _defaultLoader = modus.Loader.prototype.load;
  // Use the build loader:
  modus.Loader.prototype.load = _load;
  // Set mode to building.
  modus.isBuilding = true;

  this.once('done', function () {
    modus.isBuilding = false;
    modus.Loader.prototype.load = _defaultLoader;
  });

  loader.load(this.options.main, function () {
    var main = modus.normalizeModuleName(self.options.main);
    var mod = modus.getModule(main);
    mod.once('done', function () {
      self.compile();
    });
    mod.enable();
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
Build.prototype.require = require;

// Alias for `fs`, used in hooks.
Build.prototype.fs = fs;

Build.prototype.readFile = function (src) {
  src = modus.config('root') + src;
  var file = fs.readFileSync(this.options.root + src, 'utf-8');
  return file;
};

// Add output to the builder.
var licenseMatch = /\/\*\![\s\S]+?\*\//g;
Build.prototype.output = function (name, output) {
  // check for header data
  var licenses = licenseMatch.exec(output);
  if (licenses) this._header.push(licenses[0]);
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
  var compiled = (this.options.minify)
    ? this.minify()
    : this._compiled.join('\n');
  var self = this;
  dest = this.options.root + modus.config('root') + dest;
  fs.writeFile(dest, compiled, function () {
    console.log('Compiled to: ', dest);
    self.emit('output.done');
  });
};

// Use UglifyJs to minify the script.
Build.prototype.minify = function () {
  var compiled = this._compiled.join('\n');
  var minified = UglifyJs.minify(compiled, {fromString: true}).code;
  minified = this._header.join('\n') + '\n' + minified;
  return minified;
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