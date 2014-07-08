/*!
 * Modus 0.1.3
 *
 * Copyright 2014
 * Released under the MIT license
 *
 * Date: 2014-07-08T19:53Z
 */

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
// We need to use Function, sorry jsLint.
/*jslint evil: true */


// Internal helpers
// ================

// Ensure async loading.
var nextTick = ( function () {
  var fns = [];
  var enqueueFn = function (fn, ctx) {
    if (ctx) bind(fn, ctx);
    return fns.push(fn);
  };
  var dispatchFns = function () {
    var toCall = fns
      , i = 0
      , len = fns.length;
    fns = [];
    while (i < len) { 
      toCall[i++]();
    }
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

// A super stripped down promise-like thing.
var Wait = function(){
  this._state = 0;
  this._onReady = [];
  this._onFailed = [];
  this._value = null;
};

// Run when done waiting.
Wait.prototype.done = function(onReady, onFailed){
  var self = this;
  nextTick(function(){
    if(onReady && ( "function" === typeof onReady)){
      (self._state === 1)
        ? onReady.call(self, self._value)
        : self._onReady.push(onReady);
    }
    if(onFailed && ( "function" === typeof onFailed)){
      (self._state === -1)
        ? onFailed.call(self, self._value)
        : self._onFailed.push(onFailed);
    }
  });
  return this;
};

// Resolve the Wait.
Wait.prototype.resolve = function(value, ctx){
  this._state = 1;
  this._dispatch(this._onReady, value, ctx);
  this._onReady = [];
};

// Reject the Wait.
Wait.prototype.reject = function(value, ctx){
  this._state = -1;
  this._dispatch(this._onFailed, value, ctx);
  this._onFailed = [];
};

// Helper to run callbacks
Wait.prototype._dispatch = function (fns, value, ctx) {
  this._value = (value || this._value);
  ctx = (ctx || this);
  var self = this;
  each(fns, function(fn){ fn.call(ctx, self._value); });
};

// Get all the keys in an object.
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

// Iterate over arrays or objects.
var each = function (obj, callback, context) {
  if(!obj){
    return obj;
  }
  context = (context || obj);
  if(Array.prototype.forEach && obj.forEach){
    obj.forEach(callback)
  } else if (obj instanceof Array) {
    for (var i = 0; i < obj.length; i += 1) {
      if (obj[i] && callback.call(context, obj[i], i, obj)) {
        break;
      }
    }
  } else {
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (key && callback.call(context, obj[key], key, obj)) {
          break;
        }
      }
    }
  }
  return obj;
};

// Run through each item in an array, then resolve a Wait
// once all items have been iterated through.
//
// example:
//
//    eachWait(object, function(item, next, error) {
//      // do something with 'item', then do the next thing
//      next();
//    })
//    .done(function () {
//      console.log("Last item ran!")
//    }, function (reason) {
//      // Handle errors here.
//    });
//
var eachWait = function (obj, callback, context) {
  var len = size(obj);
  var current = 0;
  var wait = new Wait();
  context = context || obj;
  var next = function () {
    current += 1;
    // We're at the last item, so resolve the wait.
    if (current === len) wait.resolve();
  };
  var error = function (reason) {
    wait.reject(reason);
  };
  // Run an 'each' loop
  each(obj, function (item) {
    callback.call(context, item, next, error);
  });
  return wait;
};

// Extend an object
var extend = function(obj /*...*/){
  each(Array.prototype.slice.call(arguments, 1), function(source){
    if(source){
      for(var prop in source){
        if (source.hasOwnProperty(prop)) obj[prop] = source[prop];
      }
    }
  });
  return obj;
};

// A simple shim for Function.bind
var bind = function (func, ctx) {
  if (Function.prototype.bind && func.bind) return func.bind(ctx);
  return function () { func.apply(ctx, arguments); };
};
// Modus
// =====
//
// The primary API

// Create the main namespace.
var Modus = root.Modus = {};

Modus.env = {};

// Config options for Modus.
Modus.options = {
  root: '',
  map: {}
};

var getMappedPath = Modus.getMappedPath = function(path) {
  // more: gotta handle path maps.
  path = Modus.config('root') + path.replace(/\./g, '/') + '.js';
  return path;
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

// Import a module from the env.
Modus.imports = function (name) {
  if (!Modus.env.hasOwnProperty(name)) {
    throw new Error('Module was not found: ' + name);
    return {};
  }
  return Modus.env[name].env;
};

// Run the main module.
Modus.main = function (name, next, error) {
  error = error || function (e) {
    throw e;
  }
  Modus.Loader.load(name).done(function (mod) {
    mod.enable();
    mod.done(next, error)
  }, error);
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
// Modus.Module
// ============

// Module states
var MODULE_STATE = {
  PENDING: 0,
  WORKING: 1,
  LOADED: 2,
  READY: 3,
  ENABLED: 4,
  DISABLED: -1
};

// The core of Modus. Modules are where all dependency
// management happens.
var Module = Modus.Module = function (name) {
  var self = this;
  this._state = MODULE_STATE.PENDING;
  this.imports = [];
  this.env = {};
  this.factory = function () {};
  this._name = "";
  this._wait = new Wait();
  // Register the Module
  if (name) this.defines(name);
};

// Register the Module. If a name is not provided
// to the constructor, this method MUST be called somewhere
// in the package definition.
Module.prototype.defines = function (name) {
  // Set this Module's name.
  this._name = name;
  // Register in the Modus.env
  Modus.env[name] = this;
};

// Run the package, gathering all imports and defining
// all exports.
Module.prototype.enable = function () {
  if (this.isDisabled() || this.isWorking()) return;
  if (this.isPending()) {
    this._importDependencies();
  } else if (this.isEnabled()) {
    this._wait.resolve();
  }
};

// Disable this package
Module.prototype.disable = function (reason) {
  this.isDisabled(true);
  this._wait.reject(reason);
};

// Gather all imports.
Module.prototype._importDependencies = function () {
  if (this.isDisabled() || this.isWorking()) return;
  var queue = [];
  var self = this;
  each(this.imports, function (item) {
    if (item.imported === true || Modus.env.hasOwnProperty(item.id)) return;
    item.imported = true;
    queue.push(item);
  });
  if (queue.length > 0) {
    this.isWorking(true);
    eachWait(queue, function getImports (item, next, error) {
      // Wait for a package to load its deps before continuing,
      // and ensure that an object is defined before continuing.
      var check = function () {
        var name = item.id;
        // if (isPath(name)) name = getObjectByPath(name, {stripExt:true});
        if (Modus.env.hasOwnProperty(name)) {
          Modus.env[name].done(next, error);
          Modus.env[name].enable();
        // } else {
        //   if (getObjectByName(name)) {
        //     next();
        //   } else {
        //     error('A dependency was not loaded: ' + name);
        //   }
        }
      };
      // Load the item, either with a plugin or the default method.
      // if (item.plugin) {
      //   if ('function' === typeof item.plugin) {
      //     item.plugin(item.id, check, error);
      //   } else {
      //     Modus.plugin(item.plugin, item.id, check, error);
      //   }
      // } else {
        Modus.Loader.load(item.id, check, error);
      // }
    })
    .done(function () {
      self.isLoaded(true);
      self._define();
    }, function (reason) {
      self.disable(reason);
    });
  } else {
    this.isLoaded(true);
    self._define();
  }
};

Module.prototype.exports = function (items) {
  this.env = extend(this.env, items);
};

Module.prototype.done = function (next, error) {
  this._wait.done(next, error);
};

Module.prototype._define = function () {
  this.factory(Modus.imports, bind(this.exports, this));
  this.isEnabled(true);
  // Set this as done!
  this._wait.resolve();
};

// State methods
each(['Enabled', 'Ready', 'Working', 'Loaded', 'Pending', 'Disabled'], function (state) {
  var modState = MODULE_STATE[state.toUpperCase()];
  Module.prototype['is' + state] = function(set){
    if(set) this._state = modState;
    return this._state === modState;
  } 
});
// Modus.Loader
// ============

var Loader = Modus.Loader = {};

// Regexp for parsing
var _module = /module\s+?([\s\S]+?)[;|\n\r]/g;
var _import = /import\s+?([\s\S]+?)[;|\n\r]/g;
var _as = /\s+?as\s+?([\s\S]+?)$/g;
var _using = /using\s+?([\s\S]+?)$/g;
var _exportVar = /export\s+?var\s+?([\s\S]+?)\s+?[\S]/g;
var _exportList = /export\s+?{([\s\S]+?)};?/g;

// Parse a Modus module into pure javascript.
Loader.parse = function (raw, name) {
  var module = new Modus.Module(name);

  // Find the module name.
  raw = raw.replace(_module, function (matches, modname) {
    module.defines(modname);
    name = modname;
    return '';
  });

  var namespace = name.split('.');
  namespace.pop();
  namespace = namespace.join('.');

  // Find imports
  raw = raw.replace(_import, function (matches, dep) {
    var alias = dep.split('.').pop(); // Get the last segment of the module name.
    var plugin = false
    if (dep.indexOf('.') === 0) {
      dep = namespace + dep;
    }
    dep = dep.replace(_as, function (matches, as) {
      alias = as;
      return '';
    });
    dep = dep.replace(_using, function (matches, using) {
      plugin = using;
      return '';
    });
    module.imports.push({id:dep});
    return "var " + alias + " = __import__('" + dep + "');\n";
  });

  // Find exports.
  raw = raw.replace(_exportVar, function (matches, exports) {
    return '__export__.' + exports.trim();
  });

  raw = raw.replace(_exportList, function (matches, list) {
    var items = list.split(',');
    var result = []
    each(items, function (item) {
      item = item.trim();
      result.push(item + ':' + item);
    });
    return '__export__({' + result.join(',') + '});\n';
  });

  // console.log(raw);

  module.factory = new Function('__import__, __export__', raw);

  return module;
};

// Holds visited urls to ensure they are only loaded once.
var _visited = {};

// Load the module via ajax.
Loader.load = function (module, next, error, options) {
  var src = getMappedPath(module, Modus.config('root'));
  var self = this;

  if(_visited.hasOwnProperty(src)){
    _visited[src].done(next, error);
    return;
  }

  var visit = _visited[src] = new Wait();
  visit.done(next, error);

  if(root.XMLHttpRequest){
    var request = new XMLHttpRequest();
  } else { // code for IE6, IE5
    var request = new ActiveXObject("Microsoft.XMLHTTP");
  }

  request.onreadystatechange = function(){
    if(4 === this.readyState){
      if(200 === this.status){
        try {
          var res = self.parse(this.responseText, module);
          visit.resolve(res);
        } catch (e) {
          visit.reject(e);
          console.log(e);
          throw new Error(e.message + ' in module [' + module + '] ');
        }
      } else {
        visit.reject(this.status);
      }
    }
  }

  request.open('GET', src, true);
  request.send();

  return visit;
};

// If this script has 'data-main' set, try to load it.


}));