// modus
// =====

// Environment helpers
// -------------------

// 'env' holds modules.
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

// Simple error wrapper.
modus.err = function (error) {
  throw new Error(error);
};

// Check namespace maps for any matches.
var _getMappedNamespacePath = function (module) {
  var ns = module.substring(0, module.lastIndexOf('.'));
  var modName = module.substring(module.lastIndexOf('.') + 1);
  ns = modus.normalizeModuleName(ns);
  var maps = modus.config('namespaceMaps');
  if (maps[ns]) {
    return modus.normalizeModuleName(maps[ns]) + '.' + modName;
  }
  return module;
};

// Check module maps for any matches.
var _getMappedModulePath = function (module) {
  var maps = modus.config('maps');
  return (maps[module])? maps[module] : module;
};

// Get a mapped path
var getMappedPath = modus.getMappedPath = function (module, root) {
  root = root || modus.config('root');
  var src = _getMappedModulePath(module);
  src = _getMappedNamespacePath(src);
  src = (!isPath(src))? src.replace(/\./g, '/') : src;
  src = (src.indexOf('.js') < 0 && !isServer())
    ? root + src + '.js'
    : root + src;
  return src;
};

// Make sure all names are correct.
var normalizeModuleName = modus.normalizeModuleName = function (name) {
  if(isPath(name)) {
    // Strip extensions
    if (name.indexOf('.js') > 0) {
      name = name.substring(0, name.indexOf('.js'));
    }
  }
  name = name.replace(/\/|\\/g, '.');
  return name;
};

// Check if a module has been loaded.
var moduleExists = modus.moduleExists = function (name) {
  name = normalizeModuleName(name);
  if (modus.env.hasOwnProperty(name)) return true;
  return false;
};

// Get a module from the env.
var getModule = modus.getModule = function (name) {
  if (!name) return modus.env;
  name = normalizeModuleName(name);
  return modus.env[name] || false;
}

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
    nextTick(bind(mod.enable, mod));
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
  var mod = new modus.Module(name, factory, options);
  _enableModule(name, mod);
  return mod;
};

// Syntactic sugar for namespaces.
//
//    modus.namespace('foo.bin', function () {
//      this.module('bin', function () {...});
//    });
//
//    //Or:
//    modus.namespace('foo.bar').module('bin', function () { ... });
//
modus.namespace = function (namespace, factory) {
  var options = {namespace: namespace};
  var ns = {
    module: function (name, factory) {
      return modus.module(name, factory, options);
    },
    publish: function (name, value) {
      return modus.publish(name, value, options);
    }
  };
  if (factory)
    factory.call(ns);
  return ns;
};

// Shortcut to export a single value as a module.
modus.publish = function (name, value, options) {
  options = options || {};
  options.pub = true;
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
  var mod = new modus.Module(name, factory, {amd: true});
  mod.addDependency(deps);
  _enableModule(name, mod);
  return mod;
};

// Make jQuery happy.
root.define.amd = {
  jQuery: true
};