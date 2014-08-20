// modus
// =====

// Environment helpers
// -------------------

// Modus' env, where modules hang out.
modus.env = {};

// Config options for modus.
modus.options = {
  root: '',
  maps: {},
  namespaceMaps: {}
};

// Return modus to its last owner
modus.noConflict = function () {
  root.modus = _previousModus;
  return modus;
};

// Set or get a modus config option.
modus.config = function (key, val) {
  if ( "object" === typeof key ) {
    for ( var item in key ) {
      modus.config(item, key[item]);
    }
    return;
  }
  if(arguments.length === 0)
    return modus.options;
  if(arguments.length < 2)
    return ("undefined" === typeof modus.options[key])? false : modus.options[key];
  if ( 'maps' === key )
    return modus.map(val);
  if ('namespaceMaps' === key)
    return modus.mapNamespace(val);
  modus.options[key] = val;
  return modus.options[key];
};

// Figure out what we're running modus in.
var checkEnv = function () {
  if (typeof module === "object" && module.exports) {
    modus.config('environment', 'node');
  } else {
    modus.config('environment', 'client');
  }
};

// Are we running modus on a server?
var isServer = modus.isServer = function () {
  if (!modus.config('environment')) checkEnv();
  return modus.config('environment') === 'node'
    || modus.config('environment') === 'server';
};

// Are we running modus on a client?
var isClient = modus.isClient =  function () {
  if (!modus.config('environment')) checkEnv();
  return modus.config('environment') != 'node'
    && modus.config('environment') != 'server';
};

// Map a module to the given path.
//
//    modus.map('Foo', 'libs/foo.min.js');
//    // Then, inside a module:
//    this.imports(...).from('Foo'); // -> Imports from libs/foo.min.js
//
modus.map = function (mod, path, options) {
  options = options || {};
  if ('object' === typeof mod) {
    for (var key in mod) {
      modus.map(key, mod[key], options);
    }
    return;
  }
  if (options.type === 'namespaces') 
    modus.options.namespaceMaps[mod] = path;
  else
    modus.options.maps[mod] = path;
};

// Map a namespace to the given path.
//
//    modus.mapNamespace('Foo.Bin', 'libs/FooBin');
//    // The following import will now import 'lib/FooBin/Bax.js'
//    // rather then 'Foo/Bin/Bax.js'
//    this.imports(...).from('Foo.Bin.Bax');
//
modus.mapNamespace = function (ns, path) {
  modus.map(ns, path, {type: 'namespaces'});
};

// Check namespace maps for any matches.
var _getMappedNamespacePath = function (module) {
  var maps = modus.config('namespaceMaps');
  each(maps, function(map, key) {
    var re = RegExp(escapeRegExp(key), 'g');
    var norm = map.replace(/\/|\\/g, '.');
    module = module.replace(re, norm);
  });
  return module;
};

// Check module maps for any matches.
var _getMappedModulePath = function (module) {
  var maps = modus.config('maps');
  return (maps[module])? maps[module] : module;
};

// Get a mapped path
var getMappedPath = modus.getMappedPath = function (module, options) {
  options = defaults({
    ext: 'js',
    root: modus.config('root')
  }, options);
  var src = _getMappedModulePath(module);
  src = _getMappedNamespacePath(src);
  // Some modules may start with a dot. Make sure we don't end up
  // with an ugly URI by dropping it.
  if (!isPath(src) && src.charAt('0') === '.')
    src = src.substring(1);
  src = (!isPath(src))? src.replace(/\./g, '/') : src;
  if (options.ext === 'js') {
    src = (src.indexOf('.js') < 0 && !isServer())
      ? options.root + src + '.js'
      : options.root + src;
  } else {
    src = options.root + src +  '.' + options.ext;
  }
  return src;
};

// Make sure all names are correct. Relative paths are calculated based on the
// number of dots that prefix a module name. For example:
//
//    'foo.bar';   // Absolute path
//    '.foo.bar';  // up one level.
//    '..foo.bar'; // up two levels.
//    // and so forth.
//    
//    // In practice:
//    modus.normalizeModuleName('foo.bar', 'app.bar.bin');
//    // --> 'foo.bar'
//    modus.normalizeModuleName('..foo.bar', 'app.bar.bin');
//    // --> 'app.foo.bar'
//
var normalizeModuleName = modus.normalizeModuleName = function (moduleName, context) {
  context = context || '';
  // Parse paths into module-names.
  if(isPath(moduleName)) {
    moduleName = moduleName.replace(/\b\.js\b/g, '');
    // Turn relative-path syntax (like './foo' or '../foo') into
    // relative-module syntax.
    if (moduleName.indexOf('../') === 0) moduleName = '../' + moduleName;
    moduleName = moduleName.replace(/\.\.\//g, '.');
    if (moduleName.indexOf('./') === 0) moduleName = moduleName.replace('./', '.');
  }
  moduleName = moduleName.replace(/\/|\\/g, '.');
  // If this starts with a dot, make sure it's a fully qualified module name
  // by checking the module's context and assuming it's coming from the same place.
  if (moduleName.charAt(0) === '.') {
    var contextBase = context.split('.');
    var modParts = moduleName.split('.');
    each(modParts, function (part) {
      if (part.length > 0) 
        contextBase.push(part);
      else
        contextBase.pop();
    });
    return contextBase.join('.');
  }
  return moduleName;
};

// Check if a module has been loaded.
var moduleExists = modus.moduleExists = function (name) {
  name = normalizeModuleName(name);
  return modus.env.hasOwnProperty(name);
};

// Get a module from the modules registry.
var getModule = modus.getModule = function (name) {
  if (!name) return modus.env;
  name = normalizeModuleName(name);
  return modus.env[name] || false;
};

// Add a module to the modules registry.
var addModule = modus.addModule = function (name, mod) {
  if (!(mod instanceof Module)) 
    throw new TypeError('Must be a Module: ' + typeof mod);
  modus.env[name] = mod;
};

// Return the last module added. This is used to find
// anonymous modules and give them names.
var _lastModule = null;
var getLastModule = modus.getLastModule = function () {
  var mod = _lastModule;
  _lastModule = null;
  return mod;
};

// Primary API
// -----------

// Helper to enable modules. If a module is anonymous, it will wait
// until the script has finished loading to be defined.
function _enableModule(name, mod) {
  if (typeof name === 'string') { 
    // Enable now.
    // mod.enable();
    nextTick(bind(mod.enableModule, mod));
  } else {
    // Anon module: wait for the script to load.
    _lastModule = mod;
  }
}

// Module factory.
//
//    modus.module('foo.bar', function (bar) {
//      // code
//    });
//
modus.module = function (name, factory, options) {
  options = options || {};
  var mod = new Module(name, factory, options);
  _enableModule(name, mod);
  return mod;
};

// Shortcut to export a single value as a module.
modus.publish = function (name, value, options) {
  options = options || {};
  options.isPublished = true;
  if (arguments.length <= 1) {
    options = value;
    value = name;
    name = false;
  }
  return modus.module(name, function () {
    this.default = value;
  }, options);
};

// Define an AMD module. This is exported to the root
// namespace so non-modus modules can be natively imported
// with a simple `define` call.
root.define = modus.define = function (name, deps, factory) {
  if (typeof name !== 'string') {
    factory = deps;
    deps = name;
    name = false;
  }
  if (!(deps instanceof Array)) {
    factory = deps;
    deps = [];
  }
  // Might be a commonJs thing:
  if (deps.length === 0 && factory.length === 1)
    deps.push('require');
  var mod = new Module(name, factory, {isAmd: true});
  mod.addModuleDependency(deps);
  _enableModule(name, mod);
  return mod;
};

// Make jQuery happy.
root.define.amd = {
  jQuery: true
};

// Shortcut for `modus.module`. `mod` is the preferred way to define
// modules.
root.mod = modus.module;
