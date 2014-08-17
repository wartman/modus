/*!
  
  
  \\\\         \\\\     \\\\\\     \\\\\\\\     \\\\  \\\\    \\\\\\\\\
  \\\\\\     \\\\\\   \\\\\\\\\\   \\\\\\\\\    \\\\  \\\\   \\\\\\\\\\
  \\\\\\\   \\\\\\\   \\\\  \\\\   \\\\  \\\\   \\\\  \\\\    \\\\\
  \\\\ \\\\\\\ \\\\   \\\\  \\\\   \\\\  \\\\   \\\\  \\\\       \\\\\
  \\\\  \\\\\  \\\\   \\\\\\\\\\   \\\\\\\\\    \\\\\\\\\\   \\\\\\\\\\
  \\\\   \\\   \\\\     \\\\\\     \\\\\\\\      \\\\\\\\    \\\\\\\\\


  Modus 0.1.7
  
  Copyright 2014
  Released under the MIT license
  
  Date: 2014-08-17T19:37Z
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
modus.VERSION = '0.1.7';

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
  for (var key in obj) if (obj.hasOwnProperty(key)) keys.push(key);
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

// Shim for Array.prototype.indexOf
var nativeIndexOf = Array.prototype.indexOf;
var inArray = function(arr, check) {
  // Prefer native indexOf, if available.
  if (nativeIndexOf && arr.indexOf === nativeIndexOf)
    return arr.indexOf(check);
  var index = -1;
  each(arr, function (key, i) {
    if (key === check) index = i;
  });
  return index;
};

// Filter shim.
var nativeFilter = Array.prototype.filter;
var filter = function (obj, predicate, context) {
  var results = [];
  if (obj == null) return results;
  if (nativeFilter && obj.filter === nativeFilter)
    return obj.filter(predicate, context);
  each(obj, function(value, index, list) {
    if (predicate.call(context, value, index, list)) results.push(value);
  });
  return results;
};

// Return an object, minus any blacklisted items.
var omit = function(obj, blacklist) {
  var copy = {}
  for (var key in obj) {
    if (obj.hasOwnProperty(key) && (inArray(blacklist, key) < 0))
      copy[key] = obj[key];
  }
  return copy;
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

var _catchError = function (e) {
  throw e;
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
  next = next || function () {};
  error = error || _catchError;
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

// modus.Namespace
// ---------------
// Namespaces are simply objects that have access to an 'imports' 
// method which can be used to collect properties from other
// environments.
//
//    var ns = new modus.Namespace('foo.bar.bin');
//    ns.imports('bax', 'bin').from('.bix');
//    ns.imports('foo.bin.bar').as('bar');
//    ns.foo = 'foo';
//
var Namespace = modus.Namespace = function (moduleName) {
  this.moduleName = moduleName;
  // Ensure that this namespace is associated with a module.
  if (!modus.moduleExists(moduleName)) {
    var ensuredMod = modus.module(moduleName, false);
    ensuredMod.setNamespace(this);
  }
};

function _applyToNamespace (props, dep, env, many) {
  if (props instanceof Array) {
    each(props, function (prop) {
      _applyToNamespace(prop, dep, env, true);
    });
  } else if ('object' === typeof props) {
    each(props, function (alias, actual) {
      env[alias] = (dep.hasOwnProperty(actual))? dep[actual] : null;
    });
  } else {
    if (many) {
      // If 'many' is true, then we're iterating through props and
      // assigning them.
      env[props] = (dep.hasOwnProperty(props))? dep[props] : null;
    } else {
      if (dep.hasOwnProperty('default'))
        env[props] = dep['default']
      else
        env[props] = omit(dep, ['imports', 'moduleName']);
    }
  }
};

// Start an import chain. You can import specific properties from a module
// by using 'imports(<properties>).from(<moduleName>)'. For example:
//
//    var ns = new modus.Namespace('test');
//    // Pass an arbitrary number of arguments:
//    ns.imports('Foo', 'Bar').from('some.module');
//    // Or use an array:
//    ns.imports(['Foo', 'Bar']).from('some.module');
//    // Now all imported items are available in the current namespace:
//    console.log(ns.Foo, ns.Bar);
//
// If you want to import everything from a module (or import the 'default'
// export, if it is set) use 'imports(<moduleName>).as(<alias>)'. For example:
//
//    ns.imports('some.module').as('Module');
//    // The module is now available in the current namespace:
//    console.log(ns.Module.Foo, ns.Module.Bar);
//
// In both cases, '<moduleName>' will be parsed by modus and used to define
// a dependency for the current module. See 'Module#_investigate' for more on
// what's going on here.
Namespace.prototype.imports = function (/* args */) {
  var self = this;
  var args = Array.prototype.slice.call(arguments, 0);
  var props = [];
  if (args[0] instanceof Array) {
    props = args[0];
  } else {
    props = props.concat(args);
  }
  return {
    from: function (dep) {
      dep = normalizeModuleName(dep, self.moduleName);
      if (modus.moduleExists(dep)) {
        var depEnv = modus.getNamespace(dep);
        _applyToNamespace(props, depEnv, self, false);
      }
    },
    as: function (alias) {
      var dep = props[0];
      dep = normalizeModuleName(dep, self.moduleName);
      if (modus.moduleExists(dep)) {
        var depEnv = modus.getNamespace(dep);
        _applyToNamespace(alias, depEnv, self, false);
      }
    }
  };
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

  this._namespace = null;
  this._isDisabled = false;
  this._isEnabled = false;
  this._isEnabling = false;
  this._deps = [];
  this._listeners = {};
  this._isAnon = true;
  
  this.setFactory(factory);
  this.register(name);
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
    modus.addModule(this.getModuleName(), this);
  }
};

// Get the name of the module, excluding the namespace.
Module.prototype.getModuleName = function () {
  return this.options.moduleName;
};

// API method to add a dependency.
Module.prototype.addDependency = function (dep) {
  var self = this;
  if (dep instanceof Array) {
    each(dep, function (item) {
      self.addDependency(item);
    });
    return;
  }
  dep = normalizeModuleName(dep, this.getModuleName());
  this._deps.push(dep);
  return dep;
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

// API method to set this module's namespace.
Module.prototype.setNamespace = function (namespace) {
  if (!(namespace instanceof Namespace))
    throw new TypeError('Namespace must be an instance of [modus.Namespace]: ' + typeof namespace);
  this._namespace = namespace;
};

// API method to get the module's namespace.
Module.prototype.getNamespace = function () {
  if (this._isAnon)
    throw new Error('Cannot get namespace from anonymous module');
  return this._namespace || new Namespace(this.getModuleName());
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

// Parse a string into a module name.
Module.prototype._parseName = function (name) {
  this.options.moduleName = normalizeModuleName(name);
};

// RegExps to find imports.
var _finders = [
  /\.from\([\'|\"]([\s\S]+?)[\'|\"]\)/g,
  /\.imports\([\'|\"]([\s\S]+?)[\'|\"]\)\.as\([\s\S]+?\)/g
];

// Use RegExp to find any imports this module needs, then add
// them to the imports stack.
Module.prototype._investigate = function () {
  if (!this._factory) return;
  var factory = this._factory.toString();
  var self = this;
  var addDep = function (matches, dep) {
    self.addDependency(dep);
  };
  each(_finders, function (re) {
    factory.replace(re, addDep);
  });
  this.emit('investigate', this, factory);
  modus.events.emit('investigate', this, factory);
};

// Run the registered factory.
Module.prototype._runFactory = function () {
  if (!this._factory) return;
  var self = this;
  // Create or get the current env.
  this._namespace = this.getNamespace();
  // Run the factory.
  if (this._factory.length <= 0) {
    this._factory.call(this._namespace);
  } else {
    this._factory.call(this._namespace, function (err) {
      if (err)
        self.emit('error', err);
      else
        self.emit('done', null, self);
    });
  }
  // Cleanup.
  delete this._factory;
};

// Run an AMD-style factory
Module.prototype._runFactoryAMD = function () {
  if (!this._factory) return;
  var self = this;
  var deps = this.getDependencies();
  var mods = [];
  var usingExports = false;
  var amdNamespace = {};
  // Create or get the current env.
  each(deps, function (dep) {
    if (dep === 'exports') {
      mods.push(amdNamespace);
      usingExports = true;
    } else {
      dep = normalizeModuleName(dep);
      if (moduleExists(dep)) {
        var env = getNamespace(dep);
        if (env.hasOwnProperty('default'))
          mods.push(env['default']);
        else
          mods.push(env);
      }
    }
  });
  if (!usingExports) 
    amdNamespace = this._factory.apply(this, mods) || {};
  else 
    this._factory.apply(this, mods);

  // Export the env
  if (typeof amdNamespace === 'function')
    amdNamespace['default'] = amdNamespace;
  this._namespace = amdNamespace;
  // Cleanup.
  delete this._factory;
};

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
  // Some modules may start with a dot. Make sure we don't end up
  // with an ugly URI by dropping it.
  if (!isPath(src) && src.indexOf('.') === 0)
    src = src.substring(1);
  src = (!isPath(src))? src.replace(/\./g, '/') : src;
  src = (src.indexOf('.js') < 0 && !isServer())
    ? root + src + '.js'
    : root + src;
  return src;
};

// Make sure all names are correct.
var normalizeModuleName = modus.normalizeModuleName = function (moduleName, context) {
  context = context || '';
  if(isPath(moduleName)) {
    // Strip extensions
    if (moduleName.indexOf('.js') > 0) {
      moduleName = moduleName.substring(0, moduleName.indexOf('.js'));
    }
  }
  moduleName = moduleName.replace(/\/|\\/g, '.');
  // If this starts with a dot, make sure it's a fully qualified module name
  // by checking the module's context and assuming its coming from the same place.
  if (moduleName.indexOf('.') === 0) {
    context = context.substring(0, context.lastIndexOf('.'));
    if (context.length)
      moduleName = context + moduleName;
    else {
      moduleName = moduleName.substring(1);
    }
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
  if (! (mod instanceof Module)) 
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

// Get a namespace from a module
var getNamespace = modus.getNamespace = function (name) {
  if (!moduleExists(name)) 
    return false;
  return getModule(name).getNamespace();
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

// Start a script by loading a main file. With modus.start, modus will 
// try to parse the root path from the provided path, which often is 
// all the configuration you need.
modus.start = function (mainPath, done) {
  mainPath = modus.normalizeModuleName(mainPath);
  var lastSegment = (mainPath.lastIndexOf('.') + 1);
  var root = mainPath.substring(0, lastSegment);
  var main = mainPath.substring(lastSegment);
  var loader = modus.Loader.getInstance();
  modus.config('root', root.replace(/\./g, '/'));
  modus.config('main', main);
  loader.load(main, done);
};

// If this script tag has 'data-main' attribute, we can
// autostart without the need to explicitly call 'modus.start'.
function _autostart() {
  var scripts = document.getElementsByTagName( 'script' );
  var script = scripts[ scripts.length - 1 ];
  if (script) {
    var main = script.getAttribute('data-main');
    if (main)
      modus.start(main);
  }
};

if (typeof document !== 'undefined')
  _autostart();

}));