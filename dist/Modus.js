//!
// Modus 0.1.3
//
// Copyright 2014
// Released under the MIT license
//
// Date: 2014-07-11T18:23Z

(function (factory) {

  if (typeof module === "object" && typeof module.exports === "object") {
    // For CommonJS environments.
    var root = {};
    factory(root);
    module.exports = root.Modus;
  } else if (typeof window !== "undefined") {
    factory(window);
  }

}(function (root, undefined) {

"use strict"

// The main modus namespace
var Modus = root.Modus = {};

// Save the current version.
Modus.VERSION = '0.1.3';

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
  context = options.context || this;
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
    global.addEventListener('message', onMessage, true);
    return function (fn, ctx) { enqueueFn(fn, ctx) && global.postMessage(msg, '*'); };
  }
})();

var nativeFilter = Array.prototype.filter;
var filter = function (obj, predicate, context) {
  var results = [];
  if (obj == null) return results;
  if (nativeFilter && obj.filter === nativeFilter) return obj.filter(predicate, context);
  each(obj, function(value, index, list) {
    if (predicate.call(context, value, index, list)) results.push(value);
  });
  return results;
}

// UNNEEDED? /////

  // // Create an object, ensuring that every level is defined
  // // example:
  // //    foo.bar.baz -> (foo={}), (foo.bar={}), (foo.bar.baz={})
  // var createObjectByName = function (namespace, exports, env) {
  //   var cur = env || global;
  //   var parts = namespace.split('.');
  //   for (var part; parts.length && (part = parts.shift()); ) {
  //     if(!parts.length && exports !== undefined){
  //       // Last part, so export to this.
  //       cur[part] = exports;
  //     } else if (cur[part]) {
  //       cur = cur[part];
  //     } else {
  //       cur = cur[part] = {};
  //     }
  //   }
  //   return cur;
  // }

  // // Convert a string into an object
  // var getObjectByName = function (name, env) {
  //   var cur = env || global;
  //   var parts = name.split('.');
  //   for (var part; part = parts.shift(); ) {
  //     if(typeof cur[part] !== "undefined"){
  //       cur = cur[part];
  //     } else {
  //       return null;
  //     }
  //   }
  //   return cur;  
  // };

///////

// Check if this is a path or an object name
var isPath = function (obj) {
  return obj.indexOf('/') >= 0;
};

// Modus
// =====

// Environment helpers
// -------------------

// 'env' holds modules.
Modus.env = {};

// Config options for Modus.
Modus.options = {
  root: '',
  map: {}
};

// Set or get a Modus config option.
Modus.config = function (key, val) {
  if ( "object" === typeof key ) {
    for ( var item in key ) {
      Modus.config(item, key[item]);
    }
    return;
  }
  if(arguments.length < 2){
    return ("undefined" === typeof Modus.options[key])? false : Modus.options[key];
  }
  if ( 'map' === key ) {
    return Modus.map(val);
  }
  Modus.options[key] = val;
  return Modus.options[key];
};

// Figure out what we're running Modus in.
var checkEnv = function () {
  if (typeof module === "object" && module.exports) {
    Modus.config('environment', 'node');
  } else {
    Modus.config('environment', 'client');
  }
};

// Are we running Modus on a server?
var isServer = Modus.isServer = function () {
  if (!Modus.config('environment')) checkEnv();
  return Modus.config('environment') === 'node'
    || Modus.config('environment') === 'server';
};

// Are we running Modus on a client?
var isClient = Modus.isClient =  function () {
  if (!Modus.config('environment')) checkEnv();
  return Modus.config('environment') != 'node'
    && Modus.config('environment') != 'server';
};

// Map modules to a given path.
//
// example:
//    Modus.map('lib/foo.js', ['foo.bar', 'foo.bin']);
//    // You can also map a file to a base namespace
//    Modus.map('lib/foo.js', ['foo.*']);
//    // The following will now load lib/foo.js:
//    module.import('foo.bar');
//
Modus.map = function (path, provides) {
  // TODO: This method needs some love.
  if ("object" === typeof path){
    for ( var item in path ) {
      Modus.map(item, path[item]);
    }
    return;
  }
  if (!Modus.options.map[path]) {
    Modus.options.map[path] = [];
  }
  if (provides instanceof Array) {
    each(provides, function (item) {
      Modus.map(path, item);
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
  Modus.options.map[path].push(provides);
};

// Simple error wrapper.
Modus.err = function (error) {
  throw new Error(error);
};

// Get a mapped path
var getMappedPath = Modus.getMappedPath = function (module, root) {
  root = root || Modus.config('root');
  var src = (isPath(module))? module : module.replace(/\./g, '/');
  each(Modus.config('map'), function (maps, pathPattern) {
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
var normalizeModuleName = Modus.normalizeModuleName = function (name) {
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
var getMappedGlobal = Modus.getMappedGlobal = function (path) {
  if (Modus.options.map.hasOwnProperty(path)) {
    return root[Modus.options.map[path]] || false;
  }
  return false;
};

// Check if a module has been loaded.
var moduleExists = Modus.moduleExists = function (name) {
  name = normalizeModuleName(name);
  if (Modus.env.hasOwnProperty(name)) return true;
  return false;
};

// Get a module from the env.
var getModule = Modus.getModule = function (name) {
  name = normalizeModuleName(name);
  return Modus.env[name];
}

// Primary API
// -----------

// Module factory.
//
// example:
//    Modus.module('foo.bar', function (bar) {
//      // code
//    })
Modus.module = function (name, factory, options) {
  options = options || {};
  var module = new Modus.Module(name, factory, options);
  module.enable();
  return module;
};

// Syntactic sugar for namespaces.
//
// example:
//    Modus.namespace('Foo', function (Foo) {
//      Foo.module('Bar', function (Bar) {...}); // Defines 'Foo/Bar'
//    });
//    // Or:
//    Modus.namespace('Foo/Bar').module('Bin', function (Bin) { ... });
Modus.namespace = function (namespace, factory) {
  if (factory) return Modus.module(namespace, factory);
  var options = {namespace: namespace};
  return {
    module: function (name, factory) {
      return Modus.module(name, options, factory);
    },
    publish: function (name, value) {
      return Modus.publish(name, options, value);
    }
  };
};

// Shortcut to export a single value as a module.
Modus.publish = function (name, value, options) {
  return Modus.module(name, options, function (module) {
    module.default = value;
  });
};

// Modus.EventEmitter
// ------------------
// A simple event emitter, used internally for hooks.

var EventEmitter = Modus.EventEmitter = function () {
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
Modus.events = new EventEmitter();

// Modus.Import
// ------------
// Import does what you expect: it handles all imports for 
// Modus namespaces and Modus modules.
var Import = Modus.Import = function (parent) {
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
// doesn't actually load a module: see 'Modus.Module#investigate'
// to figure out what Modus is doing.
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
  if (!depEnv) Modus.err('Dependency not avalilable [' + module + '] for: ' + this._parent.getFullName());
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
}

// Modus.Module
// ------------
// The core of Modus.

var Module = Modus.Module = function (name, factory, options) {
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
  if (this.options.wait) {
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
  // Register self with Modus
  Modus.env[this.getFullName()] = this;
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

// Helper that waits for a modules to emit a 'done' or 'error'
// event.
var _onModuleDone = function (dep, next, error) {
  if (moduleExists(dep)) {
    var mod = getModule(dep);
    mod.once('done', next);
    mod.once('error', error);
    mod.enable();
  } else if (getMappedGlobal(dep)) {
    next();
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
  // Ensure we don't try to enable this module twice.
  this._isEnabling = true;
  this.emit('enable.before');
  this._investigate();
  var onFinal = bind(function () {
    this._isEnabling = false;
    this._isEnabled = true;
    if(!this.options.compiling) this._runFactory();
    this.emit('enable.after');
    if(!this.options.wait) this.emit('done');
  }, this);
  var self = this;
  if (this._deps.length <= 0) return onFinal();
  eachAsync(this._deps, {
    each: function (dep, next, error) {
      if (moduleExists(dep)) {
        _onModuleDone(dep, next, error);
      } else if (getMappedGlobal(dep)) {
        next();
      } else {
        // Try to find the module.
        Modus.load(dep, function () {
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

Module.prototype.disable = function (reason) {
  this._isDisabled = true;
  this.emit('error');
  if (this.options.throwErrors && reason instanceof Error) {
    throw reason;
  } else if (this.options.throwErrors) {
    throw new Error(reason);
  }
};

// Import dependencies.
Module.prototype.imports = function (/*...*/) {
  var imp = new Modus.Import(this);
  imp.imports.apply(imp, arguments);
  return imp;
};

// Get the namespace from the passed name.
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

Module.prototype._registerHooks = function () {
  var hooks = this.options.hooks;
  var self = this;
  each(hooks, function (cb, name) {
    self.once(name, cb);
  });
};

var _findDeps = /\.from\([\'|\"]([\s\S]+?)[\'|\"]\)/g;
var _findPlugin = /\.using\([\'|\"]([\s\S]+?)[\'|\"]\)/g;

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
};

Module.prototype._runFactory = function () {
  if (!this._factory) return;
  var self = this;
  // Bind helpers to the env.
  this.emit('factory.before');
  this.env.imports = bind(this.imports, this);
  this.env.emit = bind(this.emit, this);
  // Run the factory.
  this._factory(this.env);
  // Cleanup the env.
  this.once('done', function () {
    delete self.env.imports;
    delete self.env.emit;
    delete self._factory;
  });
  this.emit('factory.after');
};


// Modus Loaders
// -------------

if (isClient()) {

  // A collection of previously visited scripts.
  // Used to ensure that scripts are only requested once.
  var visited = {};

  // Test for the load event the current browser supports.
  var onLoadEvent = (function (){
    var testNode = document.createElement('script');
    if (testNode.attachEvent){
      return function(script, emitter){
        script.attachEvent('onreadystatechange', function () {
          if(/complete|loaded/.test(script.readyState)){
            emitter.emit('done');
          }
        });
        // Can't handle errors with old browsers.
      }
    }
    return function(script, emitter){
      script.addEventListener('load', function (e) {
        emitter.emit('done');
      }, false);
      script.addEventListener('error', function (e) {
        emitter.emit('error');
      }, false);
    }
  })();

  // Load a script. This can only be used for JS files, 
  // if you want to load a text file or do some other AJAX
  // request you'll need to write a plugin (see the 'examples'
  // folder for inspiration).
  Modus.load = function (module, next, error) {

    if (module instanceof Array) {
      eachAsync(module, {
        each: function (item, next, error) {
          Modus.load(item, next, error);
        },
        onFinal: next,
        onError: error
      });
      return;
    }

    var src = getMappedPath(module, Modus.config('root'));

    // If the script is already loading, add the callback
    // to the queue and don't load it again.
    if (visited.hasOwnProperty(src)) {
      visited[src].once('done', next);
      visited[src].once('error', error);
      return;
    }

    // Set up script
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.charset = 'utf-8';
    script.async = true;
    script.setAttribute('data-module', module);
    script.src = src;

    // Add to DOM
    var entry = document.getElementsByTagName('script')[0];
    entry.parentNode.insertBefore(script, entry);

    // Add event listener
    visited[src] = new EventEmitter();
    visited[src].once('done', next);
    visited[src].once('error', error);
    onLoadEvent(script, visited[src]);
  };

}
if (isServer()) {

  // Make Modus GLOBAL so it can run in each context.
  // This basically makes Modus a wrapper for 'require'.
  // This isn't a best practice, but Modus modules have to
  // run in both browser and node contexts, so using 
  // 'module.exports' is out.
  GLOBAL.Modus = Modus;

  Modus.load = function (module, next, error) {
    if (module instanceof Array) {
      eachAsync(module, {
        each: function (item, next, error) {
          Modus.load(item, next, error);
        },
        onFinal: next,
        onError: error
      });
      return;
    }
    var src = getMappedPath(module, Modus.config('root'));
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

}
}));