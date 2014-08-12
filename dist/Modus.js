/*!
  
  
  \\\\         \\\\     \\\\\\     \\\\\\\\     \\\\  \\\\    \\\\\\\\\
  \\\\\\     \\\\\\   \\\\\\\\\\   \\\\\\\\\    \\\\  \\\\   \\\\\\\\\\
  \\\\\\\   \\\\\\\   \\\\  \\\\   \\\\  \\\\   \\\\  \\\\    \\\\\
  \\\\ \\\\\\\ \\\\   \\\\  \\\\   \\\\  \\\\   \\\\  \\\\       \\\\\
  \\\\  \\\\\  \\\\   \\\\\\\\\\   \\\\\\\\\    \\\\\\\\\\   \\\\\\\\\\
  \\\\   \\\   \\\\     \\\\\\     \\\\\\\\      \\\\\\\\    \\\\\\\\\


  Modus 0.1.5
  
  Copyright 2014
  Released under the MIT license
  
  Date: 2014-08-12T15:45Z
*/

(function (factory) {

  if ('undefined' !== typeof __root) {
    factory(__root);
  } else if (typeof module === "object" && typeof module.exports === "object") {
    // For CommonJS environments.
    factory(global);
    module.exports = global.modus;
  } else if ('undefined' !== typeof window) {
    factory(window);
  }

}(function (root, undefined) {

"use strict"

// The main modus namespace
var modus = {};

// Save the current version.
modus.VERSION = '0.1.5';

// Save the previous value of root.modus
var _previousModus = root.modus;

// export modus
root.modus = modus;

// Helpers
// -------

// Get all keys from an object
var keys = function(obj) {
  if ("object" !== typeof obj) return [];
  if (Object.keys) return Object.keys(obj);
  var keys = [];
  for (var key in obj) if (_.has(obj, key)) keys.push(key);
  return keys;
};

// Get the size of an object
var size = function (obj) {
  if (obj == null) return 0;
  return (obj.length === +obj.length) ? obj.length : keys(obj).length;
};

// Apply defaults to an object.
var defaults = function(defaults, options){
  if (!options) return defaults;
  for(var key in defaults){
    if(defaults.hasOwnProperty(key) && !options.hasOwnProperty(key)){
      options[key] = defaults[key];
    }
  }
  return options;
};

// Extend an object
var extend = function (obj){
  each(Array.prototype.slice.call(arguments, 1), function(source){
    if(source){
      for(var prop in source){
        if (source.hasOwnProperty(prop)) obj[prop] = source[prop];
      }
    }
  });
  return obj;
};

// A simple shim for `Function#bind`
var bind = function (func, ctx) {
  if (Function.prototype.bind && func.bind) return func.bind(ctx);
  return function () { func.apply(ctx, arguments); };
};

// Iterator for arrays or objects. Uses native forEach if available.
var each = function (obj, callback, context) {
  if(!obj){
    return obj;
  }
  context = (context || obj);
  if(Array.prototype.forEach && obj.forEach){
    obj.forEach(callback)
  } else if ( obj instanceof Array ){
    for (var i = 0; i < obj.length; i += 1) {
      if (obj[i] && callback.call(context, obj[i], i, obj)) {
        break;
      }
    }
  } else {
    for(var key in obj){
      if(obj.hasOwnProperty(key)){
        if(key && callback.call(context, obj[key], key, obj)){
          break;
        }
      }
    }
  }
  return obj;
};

// Run through all items in an object, then trigger
// a callback on the last item.
var eachAsync = function (obj, options) {
  var remaining = size(obj);
  options = defaults({
    each: function(){},
    onFinal: function(){},
    onError: function(){}
  }, options);
  var context = options.context || this;
  each(obj, function (item) {
    options.each(item, function () {
      remaining -= 1;
      if (remaining <= 0) 
        options.onFinal.call(context);
    }, options.onError);
  });
};

// Enxure things are loaded async.
var nextTick = ( function () {
  var fns = [];
  var enqueueFn = function (fn, ctx) {
    if (ctx) fn.bind(ctx);
    return fns.push(fn);
  };
  var dispatchFns = function () {
    var toCall = fns
      , i = 0
      , len = fns.length;
    fns = [];
    while (i < len) { toCall[i++](); }
  };
  if (typeof setImmediate == 'function') {
    return function (fn, ctx) { enqueueFn(fn, ctx) && setImmediate(dispatchFns) }
  }
  // legacy node.js
  else if (typeof process != 'undefined' && typeof process.nextTick == 'function') {
    return function (fn, ctx) { enqueueFn(fn, ctx) && process.nextTick(dispatchFns); };
  }
  // fallback for other environments / postMessage behaves badly on IE8
  else if (typeof window == 'undefined' || window.ActiveXObject || !window.postMessage) {
    return function (fn, ctx) { enqueueFn(fn, ctx) && setTimeout(dispatchFns); };
  } else {
    var msg = "tic!" + new Date
    var onMessage = function(e){
      if(e.data === msg){
        e.stopPropagation && e.stopPropagation();
        dispatchFns();
      }
    };
    root.addEventListener('message', onMessage, true);
    return function (fn, ctx) { enqueueFn(fn, ctx) && root.postMessage(msg, '*'); };
  }
})();

// Filter shim.
var nativeFilter = Array.prototype.filter;
var filter = function (obj, predicate, context) {
  var results = [];
  if (obj == null) return results;
  if (nativeFilter && obj.filter === nativeFilter) return obj.filter(predicate, context);
  each(obj, function(value, index, list) {
    if (predicate.call(context, value, index, list)) results.push(value);
  });
  return results;
};

// Check if this is a path or an object name
var isPath = function (obj) {
  return obj.indexOf('/') >= 0;
};

// modus.EventEmitter
// ------------------
// A simple event emitter, used internally for hooks.

var EventEmitter = modus.EventEmitter = function () {
  this._listeners = {};
};

EventEmitter.prototype.addEventListener = function (name, callback, once) {
  var self = this;
  if (typeof name === 'object') {
    each(name, function (val, key) {
      self.addEventListener(key, val, once);
    });
    return this;
  }
  if (typeof callback !== 'function')
    throw new TypeError('Listener must be a function: ' + typeof callback);
  if (!this._listeners[name]) this._listeners[name] = [];
  this._listeners[name].push({
    once: once,
    cb: callback
  }); 
  return this;
};

EventEmitter.prototype.removeEventListener = function (name) {
  if (name) {
    delete this._listeners[name];
    return this;
  }
  for (var e in this._listeners) delete this._listeners[e];
  return this;
};

EventEmitter.prototype.emit = function (name) {
  var evs = this._listeners[name];
  var self = this;
  var args = Array.prototype.slice.call(arguments, 1);
  if (!evs) return this;
  each(evs, function(ev, index) {
    ev.cb.apply(self, args);
  });
  var filtered = filter(evs, function(ev) {
    return (ev.once === false);
  });
  if (filtered.length <= 0) 
    this.removeEventListener(name);
  else
    this._listeners[name] = filtered;
  return this;
};

EventEmitter.prototype.on = function (name, callback) {
  return this.addEventListener(name, callback, false);
};

EventEmitter.prototype.once = function (name, callback) {
  return this.addEventListener(name, callback, true);
};

// Set up global event handler
modus.events = new EventEmitter();

// modus.Loader
// ------------
// Handles all loading behind the scenes.
var Loader = modus.Loader = function () {
  this._visited = {};
};

// Used to store a singleton of Loader.
var _loaderInstance = null;

// Get the Loader singleton.
Loader.getInstance = function () {
  if (!_loaderInstance)
    _loaderInstance = new Loader();
  return _loaderInstance;
};

// Get a visited src, if one exists.
Loader.prototype.getVisit = function (src) {
  return this._visited[src] || false;
};

// Add a new visit.
Loader.prototype.addVisit = function (src) {
  this._visited[src] = new EventEmitter();
  return this._visited[src];
};

// Create a script node.
Loader.prototype.newScript = function (moduleName, src) {
  var script = document.createElement("script");
  script.type = 'text/javascript';
  script.charset = 'utf-8';
  script.async = true;
  script.setAttribute('data-module', moduleName);
  script.src = src;
  return script;
};

// Instert a script node into the DOM, and add an event listener.
Loader.prototype.insertScript = function (script, next) {
  var head = document.getElementsByTagName("head")[0] || document.documentElement;
  head.insertBefore(script, head.firstChild).parentNode;
  if (next) {
    // If a callback is provided, use an event listener.
    var done = false;
    script.onload = script.onreadystatechange = function() {
      if (!done && (!this.readyState ||
          this.readyState === "loaded" || this.readyState === "complete") ) {
        done = true;
        next();
        // Handle memory leak in IE
        script.onload = script.onreadystatechange = null;
      }
    };
  }
};

// Start loading a module. This method will detect the environment
// (server or client) and act appropriately.
Loader.prototype.load = function (moduleName, next, error) {
  var self = this;
  if (moduleName instanceof Array) {
    eachAsync(moduleName, {
      each: function (item, next, error) {
        self.load(item, next, error);
      },
      onFinal: next,
      onError: error
    });
    return;
  }
  if (isClient())
    this.loadClient(moduleName, next, error);
  else
    this.loadServer(moduleName, next, error);
}

// Load a module when in a browser context.
Loader.prototype.loadClient = function (moduleName, next, error) {
  var self = this;
  var src = getMappedPath(moduleName, modus.config('root'));
  var visit = this.getVisit(src);
  var script;

  if (visit) {
    visit.once('done', next);
    visit.once('error', error);
    return;
  }

  script = this.newScript(moduleName, src);
  visit = this.addVisit(src);
  
  visit.once('done', next);
  visit.once('error', error);

  this.insertScript(script, function () {
    // Handle anon modules.
    var mod = modus.getLastModule();
    if (mod) mod.register(moduleName);
    visit.emit('done');
  });
};

// Load a module when in a Nodejs context.
Loader.prototype.loadServer = function (moduleName, next, error) {
  var src = getMappedPath(moduleName, modus.config('root'));
  try {
    require('./' + src);
    // Handle anon modules.
    var mod = modus.getLastModule();
    if (mod) mod.register(moduleName);
    nextTick(function () {
      next();
    });
  } catch(e) {
    nextTick(function () {
      error(e);
    });
  } 
};

// modus.Import
// ------------
// Import does what you expect: it handles all imports for 
// modus namespaces and modus modules.
var Import = function (parent) {
  this._listeners = {};
  this._parent = parent;
  this._components = [];
  this._module = false;
  this._plugin = false;
};

// Import components from a module. If a string is passed,
// the default value of the module will be imported (or, if
// default isn't set, the entire module). If an array is passed,
// all matching properties from the requested module will be imported.
Import.prototype.imports = function(components) {
  this._components = components;
  if (!this._components) this._components = [];
  return this;
};

// Specify the module to import from. Note that this method
// doesn't actually load a module: see 'modus.Module#investigate'
// to figure out what modus is doing.
//
// When defining imports, note that 'from' MUST be the last
// part of your chain. 
Import.prototype.from = function (module) {
  this._module = module;
  this._applyToEnv();
};

// Get the parent module.
Import.prototype.getParent = function () {
  return this._parent;
};

// Apply imported components to the parent module.
Import.prototype._applyToEnv = function () {
  if (!this._module) throw new Error('No module specified for import');
  var parentEnv = this._parent.getEnv();
  var module = normalizeModuleName(this._module);
  // Check if this is using a namespace shortcut
  if (module.indexOf('.') === 0)
    module = this._parent.getNamespace() + module;
  var self = this;
  var depEnv = (moduleExists(module))
    ? getModule(module).getEnv() 
    : false;
  var components = this._components;
  if (!depEnv) modus.err('Dependency not avalilable [' + module + '] for: ' + this._parent.getFullName());
  if (typeof components === 'string') {
    if (depEnv['default']) {
      parentEnv[components] = depEnv['default'];
    } else {
      parentEnv[components] = depEnv;
    }
  } else if (this._components.length <= 0) {
    return;
  } else {
    each(components, function(component) {
      if(depEnv.hasOwnProperty(component))
        parentEnv[component] = depEnv[component];
    });
  }
};

// modus.Module
// ------------
// The core of modus, Modules allow you to spread code across
// several files (private).
var Module = function (name, factory, options) {
  var self = this;

  // Allow for anon modules.
  if('function' === typeof name) {
    options = factory;
    factory = name;
    name = false;
  }

  this.options = defaults({
    namespace: false,
    moduleName: null,
    throwErrors: true,
    pub: false,
    amd: false,
    wait: false
  }, options);

  // If the factory has more then one argument, this module
  // depends on some sort of async operation (unless this is an
  // amd module).
  if ((factory && factory.length >= 1) && !this.options.amd) 
    this.options.wait = true;
  if (this.options.wait) {
    // We only want to wait until 'done' is emited, then
    // return to the usual behavior.
    this.once('done', function () {
      self.options.wait = false;
    });
  }

  this._env = {};
  this._isDisabled = false;
  this._isEnabled = false;
  this._isEnabling = false;
  this._deps = [];
  this._listeners = {};
  this._isAnon = true;
  
  this.setFactory(factory);
  this.register(name)
};

// Extend the event emitter.
Module.prototype = new EventEmitter();
Module.prototype.constructor = Module;

// Set the module name and register the module, if a name is
// provided.
Module.prototype.register = function (name) {
  if (this._isAnon && name) {
    this._isAnon = false;
    this._parseName(name);
    // Register with modus
    modus.env[this.getFullName()] = this;
  }
};

// Get the name of the module, excluding the namespace.
Module.prototype.getName = function () {
  return this.options.moduleName;
};

// Get the module's namespace
Module.prototype.getNamespace = function () {
  return this.options.namespace;
};

// Get the full name of the module, including the namespace.
Module.prototype.getFullName = function () {
  if(!this.options.namespace || !this.options.namespace.length)
    return this.options.moduleName;
  return this.options.namespace + '.' + this.options.moduleName;
};

// API method to add a dependency.
Module.prototype.addDependency = function (dep) {
  if (dep instanceof Array)
    this._deps = this._deps.concat(dep);
  else
    this._deps.push(dep);
};

// API method to get all dependencies.
Module.prototype.getDependencies = function () {
  return this._deps || [];
};

// API method to set the factory function.
Module.prototype.setFactory = function (factory) {
  this._factory = factory;
};

// API method to get the factory function, if it exists.
Module.prototype.getFactory = function () {
  return this._factory || false;
};

// API method to get the module's environment.
Module.prototype.getEnv = function () {
  return this._env || {};
};

// Make sure a module is enabled and add event listeners.
var _ensureModuleIsEnabled = function (dep, next, error) {
  if (moduleExists(dep)) {
    var mod = getModule(dep);
    mod.once('done', function () { nextTick(next) });
    mod.once('error', function () { nextTick(error) });
    mod.enable();
  } else {
    error('Could not load dependency: ' + dep);
  }
};

// Enable this module.
Module.prototype.enable = function() {
  if (this._isDisabled || this._isEnabling) return;
  if (this._isEnabled) {
    if (!this.options.wait) this.emit('done');
    return;
  }

  var self = this;
  var loader = modus.Loader.getInstance();
  var deps = [];
  var onFinal = function () {
    self._isEnabling = false;
    self._isEnabled = true;
    if(!modus.isBuilding) {
      if (self.options.amd)
        self._runFactoryAMD();
      else
        self._runFactory();
    }
    if(!self.options.wait) self.emit('done');
  };

  // Ensure we don't try to enable this module twice.
  this._isEnabling = true;
  this.emit('enable.before');
  this._investigate();
  deps = this.getDependencies();

  if (deps.length <= 0) {
    onFinal();
    return;
  }

  eachAsync(deps, {
    each: function (dep, next, error) {
      if (self.options.amd && dep === 'exports') {
        next();
      } else if (moduleExists(dep)) {
        _ensureModuleIsEnabled(dep, next, error);
      } else {
        // Try to find the module.
        if (moduleExists(dep)) {
          _ensureModuleIsEnabled(dep, next, error);
        } else {
          loader.load(dep, function () {
            _ensureModuleIsEnabled(dep, next, error);
          }, error);
        }
      }
    },
    onFinal: onFinal,
    onError: function (reason) {
      self.disable(reason);
    }
  });
};

// Disable this module and run any error hooks. Once a 
// module is disabled it cannot transition to an 'enabled' state.
Module.prototype.disable = function (reason) {
  this._isDisabled = true;
  this.emit('error');
  if (this.options.throwErrors && reason instanceof Error) {
    throw reason;
  } else if (this.options.throwErrors) {
    throw new Error(reason);
  }
};

// Create an instance of `Import`. Arguments passed here
// will be passed to `Import#imports`.
//
//    this.imports(['Bar', 'Bin']).from('app.bar');
//
Module.prototype.imports = function (componets) {
  var imp = new Import(this);
  imp.imports(componets);
  return imp;
};

// Parse a string into a module name and namespace.
Module.prototype._parseName = function (name) {
  var namespace = this.options.namespace || '';
  name = normalizeModuleName(name);
  if (name.indexOf('.') > 0) {
    if (namespace.length) namespace += '.';
    namespace += name.substring(0, name.lastIndexOf('.'));
    name = name.substring(name.lastIndexOf('.') + 1);
  }
  this.options.moduleName = name;
  this.options.namespace = namespace;
};

// RegExp to find imports.
var _findDeps = /\.from\([\'|\"]([\s\S]+?)[\'|\"]\)/g;

// Use RegExp to find any imports this module needs, then add
// them to the imports stack.
Module.prototype._investigate = function () {
  if (!this._factory) return;
  var factory = this._factory.toString();
  var self = this;
  factory.replace(_findDeps, function (matches, dep) {
    // Check if this is using a namespace shortcut
    if (dep.indexOf('.') === 0)
      dep = self.options.namespace + dep;
    self.addDependency(dep);
  });
  this.emit('investigate', this);
  modus.events.emit('module.investigate', this);
};

// Run the registered factory.
Module.prototype._runFactory = function () {
  if (!this._factory) return;
  var self = this;
  // Bind helpers to the env.
  this._env.imports = bind(this.imports, this);
  // Run the factory.
  if (this._factory.length <= 0) {
    this._factory.call(this._env);
  } else {
    this._factory.call(this._env, function (err) {
      if (err)
        self.emit('error', err);
      else
        self.emit('done', null, self);
    });
  }
  // Cleanup the env.
  this.once('done', function () {
    delete self._env.imports;
    delete self._factory;
  });
};

// Run an AMD-style factory
Module.prototype._runFactoryAMD = function () {
  if (!this._factory) return;
  var self = this;
  var deps = this.getDependencies();
  var mods = [];
  var usingExports = false;
  each(deps, function (dep) {
    if (dep === 'exports') {
      mods.push(self._env);
      usingExports = true;
    } else {
      dep = normalizeModuleName(dep);
      if (moduleExists(dep)) 
        mods.push(getModule(dep).getEnv());
    }
  });
  if (!usingExports) 
    this._env = this._factory.apply(this, mods) || {};
  else 
    this._factory.apply(this, mods)
  this.once('done', function () {
    delete self._factory;
  });
};

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
  var mod = new Module(name, factory, options);
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
  var mod = new Module(name, factory, {amd: true});
  mod.addDependency(deps);
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

}));