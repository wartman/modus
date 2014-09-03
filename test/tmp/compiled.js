;(function () {
var __root = this;

/*!
  
  
  \\\\         \\\\     \\\\\\     \\\\\\\\     \\\\  \\\\    \\\\\\\\\
  \\\\\\     \\\\\\   \\\\\\\\\\   \\\\\\\\\    \\\\  \\\\   \\\\\\\\\\
  \\\\\\\   \\\\\\\   \\\\  \\\\   \\\\  \\\\   \\\\  \\\\    \\\\\
  \\\\ \\\\\\\ \\\\   \\\\  \\\\   \\\\  \\\\   \\\\  \\\\       \\\\\
  \\\\  \\\\\  \\\\   \\\\\\\\\\   \\\\\\\\\    \\\\\\\\\\   \\\\\\\\\\
  \\\\   \\\   \\\\     \\\\\\     \\\\\\\\      \\\\\\\\    \\\\\\\\\


  Modus 0.2.3
  
  Copyright 2014
  Released under the MIT license
  
  Date: 2014-09-03T16:04Z
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
modus.VERSION = '0.2.3';

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

// A super stripped down promise-like thing. This is most definitely
// NOT promises/A+ compliant, but its enough for our needs.
var when = function (resolver) {
  var context = this;
  var _state = false;
  var _readyFns = [];
  var _failedFns = [];
  var _value = null;
  var _dispatch = function (fns, value, ctx) {
    if (!fns.length) return;
    _value = (value || _value);
    ctx = (ctx || this);
    var fn;
    while (fn = fns.pop()) { fn.call(ctx, _value); }
  };
  var _resolve = function (value, ctx) {
    context = ctx || context;
    _state = 1;
    _dispatch(_readyFns, value, ctx)
  };
  var _reject = function (value, ctx) {
    context = ctx || context;
    _state = -1;
    _dispatch(_failedFns, value, ctx)
  };

  // Run the resolver
  if (resolver)
    resolver(_resolve, _reject);

  return {
    then: function (onReady, onFailed) {
      nextTick(function () {
        if(onReady && ( "function" === typeof onReady)){
          (_state === 1)
            ? onReady.call(context, _value)
            : _readyFns.push(onReady);
        }
        if(onFailed && ( "function" === typeof onFailed)){
          (_state === -1)
            ? onFailed.call(context, _value)
            : _failedFns.push(onFailed);
        }
      });
      return this;
    },
    fail: function (onFailed) {
      return this.then(null, onFailed);
    },
    resolve: _resolve,
    reject: _reject
  };
};

// Run a callback on an array of items, then resolve
// the promise when complete.
var whenAll = function (obj, cb, ctx) {
  ctx = ctx || this;
  var remaining = size(obj);
  return when(function (res, rej) {
    each(obj, function (arg) {
      when(function (res, rej) {
        cb.call(ctx, arg, res, rej)
      }).then(function () {
        remaining -= 1;
        if (remaining <= 0) res(null, ctx);
      }).fail(function (reason) {
        rej(reason);
      });
    });
  });
};

// Check if this is a path or an object name
var isPath = function (obj) {
  return obj.indexOf('/') >= 0;
};

// Excape characters for regular expressions.
var escapeRegExp = function (str) {
  return str.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
}

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
Loader.prototype.addVisit = function (src, resolver) {
  this._visited[src] = when(resolver);
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
  var promise;
  if (moduleName instanceof Array) {
    promise = whenEach(moduleName, function (item, res, rej) {
      self.load(item).then(res, rej);
    });
  } else if (isServer()) {
    promise = this.loadServer(moduleName);
  } else {
    promise = this.loadClient(moduleName);
  }
  if (next) promise.then(next, error);
  return promise;
};

// Load a module when in a browser context.
Loader.prototype.loadClient = function (moduleName) {
  var self = this;
  var src = getMappedPath(moduleName);
  var visit = this.getVisit(src);
  var script;

  if (!visit) {
    script = this.newScript(moduleName, src);
    visit = this.addVisit(src, function (res, rej) {
      self.insertScript(script, function () {
        // Handle anon modules.
        var mod = modus.getLastModule();
        if (mod) mod.registerModule(moduleName);
        res();
      });
    });
  }

  return visit;
};

// Load a module when in a Nodejs context.
Loader.prototype.loadServer = function (moduleName) {
  var src = getMappedPath(moduleName);
  var visit = this.getVisit(src);

  if (!visit) {
    visit = this.addVisit(src, function (res, rej) {
      try {
        require('./' + src);
        // Handle anon modules.
        var mod = modus.getLastModule();
        if (mod) mod.registerModule(moduleName);
        res();
      } catch(e) {
        rej(e);
      } 
    });
  }

  return visit;
};

// modus.Module
// ------------
// The core of modus. Exports are applied directly to each module
// object, so some effort has been made to reduce the likelihood of 
// name conflicts (mostly by making method names rather verbose).
var Module = modus.Module = function (name, factory, options) {
  var self = this;
  // Allow for anon modules.
  if('function' === typeof name) {
    options = factory;
    factory = name;
    name = false;
  }

  // Define module information
  this.__modulePromise = when();
  this.__moduleDependencies = [];
  this.__moduleName = '';
  this.__moduleFactory = null;
  this.__moduleMeta = defaults({
    throwErrors: true,
    isAsync: false,
    isPublished: false,
    isAmd: false,
    isDisabled: false,
    isEnabled: false,
    isEnabling: false,
    isAnon: true
  }, options);
  
  this.setModuleFactory(factory);
  this.registerModule(name);
};

// A list of props to omit from module imports.
var _moduleOmit = ['__moduleName', '__moduleFactory', '__modulePromise', '__moduleMeta', '__moduleDependencies'];

// Private method to add imported properties to a module.
function _applyToModule (props, dep, many) {
  var env = this;
  if (props instanceof Array) {
    each(props, function (prop) {
      _applyToModule.call(env, prop, dep, true);
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
        env[props] = omit(dep, _moduleOmit);
    }
  }
};

// Start an import chain. You can import specific properties from a module
// by using 'imports(<properties>).from(<moduleName>)'. For example:
//
//    var mod = new modus.Module('test');
//    // Pass an arbitrary number of arguments:
//    mod.imports('Foo', 'Bar').from('some.module');
//    // Or use an array:
//    mod.imports(['Foo', 'Bar']).from('some.module');
//    // Now all imported items are available in the current module:
//    console.log(mod.Foo, mod.Bar);
//
// If you want to import everything from a module (or import the 'default'
// export, if it is set) use 'imports(<moduleName>).as(<alias>)'. For example:
//
//    mod.imports('some.module').as('Module');
//    // The module is now available in the current module:
//    console.log(mod.Module.Foo, mod.Module.Bar);
//
// In both cases, '<moduleName>' will be parsed by modus and used to define
// a dependency for the current module. See 'Module#_investigate' for more on
// what's going on here.
Module.prototype.imports = function (/* args */) {
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
      dep = normalizeModuleName(dep, self.getModuleName());
      if (modus.moduleExists(dep)) {
        var depEnv = modus.getModule(dep);
        _applyToModule.call(self, props, depEnv, false);
      }
    },
    as: function (alias) {
      var dep = props[0];
      dep = normalizeModuleName(dep, self.getModuleName());
      if (modus.moduleExists(dep)) {
        var depEnv = modus.getModule(dep);
        _applyToModule.call(self, alias, depEnv, false);
      }
    }
  };
};

// Shim for CommonJs style require calls.
Module.prototype.require = function (dep) {
  dep = normalizeModuleName(dep, this.getModuleName());
  var result = {};
  if (modus.moduleExists(dep)) {
    var depEnv = modus.getModule(dep);
    if (depEnv.hasOwnProperty('default'))
      result = depEnv['default']
    else
      result = omit(depEnv, _moduleOmit);
  }
  return result;
};

// Set the module name and register the module, if a name is
// provided.
Module.prototype.registerModule = function (name) {
  if (this.getModuleMeta('isAnon') && name) {
    this.setModuleMeta('isAnon', false);
    this.__moduleName = normalizeModuleName(name);
    // Register with modus
    modus.addModule(this.getModuleName(), this);
  }
};

// Get a meta item from the module, if it exists ('meta items' typically
// being things like 'isAsync' or 'isEnabled'). Returns `false` if nothing
// is found.
Module.prototype.getModuleMeta = function (key) {
  if(!key) return this.__moduleMeta;
  return this.__moduleMeta[key] || false;
};

// Set a meta item.
Module.prototype.setModuleMeta = function (key, value) {
  this.__moduleMeta[key] = value;
};

// Use a promise
Module.prototype.onModuleReady = function(onReady, onFail) {
  if (arguments.length)
    this.__modulePromise.then(onReady, onFail);
  return this.__modulePromise;
};

// Get the name of the module, excluding the namespace.
Module.prototype.getModuleName = function () {
  return this.__moduleName;
};

// API method to add a dependency.
Module.prototype.addModuleDependency = function (dep) {
  var self = this;
  if (dep instanceof Array) {
    each(dep, function (item) {
      self.addModuleDependency(item);
    });
    return;
  }
  dep = normalizeModuleName(dep, this.getModuleName());
  this.__moduleDependencies.push(dep);
  return dep;
};

// API method to get all dependencies.
Module.prototype.getModuleDependencies = function () {
  return this.__moduleDependencies || [];
};

// RegExp to remove comments, ensuring that we don't try to
// import things that have been commented out.
var _commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg;

// RegExps to find imports.
var _importRegExp = [
  /\.from\(\s*["']([^'"\s]+)["']\s*\)/g,
  /\.imports\(\s*["']([^'"\s]+)["']\s*\)\.as\([\s\S]+?\)/g,
  /require\s*\(\s*["']([^'"\s]+)["']\s*\)/g
];

// Use RegExp to find any imports this module needs, then add
// them to the dependency stack.
Module.prototype.findModuleDependencies = function () {
  if (!this.__moduleFactory) return;
  var self = this;
  var factory = this.__moduleFactory
    .toString()
    .replace(_commentRegExp, '');
  each(_importRegExp, function (re) {
    factory.replace(re, function (matches, dep) {
      self.addModuleDependency(dep);
    });
  });
  // this.emitModuleEvent('module:investigate', this, factory);
  // modus.events.emit('module:investigate', this, factory);
};

// API method to set the factory function.
// If the factory has more then one argument, this module
// depends on some sort of async operation (unless this is an
// amd module).
Module.prototype.setModuleFactory = function (factory) {
  if ('function' !== typeof factory) return;
  if ((factory && factory.length >= 1) && !this.getModuleMeta('isAmd'))
    this.setModuleMeta('isAsync', true);
  this.__moduleFactory = factory;
};

// API method to get the factory function, if it exists.
Module.prototype.getModuleFactory = function () {
  return this.__moduleFactory || false;
};

// Make sure a module is enabled and add event listeners.
var _ensureModuleIsEnabled = function (dep, next, error) {
  if (moduleExists(dep)) {
    var mod = getModule(dep);
    mod.enableModule().then(next, error);
  } else {
    error('Could not load dependency: ' + dep);
  }
};

// Run the registered factory.
var _runFactory = function () {
  if (!this.__moduleFactory) return;
  var self = this;
  // Run the factory.
  if (this.__moduleFactory.length <= 0) {
    this.__moduleFactory.call(this);
  } else {
    this.__moduleFactory.call(this, function (err) {
      if (err)
        self.__modulePromise.reject(err, self);
      else
        self.__modulePromise.resolve(self, self);
    });
  }
  // Cleanup.
  delete this.__moduleFactory;
};

// Run an AMD-style factory
var _runFactoryAMD = function () {
  if (!this.__moduleFactory) return;
  var self = this;
  var deps = this.getModuleDependencies();
  var mods = [];
  var usingExports = false;
  var amdModule = {exports: {}};
  // Create or get the current env.
  each(deps, function (dep) {
    if (dep === 'exports') {
      mods.push(amdModule.exports);
      usingExports = true;
    } else if (dep === 'module') {
      mods.push(amdModule);
      usingExports = true;
    } else if (dep === 'require') {
      mods.push(bind(self.require, self));
    } else {
      dep = normalizeModuleName(dep);
      if (moduleExists(dep)) {
        var env = getModule(dep);
        if (env.hasOwnProperty('default'))
          mods.push(env['default']);
        else
          mods.push(env);
      }
    }
  });
  if (!usingExports) 
    amdModule.exports = this.__moduleFactory.apply(this, mods) || {};
  else 
    this.__moduleFactory.apply(this, mods);

  // Export the env
  // @todo: I think I have the following check just to make underscore work. Seems a
  // little odd? Is it even necessary?
  if (typeof amdModule.exports === 'function')
    amdModule.exports['default'] = amdModule.exports;
  extend(this, amdModule.exports);

  // Cleanup.
  delete this.__moduleFactory;
};

// Enable this module.
Module.prototype.enableModule = function() {
  if (this.getModuleMeta('isDisabled') 
      || this.getModuleMeta('isEnabling')
      || this.getModuleMeta('isEnabled')) 
    return this.__modulePromise;

  var self = this;
  var loader = modus.Loader.getInstance();
  var deps = [];
  var onFinal = function () {
    self.setModuleMeta('isEnabling', false);
    self.setModuleMeta('isEnabled', true);
    if(!modus.isBuilding) {
      if (self.getModuleMeta('isAmd'))
        _runFactoryAMD.call(self);
      else
        _runFactory.call(self);
    }
    if(!self.getModuleMeta('isAsync'))
      self.__modulePromise.resolve(null, self);
  };

  // Ensure we don't try to enable this module twice.
  this.setModuleMeta('isEnabling', true);
  // this.emitModuleEvent('module:enableBefore');
  this.findModuleDependencies();
  deps = this.getModuleDependencies();

  if (deps.length <= 0) {
    onFinal();
    return this.__modulePromise;
  }

  whenAll(deps, function (dep, next, error) {
    if (self.getModuleMeta('isAmd') && inArray(['exports', 'require', 'module'], dep) >= 0) {
      // Skip AMD/CommonJS helpers
      next();
    } else if (moduleExists(dep)) {
      _ensureModuleIsEnabled(dep, next, error);
    } else {
      // Try to find the module.
      if (moduleExists(dep)) {
        _ensureModuleIsEnabled(dep, next, error);
      } else {
        loader
          .load(dep)
          .then(function () {
            _ensureModuleIsEnabled(dep, next, error);
          }, error);
      }
    }
  }).then(onFinal, bind(this.disableModule, this));

  return this.__modulePromise;
};

// Disable this module and run any error hooks. Once a 
// module is disabled it cannot transition to an 'enabled' state.
Module.prototype.disableModule = function (reason) {
  this.setModuleMeta('isDisabled', true);
  this.emitModuleEvent('error', reason);
  if (this.getModuleMeta('throwErrors') && reason instanceof Error) {
    throw reason;
  } else if (this.getModuleMeta('throwErrors')) {
    throw new Error(reason);
  }
  return reason;
};

// modus
// =====

// Environment helpers
// -------------------

// Modus' env, where modules hang out.
modus.env = {};

// Config options for modus.
modus.options = {
  root: '',  maps: {},
  namespaceMaps: {},
  main: 'main',
  // A modusfile can be used to customize a compiled project.
  // This should be a module name or URI to a modusfile document
  // (or set to 'false')
  // See `modus.addBuildEvent` for more.
  modusfile: false
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

// Sugar for getting all modules.
var getAllModules = modus.getAllModules = function () {
  return getModule();
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
  if (deps.length === 0 && factory.length > 0)
    deps = (factory.length === 1 ? ['require'] : ['require', 'exports', 'module']).concat(deps);
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

// Build API
// ---------

var _moduleBuildEvents = {};
var _globalBuildEvents = [];

// Add a build event. This can be limited to a specific module
// (by passing a module name as the first argument), or can be
// run globally by omitting the first argument.
//
//    // Running on a single module:
//    modus.addBuildEvent('foo.bar', function (mod, build) {
//      // `mod` is the current module and `build` is the current
//      // instance of `modus.Build`.
//      build.output(mod.getModuleName(), 'this will replace the module');
//    });
//
//    // Running globally:
//    modus.addBuildEvent(function (mods, build) {
//      // `mods` is an array containing all the modules in the app.
//      mods.forEach(function (mod) {
//        build.output(mod.getModuleName(), 'Do something here.');
//      });
//    });
//
modus.addBuildEvent = function (moduleName, callback) {
  // Only register build events if this is building.
  if (!modus.isBuilding) return;
  if ('undefined' === typeof callback) {
    callback = moduleName;
    moduleName = false;
  }
  if (!moduleName) {
    // then this is a global build event
    _globalBuildEvents.push(callback);
  } else {
    moduleName = normalizeModuleName(moduleName);
    _moduleBuildEvents[moduleName] = callback;
  }
};

// Used by modus.Build to get build events.
modus.getBuildEvent = function (moduleName) {
  if (!moduleName) return _globalBuildEvents;
  return _moduleBuildEvents[moduleName] || false;
};

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
var modus = __root.modus, define = modus.define, mod = modus.module;

modus.config({
  main: 'main',
  maps: {
    'underscore': '../node_modules/underscore/underscore-min'
  } 
});
modus.publish('fixtures.build.moduleBuildEvent', 'file loaded' );
// Also tests the simple API
mod('fixtures.build.anon', function () {
  this.default = 'anon';
});
//     Underscore.js 1.6.0
//     http://underscorejs.org
//     (c) 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.
(function(){var n=this,t=n._,r={},e=Array.prototype,u=Object.prototype,i=Function.prototype,a=e.push,o=e.slice,c=e.concat,l=u.toString,f=u.hasOwnProperty,s=e.forEach,p=e.map,h=e.reduce,v=e.reduceRight,g=e.filter,d=e.every,m=e.some,y=e.indexOf,b=e.lastIndexOf,x=Array.isArray,w=Object.keys,_=i.bind,j=function(n){return n instanceof j?n:this instanceof j?void(this._wrapped=n):new j(n)};"undefined"!=typeof exports?("undefined"!=typeof module&&module.exports&&(exports=module.exports=j),exports._=j):n._=j,j.VERSION="1.6.0";var A=j.each=j.forEach=function(n,t,e){if(null==n)return n;if(s&&n.forEach===s)n.forEach(t,e);else if(n.length===+n.length){for(var u=0,i=n.length;i>u;u++)if(t.call(e,n[u],u,n)===r)return}else for(var a=j.keys(n),u=0,i=a.length;i>u;u++)if(t.call(e,n[a[u]],a[u],n)===r)return;return n};j.map=j.collect=function(n,t,r){var e=[];return null==n?e:p&&n.map===p?n.map(t,r):(A(n,function(n,u,i){e.push(t.call(r,n,u,i))}),e)};var O="Reduce of empty array with no initial value";j.reduce=j.foldl=j.inject=function(n,t,r,e){var u=arguments.length>2;if(null==n&&(n=[]),h&&n.reduce===h)return e&&(t=j.bind(t,e)),u?n.reduce(t,r):n.reduce(t);if(A(n,function(n,i,a){u?r=t.call(e,r,n,i,a):(r=n,u=!0)}),!u)throw new TypeError(O);return r},j.reduceRight=j.foldr=function(n,t,r,e){var u=arguments.length>2;if(null==n&&(n=[]),v&&n.reduceRight===v)return e&&(t=j.bind(t,e)),u?n.reduceRight(t,r):n.reduceRight(t);var i=n.length;if(i!==+i){var a=j.keys(n);i=a.length}if(A(n,function(o,c,l){c=a?a[--i]:--i,u?r=t.call(e,r,n[c],c,l):(r=n[c],u=!0)}),!u)throw new TypeError(O);return r},j.find=j.detect=function(n,t,r){var e;return k(n,function(n,u,i){return t.call(r,n,u,i)?(e=n,!0):void 0}),e},j.filter=j.select=function(n,t,r){var e=[];return null==n?e:g&&n.filter===g?n.filter(t,r):(A(n,function(n,u,i){t.call(r,n,u,i)&&e.push(n)}),e)},j.reject=function(n,t,r){return j.filter(n,function(n,e,u){return!t.call(r,n,e,u)},r)},j.every=j.all=function(n,t,e){t||(t=j.identity);var u=!0;return null==n?u:d&&n.every===d?n.every(t,e):(A(n,function(n,i,a){return(u=u&&t.call(e,n,i,a))?void 0:r}),!!u)};var k=j.some=j.any=function(n,t,e){t||(t=j.identity);var u=!1;return null==n?u:m&&n.some===m?n.some(t,e):(A(n,function(n,i,a){return u||(u=t.call(e,n,i,a))?r:void 0}),!!u)};j.contains=j.include=function(n,t){return null==n?!1:y&&n.indexOf===y?n.indexOf(t)!=-1:k(n,function(n){return n===t})},j.invoke=function(n,t){var r=o.call(arguments,2),e=j.isFunction(t);return j.map(n,function(n){return(e?t:n[t]).apply(n,r)})},j.pluck=function(n,t){return j.map(n,j.property(t))},j.where=function(n,t){return j.filter(n,j.matches(t))},j.findWhere=function(n,t){return j.find(n,j.matches(t))},j.max=function(n,t,r){if(!t&&j.isArray(n)&&n[0]===+n[0]&&n.length<65535)return Math.max.apply(Math,n);var e=-1/0,u=-1/0;return A(n,function(n,i,a){var o=t?t.call(r,n,i,a):n;o>u&&(e=n,u=o)}),e},j.min=function(n,t,r){if(!t&&j.isArray(n)&&n[0]===+n[0]&&n.length<65535)return Math.min.apply(Math,n);var e=1/0,u=1/0;return A(n,function(n,i,a){var o=t?t.call(r,n,i,a):n;u>o&&(e=n,u=o)}),e},j.shuffle=function(n){var t,r=0,e=[];return A(n,function(n){t=j.random(r++),e[r-1]=e[t],e[t]=n}),e},j.sample=function(n,t,r){return null==t||r?(n.length!==+n.length&&(n=j.values(n)),n[j.random(n.length-1)]):j.shuffle(n).slice(0,Math.max(0,t))};var E=function(n){return null==n?j.identity:j.isFunction(n)?n:j.property(n)};j.sortBy=function(n,t,r){return t=E(t),j.pluck(j.map(n,function(n,e,u){return{value:n,index:e,criteria:t.call(r,n,e,u)}}).sort(function(n,t){var r=n.criteria,e=t.criteria;if(r!==e){if(r>e||r===void 0)return 1;if(e>r||e===void 0)return-1}return n.index-t.index}),"value")};var F=function(n){return function(t,r,e){var u={};return r=E(r),A(t,function(i,a){var o=r.call(e,i,a,t);n(u,o,i)}),u}};j.groupBy=F(function(n,t,r){j.has(n,t)?n[t].push(r):n[t]=[r]}),j.indexBy=F(function(n,t,r){n[t]=r}),j.countBy=F(function(n,t){j.has(n,t)?n[t]++:n[t]=1}),j.sortedIndex=function(n,t,r,e){r=E(r);for(var u=r.call(e,t),i=0,a=n.length;a>i;){var o=i+a>>>1;r.call(e,n[o])<u?i=o+1:a=o}return i},j.toArray=function(n){return n?j.isArray(n)?o.call(n):n.length===+n.length?j.map(n,j.identity):j.values(n):[]},j.size=function(n){return null==n?0:n.length===+n.length?n.length:j.keys(n).length},j.first=j.head=j.take=function(n,t,r){return null==n?void 0:null==t||r?n[0]:0>t?[]:o.call(n,0,t)},j.initial=function(n,t,r){return o.call(n,0,n.length-(null==t||r?1:t))},j.last=function(n,t,r){return null==n?void 0:null==t||r?n[n.length-1]:o.call(n,Math.max(n.length-t,0))},j.rest=j.tail=j.drop=function(n,t,r){return o.call(n,null==t||r?1:t)},j.compact=function(n){return j.filter(n,j.identity)};var M=function(n,t,r){return t&&j.every(n,j.isArray)?c.apply(r,n):(A(n,function(n){j.isArray(n)||j.isArguments(n)?t?a.apply(r,n):M(n,t,r):r.push(n)}),r)};j.flatten=function(n,t){return M(n,t,[])},j.without=function(n){return j.difference(n,o.call(arguments,1))},j.partition=function(n,t){var r=[],e=[];return A(n,function(n){(t(n)?r:e).push(n)}),[r,e]},j.uniq=j.unique=function(n,t,r,e){j.isFunction(t)&&(e=r,r=t,t=!1);var u=r?j.map(n,r,e):n,i=[],a=[];return A(u,function(r,e){(t?e&&a[a.length-1]===r:j.contains(a,r))||(a.push(r),i.push(n[e]))}),i},j.union=function(){return j.uniq(j.flatten(arguments,!0))},j.intersection=function(n){var t=o.call(arguments,1);return j.filter(j.uniq(n),function(n){return j.every(t,function(t){return j.contains(t,n)})})},j.difference=function(n){var t=c.apply(e,o.call(arguments,1));return j.filter(n,function(n){return!j.contains(t,n)})},j.zip=function(){for(var n=j.max(j.pluck(arguments,"length").concat(0)),t=new Array(n),r=0;n>r;r++)t[r]=j.pluck(arguments,""+r);return t},j.object=function(n,t){if(null==n)return{};for(var r={},e=0,u=n.length;u>e;e++)t?r[n[e]]=t[e]:r[n[e][0]]=n[e][1];return r},j.indexOf=function(n,t,r){if(null==n)return-1;var e=0,u=n.length;if(r){if("number"!=typeof r)return e=j.sortedIndex(n,t),n[e]===t?e:-1;e=0>r?Math.max(0,u+r):r}if(y&&n.indexOf===y)return n.indexOf(t,r);for(;u>e;e++)if(n[e]===t)return e;return-1},j.lastIndexOf=function(n,t,r){if(null==n)return-1;var e=null!=r;if(b&&n.lastIndexOf===b)return e?n.lastIndexOf(t,r):n.lastIndexOf(t);for(var u=e?r:n.length;u--;)if(n[u]===t)return u;return-1},j.range=function(n,t,r){arguments.length<=1&&(t=n||0,n=0),r=arguments[2]||1;for(var e=Math.max(Math.ceil((t-n)/r),0),u=0,i=new Array(e);e>u;)i[u++]=n,n+=r;return i};var R=function(){};j.bind=function(n,t){var r,e;if(_&&n.bind===_)return _.apply(n,o.call(arguments,1));if(!j.isFunction(n))throw new TypeError;return r=o.call(arguments,2),e=function(){if(!(this instanceof e))return n.apply(t,r.concat(o.call(arguments)));R.prototype=n.prototype;var u=new R;R.prototype=null;var i=n.apply(u,r.concat(o.call(arguments)));return Object(i)===i?i:u}},j.partial=function(n){var t=o.call(arguments,1);return function(){for(var r=0,e=t.slice(),u=0,i=e.length;i>u;u++)e[u]===j&&(e[u]=arguments[r++]);for(;r<arguments.length;)e.push(arguments[r++]);return n.apply(this,e)}},j.bindAll=function(n){var t=o.call(arguments,1);if(0===t.length)throw new Error("bindAll must be passed function names");return A(t,function(t){n[t]=j.bind(n[t],n)}),n},j.memoize=function(n,t){var r={};return t||(t=j.identity),function(){var e=t.apply(this,arguments);return j.has(r,e)?r[e]:r[e]=n.apply(this,arguments)}},j.delay=function(n,t){var r=o.call(arguments,2);return setTimeout(function(){return n.apply(null,r)},t)},j.defer=function(n){return j.delay.apply(j,[n,1].concat(o.call(arguments,1)))},j.throttle=function(n,t,r){var e,u,i,a=null,o=0;r||(r={});var c=function(){o=r.leading===!1?0:j.now(),a=null,i=n.apply(e,u),e=u=null};return function(){var l=j.now();o||r.leading!==!1||(o=l);var f=t-(l-o);return e=this,u=arguments,0>=f?(clearTimeout(a),a=null,o=l,i=n.apply(e,u),e=u=null):a||r.trailing===!1||(a=setTimeout(c,f)),i}},j.debounce=function(n,t,r){var e,u,i,a,o,c=function(){var l=j.now()-a;t>l?e=setTimeout(c,t-l):(e=null,r||(o=n.apply(i,u),i=u=null))};return function(){i=this,u=arguments,a=j.now();var l=r&&!e;return e||(e=setTimeout(c,t)),l&&(o=n.apply(i,u),i=u=null),o}},j.once=function(n){var t,r=!1;return function(){return r?t:(r=!0,t=n.apply(this,arguments),n=null,t)}},j.wrap=function(n,t){return j.partial(t,n)},j.compose=function(){var n=arguments;return function(){for(var t=arguments,r=n.length-1;r>=0;r--)t=[n[r].apply(this,t)];return t[0]}},j.after=function(n,t){return function(){return--n<1?t.apply(this,arguments):void 0}},j.keys=function(n){if(!j.isObject(n))return[];if(w)return w(n);var t=[];for(var r in n)j.has(n,r)&&t.push(r);return t},j.values=function(n){for(var t=j.keys(n),r=t.length,e=new Array(r),u=0;r>u;u++)e[u]=n[t[u]];return e},j.pairs=function(n){for(var t=j.keys(n),r=t.length,e=new Array(r),u=0;r>u;u++)e[u]=[t[u],n[t[u]]];return e},j.invert=function(n){for(var t={},r=j.keys(n),e=0,u=r.length;u>e;e++)t[n[r[e]]]=r[e];return t},j.functions=j.methods=function(n){var t=[];for(var r in n)j.isFunction(n[r])&&t.push(r);return t.sort()},j.extend=function(n){return A(o.call(arguments,1),function(t){if(t)for(var r in t)n[r]=t[r]}),n},j.pick=function(n){var t={},r=c.apply(e,o.call(arguments,1));return A(r,function(r){r in n&&(t[r]=n[r])}),t},j.omit=function(n){var t={},r=c.apply(e,o.call(arguments,1));for(var u in n)j.contains(r,u)||(t[u]=n[u]);return t},j.defaults=function(n){return A(o.call(arguments,1),function(t){if(t)for(var r in t)n[r]===void 0&&(n[r]=t[r])}),n},j.clone=function(n){return j.isObject(n)?j.isArray(n)?n.slice():j.extend({},n):n},j.tap=function(n,t){return t(n),n};var S=function(n,t,r,e){if(n===t)return 0!==n||1/n==1/t;if(null==n||null==t)return n===t;n instanceof j&&(n=n._wrapped),t instanceof j&&(t=t._wrapped);var u=l.call(n);if(u!=l.call(t))return!1;switch(u){case"[object String]":return n==String(t);case"[object Number]":return n!=+n?t!=+t:0==n?1/n==1/t:n==+t;case"[object Date]":case"[object Boolean]":return+n==+t;case"[object RegExp]":return n.source==t.source&&n.global==t.global&&n.multiline==t.multiline&&n.ignoreCase==t.ignoreCase}if("object"!=typeof n||"object"!=typeof t)return!1;for(var i=r.length;i--;)if(r[i]==n)return e[i]==t;var a=n.constructor,o=t.constructor;if(a!==o&&!(j.isFunction(a)&&a instanceof a&&j.isFunction(o)&&o instanceof o)&&"constructor"in n&&"constructor"in t)return!1;r.push(n),e.push(t);var c=0,f=!0;if("[object Array]"==u){if(c=n.length,f=c==t.length)for(;c--&&(f=S(n[c],t[c],r,e)););}else{for(var s in n)if(j.has(n,s)&&(c++,!(f=j.has(t,s)&&S(n[s],t[s],r,e))))break;if(f){for(s in t)if(j.has(t,s)&&!c--)break;f=!c}}return r.pop(),e.pop(),f};j.isEqual=function(n,t){return S(n,t,[],[])},j.isEmpty=function(n){if(null==n)return!0;if(j.isArray(n)||j.isString(n))return 0===n.length;for(var t in n)if(j.has(n,t))return!1;return!0},j.isElement=function(n){return!(!n||1!==n.nodeType)},j.isArray=x||function(n){return"[object Array]"==l.call(n)},j.isObject=function(n){return n===Object(n)},A(["Arguments","Function","String","Number","Date","RegExp"],function(n){j["is"+n]=function(t){return l.call(t)=="[object "+n+"]"}}),j.isArguments(arguments)||(j.isArguments=function(n){return!(!n||!j.has(n,"callee"))}),"function"!=typeof/./&&(j.isFunction=function(n){return"function"==typeof n}),j.isFinite=function(n){return isFinite(n)&&!isNaN(parseFloat(n))},j.isNaN=function(n){return j.isNumber(n)&&n!=+n},j.isBoolean=function(n){return n===!0||n===!1||"[object Boolean]"==l.call(n)},j.isNull=function(n){return null===n},j.isUndefined=function(n){return n===void 0},j.has=function(n,t){return f.call(n,t)},j.noConflict=function(){return n._=t,this},j.identity=function(n){return n},j.constant=function(n){return function(){return n}},j.property=function(n){return function(t){return t[n]}},j.matches=function(n){return function(t){if(t===n)return!0;for(var r in n)if(n[r]!==t[r])return!1;return!0}},j.times=function(n,t,r){for(var e=Array(Math.max(0,n)),u=0;n>u;u++)e[u]=t.call(r,u);return e},j.random=function(n,t){return null==t&&(t=n,n=0),n+Math.floor(Math.random()*(t-n+1))},j.now=Date.now||function(){return(new Date).getTime()};var T={escape:{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#x27;"}};T.unescape=j.invert(T.escape);var I={escape:new RegExp("["+j.keys(T.escape).join("")+"]","g"),unescape:new RegExp("("+j.keys(T.unescape).join("|")+")","g")};j.each(["escape","unescape"],function(n){j[n]=function(t){return null==t?"":(""+t).replace(I[n],function(t){return T[n][t]})}}),j.result=function(n,t){if(null==n)return void 0;var r=n[t];return j.isFunction(r)?r.call(n):r},j.mixin=function(n){A(j.functions(n),function(t){var r=j[t]=n[t];j.prototype[t]=function(){var n=[this._wrapped];return a.apply(n,arguments),z.call(this,r.apply(j,n))}})};var N=0;j.uniqueId=function(n){var t=++N+"";return n?n+t:t},j.templateSettings={evaluate:/<%([\s\S]+?)%>/g,interpolate:/<%=([\s\S]+?)%>/g,escape:/<%-([\s\S]+?)%>/g};var q=/(.)^/,B={"'":"'","\\":"\\","\r":"r","\n":"n","	":"t","\u2028":"u2028","\u2029":"u2029"},D=/\\|'|\r|\n|\t|\u2028|\u2029/g;j.template=function(n,t,r){var e;r=j.defaults({},r,j.templateSettings);var u=new RegExp([(r.escape||q).source,(r.interpolate||q).source,(r.evaluate||q).source].join("|")+"|$","g"),i=0,a="__p+='";n.replace(u,function(t,r,e,u,o){return a+=n.slice(i,o).replace(D,function(n){return"\\"+B[n]}),r&&(a+="'+\n((__t=("+r+"))==null?'':_.escape(__t))+\n'"),e&&(a+="'+\n((__t=("+e+"))==null?'':__t)+\n'"),u&&(a+="';\n"+u+"\n__p+='"),i=o+t.length,t}),a+="';\n",r.variable||(a="with(obj||{}){\n"+a+"}\n"),a="var __t,__p='',__j=Array.prototype.join,"+"print=function(){__p+=__j.call(arguments,'');};\n"+a+"return __p;\n";try{e=new Function(r.variable||"obj","_",a)}catch(o){throw o.source=a,o}if(t)return e(t,j);var c=function(n){return e.call(this,n,j)};return c.source="function("+(r.variable||"obj")+"){\n"+a+"}",c},j.chain=function(n){return j(n).chain()};var z=function(n){return this._chain?j(n).chain():n};j.mixin(j),A(["pop","push","reverse","shift","sort","splice","unshift"],function(n){var t=e[n];j.prototype[n]=function(){var r=this._wrapped;return t.apply(r,arguments),"shift"!=n&&"splice"!=n||0!==r.length||delete r[0],z.call(this,r)}}),A(["concat","join","slice"],function(n){var t=e[n];j.prototype[n]=function(){return z.call(this,t.apply(this._wrapped,arguments))}}),j.extend(j.prototype,{chain:function(){return this._chain=!0,this},value:function(){return this._wrapped}}),"function"==typeof define&&define.amd&&define("underscore",[],function(){return j})}).call(this);
//# sourceMappingURL=underscore-min.map;
modus.publish('fixtures.build.txt.file2', 'File two.');
modus.publish('fixtures.build.txt.file3', 'File three.');
mod('fixtures.build.globalBuildEvent', function () {
  this.textloader = function (txt) {
    // do nothing! This is just a target to test out
    // the compiler, seeing if my little idea about how
    // text files can be loaded actually works.
  };
});

modus.addBuildEvent(function (mods, output, build) {
  var txtCheck = /\.textloader\(['|"]([\s\S]+?)['|"]\)/g;
  for (var modName in output) {
    output[modName].replace(txtCheck, function (match, filepath) {
      var fileModName = modus.normalizeModuleName(filepath, modName);
      var file = build.readFile(filepath, {ext: 'txt', context: modName});
      modus.publish(fileModName, file);
      modus.getModule(modName).addModuleDependency(fileModName);
      build.output(fileModName, "modus.publish('" + fileModName + "', '" + file + "');");
    });
  }
});
;
mod('fixtures.build.two', function () {
  this.imports('textloader').from('.globalBuildEvent');
  this.textloader('./txt/file3');
  this.bar = 'bar';
  this.baz = 'baz';
});
mod('fixtures.build.one', function () {
  this.imports('bar', 'baz').from('.two');
  this.imports('textloader').from('.globalBuildEvent');
  this.foo = 'foo';
  this.textloader('./txt/file2');
});
;

modus.module('main', function () {
  this.imports('underscore').as('_');
  this.imports('fixtures.build.anon').as('anon');
  this.imports('fixtures.build.moduleBuildEvent').as('fileload');
  this.imports('fixtures.build.globalBuildEvent').as('glob');
  this.imports('foo', 'bar', 'baz').from('fixtures.build.one');
});

}).call(this);