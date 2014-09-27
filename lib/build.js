var modus = require('../');
var fs = require('fs');
var lodash = require('lodash');
var UglifyJs = require('uglify-js');
var util = require('./util');

// modus.Build
// -----------
// Compile modus modules into a single file for distribution.
var Build = function (options) {
  this._output = {};
  this._config = [];
  this._compiled = [];
  this._header = [];
  // Pointer for the current instance of modus.
  this.modus = modus;
  if (options) this.start(options);
};

var _visited = {};

// Add a method to the loader for build files.
modus.Loader.prototype.loadBuilding = function (moduleName) {
  var src = modus.getMappedPath(moduleName) + '.js';
  var visit = this.getVisit(moduleName);
  
  if (visit)
    return visit;

  var build = Build.getInstance();

  visit = this.addVisit(moduleName);

  fs.readFile(build.options.root + src, 'utf-8', function (err, contents) {
    if (err) {
      visit.reject(err);
    }
    contents = util.normalizeDefinition(contents, false);
    var factory = new Function('modus', contents);
    var currentModule;
    contents = util.getConfig(contents, build);
    try {
      // Run the factory.
      factory(modus);

      moduleName = modus.normalizeModuleName(moduleName);
      currentModule = modus.getModule(moduleName);

      // Handle anonymous modules
      if (!currentModule) {
        currentModule = modus.getLastModule();

        if (!currentModule) 
          return error('Could not load module [' + moduleName + '] from path: ' + build.options.root + src);

        currentModule.registerModule(moduleName);
        contents = util.normalizeDefinition(contents, moduleName);
        console.log(contents);
      }
    } catch (e) {
      // Right now, this is the only way to compile jQuery.
      // The following is just to keep modus happy:
      currentModule = modus.module(moduleName, function () {});
    }

    // Output the default data. Calling `build.output` again
    // using the current moduleName will overwrite this.
    build.output(moduleName, contents);

    // Run build event, if one exists.
    build.triggerBuildEvent(currentModule, contents);

    // Move up the stack!
    visit.resolve();
  });
  return visit;
};

// Get a singleton of Modus Build. You can pass options here,
// but they'll only be applied if this is the first time the
// method is called.
var _buildInstance = null;
Build.getInstance = function (options) {
  if (!_buildInstance)
    _buildInstance = new Build(options);
  return _buildInstance;
};

// Defaults
Build.prototype.options = {
  main: 'main',
  dest: 'build.js',
  root: process.cwd() + '/',
  minify: false
};

// Start compiling.
Build.prototype.start = function (options, next) {
  var self = this;
  var loader = modus.Loader.getInstance();
  this.reset();
  this.options = lodash.defaults(options || {}, this.options);

  // Set mode to building.
  modus.isBuilding = true;

  loader.load(this.options.main).then(function () {
    var mainModule = modus.config('main') || modus.normalizeModuleName(self.options.main);
    var main = modus.getModule(mainModule);
    var loadDone = function () {
      self.compile(next);
      modus.isBuilding = false;
    };
    if (modus.config('buildEvents')) {
      // Load events from the given file.
      loader.load(modus.config('buildEvents')).then(function () {
        main.enableModule().then(loadDone);
      }, util.baseError);
      return;
    }
    main.enableModule().then(loadDone);
  }, util.baseError);
  return this;
};

// Alias for `require`, used in hooks.
Build.prototype.require = require;

// Alias for `fs`, used in hooks.
Build.prototype.fs = fs;

// Run a build event, if one exists.
Build.prototype.triggerBuildEvent = function (mod, raw) {
  if (mod) {
    var ev = modus.getBuildEvent(mod.getModuleName());
    if (ev) {
      ev(mod, raw, this);
    }
  }
};

// Run global build events.
Build.prototype.triggerGlobalBuildEvents = function () {
  var events = modus.getBuildEvent();
  var self = this;
  lodash.each(events, function (ev) {
    ev(modus.getAllModules(), self.getOutput(), self);
  });
};

// Read a file. This method will let you read file relative to the 
// current module: just pass 'context: <the module name>' to the
// options hash. You can also set the extension here, if you need to.
Build.prototype.readFile = function (src, options) {
  options = _.defaults(options, {
    root: modus.config('root'),
    ext: 'js',
    context: false
  });
  if (options.context)
    src = modus.normalizeModuleName(src, options.context);
  src = modus.getMappedPath(src, {root: options.root, ext: options.ext});
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

// Set modus.config. This is done separately so that it
// can always be added before any modules (as 'main' is always defined last,
// to ensure all deps are defined).
Build.prototype.outputConfig = function (cfg) {
  this._config.push(cfg);
};

Build.prototype.getConfig = function () {
  if (this._config.length >= 1)
    return 'modus.config(' + this._config.join(',\n') + ');';
  else
    return false;
}

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
Build.prototype.writeOutput = function (dest, next) {
  if ('function' === typeof dest){
    next = dest;
    dest = false;
  }
  dest = dest || this.options.dest;
  var compiled = (this.options.minify)
    ? this.minify()
    : this._compiled.join('\n');
  var self = this;
  dest = this.options.root + dest;
  fs.writeFile(dest, compiled, next);
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
Build.prototype.compile = function (next) {
  var self = this;
  var modList = {};
  var mainModule = modus.config('main') || modus.normalizeModuleName(this.options.main);
  var sortedModules = [];
  var compiled = [];
  var mods;
  var config;

  // Run any global events.
  this.triggerGlobalBuildEvents();

  mods = modus.getAllModules();

  lodash.each(mods, function (mod) {
    modList[mod.getModuleName()] = mod.getModuleDependencies();
  });
  sortedModules = this.sort(modList, mainModule);
  lodash.each(sortedModules, function (modName) {
    if(modus.config('main')) {
      if (modName === modus.config('main'))
        modName = modus.normalizeModuleName(self.options.main);
    }
    var contents = self._output[modName];
    compiled.push(contents);
  });

  config = this.getConfig();
  if (config) compiled.unshift(config);

  // Add the modus runtime
  // @todo This all strikes me as being rather clumsy. Can we get around having to add all these
  // extra lines so that `__root` will work? Remember: the reason we're doing this is to avoid
  // having to bind everything to 'window'.
  var modusRaw = fs.readFileSync(__dirname + '/../dist/Modus.js', 'utf-8');
  compiled.unshift(modusRaw + "\nvar modus = __root.modus;\n");
  // Add wrapper
  compiled.unshift(";(function () {\nvar __root = this;\n");
  compiled.push("\n}).call(this);");
  this._compiled = compiled;

  if (next) next(this._compiled.join('\n'));
};

// Topological sorter for dependencies. Sorts modules in order
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

module.exports = Build;
