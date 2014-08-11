// modus.Build
// -----------
// Compile modus modules into a single file for distribution.

var modus = require('../dist/modus');
// Make sure 'define' doesn't interfere with any require calls.
define = null;
var fs = require('fs');
var lodash = require('lodash');
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
    // If this has config info, try to parse it.
    var getConfig = /modus\.config\([\s\S\r\n'"\{\}]+?\)/g
    var config = null;
    contents = contents.replace(getConfig, function (match) {
      build.setConfig(match);
      return "";
    });
    try {
      // Turn on 'define' only as long as needed.
      global.define = modus.define;
      // Run the factory.
      factory(modus);
      global.define = null;

      moduleName = modus.normalizeModuleName(moduleName);
      var mod = modus.getModule(moduleName);

      // Handle anonymous modules
      if (!mod) {
        mod = modus.getLastModule();
        if (!mod) 
          return error('Could not load module [' + moduleName + '] from path: ' + build.options.root + src);
        mod.register(moduleName);
        if (mod.options.amd)
          contents = contents.replace('define(', "define('" + moduleName + "', ");
        else if (mod.options.pub)
          contents = contents.replace('modus.publish(', "modus.publish('" + moduleName + "', ");
        else
          contents = contents.replace('modus.module(', "modus.module('" + moduleName + "', ");
      }
    } catch (e) {
      // Right now, this is the only way to compile jQuery.
      // The following is just to keep modus happy:
      var mod = modus.module(moduleName, function () {});
    }

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
  this._config = null;
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

// Set the config.
Build.prototype.setConfig = function (cfg) {
  this._config = cfg + ';';
};

// Start compiling.
Build.prototype.start = function (options) {
  var self = this;
  var loader = modus.Loader.getInstance();
  this.reset();
  this.options = lodash.defaults(options || {}, this.options);

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
  if (output.lastIndexOf(';') !== (output.length - 1))
    output += ';';
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
  var mods = modus.getModule();
  var modList = {};
  var sortedModules = [];
  var compiled = [];
  lodash.each(mods, function (mod) {
    modList[mod.getFullName()] = mod.getDependencies();
  });
  sortedModules = this.sort(modList, this.options.main);
  lodash.each(sortedModules, function (modName) {
    var contents = self._output[modName];
    compiled.push(contents);
  });
  if (this._config)
    compiled.unshift(this._config);
  // Add the modus runtime
  var modusRaw = fs.readFileSync(__dirname + '/../dist/Modus.js', 'utf-8');
  compiled.unshift(modusRaw + "\nvar modus = __root.modus, define = modus.define;\n");
  // Add wrapper
  compiled.unshift(";(function () {\nvar __root = this;\n");
  compiled.push("\n}).call(this);");
  this._compiled = compiled;
  this.emit('done', this._compiled.join('\n'));
};

// Topological sorter for dependencites. Sorts modules in order
// of dependency.
Build.prototype.sort = function (dependencies, root) {

  var nodes = {};
  var nodeCount = 0;
  var ready = [];
  var output = [];

  // build the graph
  function add (element) {
    nodeCount += 1;
    nodes[element] = { needs:[], neededBy:[], name: element };
    
    if (dependencies[element]) {
      dependencies[element].forEach(function (dependency) {
        if (!nodes[dependency]) add(dependency);
        nodes[element].needs.push(nodes[dependency]);
        nodes[dependency].neededBy.push(nodes[element]);
      });
    }

    if (!nodes[element].needs.length) ready.push(nodes[element]);
  }

  if (root) {
    add(root);
  } else {
    for (var element in dependencies) {
      if (!nodes[element]) add(element);
    }
  }

  // Sort the graph
  while (ready.length) {
    var dependency = ready.pop();
    output.push(dependency.name);
    dependency.neededBy.forEach(function (element) {
      element.needs = element.needs.filter(function (x) {return x!=dependency});
      if(!element.needs.length) ready.push(element);
    });
  }

  // Error check
  if (output.length != nodeCount) {
    throw Error("circular dependency");
  }

  return output;
};
