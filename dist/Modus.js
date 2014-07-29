/*!

  
  ....         ....     ......     ........     ....  ....    .........
  .    .     .    .   .  ....  .   .  ...  .    .  .  .  .   .        .
  .  .  .   .  .  .   .  .  .  .   .  .  .  .   .  .  .  .   .   ......
  .  . .  .  . .  .   .  .  .  .   .  .  .  .   .  .  .  .    .....  .
  .  .  .   .  .  .   .  .  .  .   .  .  .  .   .  .  .  .   .......  .
  .  .   . .   .  .   .  ....  .   .  ...  .    .  ....  .   .        .
  ....    .    ....     ......     ........      ........    .........



  Modus 0.1.3
  
  Copyright 2014
  Released under the MIT license
  
  Date: 2014-07-29T19:04Z
*/

(function (factory) {

  if (typeof module === "object" && typeof module.exports === "object") {
    // For CommonJS environments.
    var root = global || {}; // If this is nodejs, we want modus to be global.
    factory(root);
    module.exports = root.modus;
  } else if (typeof window !== "undefined") {
    factory(window);
  }

}(function (root, undefined) {

"use strict"

// The main modus namespace
var modus = root.modus = {};

// Save the current version.
modus.VERSION = '0.1.3';

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

// modus
// =====

// Environment helpers
// -------------------

// 'env' holds modules.
modus.env = {};

// Config options for modus.
modus.options = {
  root: '',
  map: {}
};

// Set or get a modus config option.
modus.config = function (key, val) {
  if ( "object" === typeof key ) {
    for ( var item in key ) {
      modus.config(item, key[item]);
    }
    return;
  }
  if(arguments.length < 2){
    return ("undefined" === typeof modus.options[key])? false : modus.options[key];
  }
  if ( 'map' === key ) {
    return modus.map(val);
  }
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

// Map modules to a given path.
//
// example:
//    modus.map('lib/foo.js', ['foo.bar', 'foo.bin']);
//    // You can also map a file to a base namespace
//    modus.map('lib/foo.js', ['foo.*']);
//    // The following will now load lib/foo.js:
//    module.import('foo.bar');
//
modus.map = function (path, provides) {
  // TODO: This method needs some love.
  if ("object" === typeof path){
    for ( var item in path ) {
      modus.map(item, path[item]);
    }
    return;
  }
  if (!modus.options.map[path]) {
    modus.options.map[path] = [];
  }
  if (provides instanceof Array) {
    each(provides, function (item) {
      modus.map(path, item);
    });
    return;
  }
  provides = new RegExp ( 
    provides
      // ** matches any number of segments (will only use the first)
      .replace('**', "([\\s\\S]+?)")
      // * matches a single segment (will only use the first)
      .replace('*', "([^\\/|^$]+?)") 
      // escapes
      .replace(/\//g, '\\/')
      .replace(/\./g, "\\.")
      .replace(/\$/g, '\\$')
      + '$'
  );
  modus.options.map[path].push(provides);
};

// Simple error wrapper.
modus.err = function (error) {
  throw new Error(error);
};

// Get a mapped path
var getMappedPath = modus.getMappedPath = function (module, root) {
  root = root || modus.config('root');
  var src = (isPath(module))? module : module.replace(/\./g, '/');
  each(modus.config('map'), function (maps, pathPattern) {
    each(maps, function (map) {
      module.replace(map, function (matches, many, single) {
        src = pathPattern;
        if (!single) {
          single = many;
          many = false;
        }
        if (many) src = src.replace('**', many);
        if (single) src = src.replace('*', single)
      });
    });
  });
  src = (src.indexOf('.js') < 0 && !isServer())
    ? root + src + '.js'
    : root + src;
  return src;
};

// Make sure all names are correct.
var normalizeModuleName = modus.normalizeModuleName = function (name) {
  if(isPath(name)) {
    // Strip extensions
    if (name.indexOf('.') > 0) {
      name = name.substring(0, name.indexOf('.'));
    }
    name = name.replace(/\/\\/g, '.');
  }
  return name;
};

// Try to get a global export from a script.
var getMappedGlobal = modus.getMappedGlobal = function (path) {
  if (modus.options.map.hasOwnProperty(path)) {
    return root[modus.options.map[path]] || false;
  }
  return false;
};

// Check if a module has been loaded.
var moduleExists = modus.moduleExists = function (name) {
  name = normalizeModuleName(name);
  if (modus.env.hasOwnProperty(name)) return true;
  return false;
};

// Get a module from the env.
var getModule = modus.getModule = function (name) {
  name = normalizeModuleName(name);
  return modus.env[name];
}

// Primary API
// -----------

// Module factory.
//
// example:
//    modus.module('foo.bar', function (bar) {
//      // code
//    });
//
modus.module = function (name, factory, options) {
  options = options || {};
  var module = new modus.Module(name, factory, options);
  nextTick(bind(module.enable, module)  );
  return module;
};

// Syntactic sugar for namespaces.
//
// example:
//    modus.namespace('Foo', function (Foo) {
//      Foo.module('Bar', function (Bar) {...}); // Defines 'Foo/Bar'
//    });
//    // Or:
//    modus.namespace('Foo/Bar').module('Bin', function (Bin) { ... });
//
modus.namespace = function (namespace, factory) {
  if (factory) return modus.module(namespace, factory);
  var options = {namespace: namespace};
  return {
    module: function (name, factory) {
      return modus.module(name, options, factory);
    },
    publish: function (name, value) {
      return modus.publish(name, options, value);
    }
  };
};

// Shortcut to export a single value as a module.
modus.publish = function (name, value, options) {
  return modus.module(name, options, function (module) {
    module.default = value;
  });
};

// modus.EventEmitter
// ------------------
// A simple event emitter, used internally for hooks.

var EventEmitter = modus.EventEmitter = function () {
  this._listeners = {};
};

EventEmitter.prototype.addEventListener = function (name, callback, once) {
  if (typeof callback !== 'function')
    throw new TypeError('Listener must be a function: ' + typeof callback);
  if (!this._listeners[name]) this._listeners[name] = [];
  this._listeners[name].push({
    once: once,
    cb: callback
  }); 
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

EventEmitter.prototype.removeEventListener = function (name) {
  if (name) {
    delete this._listeners[name];
    return this;
  }
  for (var e in this._listeners) delete this._listeners[e];
  return this;
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
    visit.emit('done');
  });
};

// Load a module when in a Nodejs context.
Loader.prototype.loadServer = function (moduleName, next, error) {
  try {
    require(src);
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
var Import = modus.Import = function (parent) {
  this._listeners = {};
  this._parent = parent;
  this._components = [];
  this._module = false;
  this._plugin = false;
};

// Extend the event emitter.
Import.prototype = new EventEmitter()
Import.prototype.constructor = Import;

// Import components from a module.
Import.prototype.imports = function() {
  var self = this;
  if (!this._components) this._components = [];
  each(arguments, function (arg) {
    self._components.push(arg);
  });
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
Import.prototype.getModule = function () {
  return this._parent;
};

// Apply imported components to the parent module.
Import.prototype._applyToEnv = function () {
  if (!this._module) throw new Error('No module specified for import');
  var parentEnv = this._parent.env;
  var module = normalizeModuleName(this._module);
  // Check if this is using a namespace shortcut
  if (module.indexOf('.') === 0)
    module = this._parent.options.namespace + module;
  var self = this;
  var depEnv = (moduleExists(module))
    ? getModule(module).env 
    : false;
  if (!depEnv) modus.err('Dependency not avalilable [' + module + '] for: ' + this._parent.getFullName());
  if (this._components.length <= 0) return;
  if (this._components.length === 1) {
    // Handle something like "module.imports('foo').from('app.foo')"
    // If the name matches the last segment of the module name, it should import the entire module.
    var moduleName = module.substring(module.lastIndexOf('.') + 1);
    var component = this._components[0];
    if (component === moduleName) {
      if (depEnv['default'])
        parentEnv[component] = depEnv['default'];
      else
        parentEnv[component] = depEnv;
      return;
    }
  }
  each(this._components, function(component) {
    if(depEnv.hasOwnProperty(component))
      parentEnv[component] = depEnv[component];
  });
};

// modus.Module
// ------------
// The core of modus, Modules allow you to spread code across
// several files.
var Module = modus.Module = function (name, factory, options) {
  this.options = defaults({
    namespace: false,
    moduleName: null,
    throwErrors: true,
    // If true, the factory will not be run.
    compiling: false,
    // If true, you'll need to manualy emit 'done' before
    // the module will be marked as 'enabled'
    wait: false,
    hooks: {}
  }, options);
  var self = this;
  // If the factory has more then one argument, this module
  // depends on some sort of async operation.
  if (factory && factory.length >= 2) 
    this.options.wait = true;
  if (this.options.wait) {
    // We only want to wait until 'done' is emited, then
    // return to the usual behavior.
    this.once('done', function () {
      self.options.wait = false;
    });
  }
  this.env = {};
  this._isDisabled = false;
  this._isEnabled = false;
  this._isEnabling = false;
  this._deps = [];
  this._listeners = {};
  this._factory = factory;
  // Parse the name.
  this._parseName(name);
  // Register self with modus
  modus.env[this.getFullName()] = this;
  this._registerHooks();
};

// Extend the event emitter.
Module.prototype = new EventEmitter();
Module.prototype.constructor = Module;

// Get the name of the module, excluding the namespace.
Module.prototype.getName = function () {
  return this.options.moduleName;
};

// Get the full name of the module, including the namespace.
Module.prototype.getFullName = function () {
  if(!this.options.namespace || !this.options.namespace.length)
    return this.options.moduleName;
  return this.options.namespace + '.' + this.options.moduleName;
};

// Callback that waits for a modules to emit a 'done' or 'error'
// event.
var _onModuleDone = function (dep, next, error) {
  if (moduleExists(dep)) {
    var mod = getModule(dep);
    mod.once('done', function () { nextTick(next) });
    mod.once('error', function () { nextTick(error) });
    mod.enable();
  } else if (getMappedGlobal(dep)) {
    next();
  } else {
    error('Could not load dependency: ' + dep);
  }
};

// Callback to run after the last dependency is loaded.
var _onFinal = function () {
  this._isEnabling = false;
  this._isEnabled = true;
  if(!this.options.compiling) this._runFactory();
  this.emit('enable.after');
  if(!this.options.wait) this.emit('done');
};

// Enable this module.
Module.prototype.enable = function() {
  if (this._isDisabled || this._isEnabling) return;
  if (this._isEnabled) {
    if (!this.options.wait) this.emit('done');
    return;
  }
  // Ensure we don't try to enable this module twice.
  this._isEnabling = true;
  this.emit('enable.before');
  this._investigate();
  var onFinal = bind(_onFinal, this);
  var self = this;
  var loader = modus.Loader.getInstance();
  if (this._deps.length <= 0) return onFinal();
  eachAsync(this._deps, {
    each: function (dep, next, error) {
      if (moduleExists(dep)) {
        _onModuleDone(dep, next, error);
      } else {
        // Try to find the module.
        loader.load(dep, function () {
          _onModuleDone(dep, next, error);
        }, error);
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

// Create an instance of `modus.Import`. Arguments passed here
// will be passed to `modus.Import#imports`.
//
//    foo.imports('Bar', 'Bin').from('app.bar');
//
Module.prototype.imports = function (/*...*/) {
  var imp = new modus.Import(this);
  imp.imports.apply(imp, arguments);
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

// You can add hooks by passing them to the 'options'
// arg in the `modus.Module` constructor. Currently available
// hooks are:
//
//    build: function (raw) <- Used by the builder to allow custom
//                             compiling. Should return a string that will
//                             be used in the final, compiled script.
//
Module.prototype._registerHooks = function () {
  var hooks = this.options.hooks;
  var self = this;
  each(hooks, function (cb, name) {
    self.once(name, cb);
  }); 
};

// RegExp to find imports.
var _findDeps = /\.from\([\'|\"]([\s\S]+?)[\'|\"]\)/g;

// Use RegExp to find any imports this module needs, then add
// them to the imports stack.
Module.prototype._investigate = function () {
  var factory = this._factory.toString();
  var self = this;
  factory.replace(_findDeps, function (matches, dep) {
    // Check if this is using a namespace shortcut
    if (dep.indexOf('.') === 0)
      dep = self.options.namespace + dep;
    self._deps.push(dep);
  });
  this.emit('investigate');
  modus.events.emit('module.investigate', this);
};

// Run the registered factory.
Module.prototype._runFactory = function () {
  if (!this._factory) return;
  var self = this;
  // Bind helpers to the env.
  this.emit('factory.before');
  this.env.imports = bind(this.imports, this);
  // Run the factory.
  if (this._factory.length <= 1) {
    this._factory(this.env);
  } else {
    this._factory(this.env, function (err) {
      if (err)
        self.emit('error', err);
      else
        self.emit('done');
    });
  }
  // Cleanup the env.
  this.once('done', function () {
    delete self.env.imports;
    // delete self.env.emit;
    delete self._factory;
  });
  this.emit('factory.after');
};

}));